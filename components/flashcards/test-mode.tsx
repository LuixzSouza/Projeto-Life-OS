"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Flashcard, FlashcardDeck } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, X, Trophy, RotateCcw, ClipboardCheck } from "lucide-react";

interface TestModeProps {
  deck: Pick<FlashcardDeck, "title">;
  cards: Flashcard[];
}

interface Question {
  cardId: string;
  prompt: string;      // termo
  correct: string;     // definição certa
  options: string[];   // 4 opções embaralhadas (inclui a certa)
}

const MAX_QUESTIONS = 20;

// Texto limpo para exibição (tira cercas de código, imagens e markdown leve).
function clean(raw: string): string {
  return raw
    .replace(/```[\s\S]*?```/g, " [código] ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " [imagem] ")
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(cards: Flashcard[]): Question[] {
  // Distratores: todas as definições distintas do baralho.
  const allDefs = Array.from(new Set(cards.map((c) => clean(c.definition)).filter(Boolean)));
  const chosen = shuffle(cards).slice(0, Math.min(MAX_QUESTIONS, cards.length));

  return chosen.map((c) => {
    const correct = clean(c.definition);
    const pool = shuffle(allDefs.filter((d) => d !== correct)).slice(0, 3);
    const options = shuffle([correct, ...pool]);
    return { cardId: c.id, prompt: clean(c.term), correct, options };
  });
}

/**
 * Modo Teste: múltipla escolha gerada automaticamente dos cartões (o termo é a
 * pergunta; a definição certa + 3 distratores viram as opções). Recall com
 * reconhecimento — bom para véspera de prova. Não grava review (não interfere na
 * repetição espaçada), igual ao modo Combinar.
 */
export function TestMode({ deck, cards }: TestModeProps) {
  const [round, setRound] = useState(0);
  const [questions, setQuestions] = useState<Question[]>(() => buildQuestions(cards));
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrong, setWrong] = useState<{ prompt: string; correct: string; chosen: string }[]>([]);

  const total = questions.length;
  const current = questions[index];
  const finished = index >= total;

  const restart = useCallback(() => {
    setQuestions(buildQuestions(cards));
    setIndex(0);
    setPicked(null);
    setCorrectCount(0);
    setWrong([]);
    setRound((r) => r + 1);
  }, [cards]);

  const answer = (option: string) => {
    if (picked !== null || !current) return;
    setPicked(option);
    if (option === current.correct) {
      setCorrectCount((c) => c + 1);
    } else {
      setWrong((w) => [...w, { prompt: current.prompt, correct: current.correct, chosen: option }]);
    }
  };

  const next = () => {
    setPicked(null);
    setIndex((i) => i + 1);
  };

  const scorePct = total > 0 ? Math.round((correctCount / total) * 100) : 0;

  // key força remontar as opções ao trocar de rodada (evita estado preso).
  const gridKey = useMemo(() => `${round}-${index}`, [round, index]);

  if (cards.length < 2) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-lg font-semibold">Poucos cartões</p>
        <p className="mt-1 text-sm text-muted-foreground">O modo Teste precisa de pelo menos 2 cartões para gerar as alternativas.</p>
        <Link href="/flashcards" className="mt-6 inline-block">
          <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        </Link>
      </div>
    );
  }

  // Tela final: nota + revisão dos erros.
  if (finished) {
    return (
      <div className="mx-auto min-h-screen max-w-xl px-4 py-8">
        <div className="space-y-6 rounded-[2rem] border border-border/50 bg-card p-8 text-center shadow-xl animate-in zoom-in-95">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-primary/10 text-amber-500">
            <Trophy className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black">Teste concluído!</h2>
            <p className="mt-1 text-sm text-muted-foreground">{deck.title}</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className={cn("text-5xl font-black tabular-nums", scorePct >= 70 ? "text-emerald-500" : scorePct >= 50 ? "text-amber-500" : "text-rose-500")}>{scorePct}%</span>
          </div>
          <p className="text-sm text-muted-foreground">Você acertou <b className="text-foreground">{correctCount}</b> de <b className="text-foreground">{total}</b>.</p>

          {wrong.length > 0 && (
            <div className="space-y-2 rounded-2xl border border-border/40 bg-muted/20 p-4 text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Revisar ({wrong.length})</p>
              {wrong.map((w, i) => (
                <div key={i} className="border-t border-border/30 pt-2 first:border-0 first:pt-0">
                  <p className="text-sm font-semibold">{w.prompt}</p>
                  <p className="mt-0.5 flex items-start gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <Check className="mt-0.5 h-3 w-3 shrink-0" /> {w.correct}
                  </p>
                  <p className="mt-0.5 flex items-start gap-1.5 text-xs text-rose-500">
                    <X className="mt-0.5 h-3 w-3 shrink-0" /> Você marcou: {w.chosen}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button onClick={restart} className="h-11 gap-2 rounded-xl font-bold"><RotateCcw className="h-4 w-4" /> Refazer teste</Button>
            <Link href="/flashcards"><Button variant="ghost" className="h-10 w-full rounded-xl text-muted-foreground">Voltar à biblioteca</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      {/* Topo: sair + progresso */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/flashcards">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Sair</Button>
        </Link>
        <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
          <ClipboardCheck className="h-4 w-4 text-primary" /> {index + 1} / {total}
        </span>
      </div>
      <Progress value={((index) / total) * 100} className="mb-6 h-1.5" />

      {/* Pergunta */}
      <div className="mb-6 rounded-2xl border border-border/50 bg-card p-6 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">O que é / significa</p>
        <p className="mt-2 text-xl font-bold leading-snug">{current.prompt}</p>
      </div>

      {/* Alternativas */}
      <div key={gridKey} className="space-y-2.5">
        {current.options.map((opt, i) => {
          const isCorrect = opt === current.correct;
          const isPicked = picked === opt;
          const reveal = picked !== null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => answer(opt)}
              disabled={reveal}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-4 text-left text-sm leading-snug transition-all",
                !reveal && "border-border/50 bg-card hover:border-primary/40 hover:bg-muted/40",
                reveal && isCorrect && "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                reveal && isPicked && !isCorrect && "border-rose-500/50 bg-rose-500/10 text-rose-600",
                reveal && !isCorrect && !isPicked && "opacity-50",
              )}
            >
              <span className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold",
                reveal && isCorrect ? "border-emerald-500 bg-emerald-500 text-white"
                  : reveal && isPicked ? "border-rose-500 bg-rose-500 text-white"
                  : "border-border text-muted-foreground",
              )}>
                {reveal && isCorrect ? <Check className="h-3.5 w-3.5" /> : reveal && isPicked ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
              </span>
              <span className="min-w-0">{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Próxima */}
      {picked !== null && (
        <div className="mt-6 flex justify-end animate-in fade-in slide-in-from-bottom-2">
          <Button onClick={next} className="h-11 gap-2 rounded-xl px-6 font-bold">
            {index + 1 >= total ? "Ver resultado" : "Próxima"}
          </Button>
        </div>
      )}
    </div>
  );
}
