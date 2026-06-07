"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Repeat,
  X,
  Code2,
  BrainCircuit,
  Trophy,
  Keyboard
} from "lucide-react";
import Link from "next/link";
import { Flashcard, FlashcardDeck } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { reviewFlashcard } from "@/app/(dashboard)/flashcards/actions"; // O servidor que alimenta a IA de revisão

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface StudySessionProps {
  deck: FlashcardDeck;
  cards: Flashcard[];
}

type ReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

/* -------------------------------------------------------------------------- */
/* UTILS (Renderização de Texto)                                              */
/* -------------------------------------------------------------------------- */

function RichTextDisplay({ text, isDark = false }: { text: string; isDark?: boolean; }) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="w-full text-left space-y-4">
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3).trim();
          return (
            <div key={i} className={cn("my-4 rounded-xl overflow-hidden border shadow-inner", isDark ? "bg-slate-900/50 border-slate-700/50" : "bg-muted/50 border-border")}>
              <div className={cn("flex items-center gap-2 px-4 py-2 border-b", isDark ? "bg-slate-800/80 border-slate-700/50" : "bg-muted border-border")}>
                <Code2 className="h-4 w-4 text-primary" />
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Código</span>
              </div>
              <pre className="p-4 overflow-x-auto font-mono text-primary text-sm sm:text-base scrollbar-thin scrollbar-thumb-primary/20">
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        return (
          <p key={i} className={cn("whitespace-pre-wrap leading-relaxed", isDark ? "text-slate-200" : "text-foreground/90", "text-xl sm:text-2xl font-medium text-center balance-text")}>
            {part}
          </p>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTE PRINCIPAL                                                       */
/* -------------------------------------------------------------------------- */

export function StudySession({ deck, cards: initialCards }: StudySessionProps) {
  // Fila de estudos (Para Repetição Espaçada é ideal revisar os mais atrasados primeiro)
  const [queue, setQueue] = useState<Flashcard[]>(() => {
    return [...initialCards].sort((a, b) => {
      const dateA = a.nextReview ? new Date(a.nextReview).getTime() : 0;
      const dateB = b.nextReview ? new Date(b.nextReview).getTime() : 0;
      return dateA - dateB;
    });
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Previne duplo clique

  // Estatísticas Visuais
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  const currentCard = queue[currentIndex];
  const progress = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0;

  // --- ATALHOS DE TECLADO ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isFinished || isSaving) return;

    if (!isFlipped) {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        setIsFlipped(true);
      }
    } else {
      if (e.key === "1") handleRate("AGAIN");
      if (e.key === "2") handleRate("HARD");
      if (e.key === "3") handleRate("GOOD");
      if (e.key === "4") handleRate("EASY");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped, isFinished, isSaving, currentIndex]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);


  // --- AVALIAÇÃO E LÓGICA DO ALGORITMO ---
  const handleRate = async (rating: ReviewRating) => {
    if (isSaving || !currentCard) return;
    setIsSaving(true);

    // 1. Atualiza Stats locais
    setStats((prev) => ({ ...prev, [rating.toLowerCase()]: prev[rating.toLowerCase() as keyof typeof prev] + 1 }));

    // 2. Registra no Servidor
    await reviewFlashcard(currentCard.id, rating);

    // 3. Se errou (AGAIN), joga para o fim da fila para forçar revisão na mesma sessão
    if (rating === "AGAIN") {
      setQueue((prev) => [...prev, currentCard]);
    }

    // 4. Próxima Carta
    if (currentIndex + 1 >= queue.length) {
      setIsFinished(true);
    } else {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 150); // Timeout leve para animação 3D
    }
    
    setIsSaving(false);
  };

  const restartFull = () => {
    window.location.reload(); // O método mais limpo para resetar servidor e cliente juntos aqui
  };

  /* -------------------------------------------------------------------------- */
  /* TELA FINAL DE RESULTADO                                                    */
  /* -------------------------------------------------------------------------- */
  
  if (isFinished) {
    const totalReviewed = stats.again + stats.hard + stats.good + stats.easy;
    const accuracy = totalReviewed > 0 ? ((stats.good + stats.easy) / totalReviewed) * 100 : 0;

    return (
      <div className="max-w-3xl mx-auto p-6 flex flex-col items-center justify-center min-h-[85vh] text-center space-y-12 animate-in zoom-in-95 duration-500">
        <div className="space-y-6 relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-30 -z-10" />
          <div className="inline-flex p-6 rounded-full bg-card border border-border/50 shadow-2xl mb-2 ring-8 ring-primary/5">
            {accuracy >= 70 ? <Trophy className="h-16 w-16 text-amber-500 fill-amber-500/20" /> : <BrainCircuit className="h-16 w-16 text-primary" />}
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground">
                {accuracy >= 90 ? "Impressionante!" : accuracy >= 70 ? "Muito Bom!" : "Bom Esforço!"}
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
                Você revisou <strong className="text-foreground">{totalReviewed}</strong> cartões hoje.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-sm flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-rose-600">{stats.again}</span>
            <span className="text-[10px] font-bold text-rose-600/80 uppercase tracking-widest mt-1">Erros</span>
          </div>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-sm flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-amber-600">{stats.hard}</span>
            <span className="text-[10px] font-bold text-amber-600/80 uppercase tracking-widest mt-1">Difíceis</span>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-sm flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-emerald-600">{stats.good}</span>
            <span className="text-[10px] font-bold text-emerald-600/80 uppercase tracking-widest mt-1">Bons</span>
          </div>
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-sm flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-blue-600">{stats.easy}</span>
            <span className="text-[10px] font-bold text-blue-600/80 uppercase tracking-widest mt-1">Fáceis</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md pt-6">
          <Link href="/flashcards" className="w-full">
             <Button variant="outline" size="lg" className="w-full h-14 text-base font-bold rounded-xl transition-all">
                Sair para Biblioteca
             </Button>
          </Link>
          <Button onClick={restartFull} size="lg" className="w-full h-14 text-base font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform bg-primary text-primary-foreground rounded-xl">
            <Repeat className="mr-2 h-5 w-5" /> Revisar Novamente
          </Button>
        </div>
      </div>
    );
  }

  /* -------------------------------------------------------------------------- */
  /* TELA DE ESTUDO ATIVA                                                       */
  /* -------------------------------------------------------------------------- */
  
  return (
    <div className="flex flex-col h-[calc(100vh-20px)] sm:h-screen max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 overflow-hidden">
      
      {/* HEADER DA SESSÃO */}
      <div className="flex flex-col gap-6 mb-8 shrink-0">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Link href="/flashcards">
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shadow-sm" title="Sair">
                        <X className="h-6 w-6" />
                    </Button>
                </Link>
            </div>
            
            <div className="text-center space-y-1">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold tracking-widest px-3">
                    {deck.title}
                </Badge>
                <div className="font-mono text-sm font-bold text-muted-foreground">
                    <span className="text-foreground text-lg">{currentIndex + 1}</span>
                    <span className="mx-1.5 opacity-30">/</span>{queue.length}
                </div>
            </div>

            <div className="w-12" /> {/* Spacer */}
        </div>

        <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden shadow-inner">
            <div className="h-full transition-all duration-700 ease-out rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ÁREA DO CARTÃO (3D Flip Effect) */}
      <div className="flex-1 flex flex-col relative w-full min-h-0 perspective-[2000px]">
        <div className="flex-1 relative w-full max-w-3xl mx-auto">
            
            <div
                className={cn("w-full h-full relative transition-all duration-700 ease-out cursor-pointer transform-style-3d", isFlipped ? "rotate-y-180" : "hover:-translate-y-2 hover:shadow-2xl")}
                onClick={() => !isFlipped && setIsFlipped(true)}
                style={{ transformStyle: "preserve-3d" }}
            >
                {/* --- FRENTE (PERGUNTA) --- */}
                <div className={cn("absolute inset-0 w-full h-full backface-hidden rounded-[2.5rem] flex flex-col items-center justify-center p-8 sm:p-12 text-center overflow-y-auto scrollbar-hide border-2 bg-card shadow-2xl", "border-primary/10 hover:border-primary/30 transition-all")} style={{ backfaceVisibility: "hidden" }}>
                    <Badge variant="outline" className="absolute top-8 left-8 uppercase tracking-[0.2em] text-[10px] font-black text-muted-foreground border-border/60 px-3 py-1.5">
                        Frente
                    </Badge>
                    <div className="w-full">
                        <RichTextDisplay text={currentCard?.term} />
                    </div>
                    {!isFlipped && (
                        <div className="absolute bottom-8 sm:bottom-12 left-0 right-0 flex justify-center animate-pulse">
                            <span className="text-xs font-bold text-muted-foreground/80 flex items-center gap-2 bg-muted/80 px-5 py-2.5 rounded-full border border-border/50 backdrop-blur-sm shadow-sm">
                                <Keyboard className="h-4 w-4" /> Toque ou aperte <strong className="text-foreground">Espaço</strong> para virar
                            </span>
                        </div>
                    )}
                </div>

                {/* --- VERSO (RESPOSTA) --- */}
                <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 rounded-[2.5rem] flex flex-col items-center justify-center p-8 sm:p-12 text-center overflow-y-auto scrollbar-hide bg-slate-950 border border-slate-800 shadow-2xl" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                    <Badge variant="outline" className="absolute top-8 left-8 uppercase tracking-[0.2em] text-[10px] font-black border-primary/30 text-primary/80 bg-primary/10 px-3 py-1.5">
                        Verso
                    </Badge>
                    <div className="w-full">
                        <RichTextDisplay text={currentCard?.definition} isDark={true} />
                    </div>
                </div>
            </div>
        </div>

        {/* CONTROLES DE AVALIAÇÃO (Aparecem quando o cartão vira) */}
        <div className={cn("mt-8 sm:mt-10 shrink-0 transition-all duration-500 w-full max-w-3xl mx-auto", isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none')}>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pb-4">
                
                <Button size="lg" disabled={isSaving} onClick={() => handleRate("AGAIN")} className="flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col gap-1 shadow-sm">
                  <span className="text-base sm:text-lg">Errei</span>
                  <span className="text-[10px] opacity-70 font-mono hidden sm:block tracking-widest mt-1">Aperte 1</span>
                </Button>
                
                <Button size="lg" disabled={isSaving} onClick={() => handleRate("HARD")} className="flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col gap-1 shadow-sm">
                  <span className="text-base sm:text-lg">Difícil</span>
                  <span className="text-[10px] opacity-70 font-mono hidden sm:block tracking-widest mt-1">Aperte 2</span>
                </Button>
                
                <Button size="lg" disabled={isSaving} onClick={() => handleRate("GOOD")} className="flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col gap-1 shadow-sm">
                  <span className="text-base sm:text-lg">Bom</span>
                  <span className="text-[10px] opacity-70 font-mono hidden sm:block tracking-widest mt-1">Aperte 3</span>
                </Button>

                <Button size="lg" disabled={isSaving} onClick={() => handleRate("EASY")} className="flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col gap-1 shadow-sm">
                  <span className="text-base sm:text-lg">Fácil</span>
                  <span className="text-[10px] opacity-70 font-mono hidden sm:block tracking-widest mt-1">Aperte 4</span>
                </Button>

            </div>
        </div>
      </div>
    </div>
  );
}