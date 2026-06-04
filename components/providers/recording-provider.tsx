"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import { Mic, Square, Loader2, Pause, Play, AlertTriangle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { appendMeetingTranscript, summarizeMeeting } from "@/app/(dashboard)/projects/actions";

type Subscriber = (text: string) => void;

interface RecordingContextValue {
  isRecording: boolean;
  isPaused: boolean;
  activeMeetingId: string | null;
  activeTitle: string | null;
  elapsed: number;
  transcribing: boolean;
  pending: number;
  // Disparado quando o resumo automático (ao parar) termina — o editor aberto
  // reage e recarrega notas/resumo.
  summaryEvent: { id: string; at: number } | null;
  startSession: (meetingId: string, title: string, prompt?: string) => Promise<void>;
  stopSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  subscribe: (meetingId: string, cb: Subscriber) => () => void;
  getLevel: () => number;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error("useRecording deve ser usado dentro de RecordingProvider");
  return ctx;
}

// Duração de cada bloco. Blocos completos (webm independentes) são transcritos
// um a um — assim reuniões longas não estouram o limite de tamanho do Whisper.
const SEGMENT_MS = 45000;
// Abaixo deste pico de amplitude o bloco é considerado silêncio e não é enviado
// (evita gasto de API e a alucinação do Whisper em trechos mudos).
const SILENCE_LEVEL = 0.015;
// Falhas seguidas antes de parar sozinho (ex.: chave de API inválida/ausente).
const MAX_FAIL_STREAK = 3;
// Marca a gravação ativa no localStorage para detectar interrupções (reload/crash).
// A stream não sobrevive ao reload, mas as transcrições são salvas a cada bloco —
// então conseguimos avisar o usuário que os dados estão a salvo.
const LS_ACTIVE_KEY = "lifeos:active-recording";

