"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Repeat,
  X,
  Code2,
  BrainCircuit,
  Trophy,
  Keyboard,
  PenLine,
  CornerDownLeft,
  Shuffle,
  ArrowLeftRight,
} from "lucide-react";
import Link from "next/link";
import { Flashcard, FlashcardDeck } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { reviewFlashcard } from "@/app/(dashboard)/flashcards/actions"; // O servidor que alimenta a IA de revisão
import { previewLabel, type ReviewRating } from "@/lib/srs";
import { matchLevel } from "@/lib/text-similarity";
import { findVideoEmbed } from "@/lib/media-embed";
import { VideoEmbed } from "@/components/flashcards/video-embed";
import { SpeakButton } from "@/components/flashcards/speak-button";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

interface StudySessionProps {
  /** Só o título é usado — permite sessões sintéticas (ex.: Revisão Geral). */
  deck: Pick<FlashcardDeck, "title">;
  cards: Flashcard[];
  /** "flip" (padrão): vira e auto-avalia. "written": digita a resposta (recall ativo). */
  mode?: "flip" | "written";
}

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

export function StudySession({ deck, cards: initialCards, mode = "flip" }: StudySessionProps) {
  const written = mode === "written";
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

  // Modo Escrita: resposta digitada do cartão atual + foco automático no input.
  const [typedAnswer, setTypedAnswer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Estudo invertido: mostra a definição e você lembra o termo (memória nos dois sentidos).
  const [reverse, setReverse] = useState(false);

  // Estatísticas Visuais
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  const currentCard = queue[currentIndex];
  const progress = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0;

  // Prévia do intervalo de cada nota ("Errei · 10 min", "Bom · 4 dias"). Usa o
  // MESMO motor (lib/srs.ts) que o servidor grava — a prévia nunca mente. Fixa o
  // `now` por cartão para os 4 rótulos saírem do mesmo instante.
  const previews = useMemo(() => {
    if (!currentCard) return null;
    const now = new Date();
    return {
      AGAIN: previewLabel(currentCard, "AGAIN", now),
      HARD: previewLabel(currentCard, "HARD", now),
      GOOD: previewLabel(currentCard, "GOOD", now),
      EASY: previewLabel(currentCard, "EASY", now),
    } satisfies Record<ReviewRating, string>;
  }, [currentCard]);

  // Blocos de conteúdo: a imagem e o vídeo "seguem" seu texto. No estudo
  // invertido (reverse) a definição vira a pergunta e o termo a resposta.
  const termBlock = useMemo(
    () =>
      currentCard
        ? { text: currentCard.term, image: currentCard.imageUrl, video: findVideoEmbed(currentCard.term) }
        : null,
    [currentCard],
  );
  const defBlock = useMemo(
    () =>
      currentCard
        ? { text: currentCard.definition, image: null as string | null, video: findVideoEmbed(currentCard.definition) }
        : null,
    [currentCard],
  );
  const front = reverse ? defBlock : termBlock;
  const back = reverse ? termBlock : defBlock;

  // Modo Escrita: dica de quão perto a resposta digitada ficou (só auxílio — a
  // nota final é do usuário). Compara com a RESPOSTA (verso atual). Sugere a nota.
  const matchHint = useMemo(() => {
    if (!written || !back || !typedAnswer.trim()) return null;
    return matchLevel(typedAnswer, back.text);
  }, [written, back, typedAnswer]);
  const suggestedRating: ReviewRating | null =
    matchHint === "match" ? "GOOD" : matchHint === "close" ? "HARD" : matchHint === "off" ? "AGAIN" : null;

  // Revela a resposta (vira o cartão) — usado no Modo Escrita pelo Enter/botão.
  const reveal = useCallback(() => setIsFlipped(true), []);

  // Foca o input ao trocar de cartão no Modo Escrita.
  useEffect(() => {
    if (written && !isFlipped) {
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [written, isFlipped, currentIndex]);

  // --- ATALHOS DE TECLADO ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (isFinished || isSaving) return;

    if (!isFlipped) {
      // No Modo Escrita o atalho de virar é desligado — o input recebe o Espaço
      // e o Enter (que revela). Só o modo flip vira com a barra/Enter global.
      if (!written && (e.code === "Space" || e.code === "Enter")) {
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
  }, [isFlipped, isFinished, isSaving, currentIndex, written]);

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

    // 3. Reaprendizado: se errou, o cartão volta algumas posições à frente (não
    // no fim) — reforça ainda nesta sessão, mas sem reaparecer na cara.
    let nextQueue = queue;
    if (rating === "AGAIN") {
      const insertAt = Math.min(currentIndex + 4, queue.length);
      nextQueue = [...queue.slice(0, insertAt), currentCard, ...queue.slice(insertAt)];
      setQueue(nextQueue);
    }

    // 4. Avança ou encerra. Usa o tamanho da fila JÁ atualizada — senão errar a
    // última carta encerraria a sessão sem reaprendê-la.
    if (currentIndex + 1 >= nextQueue.length) {
      setIsFinished(true);
    } else {
      setIsFlipped(false);
      setTypedAnswer(""); // limpa a resposta digitada para o próximo cartão
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 150); // Timeout leve para animação 3D
    }

    setIsSaving(false);
  };

  const restartFull = () => {
    window.location.reload(); // O método mais limpo para resetar servidor e cliente juntos aqui
  };

  // Embaralha só os cartões que ainda VÊM (mantém o atual e os já vistos no lugar).
  const shuffleRemaining = () => {
    setQueue((prev) => {
      const head = prev.slice(0, currentIndex + 1);
      const tail = prev.slice(currentIndex + 1);
      for (let i = tail.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tail[i], tail[j]] = [tail[j], tail[i]];
      }
      return [...head, ...tail];
    });
  };

  // Inverte termo/definição: volta a mostrar a "pergunta" (verso oculto de novo).
  const toggleReverse = () => {
    setReverse((r) => !r);
    setIsFlipped(false);
    setTypedAnswer("");
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
                <div className="flex items-center justify-center gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] uppercase font-bold tracking-widest px-3">
                        {deck.title}
                    </Badge>
                    {written && (
                        <Badge variant="secondary" className="gap-1 border-none bg-amber-500/10 text-amber-600 px-2 text-[10px] font-bold uppercase tracking-widest">
                            <PenLine className="h-3 w-3" /> Escrita
                        </Badge>
                    )}
                </div>
                <div className="font-mono text-sm font-bold text-muted-foreground">
                    <span className="text-foreground text-lg">{currentIndex + 1}</span>
                    <span className="mx-1.5 opacity-30">/</span>{queue.length}
                </div>
            </div>

            <div className="flex items-center gap-1.5">
                <Button
                    variant="outline" size="icon" onClick={shuffleRemaining}
                    title="Embaralhar os próximos cartões"
                    className="h-12 w-12 rounded-xl text-muted-foreground shadow-sm transition-colors hover:text-primary hover:bg-primary/10"
                >
                    <Shuffle className="h-5 w-5" />
                </Button>
                <Button
                    variant="outline" size="icon" onClick={toggleReverse}
                    title={reverse ? "Voltar ao normal (termo → definição)" : "Inverter (definição → termo)"}
                    className={cn(
                        "h-12 w-12 rounded-xl shadow-sm transition-colors",
                        reverse ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground hover:text-primary hover:bg-primary/10",
                    )}
                >
                    <ArrowLeftRight className="h-5 w-5" />
                </Button>
            </div>
        </div>

        <div className="w-full bg-muted/60 h-2 rounded-full overflow-hidden shadow-inner">
            <div className="h-full transition-all duration-700 ease-out rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ÁREA DO CARTÃO (3D Flip Effect) */}
      <div className="flex-1 flex flex-col relative w-full min-h-0 perspective-[2000px]">
        <div className="flex-1 relative w-full max-w-3xl mx-auto">
            
            <div
                className={cn("w-full h-full relative transition-all duration-700 ease-out transform-style-3d", isFlipped ? "rotate-y-180" : "hover:-translate-y-2 hover:shadow-2xl", written ? "cursor-default" : "cursor-pointer")}
                onClick={() => !written && !isFlipped && setIsFlipped(true)}
                style={{ transformStyle: "preserve-3d" }}
            >
                {/* --- FRENTE (PERGUNTA) --- */}
                <div className={cn("absolute inset-0 w-full h-full backface-hidden rounded-[2.5rem] flex flex-col items-center justify-center p-8 sm:p-12 text-center overflow-y-auto scrollbar-hide border-2 bg-card shadow-2xl", "border-primary/10 hover:border-primary/30 transition-all")} style={{ backfaceVisibility: "hidden" }}>
                    <Badge variant="outline" className="absolute top-8 left-8 uppercase tracking-[0.2em] text-[10px] font-black text-muted-foreground border-border/60 px-3 py-1.5">
                        Frente
                    </Badge>
                    <SpeakButton text={front?.text} className="absolute top-6 right-6" />
                    <div className="w-full">
                        <RichTextDisplay text={front?.text ?? ""} />
                        {front?.image && (
                            // eslint-disable-next-line @next/next/no-img-element -- base64 local (images.unoptimized)
                            <img
                                src={front.image}
                                alt="Imagem do cartão"
                                className="mx-auto mt-5 max-h-[40vh] w-auto rounded-xl border border-border/50 object-contain shadow-sm"
                            />
                        )}
                        {front?.video && <VideoEmbed embed={front.video} />}

                        {/* MODO ESCRITA: digita a resposta antes de revelar. */}
                        {written && !isFlipped && (
                            <div className="mx-auto mt-8 w-full max-w-xl" onClick={(e) => e.stopPropagation()}>
                                <Input
                                    ref={inputRef}
                                    value={typedAnswer}
                                    onChange={(e) => setTypedAnswer(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") { e.preventDefault(); reveal(); }
                                    }}
                                    placeholder="Digite sua resposta…"
                                    className="h-14 rounded-xl border-border/60 bg-background text-center text-lg shadow-sm focus-visible:ring-primary/30"
                                />
                                <Button onClick={reveal} className="mt-3 h-11 w-full gap-2 rounded-xl font-bold shadow-sm">
                                    <CornerDownLeft className="h-4 w-4" /> Verificar resposta
                                </Button>
                            </div>
                        )}
                    </div>
                    {!written && !isFlipped && (
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
                    <SpeakButton text={back?.text} className="absolute top-6 right-6 text-slate-400 hover:bg-white/10 hover:text-white" />
                    <div className="w-full">
                        {/* MODO ESCRITA: o que você digitou + dica de proximidade. */}
                        {written && (
                            <div className="mx-auto mb-6 w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sua resposta</p>
                                <p className="mt-1 text-base text-slate-100">
                                    {typedAnswer.trim() || <span className="italic text-slate-500">— (em branco)</span>}
                                </p>
                                {matchHint && (
                                    <span
                                        className={cn(
                                            "mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
                                            matchHint === "match" && "bg-emerald-500/15 text-emerald-400",
                                            matchHint === "close" && "bg-amber-500/15 text-amber-400",
                                            matchHint === "off" && "bg-rose-500/15 text-rose-400",
                                        )}
                                    >
                                        {matchHint === "match" ? "✓ Parece certo" : matchHint === "close" ? "≈ Quase lá" : "✗ Confira a resposta"}
                                    </span>
                                )}
                            </div>
                        )}
                        <RichTextDisplay text={back?.text ?? ""} isDark={true} />
                        {back?.image && (
                            // eslint-disable-next-line @next/next/no-img-element -- base64 local (images.unoptimized)
                            <img
                                src={back.image}
                                alt="Imagem do cartão"
                                className="mx-auto mt-5 max-h-[40vh] w-auto rounded-xl border border-slate-700 object-contain shadow-sm"
                            />
                        )}
                        {back?.video && <VideoEmbed embed={back.video} dark />}
                    </div>
                </div>
            </div>
        </div>

        {/* CONTROLES DE AVALIAÇÃO (Aparecem quando o cartão vira) */}
        <div className={cn("mt-8 sm:mt-10 shrink-0 transition-all duration-500 w-full max-w-3xl mx-auto", isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8 pointer-events-none')}>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pb-4">
                
                <Button size="lg" disabled={isSaving} onClick={() => handleRate("AGAIN")} className={cn("flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col gap-0.5 shadow-sm", suggestedRating === "AGAIN" && "ring-2 ring-rose-400 ring-offset-2 ring-offset-background")}>
                  <span className="text-base sm:text-lg">Errei</span>
                  <span className="text-[11px] font-bold opacity-90 tabular-nums">{previews?.AGAIN}</span>
                  <span className="text-[9px] opacity-50 font-mono hidden sm:block tracking-widest">tecla 1</span>
                </Button>

                <Button size="lg" disabled={isSaving} onClick={() => handleRate("HARD")} className={cn("flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col gap-0.5 shadow-sm", suggestedRating === "HARD" && "ring-2 ring-amber-400 ring-offset-2 ring-offset-background")}>
                  <span className="text-base sm:text-lg">Difícil</span>
                  <span className="text-[11px] font-bold opacity-90 tabular-nums">{previews?.HARD}</span>
                  <span className="text-[9px] opacity-50 font-mono hidden sm:block tracking-widest">tecla 2</span>
                </Button>

                <Button size="lg" disabled={isSaving} onClick={() => handleRate("GOOD")} className={cn("flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col gap-0.5 shadow-sm", suggestedRating === "GOOD" && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-background")}>
                  <span className="text-base sm:text-lg">Bom</span>
                  <span className="text-[11px] font-bold opacity-90 tabular-nums">{previews?.GOOD}</span>
                  <span className="text-[9px] opacity-50 font-mono hidden sm:block tracking-widest">tecla 3</span>
                </Button>

                <Button size="lg" disabled={isSaving} onClick={() => handleRate("EASY")} className="flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col gap-0.5 shadow-sm">
                  <span className="text-base sm:text-lg">Fácil</span>
                  <span className="text-[11px] font-bold opacity-90 tabular-nums">{previews?.EASY}</span>
                  <span className="text-[9px] opacity-50 font-mono hidden sm:block tracking-widest">tecla 4</span>
                </Button>

            </div>
        </div>
      </div>
    </div>
  );
}