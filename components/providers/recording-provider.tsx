"use client";

import { createContext, useContext, useRef, useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";
import { Mic, Square, Loader2 } from "lucide-react";
import { appendMeetingTranscript } from "@/app/(dashboard)/projects/actions";

type Subscriber = (text: string) => void;

interface RecordingContextValue {
  isRecording: boolean;
  activeMeetingId: string | null;
  activeTitle: string | null;
  elapsed: number;
  transcribing: boolean;
  startSession: (meetingId: string, title: string, prompt?: string) => Promise<void>;
  stopSession: () => void;
  subscribe: (meetingId: string, cb: Subscriber) => () => void;
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

const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function RecordingProvider({ children }: { children: ReactNode }) {
  const [isRecording, setIsRecording] = useState(false);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [transcribing, setTranscribing] = useState(false);

  const streamsRef = useRef<MediaStream[]>([]);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const destRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeRef = useRef(false);
  const segTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const meetingIdRef = useRef<string | null>(null);
  const promptRef = useRef<string>("");
  const subsRef = useRef<Map<string, Subscriber>>(new Map());
  const uploadChainRef = useRef<Promise<void>>(Promise.resolve());

  const subscribe = useCallback((meetingId: string, cb: Subscriber) => {
    subsRef.current.set(meetingId, cb);
    return () => { if (subsRef.current.get(meetingId) === cb) subsRef.current.delete(meetingId); };
  }, []);

  // Entrega o trecho transcrito: para o editor aberto (se houver) ou direto ao banco.
  const routeTranscript = (meetingId: string, text: string) => {
    const sub = subsRef.current.get(meetingId);
    if (sub) sub(text);
    else void appendMeetingTranscript(meetingId, text);
  };

  const uploadSegment = async (blob: Blob, meetingId: string) => {
    if (blob.size < 1200) return; // bloco praticamente vazio
    try {
      setTranscribing(true);
      const fd = new FormData();
      fd.append("audio", blob, "segmento.webm");
      if (promptRef.current) fd.append("prompt", promptRef.current);
      const res = await fetch("/api/transcribe", { method: "POST", body: fd });
      const data = await res.json();
      if (data.success && data.transcript?.trim()) {
        routeTranscript(meetingId, data.transcript.trim());
      } else if (!data.success) {
        toast.error(data.message || "Falha ao transcrever um trecho.");
      }
    } catch {
      toast.error("Erro ao transcrever um trecho.");
    } finally {
      setTranscribing(false);
    }
  };

  const enqueueUpload = (blob: Blob, meetingId: string) => {
    uploadChainRef.current = uploadChainRef.current.then(() => uploadSegment(blob, meetingId));
  };

  const startSegment = () => {
    if (!activeRef.current || !destRef.current) return;
    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    const mr = new MediaRecorder(destRef.current.stream, mime ? { mimeType: mime } : undefined);
    chunksRef.current = [];
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const mid = meetingIdRef.current;
      if (mid) enqueueUpload(blob, mid);
      if (activeRef.current) startSegment(); // emenda o próximo bloco
    };
    mr.start();
    recorderRef.current = mr;
    segTimerRef.current = setTimeout(() => { try { mr.stop(); } catch {} }, SEGMENT_MS);
  };

  const cleanup = () => {
    if (segTimerRef.current) { clearTimeout(segTimerRef.current); segTimerRef.current = null; }
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    streamsRef.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    streamsRef.current = [];
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
    destRef.current = null;
    recorderRef.current = null;
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
      ctx.createMediaStreamSource(micStream).connect(dest);
      if (sysStream && sysStream.getAudioTracks().length > 0) {
        ctx.createMediaStreamSource(sysStream).connect(dest);
      }

      meetingIdRef.current = meetingId;
      promptRef.current = (prompt || title || "").slice(0, 800);
      activeRef.current = true;
      setActiveMeetingId(meetingId);
      setActiveTitle(title);
      setIsRecording(true);
      setElapsed(0);
      elapsedTimerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
      startSegment();
      toast.success("Gravação iniciada.");
    } catch (e) {
      console.error(e);
      toast.error("Não foi possível acessar o microfone.");
      cleanup();
      activeRef.current = false;
      setIsRecording(false);
    }
    // Lida só com refs/estáveis internamente; deps vazias são intencionais.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopSession = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    if (segTimerRef.current) { clearTimeout(segTimerRef.current); segTimerRef.current = null; }
    try { recorderRef.current?.stop(); } catch {} // dispara onstop → último upload (não reinicia)
    if (elapsedTimerRef.current) { clearInterval(elapsedTimerRef.current); elapsedTimerRef.current = null; }
    setIsRecording(false);
    setActiveMeetingId(null);
    setActiveTitle(null);
    setTimeout(cleanup, 600);
    toast.success("Gravação finalizada. Transcrevendo o último trecho...");
  }, []);

  return (
    <RecordingContext.Provider
      value={{ isRecording, activeMeetingId, activeTitle, elapsed, transcribing, startSession, stopSession, subscribe }}
    >
      {children}
      {isRecording && (
        <div className="fixed bottom-5 right-5 z-[200] w-72 rounded-2xl border border-border/60 bg-card shadow-2xl p-4 animate-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-60 animate-ping" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-rose-600" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-foreground truncate flex items-center gap-1.5">
                <Mic className="h-3.5 w-3.5 text-rose-500" /> Gravando reunião
              </p>
              <p className="text-[11px] text-muted-foreground truncate">{activeTitle}</p>
            </div>
            <span className="text-sm font-mono font-bold tabular-nums text-foreground">{fmtTime(elapsed)}</span>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              {transcribing ? <><Loader2 className="h-3 w-3 animate-spin" /> transcrevendo...</> : "captura + transcreve"}
            </span>
            <button
              onClick={stopSession}
              className="flex items-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold px-3 py-1.5 transition-colors"
            >
              <Square className="h-3 w-3 fill-current" /> Parar
            </button>
          </div>
        </div>
      )}
    </RecordingContext.Provider>
  );
}
