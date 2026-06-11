"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, BrainCircuit, Search, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

import { countDue, type DeckGridProps, type DeckWithCount } from "./deck-grid-types";
import { CreateDeckDialog } from "./create-deck-dialog";
import { DeckCard } from "./deck-card";
import { StudyModeDialog } from "./study-mode-dialog";
import { DeleteDeckAlert } from "./delete-deck-alert";
import { EntityConnectionsDialog } from "@/components/connect/entity-connections-dialog";

/** Busca sem acento/caixa ("logica" acha "Lógica") — padrão do projeto. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function DeckGrid({ decks, subjects = [] }: DeckGridProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [studyDeck, setStudyDeck] = useState<DeckWithCount | null>(null);
  const [deckToDelete, setDeckToDelete] = useState<string | null>(null);
  const [connDeck, setConnDeck] = useState<{ id: string; title: string } | null>(null);

  const [search, setSearch] = useState("");
  const [dueFirst, setDueFirst] = useState(true);

  // Filtra por título/matéria/descrição e (opcionalmente) ordena por fila vencida.
  const visibleDecks = useMemo(() => {
    const q = norm(search.trim());
    let list = decks;
    if (q) {
      list = list.filter((d) =>
        norm(`${d.title} ${d.description ?? ""} ${d.studySubject?.title ?? ""}`).includes(q)
      );
    }
    if (dueFirst) {
      list = [...list].sort((a, b) => countDue(b.cards) - countDue(a.cards));
    }
    return list;
  }, [decks, search, dueFirst]);

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

      {/* BUSCA + ORDENAÇÃO (escala p/ muitos baralhos) */}
      {decks.length > 1 && (
        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar baralho ou matéria…"
              className="h-10 rounded-xl border-0 bg-muted/30 pl-9 shadow-none focus-visible:ring-1"
            />
          </div>
          <button
            type="button"
            onClick={() => setDueFirst((v) => !v)}
            title="Baralhos com revisões pendentes aparecem primeiro"
            className={cn(
              "flex h-10 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-[11px] font-bold transition-all",
              dueFirst
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border/50 bg-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <Zap className="h-3.5 w-3.5" /> A revisar primeiro
          </button>
        </div>
      )}

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
        ) : visibleDecks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/60 py-14 text-center text-sm text-muted-foreground">
                Nenhum baralho bate com &quot;{search}&quot;.
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleDecks.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onStudy={setStudyDeck}
                onDelete={setDeckToDelete}
                onConnections={(d) => setConnDeck({ id: d.id, title: d.title })}
              />
            ))}
            </div>
        )}
      </div>

      <StudyModeDialog deck={studyDeck} onClose={() => setStudyDeck(null)} />

      <DeleteDeckAlert deckId={deckToDelete} onClose={() => setDeckToDelete(null)} />

      <EntityConnectionsDialog
        entityType="flashcardDeck"
        item={connDeck}
        onOpenChange={(o) => !o && setConnDeck(null)}
      />

    </div>
  );
}
