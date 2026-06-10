"use client";

// Modo voz (#8 do roadmap de IA): ditado via Web Speech API (SpeechRecognition,
// pt-BR) + leitura opcional das respostas (speechSynthesis). Sem dependências —
// recursos nativos do navegador, com degradação graciosa: onde não há suporte
// (ex.: Firefox), o microfone simplesmente não aparece.

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/* ----------------------------------------------------------------------------
   Tipagens mínimas da Web Speech API (não fazem parte do lib.dom padrão)
   ---------------------------------------------------------------------------- */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionErrorLike {
  error?: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SpeechRecognitionErrorLike) => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* ----------------------------------------------------------------------------
   Ditado — useSpeechInput

   Por que tem keep-alive: o Chrome encerra o SpeechRecognition sozinho (~60s
   de fala contínua ou alguns segundos de silêncio). Sem religar, o microfone
   "morre" calado — o usuário continua falando para o nada. Aqui a INTENÇÃO do
   usuário (wantRef) sobrevive aos ciclos do navegador e religamos no onend.

   Guardas de sessão longa (alguém ditando por uma hora):
   - inatividade: ~2 min sem fala → desliga sozinho e avisa;
   - reinícios em silêncio: vários ciclos seguidos sem nenhum resultado → desliga;
   - teto de caracteres por sessão → pausa e pede para revisar/enviar;
   - erros viram toast (permissão negada, sem microfone, sem suporte) em vez
     de falha silenciosa — era o "cliquei, falei e nada acontece".
   ---------------------------------------------------------------------------- */

const IDLE_STOP_MS = 2 * 60_000;      // silêncio prolongado → desliga
const SESSION_CHAR_LIMIT = 8000;      // teto de texto confirmado por sessão
const MAX_SILENT_RESTARTS = 6;        // ciclos seguidos sem resultado → desliga
const RESTART_DELAY_MS = 250;

