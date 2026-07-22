// TRILHAS DE DOMÍNIO (mastery) — item D1 do docs/ESTUDOS_ROADMAP.md.
//
// Ideia roubada da Khan Academy: em vez de "quantas horas você fez", responder
// "o quanto você DOMINA esta matéria". Diferente do ELO (que mede o ritmo geral
// do aluno), o domínio é POR MATÉRIA e combina quatro sinais que o Life OS já
// registra — nenhuma tabela nova, nenhum campo novo:
//
//   1. Tempo        — horas investidas contra a meta da matéria.
//   2. Memória      — quantos flashcards da matéria já estão "maduros" (SRS).
//   3. Constância   — em quantos dias dos últimos 30 você tocou na matéria.
//   4. Objetivos    — metas de aprendizado concluídas nessa matéria.
//
// Honestidade acima de tudo: pilar SEM DADO não pontua zero (isso puniria quem
// ainda não criou flashcards) — ele sai da conta e o peso é redistribuído entre
// os demais. Módulo puro: sem Prisma, sem React, testável isoladamente.

/** Intervalo (dias) a partir do qual o SM-2 considera o cartão de longo prazo. */
export const MATURE_INTERVAL_DAYS = 21;

/** Dias ativos em 30 que valem 100% de constância (~3x por semana). */
export const CONSISTENCY_TARGET_DAYS = 12;

/** Meta de horas assumida quando a matéria não define uma (10h). */
export const DEFAULT_GOAL_MINUTES = 600;

export type MasteryPillarKey = "time" | "memory" | "consistency" | "goals";

export interface MasteryInput {
  totalMinutes: number;
  goalMinutes: number;
  /** Dias DISTINTOS com sessão nos últimos 30 dias. */
  activeDays30: number;
  cardsTotal: number;
  /** Cartões com intervalo >= MATURE_INTERVAL_DAYS. */
  cardsMature: number;
  goalsTotal: number;
  goalsDone: number;
}

export interface MasteryPillar {
  key: MasteryPillarKey;
  label: string;
  /** 0-100. Quando `available` é falso, fica 0 e não entra na média. */
  score: number;
  /** Peso nominal (antes da redistribuição). */
  weight: number;
  /** Frase curta com o número real por trás da barra. */
  detail: string;
  available: boolean;
}

export interface MasteryLevel {
  key: "exploring" | "beginner" | "practicing" | "advanced" | "mastered";
  label: string;
  /** Classe de texto/acento Tailwind. */
  accent: string;
  /** Classe de preenchimento da barra. */
  bar: string;
  /** Fundo suave do selo. */
  soft: string;
}

export interface MasteryResult {
  /** 0-100, arredondado. */
  score: number;
  level: MasteryLevel;
  pillars: MasteryPillar[];
  /** O que fazer agora para subir — deriva do elo mais fraco. */
  nextStep: string;
}

const LEVELS: { min: number; level: MasteryLevel }[] = [
  { min: 80, level: { key: "mastered", label: "Dominado", accent: "text-emerald-500", bar: "bg-emerald-500", soft: "bg-emerald-500/10" } },
  { min: 60, level: { key: "advanced", label: "Avançado", accent: "text-blue-500", bar: "bg-blue-500", soft: "bg-blue-500/10" } },
  { min: 40, level: { key: "practicing", label: "Praticando", accent: "text-violet-500", bar: "bg-violet-500", soft: "bg-violet-500/10" } },
  { min: 20, level: { key: "beginner", label: "Iniciante", accent: "text-amber-500", bar: "bg-amber-500", soft: "bg-amber-500/10" } },
  { min: 0, level: { key: "exploring", label: "Explorando", accent: "text-muted-foreground", bar: "bg-muted-foreground/50", soft: "bg-muted" } },
];

/** Nota mínima em TODO pilar com dado para o selo "Dominado" ser honesto. */
export const MASTERED_WEAK_LINK_FLOOR = 60;

/**
 * Faixa a partir da nota. `weakestPillar` (quando informado) aplica a regra do elo
 * fraco: ninguém "domina" uma matéria carregando um pilar capenga — uma média alta
 * puxada por tempo e constância, com a memória no chão, para em "Avançado". A nota
 * numérica continua sendo a média ponderada real; só o SELO é conservador.
 */
