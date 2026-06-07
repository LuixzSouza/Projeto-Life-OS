// Tipos de Importação JSON (Mapeia a estrutura do arquivo de backup).
// Usamos 'Partial' porque o JSON pode não ter todos os campos do banco atual.
import {
  Project, Account, Task, Transaction, StudySubject, StudySession,
  Workout, HealthMetric, Event, ManagedSite, SitePage, Flashcard,
  FlashcardDeck, AccessItem, AiMessage, User, Settings, JobApplication,
  SavedLink, Portfolio, Challenge, ChallengeCheckin
} from "@prisma/client";

export type ProjectJSON = Partial<Project> & { tasks?: Partial<Task>[]; events?: Partial<Event>[]; };
export type AccountJSON = Partial<Account> & { transactions?: Partial<Transaction>[]; };
export type SubjectJSON = Partial<StudySubject> & { sessions?: Partial<StudySession>[]; };
export type SiteJSON = Partial<ManagedSite> & { pages?: Partial<SitePage>[]; };
export type ChallengeJSON = Partial<Challenge> & { checkins?: Partial<ChallengeCheckin>[]; };
// A categoria existe no JSON antigo mas não no banco novo, então definimos aqui para ler sem erro
export type DeckJSON = Partial<FlashcardDeck> & { cards?: Partial<Flashcard>[]; category?: string };

export interface BackupData {
  meta?: { system: string; version?: string; date?: string };
  user?: Partial<User>;
  settings?: Partial<Settings>;
  accounts?: AccountJSON[];
  projects?: ProjectJSON[];
  tasksWithoutProject?: Partial<Task>[];
  jobApplications?: Partial<JobApplication>[];
  studySubjects?: SubjectJSON[];
  flashcardDecks?: DeckJSON[];
  workouts?: Partial<Workout>[];
  healthMetrics?: Partial<HealthMetric>[];
  events?: Partial<Event>[];
  sites?: SiteJSON[];
  accessItems?: Partial<AccessItem>[];
  aiMessages?: Partial<AiMessage>[];
  savedLinks?: Partial<SavedLink>[];
  portfolio?: Partial<Portfolio> | null;
  challenges?: ChallengeJSON[];
}
