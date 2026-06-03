import type { LucideIcon } from "lucide-react";
import {
  User,
  Cpu,
  Briefcase,
  CheckCircle2,
  HardDrive,
  Cloud,
  Database,
  Server,
  Leaf,
  Zap,
  Sparkles,
  BrainCircuit,
} from "lucide-react";

export type StorageMode = "local" | "cloud";

/** Identificadores dos provedores de banco exibidos no wizard. */
export type DbProviderId =
  | "turso"
  | "local"
  | "postgres"
  | "supabase"
  | "mysql"
  | "mongodb";

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
  // Card de banco selecionado no wizard (controla a UI).
  dbProvider: DbProviderId;
  // Derivado de dbProvider; é o que a Server Action consome.
  storageMode: StorageMode;
  storagePath: string;
  tursoUrl: string;
  tursoToken: string;
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

// =========================================================
// PROVEDORES DE BANCO DE DADOS
// =========================================================
export interface DbProviderMeta {
  id: DbProviderId;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  /** true = funcional agora. false = card visível, mas desabilitado (Em breve). */
  available: boolean;
  /** Só faz sentido no app desktop (acesso ao sistema de arquivos). */
  desktopOnly?: boolean;
  badge?: string;
  /** Classe Tailwind de cor de destaque (texto/ícone). */
  accent: string;
}

export const DB_PROVIDERS: DbProviderMeta[] = [
  {
    id: "turso",
    name: "Turso",
    tagline: "SQLite na nuvem (libSQL)",
    description:
      "Banco SQLite distribuído, rápido e com plano grátis generoso. Ideal para deploy web (Vercel) e sincronização entre dispositivos.",
    icon: Cloud,
    available: true,
    badge: "Recomendado",
    accent: "text-emerald-500",
  },
  {
    id: "local",
    name: "Pasta Local",
    tagline: "Arquivo SQLite no seu PC",
    description:
      "Seus dados num único arquivo .db no seu computador. Privacidade total e portátil. Disponível apenas no app desktop.",
    icon: HardDrive,
    available: true,
    desktopOnly: true,
    badge: "Desktop",
    accent: "text-sky-500",
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    tagline: "Banco relacional robusto",
    description:
      "O banco relacional open-source mais popular do mundo. Ótimo para grandes volumes e consultas complexas.",
    icon: Server,
    available: false,
    badge: "Em breve",
    accent: "text-indigo-500",
  },
  {
    id: "supabase",
    name: "Supabase",
    tagline: "Postgres gerenciado + Auth",
    description:
      "Plataforma open-source sobre Postgres, com painel, backups e API automática. Integração planejada.",
    icon: Leaf,
    available: false,
    badge: "Em breve",
    accent: "text-green-500",
  },
  {
    id: "mysql",
    name: "MySQL",
    tagline: "Relacional clássico",
    description:
      "Banco relacional consagrado, presente na maioria das hospedagens. Suporte planejado.",
    icon: Database,
    available: false,
    badge: "Em breve",
    accent: "text-orange-500",
  },
  {
    id: "mongodb",
    name: "MongoDB",
    tagline: "Banco de documentos (NoSQL)",
    description:
      "Banco NoSQL orientado a documentos. Requer um modelo de dados diferente — em estudo para versões futuras.",
    icon: Leaf,
    available: false,
    badge: "Em breve",
    accent: "text-lime-600",
  },
];

// =========================================================
// PROVEDORES DE IA (Cérebro Digital)
// =========================================================
export interface AiProviderMeta {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: LucideIcon;
  badge: string;
  badgeClass: string;
  /** O que o usuário precisa para usar. */
  needs: string;
  available: boolean;
}

export const AI_PROVIDERS: AiProviderMeta[] = [
  {
    id: "ollama",
    name: "Local (Ollama)",
    tagline: "100% offline e privado",
    description:
      "Roda modelos de IA direto no seu computador. Nada sai da sua máquina — privacidade máxima e sem custo por uso.",
    icon: HardDrive,
    badge: "OFFLINE",
    badgeClass: "bg-emerald-500/10 text-emerald-600",
    needs: "Requer o app Ollama instalado (ollama.com) e um modelo baixado (ex: llama3).",
    available: true,
  },
  {
    id: "openai",
    name: "OpenAI (GPT)",
    tagline: "O mais inteligente",
    description:
      "Modelos GPT-4o/4.1 da OpenAI. Respostas mais precisas e criativas, ótimo para tarefas complexas.",
    icon: Sparkles,
    badge: "NUVEM",
    badgeClass: "bg-blue-500/10 text-blue-600",
    needs: "Requer uma chave de API (platform.openai.com) e internet. Cobrança por uso.",
    available: true,
  },
  {
    id: "groq",
    name: "Groq",
    tagline: "Altíssima velocidade",
    description:
      "Roda modelos abertos (Llama, Mixtral) com velocidade absurda de resposta. Tem um plano grátis generoso.",
    icon: Zap,
    badge: "RÁPIDO",
    badgeClass: "bg-amber-500/10 text-amber-600",
    needs: "Requer uma chave de API grátis (console.groq.com) e internet.",
    available: true,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    tagline: "Equilíbrio e contexto longo",
    description:
      "Modelos Gemini do Google, com janela de contexto enorme e bom custo-benefício. Tem camada gratuita.",
    icon: BrainCircuit,
    badge: "NUVEM",
    badgeClass: "bg-violet-500/10 text-violet-600",
    needs: "Requer uma chave de API (aistudio.google.com) e internet.",
    available: true,
  },
];