export function masteryLevel(score: number, weakestPillar?: number): MasteryLevel {
  const capped = score >= 80 && weakestPillar !== undefined && weakestPillar < MASTERED_WEAK_LINK_FLOOR
    ? 79
    : score;
  return (LEVELS.find((l) => capped >= l.min) ?? LEVELS[LEVELS.length - 1]).level;
}

const clampPct = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

/** "3h20" / "45min" — compacto o bastante para caber na legenda do pilar. */
function shortHours(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

/** Sugestão acionável para o pilar mais fraco (ou para o que falta cadastrar). */
function stepFor(pillar: MasteryPillar | undefined, input: MasteryInput): string {
  if (!pillar) return "Faça uma sessão de estudo para começar a medir seu domínio.";
  switch (pillar.key) {
    case "time":
      return `Ainda falta tempo de base: estude mais ${shortHours(Math.max(0, effectiveGoal(input) - input.totalMinutes))} para bater a meta da matéria.`;
    case "memory":
      return input.cardsTotal === 0
        ? "Crie flashcards desta matéria — sem recordação ativa o conteúdo escorre."
        : `Revise os cartões vencidos: ${input.cardsTotal - input.cardsMature} ainda não estão na memória de longo prazo.`;
    case "consistency":
      return `Constância é o que falta: você tocou nesta matéria em ${input.activeDays30} dia(s) dos últimos 30. Mire ${CONSISTENCY_TARGET_DAYS}.`;
    case "goals":
      return input.goalsTotal === 0
        ? "Defina uma meta de aprendizado para esta matéria — domínio precisa de alvo."
        : `Feche as metas em aberto: ${input.goalsTotal - input.goalsDone} ainda não foram dominadas.`;
  }
}

function effectiveGoal(input: MasteryInput): number {
  return input.goalMinutes > 0 ? input.goalMinutes : DEFAULT_GOAL_MINUTES;
}

/** Calcula o domínio de UMA matéria a partir dos sinais já registrados no app. */
export function computeMastery(input: MasteryInput): MasteryResult {
  const goal = effectiveGoal(input);

  const pillars: MasteryPillar[] = [
    {
      key: "time",
      label: "Tempo",
      weight: 0.3,
      available: true,
      score: clampPct((input.totalMinutes / goal) * 100),
      detail: `${shortHours(input.totalMinutes)} de ${shortHours(goal)}`,
    },
    {
      key: "memory",
      label: "Memória",
      weight: 0.3,
      available: input.cardsTotal > 0,
      score: input.cardsTotal > 0 ? clampPct((input.cardsMature / input.cardsTotal) * 100) : 0,
      detail: input.cardsTotal > 0
        ? `${input.cardsMature} de ${input.cardsTotal} cartões maduros`
        : "sem flashcards ainda",
    },
    {
      key: "consistency",
      label: "Constância",
      weight: 0.2,
      available: true,
      score: clampPct((input.activeDays30 / CONSISTENCY_TARGET_DAYS) * 100),
      detail: `${input.activeDays30} dia(s) ativos em 30`,
    },
    {
      key: "goals",
      label: "Objetivos",
      weight: 0.2,
      available: input.goalsTotal > 0,
      score: input.goalsTotal > 0 ? clampPct((input.goalsDone / input.goalsTotal) * 100) : 0,
      detail: input.goalsTotal > 0
        ? `${input.goalsDone} de ${input.goalsTotal} metas concluídas`
        : "sem metas ainda",
    },
  ];

  // Média ponderada só sobre os pilares com dado — pesos redistribuídos.
  const active = pillars.filter((p) => p.available);
  const totalWeight = active.reduce((sum, p) => sum + p.weight, 0);
  const score = totalWeight > 0
    ? clampPct(active.reduce((sum, p) => sum + p.score * p.weight, 0) / totalWeight)
    : 0;

  // Próximo passo: o elo mais fraco entre os pilares COM dado; se todos estão
  // fortes, aponta o pilar que sequer existe (criar cards / definir meta).
  const weakest = [...active].sort((a, b) => a.score - b.score)[0];
  const missing = pillars.find((p) => !p.available);
  const target = weakest && weakest.score < 100 ? weakest : missing ?? weakest;

  const level = masteryLevel(score, weakest?.score);

  return {
    score,
    level,
    pillars,
    nextStep: level.key === "mastered" && score >= 100
      ? "Matéria dominada. Mantenha as revisões para não perder o terreno."
      : stepFor(target, input),
  };
}
