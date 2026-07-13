import type { ElementType } from "react";
import {
  ListTodo, Wallet, BookOpen, Calendar, Users, Briefcase, Film, Bookmark,
  Shirt, Dumbbell, Link2,
} from "lucide-react";

/**
 * Mapas client-safe (sem Prisma) de ícone/rótulo por `entityType` canônico.
 * Espelham `lib/entity-resolver.ts` (server) — mantidos separados para não
 * arrastar o Prisma para os bundles de componentes client.
 */
export const ENTITY_ICON: Record<string, ElementType> = {
  task: ListTodo, note: BookOpen, transaction: Wallet, account: Wallet,
  project: Briefcase, event: Calendar, friend: Users, client: Briefcase,
  invoice: Wallet, media: Film, link: Bookmark, flashcardDeck: BookOpen,
  studySubject: BookOpen, goal: BookOpen, wardrobeItem: Shirt, workout: Dumbbell,
  meal: Dumbbell,
};

export const ENTITY_LABEL: Record<string, string> = {
  task: "Tarefa", note: "Anotação", transaction: "Transação", account: "Conta",
  project: "Projeto", event: "Evento", friend: "Conexão", client: "Cliente",
  invoice: "Fatura", media: "Mídia", link: "Link", flashcardDeck: "Baralho",
  studySubject: "Matéria", goal: "Objetivo", wardrobeItem: "Peça", workout: "Treino",
  meal: "Refeição",
};

export const FALLBACK_ICON = Link2;

/** Cor (hex) por `entityType` — usada no mapa de conexões e nas legendas. */
export const ENTITY_COLOR: Record<string, string> = {
  task: "#6366f1", note: "#0ea5e9", transaction: "#10b981", account: "#059669",
  project: "#8b5cf6", event: "#f59e0b", friend: "#ec4899", client: "#7c3aed",
  invoice: "#14b8a6", media: "#f43f5e", link: "#3b82f6", flashcardDeck: "#06b6d4",
  studySubject: "#2563eb", goal: "#f97316", wardrobeItem: "#d946ef", workout: "#ef4444",
  meal: "#84cc16",
};

const FALLBACK_COLOR = "#64748b";

export function entityColor(type: string): string {
  return ENTITY_COLOR[type] ?? FALLBACK_COLOR;
}
