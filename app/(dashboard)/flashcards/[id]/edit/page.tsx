import { prisma } from "@/lib/prisma";
import { createCard, deleteCard } from "../../actions"; // Certifique-se que o caminho está correto para suas actions
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Trash2, PlayCircle, Layers } from "lucide-react";
import Link from "next/link";

// ✅ 1. Tipagem correta para Next.js (Promise)
interface DeckEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function DeckEditPage(props: DeckEditPageProps) {
  // ✅ 2. Aguarda a resolução dos parâmetros
  const params = await props.params;
  const deckId = params.id;

  if (!deckId) return <div>ID inválido.</div>;

  // Busca o baralho e seus cartões
  const deck = await prisma.flashcardDeck.findUnique({
    where: { id: deckId },
    include: { 
      cards: { 
        orderBy: { createdAt: 'desc' } // Mostra os mais novos primeiro
      } 
    }
  });

  if (!deck) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <p className="text-zinc-500">Baralho não encontrado.</p>
            <Link href="/flashcards">
                <Button variant="outline">Voltar</Button>
            </Link>
        </div>
    );
  }

  // Wrapper para adicionar cartão (Server Action)
  async function addCardAction(formData: FormData) {
    "use server";
    await createCard(deck!.id, formData);
  }

  // Wrapper para deletar cartão (Server Action)
  async function deleteCardAction(formData: FormData) {
    "use server";
    const cardId = formData.get("cardId") as string;
    await deleteCard(cardId, deck!.id);
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 pb-24">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
            <Link href="/flashcards">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
            </Link>
            <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Layers className="h-6 w-6 text-indigo-500" />
                {deck.title}
            </h1>
            <p className="text-zinc-500 text-sm">Gerenciando {deck.cards.length} cartões</p>
            </div>
        </div>
        
        <div className="flex gap-2">
            <Link href={`/flashcards/${deck.id}/study`}>
                <Button className={`gap-2 ${deck.cards.length > 0 ? "bg-green-600 hover:bg-green-700" : "opacity-50"}`} disabled={deck.cards.length === 0}>
                    <PlayCircle className="h-4 w-4" /> 
                    {deck.cards.length > 0 ? "Praticar Agora" : "Adicione Cartões"}
                </Button>
            </Link>
        </div>
      </div>

      {/* --- FORMULÁRIO DE ADIÇÃO --- */}
      <Card className="border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30">
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Plus className="h-4 w-4" /> Adicionar Novo Cartão
          </h3>
          
          <form action={addCardAction} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-500">Frente (Pergunta/Termo)</label>
                <Input 
                    name="term" 
                    placeholder="Ex: O que é a mitocôndria?" 
                    required 
                    autoComplete="off" 
                    className="bg-white dark:bg-zinc-950"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-zinc-500">Verso (Resposta/Definição)</label>
                <Textarea 
                    name="definition" 
                    placeholder="Ex: É a organela responsável pela respiração celular..." 
                    required 
                    className="resize-none bg-white dark:bg-zinc-950 min-h-[80px]" 
                />
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" variant="secondary" className="w-full md:w-auto">
                Adicionar à Lista
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* --- LISTA DE CARTÕES --- */}
      <div className="space-y-3">
        {deck.cards.map((card, index) => (
          <div key={card.id} className="group flex flex-col md:flex-row items-start gap-4 p-4 rounded-xl border bg-card hover:border-indigo-500/30 transition-all shadow-sm">
            
            {/* Número do Cartão */}
            <div className="flex md:flex-col items-center gap-2 pt-1 md:w-12 shrink-0">
                <span className="text-xs font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-full">
                    #{deck.cards.length - index}
                </span>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 grid md:grid-cols-2 gap-4 w-full">
                <div>
                    <p className="text-[10px] font-bold text-zinc-400 mb-1 uppercase tracking-wider">Frente</p>
                    <p className="font-medium text-zinc-800 dark:text-zinc-200">{card.term}</p>
                </div>
                <div className="border-t pt-2 md:border-t-0 md:pt-0 md:border-l md:border-zinc-200 md:dark:border-zinc-800 md:pl-4">
                    <p className="text-[10px] font-bold text-zinc-400 mb-1 uppercase tracking-wider">Verso</p>
                    <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">{card.definition}</p>
                </div>
            </div>

            {/* Ação de Deletar */}
            <form action={deleteCardAction} className="md:self-center">
                <input type="hidden" name="cardId" value={card.id} />
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Excluir Cartão"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </form>
          </div>
        ))}

        {/* Empty State */}
        {deck.cards.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                <Layers className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-zinc-500 font-medium">Este baralho está vazio.</p>
                <p className="text-sm text-zinc-400">Use o formulário acima para adicionar o primeiro cartão.</p>
            </div>
        )}
      </div>
    </div>
  );
}