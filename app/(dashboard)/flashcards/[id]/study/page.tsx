import { prisma } from "@/lib/prisma";
import { StudySession } from "@/components/flashcards/study-session";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

interface StudyPageProps {
  params: Promise<{
    id: string;
  }>;
}

/* -------------------------------------------------------------------------- */
/*                                   PAGE                                     */
/* -------------------------------------------------------------------------- */

export default async function StudyPage({ params }: StudyPageProps) {
  const { id: deckId } = await params;

  /* ----------------------------- INVALID ID ------------------------------ */

  if (!deckId) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <h2 className="text-xl font-semibold">Baralho inválido</h2>
        <p className="text-muted-foreground">
          Não foi possível identificar o baralho de estudo.
        </p>
        <Link href="/flashcards">
          <Button variant="outline">Voltar para Flashcards</Button>
        </Link>
      </div>
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
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <h2 className="text-xl font-semibold">Baralho não encontrado</h2>
        <p className="text-muted-foreground">
          Esse baralho pode ter sido removido.
        </p>
        <Link href="/flashcards">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    );
  }

  /* ----------------------------- EMPTY DECK ------------------------------- */

  if (deck.cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-6 text-center p-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-semibold">Baralho vazio</h3>
          <p className="text-muted-foreground max-w-md">
            Antes de iniciar o estudo, adicione pelo menos um cartão.
          </p>
        </div>

        <div className="flex gap-3">
          <Link href="/flashcards">
            <Button variant="ghost">Voltar</Button>
          </Link>

          <Link href={`/flashcards/${deckId}/edit`}>
            <Button className="bg-primary hover:bg-primary/90">
              Adicionar cartões
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ----------------------------- STUDY MODE ------------------------------- */

  return <StudySession deck={deck} cards={deck.cards} />;
}
