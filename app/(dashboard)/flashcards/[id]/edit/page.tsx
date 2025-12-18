import { prisma } from "@/lib/prisma";
import { createCard } from "../../actions"; // deleteCard não é mais necessário aqui diretamente
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  PlayCircle,
  Layers,
  Sparkles,
  ArrowRight,
  Library,
  BookOpen
} from "lucide-react";
import Link from "next/link";
import { FlashcardItem } from "@/components/flashcards/flashcard-item"; // IMPORT NOVO

/* Tipagem correta para App Router */
interface DeckEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function DeckEditPage({ params }: DeckEditPageProps) {
  const { id: deckId } = await params;

  if (!deckId) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-muted-foreground">ID do baralho inválido.</div>
        </div>
    );
  }

  const deck = await prisma.flashcardDeck.findUnique({
    where: { id: deckId },
    include: {
      cards: {
        orderBy: { createdAt: "desc" },
      },
      studySubject: {
        select: { title: true, color: true, icon: true },
      },
    },
  });

  if (!deck) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6 text-center px-4">
        <div className="bg-muted/30 p-6 rounded-3xl ring-1 ring-border/50">
            <Layers className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">Baralho não encontrado</h2>
            <p className="text-muted-foreground max-w-sm">
                O baralho que você está procurando pode ter sido excluído ou não existe mais.
            </p>
        </div>
        <Link href="/flashcards">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para a biblioteca
          </Button>
        </Link>
      </div>
    );
  }

  /* Server Action de Adicionar (Inline) */
  async function addCardAction(formData: FormData) {
    "use server";
    await createCard(deckId, formData);
  }

  const hasCards = deck.cards.length > 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      
      {/* ================= HEADER ================= */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8">
        <div className="max-w-[1600px] mx-auto flex flex-col gap-6 animate-in fade-in duration-500">
            
            <div className="flex items-center gap-2">
                <Link href="/flashcards">
                    <Button variant="ghost" size="sm" className="pl-0 text-muted-foreground hover:text-primary transition-colors">
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Voltar para Biblioteca
                    </Button>
                </Link>
            </div>

            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-start gap-5">
                    <div className="h-14 w-14 rounded-2xl flex shrink-0 items-center justify-center bg-primary/10 text-primary shadow-sm ring-1 ring-primary/10">
                        <Library className="h-7 w-7" />
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                            <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
                                {deck.title}
                            </h1>
                            {deck.studySubject && (
                                <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 gap-1.5 py-1 px-2.5">
                                    {deck.studySubject.icon && <span>{deck.studySubject.icon}</span>}
                                    {deck.studySubject.title}
                                </Badge>
                            )}
                        </div>
                        <p className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
                            <Layers className="h-4 w-4 text-primary/60" />
                            {deck.cards.length} {deck.cards.length === 1 ? 'cartão' : 'cartões'} neste baralho
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                    {hasCards && (
                        <Link href={`/flashcards/${deck.id}/study`}>
                            <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 rounded-xl font-bold transition-transform hover:scale-[1.02]">
                                <PlayCircle className="h-5 w-5 fill-current" />
                                Estudar Agora
                            </Button>
                        </Link>
                    )}
                </div>
            </div>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">
        <div className="grid lg:grid-cols-[400px_1fr] gap-8 items-start">
            
            {/* COLUNA ESQUERDA: FORMULÁRIO (Sticky) */}
            <aside className="lg:sticky lg:top-8 order-2 lg:order-1 space-y-6">
                <Card className="border-primary/20 shadow-lg shadow-primary/5 overflow-hidden">
                    <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/60 to-primary/20" />
                    
                    <CardHeader className="pb-4 border-b border-border/40 bg-muted/20">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Plus className="h-5 w-5 text-primary" />
                            Novo Cartão
                        </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="pt-6">
                        <form action={addCardAction} className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1">
                                    Frente (Pergunta)
                                </Label>
                                <Input
                                    name="term"
                                    placeholder="Ex: O que é useState?"
                                    required
                                    className="bg-background focus:ring-primary/20 border-border/60 font-medium"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider ml-1">
                                    Verso (Resposta)
                                </Label>
                                <Textarea
                                    name="definition"
                                    placeholder="Ex: Um hook do React para gerenciar estado..."
                                    required
                                    className="min-h-[120px] resize-none bg-background focus:ring-primary/20 border-border/60 leading-relaxed"
                                />
                            </div>

                            <Button type="submit" className="w-full font-semibold shadow-sm" variant="secondary">
                                Adicionar à pilha <ArrowRight className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {!hasCards && (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100 dark:border-blue-900/30">
                        <div className="flex gap-3">
                            <div className="p-2 bg-background rounded-lg shadow-sm h-fit">
                                <Sparkles className="h-5 w-5 text-blue-500" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-semibold text-sm text-blue-700 dark:text-blue-300">Dica de Ouro</h4>
                                <p className="text-xs text-blue-600/80 dark:text-blue-400/80 leading-relaxed">
                                    Mantenha os cartões simples. Um conceito por cartão facilita a memorização ativa e torna a revisão mais eficiente.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </aside>

            {/* COLUNA DIREITA: LISTA INTERATIVA */}
            <section className="space-y-6 order-1 lg:order-2">
                <div className="flex items-center justify-between pb-2 border-b border-border/40">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        Cartões do Baralho
                    </h3>
                    <Badge variant="secondary" className="px-3">
                        Total: {deck.cards.length}
                    </Badge>
                </div>

                {deck.cards.length === 0 ? (
                    <div className="py-24 text-center border-2 border-dashed border-border/60 rounded-3xl bg-muted/5 flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">
                        <div className="bg-muted/50 p-6 rounded-full mb-4 ring-1 ring-border">
                            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">Baralho Vazio</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mt-2 leading-relaxed">
                            Este baralho precisa de conteúdo. Use o formulário para adicionar seu primeiro flashcard.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {deck.cards.map((card, index) => (
                            <FlashcardItem
                                key={card.id}
                                card={card}
                                index={index}
                                total={deck.cards.length}
                                deckId={deckId}
                            />
                        ))}
                    </div>
                )}
            </section>
        </div>
      </main>
    </div>
  );
}