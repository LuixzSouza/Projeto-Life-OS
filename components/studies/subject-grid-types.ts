import { StudySubject } from "@prisma/client";

export interface RichSubject extends StudySubject {
  totalMinutes: number;
  sessionCount?: number;
  lastStudied?: Date | string | null;
  /** Cartões vencidos nos baralhos ligados a esta matéria (revisão por matéria). */
  dueFlashcards?: number;
  /** Notas vinculadas a esta matéria (ponte Estudos -> Notas). */
  noteCount?: number;
}

export interface SubjectListProps {
  subjects: RichSubject[];
}

export type SortOption = "totalMinutes" | "title" | "createdAt";
