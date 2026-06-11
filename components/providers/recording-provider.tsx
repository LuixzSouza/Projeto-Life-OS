"use client";

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import { Mic, Square, Loader2, Pause, Play, AlertTriangle, X, Monitor } from "lucide-react";
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
  // true quando o áudio do computador (chamada/aba) está entrando na gravação.
  systemAudio: boolean;
  startSession: (meetingId: string, title: string, prompt?: string) => Promise<void>;
  stopSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  // (Re)abre o seletor de compartilhamento p/ somar o áudio do PC a uma
  // gravação em andamento — recuperação sem precisar parar a reunião.
  addSystemAudio: () => Promise<void>;
  subscribe: (meetingId: string, cb: Subscriber) => () => void;
  getLevel: () => number;
}

// Opções do getDisplayMedia que o Chrome entende mas o TS DOM ainda não tipa.
// `systemAudio: "include"` é o que faz a caixinha "compartilhar áudio do
// sistema" aparecer ao escolher a tela inteira no Windows.
interface ExtendedDisplayMediaOptions extends DisplayMediaStreamOptions {
  systemAudio?: "include" | "exclude";
  selfBrowserSurface?: "include" | "exclude";
  monitorTypeSurfaces?: "include" | "exclude";
}

const SYS_SHARE_HINT =
  "No seletor, escolha “Tela inteira” e MARQUE “Compartilhar áudio do sistema” (ou compartilhe a guia da chamada com “Compartilhar áudio da guia”).";

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function useRecording() {
  const ctx = useContext(RecordingContext);
  if (!ctx) throw new Error("useRecording deve ser usado dentro de RecordingProvider");
  return ctx;
}

