// Metadados visuais da Linha do Tempo (módulos e ações). Client-safe, sem
// imports de servidor — compartilhado entre o feed e o painel de insights.

import {
  ListTodo, Wallet, BookOpen, Calendar, Users, Briefcase, Shirt,
  Plus, Pencil, Trash2, CheckCircle2, RotateCcw, Activity,
  TrendingUp, TrendingDown, type LucideIcon,
} from "lucide-react";

export interface ModuleMeta {
  label: string;
  icon: LucideIcon;
  color: string; // hex
  href: string;  // rota do módulo (chip clicável)
}

export const MODULE_META: Record<string, ModuleMeta> = {
  tasks:    { label: "Tarefas",  icon: ListTodo,  color: "#6366f1", href: "/projects" },
  finance:  { label: "Finanças", icon: Wallet,    color: "#10b981", href: "/finance" },
  studies:  { label: "Estudos",  icon: BookOpen,  color: "#3b82f6", href: "/studies" },
  agenda:   { label: "Agenda",   icon: Calendar,  color: "#f59e0b", href: "/agenda" },
  social:   { label: "Social",   icon: Users,     color: "#ec4899", href: "/social" },
  projects: { label: "Projetos", icon: Briefcase, color: "#8b5cf6", href: "/projects" },
  business: { label: "Negócios", icon: Briefcase, color: "#14b8a6", href: "/business" },
  wardrobe: { label: "Closet",   icon: Shirt,     color: "#f43f5e", href: "/wardrobe" },
};

export function moduleMeta(module: string): ModuleMeta {
  return MODULE_META[module] ?? { label: module, icon: Activity, color: "#71717a", href: "/timeline" };
}

export interface ActionMeta {
  icon: LucideIcon;
  tone: string; // classes de badge
  verb: string;
}

export const ACTION_META: Record<string, ActionMeta> = {
  CREATE:   { icon: Plus,         tone: "bg-emerald-500/10 text-emerald-500", verb: "Criou" },
  UPDATE:   { icon: Pencil,       tone: "bg-blue-500/10 text-blue-500",       verb: "Atualizou" },
  DELETE:   { icon: Trash2,       tone: "bg-rose-500/10 text-rose-500",       verb: "Removeu" },
  COMPLETE: { icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-500", verb: "Concluiu" },
  REOPEN:   { icon: RotateCcw,    tone: "bg-amber-500/10 text-amber-500",     verb: "Reabriu" },
  RESTORE:  { icon: RotateCcw,    tone: "bg-amber-500/10 text-amber-500",     verb: "Restaurou" },
  INCOME:   { icon: TrendingUp,   tone: "bg-emerald-500/10 text-emerald-500", verb: "Recebeu" },
  EXPENSE:  { icon: TrendingDown, tone: "bg-rose-500/10 text-rose-500",       verb: "Pagou" },
};

export function actionMeta(action: string): ActionMeta {
  return ACTION_META[action] ?? { icon: Activity, tone: "bg-muted text-muted-foreground", verb: action };
}
