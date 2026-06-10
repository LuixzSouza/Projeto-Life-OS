"use client";

// Núcleo do Modo Foco: tipos, math de tempo e persistência local.
// O timer é local-first — todo o estado vive no localStorage e o tempo é
// reconstruído a partir de âncoras absolutas (epoch ms), então sobrevive a
// refresh, navegação entre páginas e ao computador dormir.

export type FocusPhase = "focus" | "short" | "long";
export type FocusMode = "POMODORO" | "STOPWATCH";

export interface FocusState {
  // Configuração (minutos)
  focusMin: number;
  shortMin: number;
  longMin: number;
  longEvery: number; // pausa longa a cada N focos

  mode: FocusMode;
  phase: FocusPhase;

  running: boolean;
  // Âncora do segmento em andamento (quando running) — epoch ms.
  phaseStartedAt: number | null;
  // Tempo já decorrido na fase atual, fora do segmento em andamento.
  accumulatedMs: number;
  // Quando o intervalo de FOCO atual começou (epoch ms) — vira o startedAt do log.
  focusStartedAt: number | null;

  focusCompleted: number; // focos concluídos desde o início da sessão

  label: string;
  taskId: string | null;
  eventId: string | null; // bloco de tempo (Event) que ancorou o foco, se houver

  open: boolean; // painel expandido?
}

export const DEFAULT_FOCUS_STATE: FocusState = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  mode: "POMODORO",
  phase: "focus",
  running: false,
  phaseStartedAt: null,
  accumulatedMs: 0,
  focusStartedAt: null,
  focusCompleted: 0,
  label: "",
  taskId: null,
  eventId: null,
  open: false,
};

// Pedido de "iniciar foco" disparado de fora do dock (ex.: ▶ Foco num bloco da
// Agenda). Gravado no localStorage + um CustomEvent acorda o dock na hora.
export interface FocusStartRequest {
  label?: string;
  taskId?: string | null;
  eventId?: string | null;
  focusMin?: number; // duração do bloco → vira o tamanho do foco (clampado no dock)
}

const START_KEY = "lifeos:focus:pending-start";
export const FOCUS_START_EVENT = "lifeos:focus:start";
/** Abre o painel do Modo Foco de qualquer lugar (disparado pelo QuickDock). */
export const FOCUS_OPEN_EVENT = "lifeos:focus:open";

export function requestFocusStart(req: FocusStartRequest): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(START_KEY, JSON.stringify(req));
    window.dispatchEvent(new CustomEvent(FOCUS_START_EVENT));
  } catch {
    /* ignora */
  }
}

export function consumeFocusStart(): FocusStartRequest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(START_KEY);
    if (!raw) return null;
    window.localStorage.removeItem(START_KEY);
    return JSON.parse(raw) as FocusStartRequest;
  } catch {
    return null;
  }
}

export interface FocusPreset {
  label: string;
  focusMin: number;
  shortMin: number;
  longMin: number;
}

export const FOCUS_PRESETS: FocusPreset[] = [
  { label: "Clássico", focusMin: 25, shortMin: 5, longMin: 15 },
  { label: "Profundo", focusMin: 50, shortMin: 10, longMin: 30 },
  { label: "Curto", focusMin: 15, shortMin: 3, longMin: 10 },
  { label: "Ultra", focusMin: 90, shortMin: 20, longMin: 30 },
];

const STORAGE_KEY = "lifeos:focus:state";

export function phaseDurationMin(s: FocusState, phase: FocusPhase): number {
  if (phase === "focus") return s.focusMin;
  if (phase === "short") return s.shortMin;
  return s.longMin;
}

// Tempo decorrido na fase atual (ms), considerando o segmento em andamento.
export function elapsedMs(s: FocusState, now: number): number {
  const live = s.running && s.phaseStartedAt != null ? now - s.phaseStartedAt : 0;
  return Math.max(0, s.accumulatedMs + live);
}

// Tempo restante na fase (ms). No cronômetro (STOPWATCH) não há alvo → null.
export function remainingMs(s: FocusState, now: number): number | null {
  if (s.mode === "STOPWATCH") return null;
  const target = phaseDurationMin(s, s.phase) * 60_000;
  return target - elapsedMs(s, now);
}

export function isPhaseComplete(s: FocusState, now: number): boolean {
  if (s.mode === "STOPWATCH") return false;
  const r = remainingMs(s, now);
  return r != null && r <= 0;
}

// Qual a próxima fase depois de um FOCO (pausa curta ou longa).
export function nextBreakPhase(s: FocusState): FocusPhase {
  const completed = s.focusCompleted + 1;
  return completed % s.longEvery === 0 ? "long" : "short";
}

export function loadFocusState(): FocusState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<FocusState>;
    // Mescla com o default para tolerar versões antigas sem algum campo.
    return { ...DEFAULT_FOCUS_STATE, ...parsed };
  } catch {
    return null;
  }
}

export function saveFocusState(s: FocusState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota — ignora */
  }
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export const PHASE_META: Record<FocusPhase, { label: string; color: string }> = {
  focus: { label: "Foco", color: "#ef4444" },
  short: { label: "Pausa curta", color: "#10b981" },
  long: { label: "Pausa longa", color: "#3b82f6" },
};

// Sinal sonoro curto via Web Audio (sem depender de arquivos de áudio).
export function playChime(kind: "focus" | "break" = "break"): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    // Foco acabou → toque ascendente; pausa acabou → toque descendente.
    const notes = kind === "focus" ? [523.25, 659.25, 783.99] : [659.25, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const t = now + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.18);
    });
    // Fecha o contexto depois do último toque.
    window.setTimeout(() => ctx.close().catch(() => {}), 800);
  } catch {
    /* navegador bloqueou áudio sem interação — ignora */
  }
}
