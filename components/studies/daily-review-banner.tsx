import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BrainCircuit, Zap, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";

interface DailyReviewBannerProps {
  /** Cartões vencidos (devidos hoje) em todos os baralhos. */
  due: number;
  /** Total de cartões do usuário — distingue "em dia" de "nem tem cartão". */
  totalCards: number;
}

/**
 * Faixa "Revisão do dia" no topo de /studies: conecta o foco (sessões) com a
 * memória de longo prazo (flashcards). É o gatilho do hábito diário — quando há
 * cartões vencidos, vira o protagonista da página com 1 clique para a Revisão
 * Geral (todos os baralhos numa fila só).
 */
export function DailyReviewBanner({ due, totalCards }: DailyReviewBannerProps) {
  // Sem nenhum cartão: convite suave a criar (sem poluir quem só usa sessões).
  if (totalCards === 0) {
    return (
      <Link
        href="/flashcards"
        className="group flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border/70 bg-card px-5 py-4 shadow-sm transition-all hover:border-primary/40 hover:bg-primary/[0.03]"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">Fixe o que você estuda com flashcards</p>
            <p className="text-xs text-muted-foreground">Repetição espaçada transforma sessão em memória de longo prazo.</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
      </Link>
    );
  }

  // Tudo revisado: reforço positivo discreto, sem roubar a cena do foco.
  if (due === 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight text-emerald-700 dark:text-emerald-400">Revisão em dia! 🎉</p>
            <p className="text-xs text-muted-foreground">Nenhum cartão vencido. Volte quando a curva do esquecimento cobrar.</p>
          </div>
        </div>
        <Link href="/flashcards">
          <Button variant="ghost" size="sm" className="gap-1.5 text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400">
            Ver baralhos <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  // Há cartões vencidos: protagonista. Accent primário, número grande, 1 clique.
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.08] to-primary/[0.02] p-5 shadow-sm sm:p-6",
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
      <div className="relative flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/20">
            <Zap className="h-7 w-7" />
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-primary/80">
              <Sparkles className="h-3.5 w-3.5" /> Revisão do dia
            </p>
            <p className="mt-0.5 text-lg font-extrabold leading-tight text-foreground">
              <span className="text-2xl tabular-nums">{due}</span>{" "}
              {due === 1 ? "cartão te espera" : "cartões te esperam"} para revisar
            </p>
            <p className="text-xs text-muted-foreground">
              Revise agora para travar o conteúdo na memória antes de esquecer.
            </p>
          </div>
        </div>
        <Link href="/flashcards/review" className="w-full sm:w-auto">
          <Button size="lg" className="h-12 w-full gap-2 rounded-xl font-bold shadow-sm sm:w-auto">
            <BrainCircuit className="h-5 w-5" /> Revisar agora
          </Button>
        </Link>
      </div>
    </div>
  );
}
