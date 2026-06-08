import { JobApplication } from "@prisma/client";

// Evento de estágio (timeline do funil).
export interface JobEventLite {
  status: string;
  createdAt: Date;
}

// Vaga com o projeto vinculado (quando houver) — usado em toda a UI do tracker.
export type JobWithProject = JobApplication & {
  project: { id: string; slug: string; title: string } | null;
  events?: JobEventLite[];
};

// Opção enxuta de projeto para o seletor de vínculo.
export interface ProjectOption {
  id: string;
  title: string;
  slug: string;
}
