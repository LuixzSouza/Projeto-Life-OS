import { ShieldCheck, Hash, Briefcase, Key } from "lucide-react";

export type CategoryKey = "FINANCE" | "SOCIAL" | "WORK" | "OTHERS";

export const CATEGORY_CONFIG: Record<CategoryKey, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  FINANCE: { icon: ShieldCheck, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Financeiro" },
  SOCIAL: { icon: Hash, color: "text-blue-500", bg: "bg-blue-500/10", label: "Social" },
  WORK: { icon: Briefcase, color: "text-violet-500", bg: "bg-violet-500/10", label: "Trabalho" },
  OTHERS: { icon: Key, color: "text-orange-500", bg: "bg-orange-500/10", label: "Outros" },
};

// Um item é "nota" (texto pra lembrar, sem credencial) quando não tem senha.
// Sentinela: notas guardam password === "" (nenhuma credencial real é vazia).
export const isNoteItem = (item: { password?: string | null }): boolean => !item.password;

export const getDomain = (url?: string | null): string | null => {
  if (!url) return null;
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch {
    return null;
  }
};

export const calculateStrength = (pass: string | null): number => {
  if (!pass) return 0;
  let score = 0;
  if (pass.length > 8) score += 30;
  if (pass.length > 12) score += 20;
  if (/[A-Z]/.test(pass)) score += 20;
  if (/[0-9]/.test(pass)) score += 15;
  if (/[^A-Za-z0-9]/.test(pass)) score += 15;
  return Math.min(score, 100);
};

export const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(date));
};
