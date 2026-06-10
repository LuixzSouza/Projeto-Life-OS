"use client";

// Efeitos sonoros da sessão de treino — gerados via Web Audio (sem arquivos/assets),
// então não pesam no bundle e funcionam offline. Respeitam uma preferência de mudo
// persistida no localStorage. Tudo é "best-effort": se o áudio não estiver disponível
// (autoplay bloqueado antes do 1º toque, navegador sem suporte) falha em silêncio.

const MUTE_KEY = "lifeos:gym:sfx-muted";

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    // iOS/Safari suspendem o contexto até um gesto do usuário — retoma sob demanda.
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function isSfxMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSfxMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    /* ignora */
  }
}

/** Toca um tom simples. `type`/`gain` modelam o timbre. */
function tone(freq: number, durationMs: number, startOffset = 0, type: OscillatorType = "sine", peak = 0.14): void {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + startOffset;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  // Envelope rápido (ataque + decaimento) — evita clique e soa "premium".
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durationMs / 1000);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durationMs / 1000 + 0.02);
}

/** Clique sutil para ações principais (iniciar, navegar). */
export function playClick(): void {
  if (isSfxMuted()) return;
  tone(520, 70, 0, "triangle", 0.08);
}

/** Confirmação positiva ao concluir uma série (dois tons subindo). */
export function playSuccess(): void {
  if (isSfxMuted()) return;
  tone(660, 90, 0, "sine", 0.12);
  tone(880, 130, 0.09, "sine", 0.12);
}

/**
 * Fim do descanso — alarme ALTO e chamativo (timer de academia). Volume bem acima
 * dos outros efeitos (peaks ~0.6) pois compete com música/barulho da academia:
 * três bipes curtos + um bipe final mais agudo e longo. `triangle`+`square`
 * sobrepostos dão um timbre denso que "corta" melhor que uma senoide pura.
 */
export function playRestEnd(): void {
  if (isSfxMuted()) return;
  const beep = (offset: number, freq: number, dur: number, peak: number) => {
    tone(freq, dur, offset, "square", peak);
    tone(freq * 1.005, dur, offset, "triangle", peak * 0.55); // leve detune → mais "corpo"
  };
  beep(0.0, 988, 150, 0.5);
  beep(0.24, 988, 150, 0.5);
  beep(0.48, 988, 150, 0.5);
  beep(0.74, 1319, 430, 0.55); // final mais agudo e longo (chama a atenção)
}

/** Som de conclusão do treino (fanfarra curta ascendente). */
export function playFinish(): void {
  if (isSfxMuted()) return;
  tone(523, 120, 0, "sine", 0.12);
  tone(659, 120, 0.12, "sine", 0.12);
  tone(784, 120, 0.24, "sine", 0.12);
  tone(1047, 320, 0.36, "sine", 0.14);
}

/** "Aquece" o contexto de áudio num gesto do usuário (libera o autoplay no iOS). */
export function primeAudio(): void {
  audio();
}

// ---- Voz (Web Speech) — melhor esforço; sem suporte, cai pro beep. ----

function speak(text: string, rate = 1.05): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = rate;
    u.volume = 1;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

/** Contagem regressiva falada ("três… dois… um…") nos últimos segundos do descanso.
 *  Sem síntese de voz disponível, vira um beep curto por segundo. */
export function playCountdown(second: number): void {
  if (isSfxMuted()) return;
  const words: Record<number, string> = { 3: "três", 2: "dois", 1: "um" };
  const word = words[second];
  if (!word || !speak(word, 1.15)) {
    // Fallback: beep sobe de tom conforme aproxima do fim (3→1).
    tone(700 + (3 - second) * 120, 120, 0, "square", 0.35);
  }
}

/** Lembrete de hidratação (voz + beep suave). */
export function playWaterReminder(): void {
  if (isSfxMuted()) return;
  if (!speak("Hora de beber água", 1)) {
    tone(587, 140, 0, "sine", 0.18);
    tone(784, 220, 0.15, "sine", 0.18);
  }
}

// ---- Feedback tátil (independe do mudo do som — serve pra academia barulhenta /
// fone isolando o áudio). Best-effort: navegadores sem suporte ignoram. ----

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignora */
  }
}

/** Toque curto ao concluir uma série. */
export function hapticTick(): void {
  vibrate(40);
}

/** Dupla vibração ao concluir a ÚLTIMA série de um exercício. */
export function hapticExerciseDone(): void {
  vibrate([180, 90, 180]);
}

/** Vibração marcante ao zerar o cronômetro de descanso. */
export function hapticRestEnd(): void {
  vibrate([250, 120, 250]);
}