// Duração de cada bloco. Blocos completos (webm independentes) são transcritos
// um a um — assim reuniões longas não estouram o limite de tamanho do Whisper.
const SEGMENT_MS = 45000;
// Depois dos 45s, espera ATÉ este tempo por um respiro (silêncio curto) para
// fechar o bloco — cortar no meio de uma palavra era a maior fonte de erros
// de transcrição nas emendas entre blocos.
const CUT_GRACE_MS = 6000;
// Nível abaixo do qual consideramos "respiro" para o corte gracioso.
const CUT_LEVEL = 0.02;
// Abaixo deste pico de amplitude o bloco é considerado silêncio e não é enviado
// (evita gasto de API e a alucinação do Whisper em trechos mudos).
const SILENCE_LEVEL = 0.015;
// Cauda da última transcrição usada como contexto do próximo trecho (uso
// canônico do `prompt` do Whisper: continuidade de nomes, jargões e pontuação).
const TAIL_CHARS = 240;
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
  const [systemAudio, setSystemAudio] = useState(false);
  // Gravação interrompida por reload/crash detectada ao montar.
  const [interrupted, setInterrupted] = useState<{ title: string; at: number } | null>(null);

  const streamsRef = useRef<MediaStream[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  // Barramento de mistura onde mic e áudio do PC se conectam — fontes novas
  // podem entrar no MEIO da gravação (addSystemAudio).
  const mixBusRef = useRef<GainNode | null>(null);
  const sysActiveRef = useRef(false);
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
  // Corte gracioso do bloco (espera um respiro) + contexto rolante p/ o Whisper.
  const cutTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTailRef = useRef("");

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
      // Contexto = vocabulário fixo (participantes/tags) + cauda do trecho
      // anterior. A fila é serializada, então a cauda chega na ordem certa.
      const context = [promptRef.current, lastTailRef.current].filter(Boolean).join("\n");
      if (context) fd.append("prompt", context);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success) {
        failStreakRef.current = 0;
        const text = (data.transcript as string | undefined)?.trim();
        if (text) {
          lastTailRef.current = text.slice(-TAIL_CHARS);
          routeTranscript(meetingId, text, atSec);
        }
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

  // ---------- Captura do áudio do COMPUTADOR (a voz dos outros na chamada) ----------

  /**
   * Abre o seletor de compartilhamento pedindo áudio do sistema.
   * Distingue os 3 desfechos que antes eram tratados igual (e por isso a
   * gravação "parecia" incluir o PC sem incluir):
   * - ok: stream com trilha de áudio de verdade;
   * - "no-audio": o usuário compartilhou mas SEM marcar a caixinha de áudio
   *   (ou escolheu uma janela, que não tem áudio) — o caso silencioso clássico;
   * - "denied": cancelou/negou o seletor.
   */
  const captureSystemAudio = async (): Promise<{ stream: MediaStream } | { error: "no-audio" | "denied" }> => {
    let stream: MediaStream;
    try {
      const options: ExtendedDisplayMediaOptions = {
        video: true,
        // Áudio do sistema é sinal digital limpo: processamento de voz (AEC/
        // supressão) aqui só degrada — música e vozes distantes saíam mastigadas.
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
        systemAudio: "include", // Chrome: oferece "compartilhar áudio do sistema" na tela inteira
        selfBrowserSurface: "exclude", // esconde a própria aba do Life OS do seletor
        monitorTypeSurfaces: "include",
      };
      stream = await navigator.mediaDevices.getDisplayMedia(options);
    } catch {
      return { error: "denied" };
    }
    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach((t) => t.stop());
      return { error: "no-audio" };
    }
    // NÃO parar a trilha de vídeo: em vários navegadores encerrar o vídeo
    // derruba a sessão de captura INTEIRA (áudio junto) — era uma das causas
    // de "não gravou o som do PC". Desabilitar mantém a sessão viva sem
    // gravar imagem (o MediaRecorder só recebe o destino de áudio).
    stream.getVideoTracks().forEach((t) => { t.enabled = false; });
    return { stream };
  };

  /** Liga o stream do sistema no barramento da gravação e monitora a vida dele. */
  const attachSystemStream = (stream: MediaStream) => {
    const ctx = audioCtxRef.current;
    const bus = mixBusRef.current;
    if (!ctx || !bus) {
      stream.getTracks().forEach((t) => t.stop());
      return;
    }
    streamsRef.current.push(stream);
    ctx.createMediaStreamSource(stream).connect(bus);
    sysActiveRef.current = true;
    setSystemAudio(true);
    const track = stream.getAudioTracks()[0];
    // "Parar compartilhamento" na barra do navegador matava o áudio do PC em
    // silêncio. Agora avisa e oferece religar sem parar a gravação.
    track.onended = () => {
      sysActiveRef.current = false;
      setSystemAudio(false);
      if (activeRef.current) {
        toast.warning("O áudio do PC parou de ser compartilhado — gravando só o microfone.", {
          duration: 15000,
          action: { label: "Religar", onClick: () => { void addSystemAudio(); } },
        });
      }
    };
  };

  const addSystemAudio = useCallback(async () => {
    if (!activeRef.current || sysActiveRef.current) return;
    const result = await captureSystemAudio();
    if ("stream" in result) {
      attachSystemStream(result.stream);
      toast.success("Áudio do PC adicionado à gravação.");
    } else if (result.error === "no-audio") {
      toast.error(`O compartilhamento veio SEM áudio. ${SYS_SHARE_HINT}`, { duration: 15000 });
    }
    // "denied": o usuário cancelou de propósito — sem toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearCutTimer = () => {
    if (cutTimerRef.current) { clearInterval(cutTimerRef.current); cutTimerRef.current = null; }
  };

  const startSegment = () => {
    if (!activeRef.current || pausedRef.current || !destRef.current) return;
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    // 128 kbps explícitos: o default do navegador pode comprimir demais a voz —
    // áudio melhor entra, transcrição melhor sai.
    const mr = new MediaRecorder(destRef.current.stream, {
      ...(mime ? { mimeType: mime } : {}),
      audioBitsPerSecond: 128_000,
    });
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
    // Corte GRACIOSO: nos 45s o bloco não fecha na hora — espera um respiro
    // (~300ms de silêncio) por até CUT_GRACE_MS, para nunca cortar palavra ao
    // meio (era a maior fonte de palavras trocadas nas emendas).
    segTimerRef.current = setTimeout(() => {
      const deadline = Date.now() + CUT_GRACE_MS;
      let quietStreak = 0;
      clearCutTimer();
      cutTimerRef.current = setInterval(() => {
        quietStreak = levelRef.current < CUT_LEVEL ? quietStreak + 1 : 0;
        if (quietStreak >= 3 || Date.now() >= deadline || !activeRef.current || pausedRef.current) {
          clearCutTimer();
          try { mr.stop(); } catch {}
        }
      }, 100);
    }, SEGMENT_MS);
  };

  // Solta câmera/mic/contexto de áudio. Roda com atraso após o stop para o último
  // bloco terminar de ser empacotado.
  const cleanupStreams = () => {
    stopMeter();
    clearCutTimer();
    if (segTimerRef.current) { clearTimeout(segTimerRef.current); segTimerRef.current = null; }
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    destRef.current = null;
    analyserRef.current = null;
    recorderRef.current = null;
    mixBusRef.current = null;
    sysActiveRef.current = false;
    setSystemAudio(false);
  };

  // Encerra a sessão (parada manual ou automática por falha).
  const teardown = (msg?: { ok?: string; err?: string }) => {
    if (!activeRef.current) return;
    activeRef.current = false;
    pausedRef.current = false;
    try { localStorage.removeItem(LS_ACTIVE_KEY); } catch {}
    clearCutTimer();
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
      // Constraints de qualidade p/ transcrição: cancela eco (voz do PC voltando
      // pelo alto-falante), suprime ruído de fundo e normaliza o ganho do mic.
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
      streamsRef.current.push(micStream);

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const dest = ctx.createMediaStreamDestination();
      destRef.current = dest;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      analyserRef.current = analyser;

      // Barramento de mistura: as fontes entram aqui. O medidor/detecção de
      // silêncio lê o sinal CRU (pré-compressor) — o compressor do Chrome tem
      // makeup gain automático que descalibraria SILENCE_LEVEL/CUT_LEVEL.
      const bus = ctx.createGain();
      bus.gain.value = 1;
      bus.connect(analyser);
      mixBusRef.current = bus;

      // Compressor SUAVE só no caminho da GRAVAÇÃO: o mic (perto, alto) e a
      // voz do outro lado da chamada (longe, baixa) chegam em volumes muito
      // diferentes — nivelar é o que evita o Whisper "perder" a fala baixinha.
      // Ratio 4:1 é transparente, não distorce.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -24;
      comp.knee.value = 30;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      bus.connect(comp);
      comp.connect(dest);

      ctx.createMediaStreamSource(micStream).connect(bus);
      const micTrack = micStream.getAudioTracks()[0];
      if (micTrack) {
        micTrack.onended = () => {
          if (activeRef.current) toast.error("O microfone foi desconectado — verifique o dispositivo de áudio.");
        };
      }

      // Áudio do computador (a voz dos OUTROS sai pela caixa de som — sem isso
      // a transcrição só pega o SEU lado da conversa).
      sysActiveRef.current = false;
      setSystemAudio(false);
      const sys = await captureSystemAudio();
      if ("stream" in sys) {
        attachSystemStream(sys.stream);
      } else if (sys.error === "no-audio") {
        // O caso que antes passava em silêncio: compartilhou, mas sem áudio.
        toast.error(`O compartilhamento veio SEM áudio — gravando só o microfone. ${SYS_SHARE_HINT}`, {
          duration: 20000,
          action: { label: "Tentar de novo", onClick: () => { void addSystemAudio(); } },
        });
      } else {
        toast.message("Gravando só o microfone (áudio do PC não compartilhado).", {
          description: "Dá para adicionar depois pelo botão “+ Áudio do PC” no painel da gravação.",
        });
      }

      setInterrupted(null); // inicia nova sessão → descarta aviso de interrupção
      try { localStorage.setItem(LS_ACTIVE_KEY, JSON.stringify({ meetingId, title, startedAt: Date.now() })); } catch {}

      meetingIdRef.current = meetingId;
      // Não usamos o título como prompt do Whisper: o título automático
      // ("Reunião 03/06 11:30") contém data/hora e, em trechos silenciosos, o
      // Whisper alucina repetindo o prompt — era a origem do "11h30 11h30 11h30...".
      // Só um prompt explícito (nomes/jargões da reunião) entra como contexto.
      promptRef.current = (prompt || "").slice(0, 800);
      lastTailRef.current = ""; // contexto rolante zera a cada sessão
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
      toast.success(
        sysActiveRef.current
          ? "Gravação iniciada: microfone + áudio do PC."
          : "Gravação iniciada (só microfone).",
      );
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
    clearCutTimer();
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
        systemAudio, startSession, stopSession, pauseSession, resumeSession, addSystemAudio, subscribe, getLevel,
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

          {/* Fontes ao vivo: transparência total sobre O QUE está sendo gravado —
              a falta disso escondia gravações só-mic que pareciam completas. */}
          <div className="mt-2 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
              <Mic className="h-2.5 w-2.5" /> Microfone
            </span>
            {systemAudio ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                <Monitor className="h-2.5 w-2.5" /> Áudio do PC
              </span>
            ) : (
              <button
                onClick={() => void addSystemAudio()}
                className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] font-bold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                title="Compartilhar o áudio do computador (a voz dos outros na chamada)"
              >
                <Monitor className="h-2.5 w-2.5" /> + Áudio do PC
              </button>
            )}
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
