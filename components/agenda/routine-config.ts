// Tipagem e configuração de categorias/dias da rotina.
import { BookOpen, Dumbbell, Home, Coffee, Briefcase, LucideIcon } from "lucide-react";

export type CategoryKey = "health" | "study" | "work" | "home" | "leisure";

export interface CategoryStyle {
  label: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export const CATEGORIES: Record<CategoryKey, CategoryStyle> = {
  health: { label: "Saúde", icon: Dumbbell, colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10", borderClass: "border-emerald-500/20" },
  study: { label: "Estudos", icon: BookOpen, colorClass: "text-blue-500", bgClass: "bg-blue-500/10", borderClass: "border-blue-500/20" },
  work: { label: "Trabalho", icon: Briefcase, colorClass: "text-violet-500", bgClass: "bg-violet-500/10", borderClass: "border-violet-500/20" },
  home: { label: "Casa", icon: Home, colorClass: "text-amber-500", bgClass: "bg-amber-500/10", borderClass: "border-amber-500/20" },
  leisure: { label: "Lazer", icon: Coffee, colorClass: "text-pink-500", bgClass: "bg-pink-500/10", borderClass: "border-pink-500/20" },
};

export const DAYS = [
  { id: "mon", label: "Segunda", short: "Seg" },
  { id: "tue", label: "Terça", short: "Ter" },
  { id: "wed", label: "Quarta", short: "Qua" },
  { id: "thu", label: "Quinta", short: "Qui" },
  { id: "fri", label: "Sexta", short: "Sex" },
  { id: "sat", label: "Sábado", short: "Sáb" },
  { id: "sun", label: "Domingo", short: "Dom" },
];
