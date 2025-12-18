import { prisma } from "@/lib/prisma";
import { StudySession } from "@/components/flashcards/study-session";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Layers, Plus, SearchX } from "lucide-react";

/* -------------------------------------------------------------------------- */
/* TYPES                                   */
/* -------------------------------------------------------------------------- */

interface StudyPageProps {
  params: Promise<{
    id: string;
  }>;
}

/* -------------------------------------------------------------------------- */
/* HELPER UI                               */
/* -------------------------------------------------------------------------- */

// Um container reutilizável para centralizar as mensagens de estado (Erro/Vazio)
const StateContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
    <div className="w-full max-w-md text-center space-y-6 p-8 rounded-3xl border border-border/60 bg-card shadow-xl shadow-primary/5 animate-in zoom-in-95 duration-500">
      {children}
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* PAGE                                    */
/* -------------------------------------------------------------------------- */

export default async function StudyPage({ params }: StudyPageProps) {
  const { id: deckId } = await params;

  /* ----------------------------- INVALID ID ------------------------------ */

  if (!deckId) {
    return (
      <StateContainer>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 ring-1 ring-destructive/20">
          <SearchX className="h-8 w-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            ID Inválido
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Não foi possível identificar o parâmetro do baralho. O link pode estar quebrado.
          </p>
        </div>
        <Link href="/flashcards" className="block pt-2">
          <Button variant="outline" className="w-full gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para Biblioteca
          </Button>
        </Link>
      </StateContainer>
    );
  }

  /* ------------------------------ FETCH DECK ----------------------------- */

  const deck = await prisma.flashcardDeck.findUnique({
    where: { id: deckId },
    include: {
      cards: true,
    },
  });

  /* ---------------------------- DECK NOT FOUND ---------------------------- */

  if (!deck) {
    return (
      <StateContainer>
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted ring-1 ring-border">
          <SearchX className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Baralho não encontrado
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Este baralho pode ter sido removido ou você não tem permissão para acessá-lo.
          </p>
        </div>
        <Link href="/flashcards" className="block pt-2">
          <Button variant="default" className="w-full gap-2 shadow-lg shadow-primary/20">
            <ArrowLeft className="h-4 w-4" /> Voltar para Biblioteca
          </Button>
        </Link>
      </StateContainer>
    );
  }

  /* ----------------------------- EMPTY DECK ------------------------------- */

  if (deck.cards.length === 0) {
    return (
      <StateContainer>
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 ring-1 ring-primary/20 shadow-inner">
          <Layers className="h-10 w-10 text-primary" />
        </div>
        
        <div className="space-y-3">
          <h3 className="text-2xl font-bold tracking-tight text-foreground">
            Baralho Vazio
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            O baralho <span className="font-semibold text-foreground">&quot;{deck.title}&quot;</span> ainda não possui cartões. Adicione conteúdo para começar a estudar.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Link href="/flashcards" className="w-full sm:w-1/2">
            <Button variant="outline" className="w-full gap-2 h-11">
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>
          </Link>

          <Link href={`/flashcards/${deckId}/edit`} className="w-full sm:w-1/2">
            <Button className="w-full gap-2 h-11 font-semibold shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </Link>
        </div>
      </StateContainer>
    );
  }

  /* ----------------------------- STUDY MODE ------------------------------- */

  // O componente StudySession assume o controle da tela inteira
  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-700">
      <StudySession deck={deck} cards={deck.cards} />
    </div>
  );
}