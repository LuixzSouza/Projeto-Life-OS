import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { StudySession } from "@/components/flashcards/study-session";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BrainCircuit } from "lucide-react";

export const metadata: Metadata = { title: "Revisão Geral | Life OS" };
export const dynamic = "force-dynamic";

/**
 * REVISÃO GERAL: todos os cartões vencidos de TODOS os baralhos numa fila só,
 * mais atrasados primeiro (o StudySession já ordena por nextReview). Mata o
 * ritual de abrir baralho por baralho quando a fila do dia está espalhada.
 */
export default async function GlobalReviewPage() {
  const userId = await getCurrentUserId();
  const now = new Date();

  // Vencidos = nextReview nula (cartão novo) ou no passado. Mesma regra do
  // filterDue do client, traduzida para o banco (não carrega o acervo inteiro).
  const dueCards = !userId
    ? []
    : await prisma.flashcard.findMany({
        where: {
          userId,
          OR: [{ nextReview: null }, { nextReview: { lte: now } }],
        },
        orderBy: { nextReview: "asc" },
        take: 500,
      });

  if (dueCards.length === 0) {
    return (
      <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background p-6">
        <div className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 rounded-full bg-emerald-500/10 blur-[100px]" />
        <div className="z-10 w-full max-w-lg space-y-8 rounded-[2.5rem] border border-border/50 bg-card/40 p-10 text-center shadow-2xl backdrop-blur-xl animate-in zoom-in-95 fade-in duration-500">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 shadow-inner ring-1 ring-emerald-500/20">
            <BrainCircuit className="h-12 w-12 text-emerald-600" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Tudo em dia! 🎉</h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Nenhum cartão vencido em nenhum baralho. Sua memória agradece — volte quando a curva do esquecimento cobrar.
            </p>
          </div>
          <Link href="/flashcards" className="block">
            <Button variant="outline" size="lg" className="h-14 w-full gap-2 rounded-xl text-base font-semibold">
              <ArrowLeft className="h-5 w-5" /> Voltar para a Biblioteca
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background animate-in fade-in duration-700">
      <StudySession deck={{ title: "Revisão Geral" }} cards={dueCards} />
    </div>
  );
}
