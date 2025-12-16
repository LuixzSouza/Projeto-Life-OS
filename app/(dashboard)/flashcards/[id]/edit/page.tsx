import { prisma } from "@/lib/prisma";
import { createCard, deleteCard } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Plus,
  Trash2,
  PlayCircle,
  Layers,
} from "lucide-react";
import Link from "next/link";

/* Tipagem correta para App Router */
interface DeckEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function DeckEditPage({ params }: DeckEditPageProps) {
  const { id: deckId } = await params;

  if (!deckId) {
    return <div className="p-6 text-muted-foreground">ID inválido.</div>;
  }

  const deck = await prisma.flashcardDeck.findUnique({
    where: { id: deckId },
    include: {
      cards: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!deck) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <p className="text-muted-foreground">Baralho não encontrado.</p>
        <Link href="/flashcards">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    );
  }

  /* Server Actions */
  async function addCardAction(formData: FormData) {
    "use server";
    await createCard(deckId, formData);
  }

  async function deleteCardAction(formData: FormData) {
    "use server";
    const cardId = formData.get("cardId") as string;
    await deleteCard(cardId, deckId);
  }

  const hasCards = deck.cards.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-24">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/flashcards">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>

          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              {deck.title}
            </h1>
            <p className="text-sm text-muted-foreground">
              {deck.cards.length} cartão(ões)
            </p>
          </div>
        </div>

        <Link
          href={
            hasCards
              ? `/flashcards/${deck.id}/study`
              : `/flashcards/${deck.id}/edit`
          }
        >
          <Button
            className="gap-2"
            variant={hasCards ? "default" : "secondary"}
          >
            <PlayCircle className="h-4 w-4" />
            {hasCards ? "Iniciar Estudo" : "Adicionar Cartões"}
          </Button>
        </Link>
      </header>

      {/* FORMULÁRIO */}
      <Card className="border-dashed bg-muted/30">
        <CardContent className="p-6 space-y-4">
          <h3 className="font-semibold flex items-center gap-2 text-primary">
            <Plus className="h-4 w-4" />
            Novo Cartão
          </h3>

          <form action={addCardAction} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Frente
                </label>
                <Input
                  name="term"
                  placeholder="Pergunta ou termo"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-muted-foreground">
                  Verso
                </label>
                <Textarea
                  name="definition"
                  placeholder="Resposta ou definição"
                  required
                  className="min-h-[90px] resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Adicionar cartão</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* LISTA DE CARTÕES */}
      <section className="space-y-3">
        {deck.cards.map((card, index) => (
          <div
            key={card.id}
            className="group flex flex-col md:flex-row gap-4 p-4 rounded-xl border bg-card hover:border-primary/40 transition"
          >
            {/* Índice */}
            <div className="md:w-12 text-xs font-mono text-muted-foreground">
              #{deck.cards.length - index}
            </div>

            {/* Conteúdo */}
            <div className="flex-1 grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Frente
                </p>
                <p className="font-medium">{card.term}</p>
              </div>

              <div className="md:border-l md:pl-4">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground">
                  Verso
                </p>
                <p className="text-sm text-muted-foreground">
                  {card.definition}
                </p>
              </div>
            </div>

            {/* Deletar */}
            <form action={deleteCardAction}>
              <input type="hidden" name="cardId" value={card.id} />
              <Button
                type="submit"
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive opacity-100 md:opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </form>
          </div>
        ))}

        {/* Empty State */}
        {!hasCards && (
          <div className="py-16 text-center border-dashed border rounded-xl">
            <Layers className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Nenhum cartão ainda</p>
            <p className="text-sm text-muted-foreground">
              Crie seu primeiro cartão usando o formulário acima.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
