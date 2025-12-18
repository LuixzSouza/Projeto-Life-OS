import { prisma } from "@/lib/prisma";
import { DeckGrid } from "@/components/flashcards/deck-grid";
import { Metadata } from "next";
import { Layers, BrainCircuit } from "lucide-react";

export const metadata: Metadata = {
  title: "Flashcards | Life OS",
  description: "Memorização ativa com repetição espaçada.",
};

export default async function FlashcardsPage() {
  /**
   * Buscamos:
   * - Baralhos (com contagem de cards e vínculo com matéria)
   * - Matérias (para o Select de criação no Grid)
   */
  const [decks, subjects] = await Promise.all([
    prisma.flashcardDeck.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        cards: {
          select: { id: true }, // Apenas para saber a quantidade (cards.length)
        },
        studySubject: {
          select: {
            id: true,
            title: true,
            color: true,
            icon: true, // Útil para mostrar ícone da matéria no card do deck
          },
        },
      },
    }),

    prisma.studySubject.findMany({
      orderBy: { title: "asc" },
    }),
  ]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ================= HEADER ================= */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8">
        <div className="flex flex-col gap-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10">
              <Layers className="h-6 w-6" />
            </div>

            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
                Flashcards
              </h1>
              <p className="text-sm md:text-base text-muted-foreground flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-primary/70" />
                Domine o conteúdo com repetição espaçada.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main className="px-6 md:px-8 py-8 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
        <DeckGrid decks={decks} subjects={subjects} />
      </main>
    </div>
  );
}