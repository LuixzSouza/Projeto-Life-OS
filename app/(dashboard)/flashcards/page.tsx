import { prisma } from "@/lib/prisma";
import { DeckGrid } from "@/components/flashcards/deck-grid";
import { Metadata } from "next";
import { Layers, BrainCircuit, ArrowLeft, BookOpen, Target, TrendingUp, Zap, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUserId } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { countDue } from "@/components/flashcards/deck-grid-types";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";

export const metadata: Metadata = {
  title: "Flashcards | Life OS",
  description: "Memorização ativa com repetição espaçada.",
};

export default async function FlashcardsPage() {
  const userId = await getCurrentUserId();
  /**
   * Buscamos:
   * - Baralhos (com contagem de cards e vínculo com matéria)
   * - Matérias (para o Select de criação no Grid)
   * - TODOS os flashcards (para gerar estatísticas globais de memória)
   */
  const [decks, subjects] = await Promise.all([
    prisma.flashcardDeck.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        cards: { select: { id: true, box: true, nextReview: true } },
        studySubject: {
          select: { id: true, title: true, color: true, icon: true },
        },
      },
    }),
    prisma.studySubject.findMany({
      where: { userId },
      orderBy: { title: "asc" },
    }),
  ]);

  // Estatísticas globais derivadas diretamente dos cartões dos baralhos.
  const allCards = decks.flatMap((d) => d.cards);
  const totalCards = allCards.length;

  // Agrupando cartões pelo Box (Nível de retenção no algoritmo SM-2)
  // Box 1: Novos ou Esquecidos · Box 2-3: Aprendendo · Box 4+: Dominados
  const stats = {
      learning: allCards.filter(c => c.box === 1).length,
      reviewing: allCards.filter(c => c.box === 2 || c.box === 3).length,
      mastered: allCards.filter(c => c.box >= 4).length,
  };

  // Cartões devidos hoje (curva de esquecimento) em todos os baralhos.
  const dueToday = countDue(allCards);

  const learningPercent = totalCards > 0 ? (stats.learning / totalCards) * 100 : 0;
  const reviewingPercent = totalCards > 0 ? (stats.reviewing / totalCards) * 100 : 0;
  const masteredPercent = totalCards > 0 ? (stats.mastered / totalCards) * 100 : 0;

  return (
    <PageShell>
      <PageHeader
        icon={<Layers className="h-6 w-6" />}
        title="Flashcards"
        description={
          <span className="flex items-center gap-2">
            <BrainCircuit className="h-4 w-4 text-primary/70" />
            Domine o conteúdo usando repetição espaçada.
          </span>
        }
        actions={
          <Link href="/studies">
            <Button variant="outline" className="gap-2 rounded-xl border-border/60 bg-background/50 shadow-sm backdrop-blur-sm">
              <BookOpen className="h-4 w-4 text-primary" />
              Árvore de Matérias
            </Button>
          </Link>
        }
      >
        <Link href="/studies" className="w-fit">
          <Button variant="ghost" size="sm" className="-ml-2 text-muted-foreground hover:bg-transparent hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Painel de Estudos
          </Button>
        </Link>
      </PageHeader>

      {/* ================= CONTENT ================= */}
      <PageContainer className="space-y-8">

        {/* Painel de Saúde da Memória (Estatísticas Globais) */}
        {totalCards > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* Resumo Total */}
                <Card className="bg-card border-border/60 shadow-sm lg:col-span-1">
                    <CardContent className="p-6 flex flex-col justify-center h-full">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Target className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold text-lg">Acervo Global</h3>
                        </div>
                        <div className="mt-4 flex items-end gap-2">
                            <span className="text-5xl font-black text-foreground leading-none">{totalCards}</span>
                            <span className="text-sm font-semibold text-muted-foreground pb-1">cartões totais</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                            Distribuídos em {decks.length} {decks.length === 1 ? "baralho" : "baralhos"}.
                        </p>

                        {/* Para revisar hoje */}
                        <div className={cn(
                            "mt-4 flex items-center gap-2.5 rounded-xl border p-3",
                            dueToday > 0 ? "border-primary/20 bg-primary/5" : "border-emerald-500/20 bg-emerald-500/5"
                        )}>
                            <div className={cn("p-1.5 rounded-lg", dueToday > 0 ? "bg-primary/10 text-primary" : "bg-emerald-500/10 text-emerald-600")}>
                                {dueToday > 0 ? <Zap className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0">
                                {dueToday > 0 ? (
                                    <>
                                        <p className="text-sm font-bold leading-none">{dueToday} para revisar hoje</p>
                                        <p className="text-[11px] text-muted-foreground mt-1">Escolha um baralho abaixo e mande ver.</p>
                                    </>
                                ) : (
                                    <p className="text-sm font-bold text-emerald-600 leading-tight">Tudo em dia! 🎉</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Gráfico de Retenção Visual */}
                <Card className="bg-card border-border/60 shadow-sm lg:col-span-3">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Saúde da sua Memória
                            </h3>
                        </div>

                        {/* Barra Combinada (Stacked Progress Bar) */}
                        <div className="relative w-full h-6 rounded-full overflow-hidden flex shadow-inner bg-muted/30 border border-border/50">
                            {/* Dominados (Verde) */}
                            {masteredPercent > 0 && (
                                <div 
                                    className="h-full bg-emerald-500 transition-all duration-1000 ease-out" 
                                    style={{ width: `${masteredPercent}%` }}
                                    title={`Dominados: ${stats.mastered} cartões`}
                                />
                            )}
                            {/* Revisando (Amarelo/Laranja) */}
                            {reviewingPercent > 0 && (
                                <div 
                                    className="h-full bg-amber-400 transition-all duration-1000 ease-out" 
                                    style={{ width: `${reviewingPercent}%` }}
                                    title={`Revisando: ${stats.reviewing} cartões`}
                                />
                            )}
                            {/* Aprendendo (Vermelho/Rosa) */}
                            {learningPercent > 0 && (
                                <div 
                                    className="h-full bg-rose-400 transition-all duration-1000 ease-out" 
                                    style={{ width: `${learningPercent}%` }}
                                    title={`Aprendendo: ${stats.learning} cartões`}
                                />
                            )}
                        </div>

                        {/* Legenda do Gráfico */}
                        <div className="grid grid-cols-3 gap-4 mt-6">
                            
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dominados</span>
                                </div>
                                <p className="text-2xl font-black text-foreground pl-5">{stats.mastered} <span className="text-xs font-normal text-muted-foreground">({Math.round(masteredPercent)}%)</span></p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Revisando</span>
                                </div>
                                <p className="text-2xl font-black text-foreground pl-5">{stats.reviewing} <span className="text-xs font-normal text-muted-foreground">({Math.round(reviewingPercent)}%)</span></p>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.4)]" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Aprendendo</span>
                                </div>
                                <p className="text-2xl font-black text-foreground pl-5">{stats.learning} <span className="text-xs font-normal text-muted-foreground">({Math.round(learningPercent)}%)</span></p>
                            </div>

                        </div>
                    </CardContent>
                </Card>
            </div>
        )}

        {/* Componente que renderiza os baralhos que você já construiu */}
        <DeckGrid decks={decks} subjects={subjects} />

      </PageContainer>
    </PageShell>
  );
}