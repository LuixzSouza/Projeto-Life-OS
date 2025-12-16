import { prisma } from "@/lib/prisma";
import { DeckGrid } from "@/components/flashcards/deck-grid";

/**
 * Página principal de Flashcards
 * Server Component
 */
export default async function FlashcardsPage() {
  /**
   * Buscamos:
   * - Baralhos (com contagem de cards e vínculo com matéria)
   * - Matérias (para o Select de criação)
   */
  const [decks, subjects] = await Promise.all([
    prisma.flashcardDeck.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        cards: {
          select: { id: true }, // apenas para contagem
        },
        studySubject: {
          select: {
            title: true,
            color: true,
          },
        },
      },
    }),

    prisma.studySubject.findMany({
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-6 py-6">
      <DeckGrid decks={decks} subjects={subjects} />
    </div>
  );
}
