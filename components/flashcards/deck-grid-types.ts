// Tipos do grid de baralhos (flashcards).
import { FlashcardDeck, StudySubject } from "@prisma/client";

export type DeckCardLite = {
  id: string;
  box: number;
  nextReview: Date | string | null;
};

export type DeckWithCount = FlashcardDeck & {
  cards: DeckCardLite[];
  studySubject?: {
    id: string;
    title: string;
    color?: string | null;
    icon?: string | null
  } | null;
};

/** Filtra os cartões vencidos (devidos hoje ou sem agendamento). */
export function filterDue<T extends { nextReview: Date | string | null }>(cards: T[]): T[] {
  const now = Date.now();
  return cards.filter((c) => !c.nextReview || new Date(c.nextReview).getTime() <= now);
}

/** Conta cartões vencidos (devidos hoje) num baralho. */
export function countDue(cards: DeckCardLite[]): number {
  return filterDue(cards).length;
}

export interface DeckGridProps {
  decks: DeckWithCount[];
  subjects?: StudySubject[];
}