const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [pending, setPending] = useState(0);
  const [summaryEvent, setSummaryEvent] = useState<{ id: string; at: number } | null>(null);
  // Gravação interrompida por reload/crash detectada ao montar.
  const [interrupted, setInterrupted] = useState<{ title: string; at: number } | null>(null);

  const streamsRef = useRef<MediaStream[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeRef = useRef(false);
  const pausedRef = useRef(false);
  const segTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);
  const meetingIdRef = useRef<string | null>(null);
  const promptRef = useRef<string>("");
  const subsRef = useRef<Map<string, Subscriber>>(new Map());
  const uploadChainRef = useRef<Promise<void>>(Promise.resolve());
  const pendingRef = useRef(0);
  const levelRef = useRef(0);
  const segMaxRef = useRef(0);
  const segStartRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const failStreakRef = useRef(0);
  const gotTranscriptRef = useRef(false);
  const beforeUnloadRef = useRef<((e: BeforeUnloadEvent) => void) | null>(null);

  const subscribe = useCallback((meetingId: string, cb: Subscriber) => {
    subsRef.current.set(meetingId, cb);
    return () => { if (subsRef.current.get(meetingId) === cb) subsRef.current.delete(meetingId); };
  }, []);

  const getLevel = useCallback(() => levelRef.current, []);

  const setPendingCount = (n: number) => { pendingRef.current = n; setPending(n); };

  // Entrega o trecho transcrito (com carimbo de tempo) ao editor aberto ou ao banco.
  const routeTranscript = (meetingId: string, text: string, atSec: number) => {
    gotTranscriptRef.current = true;
    const stamped = `[${fmtTime(atSec)}] ${text}`;
    const sub = subsRef.current.get(meetingId);
    if (sub) sub(stamped);
    else void appendMeetingTranscript(meetingId, stamped);
  };

  // Resumo automático ao parar: roda depois que o último trecho foi salvo.
  const autoSummarize = async (meetingId: string) => {
    try {
      const r = await summarizeMeeting(meetingId);
      if (r.success) {
        setSummaryEvent({ id: meetingId, at: Date.now() });
        toast.success("Resumo automático gerado.");
      }
    } catch {
      /* silencioso — o usuário ainda pode resumir manualmente */
    }
  };

  const scheduleAutoSummary = (meetingId: string) => {
    // Espera o onstop enfileirar o trecho final e encadeia o resumo no fim da fila.
    setTimeout(() => {
      uploadChainRef.current = uploadChainRef.current.then(() => autoSummarize(meetingId));
    }, 800);
  };

  // Mede o nível de áudio continuamente (medidor ao vivo + detecção de silêncio).
  const startMeter = () => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const data = new Uint8Array(analyser.fftSize);
    const loop = () => {
      analyser.getByteTimeDomainData(data);
      let peak = 0;
      for (let i = 0; i < data.length; i++) {
        const v = Math.abs(data[i] - 128) / 128;
        if (v > peak) peak = v;
      }
      levelRef.current = peak;
      if (peak > segMaxRef.current) segMaxRef.current = peak;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const stopMeter = () => {
    if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    levelRef.current = 0;
  };

  const uploadSegment = async (blob: Blob, meetingId: string, atSec: number) => {
    try {
      setTranscribing(true);
      const fd = new FormData();
      fd.append("audio", blob, "segmento.webm");
      if (promptRef.current) fd.append("prompt", promptRef.current);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        failStreakRef.current = 0;
        if (data.transcript?.trim()) routeTranscript(meetingId, data.transcript.trim(), atSec);
      } else {
        failStreakRef.current++;
        toast.error(data.message || "Falha ao transcrever um trecho.");
      }
    } catch {
      failStreakRef.current++;
      toast.error("Erro ao transcrever um trecho.");
    } finally {
      setTranscribing(false);
      setPendingCount(Math.max(0, pendingRef.current - 1));
      if (failStreakRef.current >= MAX_FAIL_STREAK && activeRef.current) {
        teardown({ err: "Transcrição falhando — confira sua chave Groq/OpenAI em Configurações." });
      }
    }
  };

  const enqueueUpload = (blob: Blob, meetingId: string, atSec: number) => {
    setPendingCount(pendingRef.current + 1);
    uploadChainRef.current = uploadChainRef.current.then(() => uploadSegment(blob, meetingId, atSec));
  };

  const startSegment = () => {
    if (!activeRef.current || pausedRef.current || !destRef.current) return;
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    const mr = new MediaRecorder(destRef.current.stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    segMaxRef.current = 0;
    segStartRef.current = elapsedRef.current;
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const mid = meetingIdRef.current;
      const silent = segMaxRef.current < SILENCE_LEVEL;
      // Bloco com som de verdade vira transcrição; silêncio é descartado na origem.
      if (mid && !silent && blob.size >= 1200) enqueueUpload(blob, mid, segStartRef.current);
      if (activeRef.current && !pausedRef.current) startSegment(); // emenda o próximo bloco
    };
    mr.start();
    recorderRef.current = mr;
    segTimerRef.current = setTimeout(() => { try { mr.stop(); } catch {} }, SEGMENT_MS);
  };

  // Solta câmera/mic/contexto de áudio. Roda com atraso após o stop para o último
  // bloco terminar de ser empacotado.
  const cleanupStreams = () => {
    stopMeter();
    if (segTimerRef.current) { clearTimeout(segTimerRef.current); segTimerRef.current = null; }
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    destRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
  };

  // Encerra a sessão (parada manual ou automática por falha).
  const teardown = (msg?: { ok?: string; err?: string }) => {
    if (!activeRef.current) return;
    activeRef.current = false;
    pausedRef.current = false;
    try { localStorage.removeItem(LS_ACTIVE_KEY); } catch {}
    if (segTimerRef.current) { clearTimeout(segTimerRef.current); segTimerRef.current = null; }
    try { recorderRef.current?.stop(); } catch {} // dispara onstop → último upload (sem reiniciar)
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    if (beforeUnloadRef.current) {
      window.removeEventListener("beforeunload", beforeUnloadRef.current);
      beforeUnloadRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setActiveMeetingId(null);
    setActiveTitle(null);
    setTimeout(cleanupStreams, 800);
    if (msg?.ok) toast.success(msg.ok);
    if (msg?.err) toast.error(msg.err);
  };

  const startSession = useCallback(async (meetingId: string, title: string, prompt?: string) => {
    if (activeRef.current) { toast.message("Já existe uma gravação em andamento."); return; }
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamsRef.current.push(micStream);

      // Áudio do computador (aba/tela) — exige marcar "compartilhar áudio".
      let sysStream: MediaStream | null = null;
      try {
        sysStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        streamsRef.current.push(sysStream);
        sysStream.getVideoTracks().forEach((t) => t.stop());
      } catch {
        toast.message("Gravando só o microfone (áudio do PC não compartilhado).");
      }

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      destRef.current = dest;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;

      const micSrc = ctx.createMediaStreamSource(micStream);
      micSrc.connect(dest);
      micSrc.connect(analyser);
      if (sysStream && sysStream.getAudioTracks().length > 0) {
        const sysSrc = ctx.createMediaStreamSource(sysStream);
        sysSrc.connect(dest);
        sysSrc.connect(analyser);
      }

      setInterrupted(null); // inicia nova sessão → descarta aviso de interrupção
      try { localStorage.setItem(LS_ACTIVE_KEY, JSON.stringify({ meetingId, title, startedAt: Date.now() })); } catch {}

      meetingIdRef.current = meetingId;
      // Não usamos o título como prompt do Whisper: o título automático
      // ("Reunião 03/06 11:30") contém data/hora e, em trechos silenciosos, o
      // Whisper alucina repetindo o prompt — era a origem do "11h30 11h30 11h30...".
      // Só um prompt explícito (nomes/jargões da reunião) entra como contexto.
      promptRef.current = (prompt || "").slice(0, 800);
      activeRef.current = true;
      pausedRef.current = false;
      failStreakRef.current = 0;
      gotTranscriptRef.current = false;
      elapsedRef.current = 0;
      setActiveMeetingId(meetingId);
      setActiveTitle(title);
      setIsRecording(true);
      setIsPaused(false);
      setElapsed(0);
      setPendingCount(0);

      const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
      beforeUnloadRef.current = onBeforeUnload;
      window.addEventListener("beforeunload", onBeforeUnload);

      elapsedTimerRef.current = setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
      startMeter();
      startSegment();
      toast.success("Gravação iniciada.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível acessar o microfone.");
      cleanupStreams();
      activeRef.current = false;
      setIsRecording(false);
    }
    // Lida só com refs/estáveis internamente; deps vazias são intencionais.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopSession = useCallback(() => {
    const mid = meetingIdRef.current;
    const summarize = gotTranscriptRef.current;
    teardown({ ok: "Gravação finalizada. Transcrevendo o último trecho..." });
    if (mid && summarize) scheduleAutoSummary(mid); // resumo automático ao parar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pauseSession = useCallback(() => {
    if (!activeRef.current || pausedRef.current) return;
    pausedRef.current = true;
    setIsPaused(true);
    if (segTimerRef.current) { clearTimeout(segTimerRef.current); segTimerRef.current = null; }
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    stopMeter();
    try { recorderRef.current?.stop(); } catch {} // fecha o bloco atual (onstop não reinicia por estar pausado)
    toast.message("Gravação pausada.");
  }, []);

  const resumeSession = useCallback(() => {
    if (!activeRef.current || !pausedRef.current) return;
    pausedRef.current = false;
    setIsPaused(false);
    elapsedTimerRef.current = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);
    }, 1000);
    startMeter();
    startSegment();
    toast.success("Gravação retomada.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Garante limpeza se o provider desmontar com gravação ativa.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (activeRef.current) { activeRef.current = false; cleanupStreams(); } }, []);

  // Ao montar: se havia uma gravação marcada e não estamos gravando, ela foi
  // interrompida (reload/crash). Avisa que os trechos transcritos já foram salvos.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_ACTIVE_KEY);
      if (raw && !activeRef.current) {
        const data = JSON.parse(raw) as { title?: string; startedAt?: number };
        setInterrupted({ title: data.title || "Reunião", at: data.startedAt || Date.now() });
        localStorage.removeItem(LS_ACTIVE_KEY);
      }
    } catch { /* localStorage indisponível */ }
  }, []);

  const dismissInterrupted = () => setInterrupted(null);

  return (
    <RecordingContext.Provider
      value={{
        isRecording, isPaused, activeMeetingId, activeTitle, elapsed, transcribing, pending, summaryEvent,
        startSession, stopSession, pauseSession, resumeSession, subscribe, getLevel,
      }}
    >
      {children}
      {isRecording && (
        <div className="fixed bottom-5 right-5 z-[200] w-72 rounded-2xl border border-border/60 bg-card shadow-2xl p-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3 shrink-0">
              {!isPaused && <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-60 animate-ping" />}
              <span className={cn("relative inline-flex h-3 w-3 rounded-full", isPaused ? "bg-amber-500" : "bg-rose-600")} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5 text-rose-500" /> {isPaused ? "Pausado" : "Gravando reunião"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{activeTitle}</p>
            </div>
            <span className="text-sm font-mono font-bold tabular-nums text-foreground">{fmtTime(elapsed)}</span>
          </div>

          <div className="mt-2.5">
            <AudioMeter getLevel={getLevel} active={isRecording && !isPaused} />
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1 min-w-0">
              {transcribing ? <><Loader2 className="h-3 w-3 animate-spin shrink-0" /> transcrevendo...</>
                : pending > 0 ? `${pending} na fila`
                : isPaused ? "pausado" : "captura + transcreve"}
            </span>
            <div className="flex items-center gap-1.5">
              {isPaused ? (
                <button onClick={resumeSession} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1.5 transition-colors">
                  <Play className="h-3 w-3 fill-current" /> Retomar
                </button>
              ) : (
                <button onClick={pauseSession} className="flex items-center gap-1.5 rounded-lg bg-muted hover:bg-muted/70 text-foreground text-[11px] font-bold px-2.5 py-1.5 transition-colors">
                  <Pause className="h-3 w-3 fill-current" /> Pausar
                </button>
              )}
              <button onClick={stopSession} className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-2.5 py-1.5 transition-colors">
                <Square className="h-3 w-3 fill-current" /> Parar
              </button>
            </div>
          </div>
        </div>
      )}

      {interrupted && !isRecording && (
        <div className="fixed bottom-5 right-5 z-[200] w-80 rounded-2xl border border-amber-500/40 bg-card shadow-2xl p-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-start gap-2.5">
            <div className="mt-0.5 shrink-0 text-amber-500"><AlertTriangle className="h-4 w-4" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground">Gravação interrompida</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{interrupted.title}</p>
              <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed">
                A página recarregou durante a gravação. Os trechos já transcritos foram salvos nas notas — abra a reunião para continuar.
              </p>
            </div>
            <button onClick={dismissInterrupted} className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors" aria-label="Dispensar">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <button onClick={dismissInterrupted} className="mt-2.5 w-full rounded-lg bg-muted/60 hover:bg-muted py-1.5 text-[11px] font-bold text-foreground transition-colors">
            Entendi
          </button>
        </div>
      )}
    </RecordingContext.Provider>
  );
}

// Medidor de áudio ao vivo. Roda seu próprio loop de animação lendo getLevel() e
// atualiza as barras direto no DOM (via data-attribute), sem re-render do React —
// isola o custo aqui e mantém 60fps suaves.
export function AudioMeter({ getLevel, active, bars = 14, className }: {
  getLevel: () => number;
  active: boolean;
  bars?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const children = Array.from(el.children) as HTMLElement[];
    if (!active) { children.forEach((c) => { c.dataset.on = "0"; }); return; }
    let raf = 0;
    const loop = () => {
      const lit = Math.min(bars, Math.round(getLevel() * bars * 3.2));
      children.forEach((c, i) => { c.dataset.on = i < lit ? "1" : "0"; });
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active, getLevel, bars]);

  return (
    <div ref={containerRef} className={cn("flex items-center gap-[3px] h-4", className)} aria-hidden>
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          data-on="0"
          className={cn(
            "flex-1 rounded-full bg-muted-foreground/20 transition-colors duration-75",
            i > bars * 0.75 ? "data-[on=1]:bg-rose-500" : "data-[on=1]:bg-emerald-500",
          )}
          style={{ height: `${30 + (i / bars) * 70}%` }}
        />
      ))}
    </div>
  );
}
