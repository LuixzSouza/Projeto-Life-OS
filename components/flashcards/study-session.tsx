"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  RotateCw,
  CheckCircle,
  XCircle,
  ArrowRight,
  Shuffle,
  Repeat,
  Sparkles,
  X,
  Code2,
  BrainCircuit,
  LayoutGrid,
  Layers,
  Settings2,
  Zap,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { Flashcard, FlashcardDeck } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface StudySessionProps {
  deck: FlashcardDeck;
  cards: Flashcard[];
}

// --- UTILS (Funções Puras) ---

function RichTextDisplay({
  text,
  isDark = false,
  compact = false,
}: {
  text: string;
  isDark?: boolean;
  compact?: boolean;
}) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="w-full text-left">
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3).trim();
          return (
            <div
              key={i}
              className={cn(
                "my-3 rounded-lg overflow-hidden border shadow-inner",
                isDark ? "bg-slate-900 border-slate-800" : "bg-muted/50 border-border",
                compact ? "text-[10px]" : "text-sm"
              )}
            >
              {!compact && (
                <div className={cn(
                  "flex items-center gap-2 px-3 py-1.5 border-b",
                  isDark ? "bg-slate-800 border-slate-700" : "bg-muted border-border"
                )}>
                  <Code2 className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Code Snippet
                  </span>
                </div>
              )}
              <pre
                className={`p-3 overflow-x-auto font-mono text-primary scrollbar-thin scrollbar-thumb-primary/20 ${
                  compact ? "max-h-20" : ""
                }`}
              >
                <code>{code}</code>
              </pre>
            </div>
          );
        }
        return (
          <p
            key={i}
            className={cn(
              "whitespace-pre-wrap leading-relaxed text-center",
              isDark ? "text-slate-300" : "text-foreground/90",
              compact ? "line-clamp-3 text-xs" : "text-base md:text-lg font-medium"
            )}
          >
            {part}
          </p>
        );
      })}
    </div>
  );
}

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateQuizOptions(targetCard: Flashcard, allCards: Flashcard[]) {
  if (allCards.length < 4 || !targetCard) return [];

  const correctOption = targetCard.definition;
  const otherOptions = allCards
    .filter((c) => c.id !== targetCard.id)
    .map((c) => c.definition);

  const distractors = shuffleArray(otherOptions).slice(0, 3);
  return shuffleArray([...distractors, correctOption]);
}

function getInitialQueue(cards: Flashcard[], mode: string | null) {
  let newQueue = [...cards];
  if (mode === "smart") {
    newQueue.sort((a, b) => (a.box || 0) - (b.box || 0));
  } else {
    newQueue = shuffleArray(newQueue);
  }
  return newQueue;
}

// --- COMPONENTE PRINCIPAL ---

