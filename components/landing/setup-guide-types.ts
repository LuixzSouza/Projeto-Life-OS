import type { ElementType, ReactNode } from "react";

// Tipagem dos passos
export type SetupStepKey = 'intro' | 'prerequisites' | 'commands' | 'database' | 'run';

export interface StepData {
  title: string;
  subtitle: string;
  icon: ElementType;
  content: ReactNode;
  progressLabel?: string;
}

// Ordem dos passos para navegação
export const STEP_ORDER: SetupStepKey[] = ['intro', 'prerequisites', 'commands', 'database', 'run'];
