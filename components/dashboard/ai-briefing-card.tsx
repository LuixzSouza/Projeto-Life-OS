"use client";

// Briefing diário proativo (#5 do roadmap de IA): card no topo do Dashboard
// em que a IA "fala primeiro" — agenda, prioridades, saldo e hábitos do dia.
// Carrega após a pintura (não bloqueia o Dashboard); cache de 1 dia no servidor.

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sunrise, RefreshCw, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getDailyBriefing, type DailyBriefing } from "@/app/(dashboard)/dashboard/actions/briefing";

export function AiBriefingCard() {
  const [briefing, setBriefing] = useState<DailyBriefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (force: boolean) => {
    try {
      const b = await getDailyBriefing(force);
      setBriefing(b);
    } catch {
      setBriefing(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const refresh = () => {
    if (refreshing) return;
    setRefreshing(true);
    void load(true);
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="mt-4 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    );
  }

  if (!briefing) return null;

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all hover:shadow-md hover:border-primary/30 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* brilho sutil no canto — detalhe premium, sem gradiente pesado */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
            <Sunrise className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Briefing do dia
            </p>
            <p className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {briefing.source === "ai" ? (
                <><Sparkles className="h-2.5 w-2.5 text-primary" /> gerado pela sua IA</>
              ) : (
                "resumo local (IA não conectada)"
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={refresh}
          title="Gerar de novo"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
        </button>
      </div>

      <div className="prose prose-sm dark:prose-invert mt-3 max-w-none prose-p:my-1.5 prose-strong:font-black text-sm leading-relaxed">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{briefing.text}</ReactMarkdown>
      </div>

      <div className="mt-3 flex justify-end">
        <Link
          href={`/ai?q=${encodeURIComponent("Aprofunde o briefing de hoje: o que merece minha atenção e por quê?")}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:border-primary/40 hover:text-primary"
        >
          Aprofundar com IA <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
