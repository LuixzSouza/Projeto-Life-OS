import { ShieldCheck, Hash, Briefcase, Key } from "lucide-react";
import type { ElementType } from "react";

export type CategoryKey = "FINANCE" | "SOCIAL" | "WORK" | "OTHERS";

export const CATEGORY_CONFIG: Record<CategoryKey, { icon: ElementType; color: string; bg: string; label: string }> = {
  FINANCE: { icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Financeiro" },
  SOCIAL: { icon: Hash, color: "text-blue-500", bg: "bg-blue-500/10", label: "Social" },
  WORK: { icon: Briefcase, color: "text-violet-500", bg: "bg-violet-500/10", label: "Trabalho" },
  OTHERS: { icon: Key, color: "text-orange-500", bg: "bg-orange-500/10", label: "Outros" },
};
