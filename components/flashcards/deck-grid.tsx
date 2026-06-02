"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, BrainCircuit } from "lucide-react";

import type { DeckGridProps, DeckWithCount } from "./deck-grid-types";
import { CreateDeckDialog } from "./create-deck-dialog";
import { DeckCard } from "./deck-card";
import { StudyModeDialog } from "./study-mode-dialog";
import { DeleteDeckAlert } from "./delete-deck-alert";

export function DeckGrid({ decks, subjects = [] }: DeckGridProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [studyDeck, setStudyDeck] = useState<DeckWithCount | null>(null);
  const [deckToDelete, setDeckToDelete] = useState<string | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <h2 className="text-2xl font-extrabold flex items-center gap-2">
                Meus Baralhos
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
                {decks.length} coleção{decks.length !== 1 && "ões"} criadas. Organize e estude!
            </p>
        </div>

        <CreateDeckDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          subjects={subjects}
        />
      </div>

      {/* GRID */}
      <div>
        {decks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-border/60 rounded-3xl bg-muted/5">
                <div className="bg-background p-5 rounded-full shadow-sm mb-4 ring-1 ring-border/50">
                    <BrainCircuit className="h-10 w-10 text-muted-foreground/30" />
                </div>
                <h3 className="text-xl font-bold text-foreground">Sua biblioteca está vazia</h3>
                <p className="text-muted-foreground max-w-sm text-center mt-2 leading-relaxed">
                    Crie seu primeiro baralho para começar a montar o seu acervo de memória de longo prazo.
                </p>
                <Button variant="default" className="mt-8 shadow-lg rounded-xl h-12 px-6" onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-5 w-5 mr-2" /> Criar agora
                </Button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {decks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onStudy={setStudyDeck}
                onDelete={setDeckToDelete}
              />
            ))}
            </div>
        )}
      </div>

      <StudyModeDialog deck={studyDeck} onClose={() => setStudyDeck(null)} />

      <DeleteDeckAlert deckId={deckToDelete} onClose={() => setDeckToDelete(null)} />

    </div>
  );
}
