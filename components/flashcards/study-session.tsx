"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RotateCw, CheckCircle, XCircle, ArrowRight, Shuffle, Repeat, HelpCircle, Sparkles, X, Code2, BrainCircuit, LayoutGrid, Layers, Settings2, Zap, GraduationCap } from "lucide-react";
import Link from "next/link";
import { Flashcard, FlashcardDeck } from "@prisma/client";
import { cn } from "@/lib/utils";
import { useSearchParams } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface StudySessionProps {
  deck: FlashcardDeck;
  cards: Flashcard[];
}

// --- UTILS (Funções Puras) ---

function RichTextDisplay({ text, isDark = false, compact = false }: { text: string, isDark?: boolean, compact?: boolean }) {
  if (!text) return null;
  const parts = text.split(/(```[\s\S]*?```)/g);

  return (
    <div className="w-full text-left">
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.slice(3, -3).trim();
          return (
            <div key={i} className={`my-2 rounded overflow-hidden border border-indigo-500/30 bg-[#1e1e1e] shadow-inner ${compact ? 'text-[10px]' : 'text-sm'}`}>
                {!compact && (
                    <div className="flex items-center gap-2 px-3 py-1 bg-[#2d2d2d] border-b border-white/10">
                        <Code2 className="h-3 w-3 text-indigo-400" />
                        <span className="text-[10px] font-mono text-zinc-400">snippet</span>
                    </div>
                )}
                <pre className={`p-2 overflow-x-auto font-mono text-indigo-100 scrollbar-thin scrollbar-thumb-indigo-500/30 ${compact ? 'max-h-20' : ''}`}>
                    <code>{code}</code>
                </pre>
            </div>
          );
        }
        return (
            <p key={i} className={cn(
                "whitespace-pre-wrap leading-relaxed", 
                isDark ? "text-indigo-100" : "text-zinc-700 dark:text-zinc-300",
                compact ? "line-clamp-3 text-xs" : ""
            )}>
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

// Gera opções para um cartão específico (Pura)
function generateQuizOptions(targetCard: Flashcard, allCards: Flashcard[]) {
    if (allCards.length < 4 || !targetCard) return [];
    
    const correctOption = targetCard.definition;
    const otherOptions = allCards
        .filter(c => c.id !== targetCard.id)
        .map(c => c.definition);
    
    const distractors = shuffleArray(otherOptions).slice(0, 3);
    return shuffleArray([...distractors, correctOption]);
}

// Prepara a fila inicial baseada no modo
function getInitialQueue(cards: Flashcard[], mode: string | null) {
    let newQueue = [...cards];
    if (mode === 'smart') {
        newQueue.sort((a, b) => (a.box || 0) - (b.box || 0));
    } else {
        newQueue = shuffleArray(newQueue);
    }
    return newQueue;
}

export function StudySession({ deck, cards: initialCards }: StudySessionProps) {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode'); 

  // --- ESTADOS COM INICIALIZAÇÃO PREGUIÇOSA (Lazy Init) ---
  // Isso resolve todos os erros de re-render, pois roda apenas uma vez na montagem
  
  // 1. Fila de Cartas
  const [queue, setQueue] = useState(() => getInitialQueue(initialCards, mode));
  
  // 2. Opções do Quiz (Já inicializa com as opções do primeiro card da fila!)
  const [currentOptions, setCurrentOptions] = useState(() => 
      queue.length > 0 ? generateQuizOptions(queue[0], initialCards) : []
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  // Quiz UI
  const [isQuizMode, setIsQuizMode] = useState(true); 
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);

  // Stats
  const [stats, setStats] = useState({ correct: 0, wrong: 0 });
  const [wrongCards, setWrongCards] = useState<Flashcard[]>([]);

  const currentCard = queue[currentIndex];
  const canUseQuiz = queue.length >= 4;
  const activeMode = isQuizMode && canUseQuiz ? 'quiz' : 'flip';
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
    
    // Reset visual
    setIsFlipped(false);
    setSelectedOption(null);
    setIsAnswerRevealed(false);
  };

  const restartFull = () => {
      const resetQueue = getInitialQueue(initialCards, mode);
      setQueue(resetQueue);
      // Gera opções para o novo primeiro card
      setCurrentOptions(resetQueue.length > 0 ? generateQuizOptions(resetQueue[0], initialCards) : []);
      
      setWrongCards([]);
      setStats({ correct: 0, wrong: 0 });
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsAnswerRevealed(false);
      setSelectedOption(null);
      setIsFinished(false);
  }

  const nextCard = () => {
    if (currentIndex < queue.length - 1) {
      const nextIndex = currentIndex + 1;
      const nextCardItem = queue[nextIndex];

      setIsFlipped(false);
      setIsAnswerRevealed(false);
      setSelectedOption(null);
      
      // Pequeno delay para transição suave
      setTimeout(() => {
          setCurrentIndex(nextIndex);
          // ✅ GERA AS PRÓXIMAS OPÇÕES AQUI (State Update em lote)
          setCurrentOptions(generateQuizOptions(nextCardItem, initialCards));
      }, 200);
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
      setStats(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setStats(prev => ({ ...prev, wrong: prev.wrong + 1 }));
      setWrongCards(prev => [...prev, currentCard]);
    }
  };

  const restartWrong = () => {
    const newQueue = [...wrongCards];
    setQueue(newQueue);
    setCurrentOptions(newQueue.length > 0 ? generateQuizOptions(newQueue[0], initialCards) : []);
    
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
      <div className="max-w-2xl mx-auto p-6 flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-in zoom-in-95 duration-500">
        <div className="space-y-2">
            <div className="inline-block p-4 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-4">
                {score >= 70 ? <Sparkles className="h-10 w-10 text-yellow-500" /> : <BrainCircuit className="h-10 w-10 text-indigo-500" />}
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                {score >= 90 ? "Dominado! 🚀" : score >= 70 ? "Muito Bom! 👏" : "Continue Praticando! 💪"}
            </h1>
            <p className="text-zinc-500 font-medium">
                Você revisou {queue.length} cartões e acertou {score}%
            </p>
        </div>

        <div className="grid grid-cols-2 gap-6 w-full max-w-md">
            <Card className="bg-green-500/10 border-green-500/20 shadow-sm">
                <CardContent className="p-6">
                    <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-2">Acertos</p>
                    <p className="text-5xl font-extrabold text-green-700">{stats.correct}</p>
                </CardContent>
            </Card>
            <Card className="bg-red-500/10 border-red-500/20 shadow-sm">
                <CardContent className="p-6">
                    <p className="text-xs text-red-600 font-bold uppercase tracking-wider mb-2">Erros</p>
                    <p className="text-5xl font-extrabold text-red-700">{stats.wrong}</p>
                </CardContent>
            </Card>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-sm pt-4">
            {wrongCards.length > 0 && (
                <Button onClick={restartWrong} size="lg" className="w-full bg-orange-600 hover:bg-orange-700 h-14 shadow-md">
                    <RotateCw className="mr-2 h-5 w-5" /> Revisar Erros ({wrongCards.length})
                </Button>
            )}
            <Button onClick={restartFull} variant="outline" size="lg" className="w-full h-12">
                <Repeat className="mr-2 h-4 w-4" /> Recomeçar Baralho
            </Button>
            <Link href="/flashcards" className="w-full">
                <Button variant="ghost" className="w-full text-zinc-500">Sair para Menu</Button>
            </Link>
        </div>
      </div>
    );
  }

  // --- TELA DE ESTUDO ---
  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-w-5xl mx-auto p-4 md:p-6">
        
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
                <Link href="/flashcards">
                    <Button variant="ghost" size="icon" className="hover:bg-red-50 hover:text-red-500 rounded-full" title="Sair">
                        <X className="h-5 w-5" />
                    </Button>
                </Link>
                
                <div className="h-9 px-4 flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-full border border-zinc-200 dark:border-zinc-700">
                    <span className="font-mono text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                        {currentIndex + 1} <span className="text-zinc-400 mx-1">/</span> {queue.length}
                    </span>
                </div>

                {mode === 'smart' ? (
                    <Badge variant="outline" className="hidden sm:flex border-green-500/30 text-green-600 bg-green-500/10 gap-1">
                        <GraduationCap className="h-3 w-3" /> Memória
                    </Badge>
                ) : (
                    <Badge variant="outline" className="hidden sm:flex border-red-500/30 text-red-600 bg-red-500/10 gap-1">
                        <Zap className="h-3 w-3" /> Prova
                    </Badge>
                )}
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto">
                {canUseQuiz && (
                    <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setIsQuizMode(!isQuizMode)}
                        className="flex-1 md:flex-none gap-2 text-xs font-bold uppercase tracking-wider h-9"
                    >
                        {isQuizMode ? <LayoutGrid className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
                        {isQuizMode ? "Visual: Quiz" : "Visual: Card"}
                    </Button>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-full h-9 w-9">
                            <Settings2 className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações da Sessão</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={shuffleRemaining}>
                            <Shuffle className="mr-2 h-4 w-4" /> Embaralhar Restantes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={restartFull} className="text-red-600 focus:text-red-600">
                            <Repeat className="mr-2 h-4 w-4" /> Reiniciar Tudo
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>

        <Progress value={progress} className="h-1.5 mb-6 bg-zinc-100 dark:bg-zinc-800" indicatorClassName={mode === 'smart' ? "bg-green-500" : "bg-indigo-600"} />

        {/* ÁREA PRINCIPAL (Centralizada) */}
        {/* Adicionei 'items-center' e 'justify-center' para garantir o centro no Flip */}
        <div className="flex-1 flex flex-col gap-6 relative w-full h-full">
            
            {/* 1. O CARTÃO (Pergunta) */}
            <div className={`relative w-full transition-all duration-500 ${activeMode === 'quiz' ? 'h-auto min-h-[200px]' : 'flex-1 h-full'}`}>
                <div 
                    className="w-full h-full relative perspective-[1500px]"
                    onClick={() => activeMode === 'flip' && !isFlipped && setIsFlipped(true)}
                >
                    <div 
                        className="w-full h-full relative transition-all duration-500 transform-style-3d shadow-xl rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                        style={{ 
                            transformStyle: 'preserve-3d',
                            transform: activeMode === 'flip' && isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                        }}
                    >
                        {/* FRENTE */}
                        <div 
                            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center overflow-y-auto backface-hidden"
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(0deg)' }}
                        >
                            <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-3">Pergunta</p>
                            <div className="text-xl md:text-3xl font-bold text-zinc-800 dark:text-zinc-100 leading-tight w-full flex justify-center">
                                <div className="max-w-2xl w-full">
                                    <RichTextDisplay text={currentCard.term} />
                                </div>
                            </div>
                            
                            {activeMode === 'flip' && !isFlipped && (
                                <p className="absolute bottom-6 text-xs text-zinc-400 animate-pulse flex items-center gap-1">
                                    Toque para ver a resposta <ArrowRight className="h-3 w-3" />
                                </p>
                            )}
                        </div>

                        {/* VERSO (Apenas Modo Flip) */}
                        <div 
                            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center bg-indigo-50 dark:bg-indigo-950/20 rounded-2xl overflow-y-auto backface-hidden"
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-3">Resposta</p>
                            <div className="text-lg md:text-2xl font-medium text-zinc-700 dark:text-zinc-200 w-full flex justify-center">
                                <div className="max-w-2xl w-full">
                                    <RichTextDisplay text={currentCard.definition} isDark={true} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. ÁREA DE INTERAÇÃO (Botões) */}
            <div className={`transition-all duration-500 ${activeMode === 'quiz' ? 'flex-1' : 'h-24 shrink-0'}`}>
                
                {/* --- MODO QUIZ --- */}
                {activeMode === 'quiz' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 h-full pb-4 content-start">
                        {currentOptions.map((option, idx) => {
                            const isSelected = selectedOption === option;
                            const isCorrect = option === currentCard.definition;
                            
                            let buttonStyle = "border-2 border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-500 bg-white dark:bg-zinc-900";
                            
                            if (isAnswerRevealed) {
                                if (isCorrect) buttonStyle = "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700";
                                else if (isSelected && !isCorrect) buttonStyle = "border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 opacity-50";
                                else buttonStyle = "border-zinc-200 opacity-40 grayscale";
                            }

                            return (
                                <button
                                    key={idx}
                                    onClick={() => handleQuizSelection(option)}
                                    disabled={isAnswerRevealed}
                                    className={`relative p-4 rounded-xl text-left transition-all duration-200 flex items-center group ${buttonStyle}`}
                                >
                                    <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-500 mr-4 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 group-hover:text-indigo-600 transition-colors shrink-0">
                                        {String.fromCharCode(65 + idx)}
                                    </div>
                                    <div className="flex-1 text-sm md:text-base font-medium w-full overflow-hidden">
                                        <RichTextDisplay text={option} compact={true} />
                                    </div>
                                    {isAnswerRevealed && isCorrect && <CheckCircle className="h-6 w-6 text-green-500 ml-2 shrink-0" />}
                                    {isAnswerRevealed && isSelected && !isCorrect && <XCircle className="h-6 w-6 text-red-500 ml-2 shrink-0" />}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* --- MODO FLIP --- */}
                {activeMode === 'flip' && (
                    <div className="flex items-center justify-center h-full">
                        {!isFlipped ? (
                            <Button 
                                size="lg" 
                                className="w-full max-w-sm h-14 text-lg font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20" 
                                onClick={() => setIsFlipped(true)}
                            >
                                Mostrar Resposta
                            </Button>
                        ) : (
                            <div className="flex gap-4 w-full max-w-md animate-in fade-in slide-in-from-bottom-2">
                                <Button 
                                    size="lg" 
                                    variant="outline" 
                                    className="flex-1 h-14 text-lg font-bold border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/30"
                                    onClick={() => handleFlipResponse(false)}
                                >
                                    <XCircle className="mr-2 h-5 w-5" /> Errei
                                </Button>
                                
                                <Button 
                                    size="lg" 
                                    className="flex-1 h-14 text-lg font-bold bg-green-600 hover:bg-green-700 text-white shadow-md shadow-green-600/20"
                                    onClick={() => handleFlipResponse(true)}
                                >
                                    <CheckCircle className="mr-2 h-5 w-5" /> Acertei
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