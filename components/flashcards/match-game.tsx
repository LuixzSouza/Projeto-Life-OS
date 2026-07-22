"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Flashcard, FlashcardDeck } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Timer, Zap, Trophy, RotateCcw, Sparkles } from "lucide-react";

interface MatchGameProps {
  deck: Pick<FlashcardDeck, "title">;
  cards: Flashcard[];
}

interface Tile {
  key: string;      // único por tile (cardId + lado)
  cardId: string;   // par: term e def do mesmo card compartilham cardId
  side: "term" | "def";
  text: string;
  matched: boolean;
  wrong: boolean;
}

const ROUND_SIZE = 6; // 6 pares = 12 blocos (bom no grid e no cérebro)

// Limpa o texto para o bloco: tira cercas de código, imagens markdown e
// espaços repetidos; encurta o que for muito longo (definições costumam ser).
function tileText(raw: string): string {
  const clean = raw
    .replace(/```[\s\S]*?```/g, " [código] ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " [imagem] ")
    .replace(/[#*_>`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > 90 ? `${clean.slice(0, 88)}…` : clean;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildTiles(cards: Flashcard[]): Tile[] {
  const chosen = shuffle(cards).slice(0, Math.min(ROUND_SIZE, cards.length));
  const tiles: Tile[] = [];
  for (const c of chosen) {
    tiles.push({ key: `${c.id}-t`, cardId: c.id, side: "term", text: tileText(c.term), matched: false, wrong: false });
    tiles.push({ key: `${c.id}-d`, cardId: c.id, side: "def", text: tileText(c.definition), matched: false, wrong: false });
  }
  return shuffle(tiles);
}

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Jogo "Combinar" (estilo Quizlet Match): ligue cada termo à sua definição o
 * mais rápido possível. É prática lúdica de reconhecimento — de propósito NÃO
 * mexe na repetição espaçada (não grava review), então jogar não bagunça a
 * agenda de revisão dos cartões.
 */
export function MatchGame({ deck, cards }: MatchGameProps) {
  const [round, setRound] = useState(0); // muda → remonta os blocos
  const [tiles, setTiles] = useState<Tile[]>(() => buildTiles(cards));
  const [selected, setSelected] = useState<string | null>(null);
  const [moves, setMoves] = useState(0);
  const [misses, setMisses] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const totalPairs = useMemo(() => tiles.length / 2, [tiles]);
  const matchedPairs = useMemo(() => tiles.filter((t) => t.matched).length / 2, [tiles]);
  // Fim da rodada é DERIVADO (todos combinados) — evita setState em efeito.
  const done = tiles.length > 0 && tiles.every((t) => t.matched);

  // Cronômetro: conta enquanto o jogo não terminou.
  useEffect(() => {
    if (done) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [done, round]);

  const newRound = useCallback(() => {
    setTiles(buildTiles(cards));
    setSelected(null);
    setMoves(0);
    setMisses(0);
    setSeconds(0);
    setRound((r) => r + 1);
  }, [cards]);

  const handleClick = (tile: Tile) => {
    if (tile.matched || tile.wrong || done) return;
    if (selected === tile.key) { setSelected(null); return; } // desmarca

    if (selected === null) {
      setSelected(tile.key);
      return;
    }

    const first = tiles.find((t) => t.key === selected);
    if (!first) { setSelected(tile.key); return; }
    setMoves((m) => m + 1);

    // Par correto: mesmo card, lados diferentes.
    if (first.cardId === tile.cardId && first.side !== tile.side) {
      setTiles((prev) => prev.map((t) => (t.key === first.key || t.key === tile.key ? { ...t, matched: true } : t)));
      setSelected(null);
    } else {
      // Erro: pisca vermelho e limpa.
      setMisses((m) => m + 1);
      setTiles((prev) => prev.map((t) => (t.key === first.key || t.key === tile.key ? { ...t, wrong: true } : t)));
      setSelected(null);
      const a = first.key, b = tile.key;
      setTimeout(() => {
        setTiles((prev) => prev.map((t) => (t.key === a || t.key === b ? { ...t, wrong: false } : t)));
      }, 650);
    }
  };

  const accuracy = moves > 0 ? Math.round(((moves - misses) / moves) * 100) : 100;

  // Baralho com menos de 2 cartões: não dá pra formar pares.
  if (cards.length < 2) {
    return (
      <div className="mx-auto max-w-md p-8 text-center">
        <p className="text-lg font-semibold">Poucos cartões</p>
        <p className="mt-1 text-sm text-muted-foreground">O jogo Combinar precisa de pelo menos 2 cartões neste baralho.</p>
        <Link href="/flashcards" className="mt-6 inline-block">
          <Button variant="outline" className="gap-2"><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-5xl px-4 py-6">
      {/* Barra superior: sair + placar */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link href="/flashcards">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" /> Sair
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-sm font-semibold tabular-nums">
            <Timer className="h-3.5 w-3.5 text-primary" /> {formatClock(seconds)}
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-muted/50 px-3 py-1.5 text-sm font-semibold tabular-nums">
            <Zap className="h-3.5 w-3.5 text-amber-500" /> {matchedPairs}/{totalPairs}
          </span>
        </div>
      </div>

      <div className="mb-5 text-center">
        <h1 className="flex items-center justify-center gap-2 text-xl font-bold">
          <Sparkles className="h-5 w-5 text-primary" /> Combinar — {deck.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Toque num termo e na definição correspondente para formar o par.</p>
      </div>

      {/* Grade de blocos */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {tiles.map((tile) => {
          const isSelected = selected === tile.key;
          return (
            <button
              key={tile.key}
              type="button"
              onClick={() => handleClick(tile)}
              disabled={tile.matched}
              className={cn(
                "flex min-h-[92px] items-center justify-center rounded-2xl border p-3 text-center text-sm leading-snug transition-all duration-200",
                tile.matched && "scale-95 border-emerald-500/30 bg-emerald-500/10 text-emerald-700 opacity-0 dark:text-emerald-300",
                tile.wrong && "animate-pulse border-rose-500/50 bg-rose-500/10 text-rose-600",
                isSelected && "border-primary bg-primary/10 text-primary shadow-md ring-2 ring-primary/30",
                !tile.matched && !tile.wrong && !isSelected && "border-border/50 bg-card hover:border-primary/40 hover:bg-muted/40",
              )}
            >
              <span className="line-clamp-4">{tile.text}</span>
            </button>
          );
        })}
      </div>

      {/* Tela de vitória */}
      {done && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-6 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm space-y-5 rounded-[2rem] border border-border/50 bg-card p-8 text-center shadow-2xl animate-in zoom-in-95">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400/20 to-primary/10 text-amber-500">
              <Trophy className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black">Rodada completa! 🎉</h2>
              <p className="mt-1 text-sm text-muted-foreground">Você combinou {totalPairs} pares.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-lg font-black tabular-nums">{formatClock(seconds)}</p>
                <p className="text-[10px] uppercase text-muted-foreground">tempo</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-lg font-black tabular-nums">{accuracy}%</p>
                <p className="text-[10px] uppercase text-muted-foreground">precisão</p>
              </div>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-lg font-black tabular-nums">{misses}</p>
                <p className="text-[10px] uppercase text-muted-foreground">erros</p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Button onClick={newRound} className="h-11 gap-2 rounded-xl font-bold">
                <RotateCcw className="h-4 w-4" /> {cards.length > ROUND_SIZE ? "Próxima rodada" : "Jogar de novo"}
              </Button>
              <Link href="/flashcards">
                <Button variant="ghost" className="h-10 w-full rounded-xl text-muted-foreground">Voltar à biblioteca</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