/** Formata segundos de gravação como m:ss (ex.: 1:07). */
export function formatListenClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function useSpeechInput(onText: (text: string) => void): {
  supported: boolean;
  listening: boolean;
  /** Transcrição parcial ao vivo (o que está sendo dito, ainda não confirmado). */
  interim: string;
  /** Segundos de microfone aberto na sessão atual (0 quando parado). */
  seconds: number;
  toggle: () => void;
  stop: () => void;
} {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [seconds, setSeconds] = useState(0);

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);            // intenção do usuário (atravessa os ciclos do Chrome)
  const charsRef = useRef(0);               // caracteres confirmados na sessão
  const silentRestartsRef = useRef(0);      // reinícios consecutivos sem nenhum resultado
  const lastSpeechRef = useRef(0);
  const restartTimerRef = useRef<number | null>(null);
  const networkErrorsRef = useRef(0);       // erros "network" seguidos → serviço indisponível
  const gotResultRef = useRef(false);       // algum resultado (mesmo parcial) já chegou?
  const muteHintShownRef = useRef(false);   // aviso único de "nada chega do microfone"

  // Callback sempre atual sem reinstanciar o reconhecedor.
  const onTextRef = useRef(onText);
  useEffect(() => { onTextRef.current = onText; }, [onText]);

  // Detecção só no client (evita mismatch de hidratação). Adiada para fora do
  // corpo do effect (regra react-hooks/set-state-in-effect).
  useEffect(() => {
    const id = window.setTimeout(() => setSupported(getRecognitionCtor() != null), 0);
    return () => window.clearTimeout(id);
  }, []);

  // Encerramento definitivo (intenção do usuário ou guarda automática).
  const finish = useCallback((notice?: string) => {
    wantRef.current = false;
    if (restartTimerRef.current != null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    recRef.current?.stop();
    setListening(false);
    setInterim("");
    setSeconds(0);
    if (notice) toast.info(notice);
  }, []);

  // O keep-alive (onend) precisa religar a função que o criou — via ref para
  // não autorreferenciar o useCallback antes da declaração.
  const spinUpRef = useRef<() => void>(() => {});

  // (Re)liga uma instância do reconhecedor — chamada no início e no keep-alive.
  const spinUp = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recRef.current || !wantRef.current) return;
    const rec = new Ctor();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true; // feedback ao vivo enquanto fala
    rec.onresult = (e) => {
      let final = "";
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else partial += r[0].transcript;
      }
      lastSpeechRef.current = Date.now();
      silentRestartsRef.current = 0;
      networkErrorsRef.current = 0;
      gotResultRef.current = true;
      setInterim(partial.trim());
      const clean = final.trim();
      if (clean) {
        charsRef.current += clean.length + 1;
        onTextRef.current(clean);
        if (charsRef.current >= SESSION_CHAR_LIMIT) {
          finish("Ditado pausado: o texto já está bem longo — revise e envie antes de continuar.");
        }
      }
    };
    rec.onerror = (e) => {
      const code = e?.error ?? "";
      if (code === "not-allowed" || code === "service-not-allowed") {
        finish("Sem permissão para usar o microfone — libere o acesso nas configurações do navegador.");
      } else if (code === "audio-capture") {
        finish("Nenhum microfone encontrado neste aparelho.");
      } else if (code === "language-not-supported") {
        finish("Este navegador não reconhece fala em português — tente o Chrome ou o Edge.");
      } else if (code === "network") {
        // O reconhecimento do Chrome usa servidores do Google. Sem internet —
        // ou em navegadores sem o serviço (Brave/Opera/forks) — ele falha em
        // loop "ouvindo sem transcrever". Avisa em vez de ficar mudo.
        networkErrorsRef.current += 1;
        if (networkErrorsRef.current >= 2) {
          finish("O serviço de voz do navegador não respondeu. Confira a internet — e note que alguns navegadores (Brave, Opera) não oferecem reconhecimento de fala; use Chrome ou Edge.");
        }
      }
      // "no-speech" / "aborted": transitórios — o onend religa.
    };
    rec.onend = () => {
      recRef.current = null;
      if (wantRef.current) {
        silentRestartsRef.current += 1;
        if (silentRestartsRef.current > MAX_SILENT_RESTARTS) {
          finish("Microfone desligado: não detectei fala por um bom tempo.");
          return;
        }
        restartTimerRef.current = window.setTimeout(() => spinUpRef.current(), RESTART_DELAY_MS);
        return;
      }
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    try {
      rec.start();
    } catch {
      // start() pode lançar (instância anterior ainda fechando) — solta esta
      // e tenta de novo em instantes, respeitando o teto de reinícios.
      recRef.current = null;
      silentRestartsRef.current += 1;
      if (silentRestartsRef.current > MAX_SILENT_RESTARTS) {
        finish("Não consegui iniciar o microfone — tente de novo.");
        return;
      }
      restartTimerRef.current = window.setTimeout(() => spinUpRef.current(), RESTART_DELAY_MS);
    }
  }, [finish]);
  useEffect(() => { spinUpRef.current = spinUp; }, [spinUp]);

  const start = useCallback(() => {
    if (wantRef.current) return;
    wantRef.current = true;
    charsRef.current = 0;
    silentRestartsRef.current = 0;
    networkErrorsRef.current = 0;
    gotResultRef.current = false;
    muteHintShownRef.current = false;
    lastSpeechRef.current = Date.now();
    setListening(true);
    setSeconds(0);
    spinUp();
  }, [spinUp]);

  const stop = useCallback(() => { finish(); }, [finish]);

  // Cronômetro da sessão + guarda de inatividade (o reset do contador
  // acontece em start/finish — handlers — pela regra set-state-in-effect).
  useEffect(() => {
    if (!listening) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setSeconds(elapsed);
      // 10s ouvindo sem NENHUM resultado (nem parcial) = áudio não está
      // chegando — dispositivo de entrada errado/mudo. Dica única, segue ouvindo.
      if (elapsed >= 10 && !gotResultRef.current && !muteHintShownRef.current) {
        muteHintShownRef.current = true;
        toast.info("Estou ouvindo, mas nada chega do microfone — confira o dispositivo de entrada no navegador/Windows e fale mais perto.");
      }
      if (Date.now() - lastSpeechRef.current > IDLE_STOP_MS) {
        finish("Microfone desligado após 2 minutos de silêncio.");
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [listening, finish]);

  // Encerra o microfone ao desmontar.
  useEffect(() => () => {
    wantRef.current = false;
    if (restartTimerRef.current != null) window.clearTimeout(restartTimerRef.current);
    recRef.current?.stop();
  }, []);

  const toggle = useCallback(() => {
    if (wantRef.current) stop();
    else start();
  }, [start, stop]);

  return { supported, listening, interim, seconds, toggle, stop };
}

/* ----------------------------------------------------------------------------
   Leitura em voz alta — speakText / useVoiceReply
   ---------------------------------------------------------------------------- */

/** Remove a sintaxe markdown para a voz não ler asteriscos e cercas. */
function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, " (trecho de código omitido) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_#>|~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function ttsSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function speakText(markdown: string): void {
  if (!ttsSupported()) return;
  const text = plainText(markdown);
  if (!text) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text.slice(0, 1200));
  utter.lang = "pt-BR";
  utter.rate = 1.05;
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking(): void {
  if (ttsSupported()) window.speechSynthesis.cancel();
}

const VOICE_REPLY_KEY = "lifeos-ai-voice-reply";

/** Preferência "ler respostas em voz alta" (persistida no aparelho). */
export function useVoiceReply(): { available: boolean; enabled: boolean; toggle: () => void } {
  const [available, setAvailable] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setAvailable(ttsSupported());
      try { setEnabled(localStorage.getItem(VOICE_REPLY_KEY) === "1"); } catch { /* noop */ }
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem(VOICE_REPLY_KEY, next ? "1" : "0"); } catch { /* noop */ }
      if (!next) stopSpeaking();
      return next;
    });
  }, []);

  return { available, enabled, toggle };
}
