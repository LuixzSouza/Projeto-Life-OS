// Templates de desafios prontos para iniciar com 1 clique.
export interface ChallengeTemplate {
  key: string;
  title: string;
  description: string;
  category: "STRENGTH" | "CARDIO" | "MOBILITY" | "HABIT";
  durationDays: number;
  color: string;
  emoji: string;
}

export const CHALLENGE_TEMPLATES: ChallengeTemplate[] = [
  {
    key: "pushup-30",
    title: "30 Dias de Flexões",
    description: "Aumente as repetições progressivamente ao longo de 30 dias.",
    category: "STRENGTH",
    durationDays: 30,
    color: "#ef4444",
    emoji: "💪",
  },
  {
    key: "squat-30",
    title: "Desafio do Agachamento",
    description: "30 dias construindo força e resistência nas pernas.",
    category: "STRENGTH",
    durationDays: 30,
    color: "#f59e0b",
    emoji: "🦵",
  },
  {
    key: "core-30",
    title: "Core 30 Dias",
    description: "Prancha e abdominais diários para um core de aço.",
    category: "STRENGTH",
    durationDays: 30,
    color: "#8b5cf6",
    emoji: "🔥",
  },
  {
    key: "run-21",
    title: "Corrida 21 Dias",
    description: "Crie o hábito de correr todos os dias por 3 semanas.",
    category: "CARDIO",
    durationDays: 21,
    color: "#3b82f6",
    emoji: "🏃",
  },
  {
    key: "mobility-14",
    title: "Mobilidade 14 Dias",
    description: "Alongamento e mobilidade para recuperar amplitude.",
    category: "MOBILITY",
    durationDays: 14,
    color: "#10b981",
    emoji: "🧘",
  },
  {
    key: "fullbody-28",
    title: "Full Body 4 Semanas",
    description: "Treino de corpo inteiro 4x por semana durante 28 dias.",
    category: "STRENGTH",
    durationDays: 28,
    color: "#6366f1",
    emoji: "🏋️",
  },
];

export const CATEGORY_LABELS: Record<string, string> = {
  STRENGTH: "Força",
  CARDIO: "Cardio",
  MOBILITY: "Mobilidade",
  HABIT: "Hábito",
};
