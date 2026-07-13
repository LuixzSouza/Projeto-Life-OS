// Faixa "Destaques do Mês": renderiza os cartões gerados por computeHighlights.
// Componente de servidor puro (sem estado) — combina com o resto da página.

import {
  PiggyBank, Trophy, TrendingUp, TrendingDown, Moon, Scale, Wallet, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Highlight, HighlightIcon, HighlightKind } from "@/lib/review-highlights";

const ICONS: Record<HighlightIcon, React.ElementType> = {
  piggy: PiggyBank,
  trophy: Trophy,
  trendingUp: TrendingUp,
  trendingDown: TrendingDown,
  moon: Moon,
  scale: Scale,
  wallet: Wallet,
  sparkles: Sparkles,
};

// Cor do chip + borda conforme a natureza do destaque.
const KIND_STYLES: Record<HighlightKind, { chip: string; ring: string }> = {
  win: { chip: "bg-emerald-500/10 text-emerald-500", ring: "hover:border-emerald-500/30" },
  attention: { chip: "bg-amber-500/10 text-amber-500", ring: "hover:border-amber-500/30" },
  info: { chip: "bg-primary/10 text-primary", ring: "hover:border-primary/30" },
};

export function MonthHighlights({ highlights }: { highlights: Highlight[] }) {
  if (highlights.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-4 w-4 items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Destaques do período</h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {highlights.map((h) => {
          const Icon = ICONS[h.icon] ?? Sparkles;
          const style = KIND_STYLES[h.kind];
          return (
            <div
              key={h.id}
              className={cn(
                "flex items-start gap-3 rounded-2xl border border-border/40 bg-card p-4 shadow-sm transition-all",
                "hover:-translate-y-0.5 hover:shadow-md",
                style.ring,
              )}
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", style.chip)}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-bold leading-tight tracking-tight">{h.title}</p>
                <p className="text-[11px] leading-snug text-muted-foreground">{h.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
