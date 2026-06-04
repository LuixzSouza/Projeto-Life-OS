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
