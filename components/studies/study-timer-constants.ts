// Tipos e constantes do timer de estudos (Pomodoro).

export type SessionType = "LEITURA" | "VIDEO" | "EXERCICIO" | "REVISAO" | "PROJETO" | "PRATICA";

export const SESSION_TYPE_OPTIONS: { value: SessionType; label: string; icon: string }[] = [
  { value: "LEITURA", label: "Leitura", icon: "📖" },
  { value: "VIDEO", label: "Vídeo/Aula", icon: "🎬" },
  { value: "EXERCICIO", label: "Exercícios", icon: "✏️" },
  { value: "REVISAO", label: "Revisão", icon: "🔄" },
  { value: "PROJETO", label: "Projeto", icon: "🔨" },
  { value: "PRATICA", label: "Prática", icon: "🎯" },
];

export const POMODORO_PRESETS = {
  CLASSIC: { focus: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60, cycles: 4 },
  DEEP_WORK: { focus: 52 * 60, shortBreak: 17 * 60, longBreak: 30 * 60, cycles: 3 },
  ULTRA_FOCUS: { focus: 90 * 60, shortBreak: 10 * 60, longBreak: 20 * 60, cycles: 2 },
  QUICK: { focus: 15 * 60, shortBreak: 3 * 60, longBreak: 10 * 60, cycles: 5 },
} as const;

export type PomodoroPreset = keyof typeof POMODORO_PRESETS;

export const STUDY_TIPS = [
  "Técnica Pomodoro: 25min foco, 5min pausa. Após 4 ciclos, faça uma pausa longa.",
  "Estudo ativo > estudo passivo. Faça perguntas, resuma, explique em voz alta.",
  "Intercale matérias diferentes para evitar fadiga mental.",
  "Revise o conteúdo 24h depois para fixar na memória de longo prazo.",
  "Use a técnica Feynman: explique como se estivesse ensinando uma criança.",
  "Beba água! A desidratação reduz a concentração em até 30%.",
];
