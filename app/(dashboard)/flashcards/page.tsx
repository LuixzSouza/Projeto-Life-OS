import { prisma } from "@/lib/prisma";
import { DeckGrid } from "@/components/flashcards/deck-grid";
import { Metadata } from "next";
import { Layers, BrainCircuit, ArrowLeft, BookOpen, Target, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = {
  title: "Flashcards | Life OS",
  description: "Memorização ativa com repetição espaçada.",
};

export default async function FlashcardsPage() {
  /**
   * Buscamos:
   * - Baralhos (com contagem de cards e vínculo com matéria)
   * - Matérias (para o Select de criação no Grid)
   * - TODOS os flashcards (para gerar estatísticas globais de memória)
   */
  const [decks, subjects, allCards] = await Promise.all([
    prisma.flashcardDeck.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        cards: { select: { id: true } },
        studySubject: {
          select: { id: true, title: true, color: true, icon: true },
        },
      },
    }),
    prisma.studySubject.findMany({
      orderBy: { title: "asc" },
    }),
    prisma.flashcard.findMany({
        select: { box: true }
    })
  ]);

  // Cálculos das Estatísticas Globais de Retenção
  const totalCards = allCards.length;
  
  // Agrupando cartões pelo Box (Nível de retenção no algoritmo SM-2)
  // Box 1: Novos ou Esquecidos recentemente
  // Box 2 e 3: Em processo de aprendizagem
  // Box 4+: Memória de longo prazo (Dominados)
  const stats = {
      learning: allCards.filter(c => c.box === 1).length,
      reviewing: allCards.filter(c => c.box === 2 || c.box === 3).length,
      mastered: allCards.filter(c => c.box >= 4).length,
  };

  const learningPercent = totalCards > 0 ? (stats.learning / totalCards) * 100 : 0;
  const reviewingPercent = totalCards > 0 ? (stats.reviewing / totalCards) * 100 : 0;
  const masteredPercent = totalCards > 0 ? (stats.mastered / totalCards) * 100 : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ================= HEADER ================= */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-8 pb-8 px-6 md:px-8">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6 animate-in fade-in duration-500">
          
          {/* Navegação de Retorno */}
          <div className="flex items-center">
            <Link href="/studies">
                <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-primary hover:bg-transparent transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para o Painel de Estudos
                </Button>
            </Link>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-2xl flex items-center justify-center bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20">
                <Layers className="h-7 w-7" />
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                  Flashcards
                </h1>
                <p className="text-sm md:text-base text-muted-foreground flex items-center gap-2 mt-1 font-medium">
                  <BrainCircuit className="h-4 w-4 text-primary/70" />
                  Domine o conteúdo usando repetição espaçada.
                </p>
              </div>
            </div>
            
            {/* Atalho rápido */}
            <div className="hidden md:block">
              <Link href="/studies">
                <Button variant="outline" className="gap-2 rounded-xl bg-background/50 backdrop-blur-sm border-border/60 shadow-sm">
                  <BookOpen className="h-4 w-4 text-primary" />
                  Árvore de Matérias
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main className="px-6 md:px-8 py-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
        
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
                            Distribuídos em {decks.length} baralhos de estudo.
                        </p>
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
        
      </main>
    </div>
  );
}