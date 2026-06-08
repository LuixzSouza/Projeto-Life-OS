// Mapa de status e temas do pipeline de carreira (job tracker).
import { DollarSign, CheckCircle2, XCircle, Clock, Search, FileCode, Users } from "lucide-react";

export type StatusTheme = "blue" | "purple" | "orange" | "yellow" | "emerald" | "indigo" | "neutral";

export interface StatusDetail {
    label: string;
    theme: StatusTheme;
    progress: number;
    icon: React.ElementType;
}

// Ordem canônica do funil (usada em dropdown de status, Kanban e timeline).
export const STATUS_ORDER = ["APPLIED", "SCREENING", "TEST", "INTERVIEW", "OFFER", "ACTIVE", "REJECTED"] as const;

export const STATUS_MAP: Record<string, StatusDetail> = {
    APPLIED: { label: "Inscrito", theme: "blue", progress: 15, icon: Clock },
    SCREENING: { label: "Triagem", theme: "purple", progress: 30, icon: Search },
    TEST: { label: "Teste", theme: "orange", progress: 50, icon: FileCode },
    INTERVIEW: { label: "Entrevista", theme: "yellow", progress: 75, icon: Users },
    OFFER: { label: "Proposta", theme: "emerald", progress: 90, icon: DollarSign },
    ACTIVE: { label: "Contratado", theme: "indigo", progress: 100, icon: CheckCircle2 },
    REJECTED: { label: "Encerrado", theme: "neutral", progress: 0, icon: XCircle },
};

export const getThemeClasses = (theme: StatusTheme): string => {
    switch (theme) {
        case "blue": return "text-blue-600 bg-blue-500/10 border-blue-500/20";
        case "purple": return "text-purple-600 bg-purple-500/10 border-purple-500/20";
        case "orange": return "text-orange-600 bg-orange-500/10 border-orange-500/20";
        case "yellow": return "text-amber-600 bg-amber-500/10 border-amber-500/20";
        case "emerald": return "text-emerald-600 bg-emerald-500/10 border-emerald-500/20";
        case "indigo": return "text-indigo-600 bg-indigo-500/10 border-indigo-500/20";
        default: return "text-muted-foreground bg-muted border-border";
    }
};
