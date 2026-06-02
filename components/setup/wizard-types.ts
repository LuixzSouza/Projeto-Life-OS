import type { LucideIcon } from "lucide-react";
import { User, Cpu, Briefcase, CheckCircle2 } from "lucide-react";

export type StorageMode = "local" | "cloud";

export interface SetupFormData {
  name: string;
  email: string;
  password: string;
  bio: string;
  currency: string;
  workStart: string;
  workEnd: string;
  aiProvider: string;
  theme: string;
  storageMode: StorageMode;
  storagePath: string;
}

export interface WizardStep {
  id: number;
  label: string;
  icon: LucideIcon;
}

export const STEPS: WizardStep[] = [
  { id: 1, label: "Perfil & Acesso", icon: User },
  { id: 2, label: "Sistema & Dados", icon: Briefcase },
  { id: 3, label: "Inteligência", icon: Cpu },
  { id: 4, label: "Revisão", icon: CheckCircle2 },
];
