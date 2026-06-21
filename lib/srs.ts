// =============================================================================
// MOTOR DE REPETIÇÃO ESPAÇADA (SRS) — SM-2 adaptado + reaprendizado
// =============================================================================
// Função PURA (sem I/O, sem "use server") para ser usada nos DOIS lados:
//   • Servidor: app/(dashboard)/flashcards/actions.ts grava o agendamento.
//   • Cliente: components/flashcards/study-session.tsx mostra a PRÉVIA do
//     intervalo em cada botão ("Errei · 10 min", "Bom · 4 dias") antes do clique.
// Manter um único cálculo dos dois lados garante que a prévia bata com o que
// realmente é gravado — nada de divergência sutil entre tela e banco.
// =============================================================================

export type ReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

/** Campos do cartão que alimentam o agendamento. */
export interface SrsCardState {
  /** Repetições corretas seguidas (Leitner). Reseta para 1 ao errar. Alimenta a
   * barra de "domínio" do baralho (box >= 4 = dominado). */
  box: number;
  /** Fator de facilidade SM-2 (quanto maior, mais rápido o intervalo cresce). */
  easeFactor: number;
  /** Intervalo atual em DIAS (0 = aprendizado/reaprendizado no mesmo dia). */
  interval: number;
}

/** Resultado pronto para gravar no banco. */
export interface SrsSchedule {
  box: number;
  easeFactor: number;
  interval: number;
  nextReview: Date;
}

const MINUTE = 60_000;
const DAY = 86_400_000;

const EASE_MIN = 1.3; // piso clássico do SM-2 (abaixo disso vira "inferno de revisão")
const EASE_MAX = 3.0;
const LAPSE_STEP_MIN = 10; // ao errar, o cartão volta em ~10 min na mesma sessão
const HARD_MULT = 1.2; // "Difícil" cresce devagar
const EASY_BONUS = 1.3; // "Fácil" ganha um empurrão extra sobre o fator de facilidade

function clampEase(ef: number): number {
  return Math.max(EASE_MIN, Math.min(EASE_MAX, Number(ef.toFixed(2))));
}

/**
 * Calcula o próximo agendamento de um cartão a partir da nota do usuário.
 * Determinístico: mesma entrada → mesma saída (recebe `now` para a prévia bater).
 */
export function scheduleReview(
  card: SrsCardState,
  rating: ReviewRating,
  now: Date = new Date(),
): SrsSchedule {
  const { box, interval } = card;
  let easeFactor = card.easeFactor || 2.5;

  // ERREI: o cartão "cai" para reaprendizado e reaparece no mesmo dia. A
  // facilidade leva uma penalidade — cartões que falham passam a crescer devagar.
  if (rating === "AGAIN") {
    return {
      box: 1,
      easeFactor: clampEase(easeFactor - 0.2),
      interval: 0,
      nextReview: new Date(now.getTime() + LAPSE_STEP_MIN * MINUTE),
    };
  }

  // Acerto: ajusta a facilidade conforme o esforço relatado.
  if (rating === "HARD") easeFactor = clampEase(easeFactor - 0.15);
  else if (rating === "EASY") easeFactor = clampEase(easeFactor + 0.15);

  let days: number;
  if (box <= 1) {
    // Primeira graduação (cartão novo ou recém-reaprendido).
    days = rating === "HARD" ? 1 : rating === "GOOD" ? 2 : 4;
  } else if (box === 2) {
    // Segunda graduação: passos fixos antes de soltar o multiplicador.
    days = rating === "HARD" ? 3 : rating === "GOOD" ? 6 : 10;
  } else {
    // Regime SM-2: intervalo escala pelo fator de facilidade, modulado pela nota.
    const mult =
      rating === "HARD" ? HARD_MULT : rating === "GOOD" ? easeFactor : easeFactor * EASY_BONUS;
    // Garante crescimento de pelo menos 1 dia (nunca encolhe num acerto).
    days = Math.max(interval + 1, Math.round(interval * mult));
  }

  return {
    box: box + 1,
    easeFactor,
    interval: days,
    nextReview: new Date(now.getTime() + days * DAY),
  };
}

/**
 * Rótulo curto em pt-BR de "daqui a quanto tempo" o cartão volta — para a prévia
 * nos botões. Ex.: "10 min", "1 dia", "4 dias", "2 sem", "3 meses".
 */
export function formatInterval(nextReview: Date, now: Date = new Date()): string {
  const ms = nextReview.getTime() - now.getTime();
  if (ms < 45 * MINUTE) {
    const mins = Math.max(1, Math.round(ms / MINUTE));
    return `${mins} min`;
  }
  if (ms < DAY) {
    const hours = Math.round(ms / (60 * MINUTE));
    return `${hours} h`;
  }
  const days = Math.round(ms / DAY);
  if (days < 7) return `${days} ${days === 1 ? "dia" : "dias"}`;
  if (days < 30) return `${Math.round(days / 7)} sem`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} ${months === 1 ? "mês" : "meses"}`;
  }
  const years = Math.round(days / 365);
  return `${years} ${years === 1 ? "ano" : "anos"}`;
}

/** Atalho: rótulo da prévia para uma nota, sem expor o agendamento inteiro. */
export function previewLabel(
  card: SrsCardState,
  rating: ReviewRating,
  now: Date = new Date(),
): string {
  return formatInterval(scheduleReview(card, rating, now).nextReview, now);
}
