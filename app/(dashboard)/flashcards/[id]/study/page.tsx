import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { StudySession } from "@/components/flashcards/study-session";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Layers, Plus, SearchX, BrainCircuit } from "lucide-react";
import { filterDue } from "@/components/flashcards/deck-grid-types";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface StudyPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ mode?: string }>;
}

/* -------------------------------------------------------------------------- */
/* HELPER UI (TELAS DE ESTADO PREMIUM)                                        */
/* -------------------------------------------------------------------------- */

// Container com design Glassmorphism e Glows ao fundo
const StateContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background relative overflow-hidden">
    {/* Glows de fundo para dar profundidade */}
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />

    <div className="w-full max-w-lg text-center space-y-8 p-10 rounded-[2.5rem] border border-border/50 bg-card/40 backdrop-blur-xl shadow-2xl animate-in zoom-in-95 fade-in duration-500 relative z-10">
      {children}
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* PAGE                                                                       */
/* -------------------------------------------------------------------------- */

export default async function StudyPage({ params, searchParams }: StudyPageProps) {
  const { id: deckId } = await params;
  const { mode } = await searchParams;

  /* ----------------------------- INVALID ID ------------------------------ */

  if (!deckId) {
    return (
      <StateContainer>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10 ring-1 ring-destructive/20 shadow-inner">
          <SearchX className="h-10 w-10 text-destructive" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            ID Inválido
          </h2>
          <p className="text-muted-foreground leading-relaxed text-base">
            Não foi possível identificar o parâmetro do baralho. O link pode estar quebrado ou incompleto.
          </p>
        </div>
        <div className="pt-4">
          <Link href="/flashcards" className="block">
            <Button variant="outline" size="lg" className="w-full gap-2 rounded-xl h-14 text-base font-semibold hover:bg-muted/50">
              <ArrowLeft className="h-5 w-5" /> Voltar para Biblioteca
            </Button>
          </Link>
        </div>
      </StateContainer>
    );
  }

  /* ------------------------------ FETCH DECK ----------------------------- */

  // Escopa por usuário: só o dono estuda o próprio baralho (evita IDOR pela URL).
  const userId = await getCurrentUserId();
  const deck = !userId ? null : await prisma.flashcardDeck.findFirst({
    where: { id: deckId, userId },
    include: {
      // Trazemos as cartas para o cliente gerenciar a sessão
      cards: true,
    },
  });

  /* ---------------------------- DECK NOT FOUND ---------------------------- */

  if (!deck) {
    return (
      <StateContainer>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-muted ring-1 ring-border/50 shadow-inner">
          <SearchX className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
            Baralho não encontrado
          </h2>
          <p className="text-muted-foreground leading-relaxed text-base">
            Este baralho foi removido ou você não tem permissão para acessá-lo.
          </p>
        </div>
        <div className="pt-4">
          <Link href="/flashcards" className="block">
            <Button variant="default" size="lg" className="w-full gap-2 shadow-lg shadow-primary/20 rounded-xl h-14 text-base font-bold">
              <ArrowLeft className="h-5 w-5" /> Voltar para Biblioteca
            </Button>
          </Link>
        </div>
      </StateContainer>
    );
  }

  /* ----------------------------- EMPTY DECK ------------------------------- */

  if (deck.cards.length === 0) {
    return (
      <StateContainer>
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 shadow-inner relative">
          <div className="absolute inset-0 bg-primary/20 rounded-[2rem] blur-xl opacity-50" />
          <Layers className="h-12 w-12 text-primary relative z-10" />
        </div>
        
        <div className="space-y-3">
          <h3 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center justify-center gap-3">
            Baralho Vazio
          </h3>
          <p className="text-muted-foreground leading-relaxed text-base">
            O baralho <span className="font-bold text-foreground">&quot;{deck.title}&quot;</span> ainda não possui cartões. Adicione conteúdo para que seu cérebro comece a trabalhar!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Link href="/flashcards" className="w-full sm:w-1/2">
            <Button variant="outline" className="w-full gap-2 h-14 rounded-xl text-base font-semibold hover:bg-muted/50 transition-colors">
              <ArrowLeft className="h-5 w-5" /> Voltar
            </Button>
          </Link>

          <Link href={`/flashcards/${deckId}/edit`} className="w-full sm:w-1/2">
            <Button className="w-full gap-2 h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground transition-all hover:-translate-y-0.5 active:translate-y-0">
              <Plus className="h-5 w-5" /> Criar Cartões
            </Button>
          </Link>
        </div>
      </StateContainer>
    );
  }

  /* ----------------------------- STUDY MODE ------------------------------- */

  // Modo Inteligente (smart): só cartões vencidos (curva de esquecimento).
  // Modo Prova (cram) ou padrão: todo o baralho.
  const isSmart = mode === "smart";
  const cards = isSmart ? filterDue(deck.cards) : deck.cards;

  // Modo Inteligente sem cartões devidos: nada a revisar hoje.
  if (isSmart && cards.length === 0) {
    return (
      <StateContainer>
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 ring-1 ring-emerald-500/20 shadow-inner relative">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-[2rem] blur-xl opacity-50" />
          <BrainCircuit className="h-12 w-12 text-emerald-600 relative z-10" />
        </div>

        <div className="space-y-3">
          <h3 className="text-3xl font-extrabold tracking-tight text-foreground">Tudo em dia! 🎉</h3>
          <p className="text-muted-foreground leading-relaxed text-base">
            Nenhum cartão de <span className="font-bold text-foreground">&quot;{deck.title}&quot;</span> está
            previsto para revisão hoje. Volte mais tarde ou revise o baralho inteiro.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-6">
          <Link href="/flashcards" className="w-full sm:w-1/2">
            <Button variant="outline" className="w-full gap-2 h-14 rounded-xl text-base font-semibold hover:bg-muted/50">
              <ArrowLeft className="h-5 w-5" /> Voltar
            </Button>
          </Link>
          <Link href={`/flashcards/${deckId}/study?mode=cram`} className="w-full sm:w-1/2">
            <Button className="w-full gap-2 h-14 rounded-xl text-base font-bold shadow-lg shadow-primary/25 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Layers className="h-5 w-5" /> Revisar tudo
            </Button>
          </Link>
        </div>
      </StateContainer>
    );
  }

  // Se tudo estiver certo, renderiza o ambiente de foco
  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-700">
      <StudySession deck={deck} cards={cards} />
    </div>
  );
}