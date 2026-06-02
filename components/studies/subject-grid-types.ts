import { StudySubject } from "@prisma/client";

export interface RichSubject extends StudySubject {
  totalMinutes: number;
  sessionCount?: number;
  lastStudied?: Date | string | null;
}

export interface SubjectListProps {
  subjects: RichSubject[];
}

export type SortOption = "totalMinutes" | "title" | "createdAt";