export function StudySession({ deck, cards: initialCards }: StudySessionProps) {
  const searchParams = useSearchParams();
  const mode = searchParams.get("mode");

  const [queue, setQueue] = useState(() => getInitialQueue(initialCards, mode));
  const [currentOptions, setCurrentOptions] = useState(() =>
    queue.length > 0 ? generateQuizOptions(queue[0], initialCards) : []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const [isQuizMode, setIsQuizMode] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [wrongCards, setWrongCards] = useState<Flashcard[]>([]);

  const currentCard = queue[currentIndex];
  const canUseQuiz = queue.length >= 4;
  const activeMode = isQuizMode && canUseQuiz ? "quiz" : "flip";
  const progress = queue.length > 0 ? ((currentIndex) / queue.length) * 100 : 0;

  // --- HANDLERS ---

  const shuffleRemaining = () => {
    const done = queue.slice(0, currentIndex + 1);
    const remaining = queue.slice(currentIndex + 1);

    if (remaining.length === 0) {
      toast.info("Não há mais cartas para embaralhar.");
      return;
    }

    const shuffledRemaining = shuffleArray(remaining);
    setQueue([...done, ...shuffledRemaining]);
    toast.success("Cartas seguintes embaralhadas!");

    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
  };

  const restartFull = () => {
    const resetQueue = getInitialQueue(initialCards, mode);
    setQueue(resetQueue);
    setCurrentOptions(
      resetQueue.length > 0
        ? generateQuizOptions(resetQueue[0], initialCards)
        : []
    );

    setWrongCards([]);
    setStats({ correct: 0, wrong: 0 });
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsAnswerRevealed(false);
    setSelectedOption(null);
    setIsFinished(false);
  };

  const nextCard = () => {
    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextCardItem = queue[nextIndex];

      setIsFlipped(false);
      setIsAnswerRevealed(false);
      setSelectedOption(null);

      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setCurrentOptions(generateQuizOptions(nextCardItem, initialCards));
      }, 300);
    } else {
      setIsFinished(true);
    }
  };

  const handleFlipResponse = (isCorrect: boolean) => {
    updateStats(isCorrect);
    nextCard();
  };

  const handleQuizSelection = (option: string) => {
    if (isAnswerRevealed) return;

    setSelectedOption(option);
    setIsAnswerRevealed(true);

    const isCorrect = option === currentCard.definition;
    updateStats(isCorrect);

    const delay = isCorrect ? 1000 : 2500;
    setTimeout(() => nextCard(), delay);
  };

  const updateStats = (isCorrect: boolean) => {
    if (isCorrect) {
      setStats((prev) => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setStats((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
      setWrongCards((prev) => [...prev, currentCard]);
    }
  };

  const restartWrong = () => {
    const newQueue = [...wrongCards];
    setQueue(newQueue);
    setCurrentOptions(
      newQueue.length > 0
        ? generateQuizOptions(newQueue[0], initialCards)
        : []
    );

    setWrongCards([]);
    setStats({ correct: 0, wrong: 0 });
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsAnswerRevealed(false);
    setSelectedOption(null);
    setIsFinished(false);
  };

  // --- TELA DE RESULTADO ---
  if (isFinished) {
    const score = Math.round((stats.correct / queue.length) * 100);

    return (
      <div className="max-w-3xl mx-auto p-6 flex flex-col items-center justify-center min-h-[85vh] text-center space-y-12 animate-in zoom-in-95 duration-500">
        
        {/* HEADER DE RESULTADO */}
        <div className="space-y-6 relative">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full opacity-20 -z-10" />
          <div className="inline-flex p-6 rounded-3xl bg-card border border-border/50 shadow-xl mb-2">
            {score >= 70 ? (
              <Sparkles className="h-16 w-16 text-amber-500 fill-amber-500/20" />
            ) : (
              <BrainCircuit className="h-16 w-16 text-primary" />
            )}
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-black tracking-tight text-foreground">
                {score >= 90 ? "Dominado!" : score >= 70 ? "Muito Bom!" : "Bom Esforço!"}
            </h1>
            <p className="text-xl text-muted-foreground font-medium">
                Você revisou <strong>{queue.length}</strong> cartões
            </p>
          </div>
        </div>

        {/* ESTATÍSTICAS */}
        <div className="grid grid-cols-2 gap-6 w-full max-w-lg">
          <Card className="bg-emerald-500/5 border-emerald-500/20 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-8 flex flex-col items-center gap-2">
              <span className="text-sm font-bold text-emerald-600 uppercase tracking-widest">
                Acertos
              </span>
              <span className="text-6xl font-black text-emerald-600">
                {stats.correct}
              </span>
            </CardContent>
          </Card>
          
          <Card className="bg-rose-500/5 border-rose-500/20 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-8 flex flex-col items-center gap-2">
              <span className="text-sm font-bold text-rose-600 uppercase tracking-widest">
                Erros
              </span>
              <span className="text-6xl font-black text-rose-600">
                {stats.wrong}
              </span>
            </CardContent>
          </Card>
        </div>

        {/* AÇÕES FINAIS */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          {wrongCards.length > 0 && (
            <Button
              onClick={restartWrong}
              size="lg"
              className="w-full h-14 text-base font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform"
            >
              <RotateCw className="mr-2 h-5 w-5" /> 
              Revisar Erros ({wrongCards.length})
            </Button>
          )}
          
          <Button
            onClick={restartFull}
            variant={wrongCards.length > 0 ? "outline" : "default"}
            size="lg"
            className={cn(
                "w-full h-14 text-base font-bold transition-transform hover:scale-[1.02]",
                wrongCards.length === 0 && "shadow-xl shadow-primary/20"
            )}
          >
            <Repeat className="mr-2 h-5 w-5" /> 
            Recomeçar Tudo
          </Button>
        </div>
        
        <Link href="/flashcards">
            <Button variant="link" className="text-muted-foreground hover:text-foreground">
                Voltar para Biblioteca
            </Button>
        </Link>
      </div>
    );
  }

  // --- TELA DE ESTUDO (SESSION) ---
  return (
    <div className="flex flex-col h-[calc(100vh-20px)] sm:h-screen max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 overflow-hidden">
      
      {/* 1. HEADER DA SESSÃO */}
      <div className="flex flex-col gap-6 mb-6 shrink-0">
        <div className="flex items-center justify-between">
            
            {/* Esquerda: Botão Sair + Contador */}
            <div className="flex items-center gap-4">
                <Link href="/flashcards">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted/80 text-muted-foreground transition-colors" title="Sair">
                        <X className="h-5 w-5" />
                    </Button>
                </Link>
                
                <div className="h-10 px-4 flex items-center bg-card rounded-xl border shadow-sm">
                    <span className="font-mono text-sm font-bold text-muted-foreground">
                        <span className="text-foreground text-lg">{currentIndex + 1}</span>
                        <span className="mx-1.5 opacity-30 text-lg">/</span>
                        {queue.length}
                    </span>
                </div>

                {mode === "smart" ? (
                    <Badge variant="secondary" className="hidden sm:flex bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 gap-1.5 h-8 px-3 text-sm">
                        <GraduationCap className="h-4 w-4" /> 
                        Modo Memória
                    </Badge>
                ) : (
                    <Badge variant="secondary" className="hidden sm:flex bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 border-amber-500/20 gap-1.5 h-8 px-3 text-sm">
                        <Zap className="h-4 w-4" /> 
                        Modo Prova
                    </Badge>
                )}
            </div>

            {/* Direita: Controles de Visualização + Menu */}
            <div className="flex items-center gap-3">
                {canUseQuiz && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsQuizMode(!isQuizMode)}
                        className="hidden sm:flex gap-2 text-xs font-bold uppercase tracking-wider h-10 px-4 shadow-sm border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                    >
                        {isQuizMode ? <LayoutGrid className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                        {isQuizMode ? "Modo Quiz" : "Modo Flip"}
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/60 hover:bg-muted">
                            <Settings2 className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Opções de Estudo</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={shuffleRemaining} className="cursor-pointer gap-2 py-2.5">
                            <Shuffle className="h-4 w-4 text-muted-foreground" /> Embaralhar Restantes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={restartFull} className="text-destructive focus:text-destructive cursor-pointer gap-2 py-2.5">
                            <Repeat className="h-4 w-4" /> Reiniciar Sessão
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        {/* Barra de Progresso */}
        <div className="w-full bg-muted/50 h-2 rounded-full overflow-hidden">
            <div 
                className={cn(
                    "h-full transition-all duration-500 ease-out rounded-full",
                    mode === "smart" ? "bg-emerald-500" : "bg-primary"
                )}
                style={{ width: `${progress}%` }}
            />
        </div>
      </div>

      {/* 2. ÁREA DO CARTÃO (FLEX GROW) */}
      <div className="flex-1 flex flex-col relative w-full min-h-0 perspective-[1000px]">
        
        {/* CARTÃO (Flipper) */}
        <div className="flex-1 relative group">
            <div
                className="w-full h-full relative transition-all duration-500 transform-style-3d cursor-pointer"
                onClick={() => activeMode === "flip" && !isFlipped && setIsFlipped(true)}
                style={{
                    transformStyle: "preserve-3d",
                    transform: activeMode === "flip" && isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
            >
                {/* --- FRENTE (PERGUNTA) --- */}
                <div
                    className={cn(
                        "absolute inset-0 w-full h-full backface-hidden rounded-[2rem] flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-y-auto scrollbar-hide border",
                        "bg-card shadow-2xl shadow-primary/5 hover:shadow-primary/10 transition-shadow",
                        activeMode === "quiz" ? "border-border/60" : "border-primary/20"
                    )}
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <div className="flex flex-col items-center max-w-4xl w-full gap-8">
                        <Badge variant="outline" className="uppercase tracking-[0.2em] text-[10px] font-extrabold border-primary/20 text-primary/80 bg-primary/5 px-3 py-1">
                            Pergunta
                        </Badge>
                        
                        <div className="w-full">
                            <div className="text-2xl md:text-4xl font-bold leading-tight text-foreground tracking-tight">
                                <RichTextDisplay text={currentCard.term} />
                            </div>
                        </div>

                        {activeMode === "flip" && !isFlipped && (
                            <div className="absolute bottom-8 md:bottom-12 text-sm font-medium text-muted-foreground/60 flex items-center gap-2 animate-bounce">
                                Toque para revelar <ArrowRight className="h-4 w-4" />
                            </div>
                        )}
                    </div>
                </div>

                {/* --- VERSO (RESPOSTA - Só aparece no Flip) --- */}
                <div
                    className="absolute inset-0 w-full h-full backface-hidden rounded-[2rem] flex flex-col items-center justify-center p-8 md:p-12 text-center overflow-y-auto scrollbar-hide bg-slate-950 border border-slate-800 shadow-2xl"
                    style={{ 
                        backfaceVisibility: "hidden", 
                        transform: "rotateY(180deg)" 
                    }}
                >
                    <div className="flex flex-col items-center max-w-4xl w-full gap-8">
                        <Badge variant="outline" className="uppercase tracking-[0.2em] text-[10px] font-extrabold border-indigo-500/30 text-indigo-300 bg-indigo-500/10 px-3 py-1">
                            Resposta
                        </Badge>
                        
                        <div className="w-full">
                            <div className="text-xl md:text-3xl font-medium leading-relaxed text-slate-100">
                                <RichTextDisplay text={currentCard.definition} isDark={true} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* 3. ÁREA DE CONTROLE (Botões / Quiz) */}
        <div className={`mt-8 shrink-0 transition-all duration-500 ease-in-out ${activeMode === 'quiz' ? 'opacity-100 translate-y-0' : 'h-24'}`}>
            
            {/* --- CONTROLES MODO QUIZ --- */}
            {activeMode === "quiz" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2">
                    {currentOptions.map((option, idx) => {
                        const isSelected = selectedOption === option;
                        const isCorrect = option === currentCard.definition;

                        let styleClass = "border-border bg-card hover:border-primary/40 hover:bg-accent/50 hover:shadow-md";
                        let icon = <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground mr-4 border border-border group-hover:border-primary/40 group-hover:text-primary transition-colors">{String.fromCharCode(65 + idx)}</div>;
                        
                        if (isAnswerRevealed) {
                            if (isCorrect) {
                                styleClass = "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30";
                                icon = <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white mr-4 shadow-sm"><CheckCircle className="h-5 w-5" /></div>;
                            }
                            else if (isSelected && !isCorrect) {
                                styleClass = "border-rose-500/50 bg-rose-500/10 text-rose-700 dark:text-rose-300 opacity-90";
                                icon = <div className="h-8 w-8 rounded-lg bg-rose-500 flex items-center justify-center text-white mr-4 shadow-sm"><XCircle className="h-5 w-5" /></div>;
                            }
                            else {
                                styleClass = "opacity-40 grayscale border-transparent bg-muted/20";
                            }
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleQuizSelection(option)}
                                disabled={isAnswerRevealed}
                                className={cn(
                                    "relative p-5 rounded-2xl border-2 text-left transition-all duration-200 flex items-center group outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                                    !isAnswerRevealed && "active:scale-[0.98]",
                                    styleClass
                                )}
                            >
                                {icon}
                                
                                <div className="flex-1 min-w-0 text-sm md:text-base font-medium pr-2 leading-snug">
                                    <RichTextDisplay text={option} compact={true} />
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* --- CONTROLES MODO FLIP --- */}
            {activeMode === "flip" && (
                <div className="flex items-center justify-center h-full">
                    {!isFlipped ? (
                        <Button
                            size="lg"
                            className="w-full max-w-sm h-16 text-lg font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] hover:shadow-primary/30 transition-all bg-primary text-primary-foreground"
                            onClick={() => setIsFlipped(true)}
                        >
                            Mostrar Resposta
                        </Button>
                    ) : (
                        <div className="flex gap-4 w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <Button
                                size="lg"
                                variant="outline"
                                className="flex-1 h-16 text-lg font-bold border-2 border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 hover:border-rose-300 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-300 dark:hover:bg-rose-900/30 rounded-2xl transition-all hover:-translate-y-1 shadow-sm"
                                onClick={() => handleFlipResponse(false)}
                            >
                                <XCircle className="mr-2 h-6 w-6" /> Errei
                            </Button>

                            <Button
                                size="lg"
                                className="flex-1 h-16 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white border-2 border-transparent shadow-xl shadow-emerald-500/20 rounded-2xl transition-all hover:-translate-y-1"
                                onClick={() => handleFlipResponse(true)}
                            >
                                <CheckCircle className="mr-2 h-6 w-6" /> Acertei
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
}