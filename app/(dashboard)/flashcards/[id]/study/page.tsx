import { prisma } from "@/lib/prisma";
import { StudySession } from "@/components/flashcards/study-session";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// ✅ 1. Definimos a tipagem correta para o Next.js moderno (Promise)
interface StudyPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudyPage(props: StudyPageProps) {
  // ✅ 2. Aguardamos a resolução dos parâmetros
  const params = await props.params;
  const deckId = params.id;

  // Verificação de segurança
  if (!deckId) {
    return <div>ID do baralho não encontrado.</div>;
  }

  const deck = await prisma.flashcardDeck.findUnique({
    where: { id: deckId }, // Agora deckId é garantido como string
    include: { cards: true }
  });

  // Tratamento de Baralho Vazio ou Inexistente
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

  if (deck.cards.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-[50vh] gap-6 text-center p-6">
            <div className="space-y-2">
                <h3 className="text-xl font-bold">Baralho Vazio 📭</h3>
                <p className="text-zinc-500 max-w-md">
                    Você precisa adicionar cartões (perguntas e respostas) antes de poder praticar.
                </p>
            </div>
            <div className="flex gap-4">
                <Link href="/flashcards">
                    <Button variant="ghost">Voltar</Button>
                </Link>
                <Link href={`/flashcards/${deckId}/edit`}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700">
                        Adicionar Cartões
                    </Button>
                </Link>
            </div>
        </div>
    );
  }

  return <StudySession deck={deck} cards={deck.cards} />;
}