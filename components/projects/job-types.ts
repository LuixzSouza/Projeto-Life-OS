import { JobApplication } from "@prisma/client";
import type { ResumeSnapshotMeta } from "@/types/resume-snapshot";

// Evento de estágio (timeline do funil).
export interface JobEventLite {
  status: string;
  createdAt: Date;
}

// Vaga com o projeto vinculado (quando houver) — usado em toda a UI do tracker.
// `resumeSnapshot` chega SEMPRE null ao client (o JSON pesado fica no servidor);
// a lista usa só `snapshotMeta` (leve). O snapshot completo é buscado sob demanda
// via getJobResumeSnapshot() na hora de baixar o PDF exato.
export type JobWithProject = JobApplication & {
  project: { id: string; slug: string; title: string } | null;
  events?: JobEventLite[];
  snapshotMeta?: ResumeSnapshotMeta | null;
};

// Opção enxuta de projeto para o seletor de vínculo.
export interface ProjectOption {
  id: string;
  title: string;
  slug: string;
}
