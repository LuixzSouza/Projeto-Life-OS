import { prisma } from "@/lib/prisma";
import { DeckGrid } from "@/components/flashcards/deck-grid";

export default async function FlashcardsPage() {
  // Buscamos Decks e Matérias em paralelo
  const [decks, subjects] = await Promise.all([
    prisma.flashcardDeck.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cards: { select: { id: true } },
        studySubject: { select: { title: true, color: true } }
      }
    }),
    // ✅ BUSCA OBRIGATÓRIA: Precisamos buscar as matérias para o Select funcionar
    prisma.studySubject.findMany({
      orderBy: { title: 'asc' }
    })
  ]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* ✅ Passamos as subjects para o componente cliente */}
      <DeckGrid decks={decks} subjects={subjects} />
    </div>
  );
}