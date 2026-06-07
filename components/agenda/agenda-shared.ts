// Tipos e metadados compartilhados da Agenda unificada.
// Sem imports de servidor (pode ser usado no cliente).

export type AgendaSource =
  | "event"
  | "meal"
  | "workout"
  | "study"
  | "sleep"
  | "body"
  | "media"
  | "wardrobe"
  | "friend"
  | "birthday"
  | "finance"
  | "job"
  | "task"
  | "challenge"
  | "meeting"
  | "invoice"
  | "recurring"
  | "charge"
  | "review"
  | "goal"
  | "holiday";

export type AgendaIconKey =
  | "calendar" | "utensils" | "dumbbell" | "book" | "moon" | "scale"
  | "film" | "shirt" | "userplus" | "cake" | "wallet" | "briefcase"
  | "check" | "flame" | "users" | "receipt" | "repeat" | "layers" | "target" | "party" | "handcoins";

export interface CategoryMeta {
  label: string;
  color: string;     // hex
  icon: AgendaIconKey;
}

// Cada origem de dado vira uma "categoria" com cor e ícone próprios.
export const CATEGORY_META: Record<AgendaSource, CategoryMeta> = {
  event:     { label: "Eventos",        color: "#6366f1", icon: "calendar" },
  meal:      { label: "Nutrição",       color: "#10b981", icon: "utensils" },
  workout:   { label: "Treino",         color: "#f97316", icon: "dumbbell" },
  study:     { label: "Estudos",        color: "#3b82f6", icon: "book" },
  sleep:     { label: "Sono",           color: "#8b5cf6", icon: "moon" },
  body:      { label: "Corpo",          color: "#06b6d4", icon: "scale" },
  media:     { label: "Entretenimento", color: "#a855f7", icon: "film" },
  wardrobe:  { label: "Closet",         color: "#ec4899", icon: "shirt" },
  friend:    { label: "Conexões",       color: "#f43f5e", icon: "userplus" },
  birthday:  { label: "Aniversários",   color: "#f59e0b", icon: "cake" },
  finance:   { label: "Financeiro",     color: "#16a34a", icon: "wallet" },
  job:       { label: "Vagas",          color: "#0ea5e9", icon: "briefcase" },
  task:      { label: "Tarefas",        color: "#eab308", icon: "check" },
  challenge: { label: "Desafios",       color: "#ef4444", icon: "flame" },
  meeting:   { label: "Reuniões",       color: "#818cf8", icon: "users" },
  invoice:   { label: "Cobranças",      color: "#0d9488", icon: "receipt" },
  recurring: { label: "Contas fixas",   color: "#d97706", icon: "repeat" },
  charge:    { label: "Cobranças fixas", color: "#059669", icon: "handcoins" },
  review:    { label: "Revisões",        color: "#4338ca", icon: "layers" },
  goal:      { label: "Metas",           color: "#0891b2", icon: "target" },
  holiday:   { label: "Feriados",        color: "#db2777", icon: "party" },
};

export interface AgendaItem {
  id: string;
  source: AgendaSource;
  title: string;
  subtitle?: string;
  meta?: string;        // valor à direita (kcal, R$, min...)
  date: string;         // ISO
  time: string | null;  // "HH:mm" ou null (dia inteiro)
  color: string;        // hex (pode sobrescrever a cor da categoria)
}

// A ordem define a exibição dos chips de filtro.
export const SOURCE_ORDER: AgendaSource[] = [
  "event", "holiday", "task", "meal", "workout", "study", "review", "sleep", "body",
  "finance", "invoice", "recurring", "charge", "job", "media", "wardrobe", "friend", "birthday", "challenge", "meeting", "goal",
];
