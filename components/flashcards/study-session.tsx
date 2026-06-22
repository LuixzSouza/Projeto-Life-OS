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
  Lightbulb,
  Check,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
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
/* PERSISTÊNCIA DA SESSÃO (resiliência a reload / sair da página)             */
/* -------------------------------------------------------------------------- */

// Versionado: se o formato mudar, bump a versão e sessões antigas são ignoradas.
const SESSION_STORE_KEY = "lifeos-flashcard-session-v1";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // resume só dentro de 12h

interface SavedSession {
  key: string; // deck + modo: distingue qual sessão é esta
  cardIds: string[]; // ids da sessão original (checagem de sobreposição)
  doneIds: string[]; // cartões já graduados (não-AGAIN) — não repetem ao retomar
  stats: { again: number; hard: number; good: number; easy: number };
  reverse: boolean;
  ts: number;
}

/** Ordena os mais atrasados primeiro (nextReview nulo = mais urgente). */
function sortByDue(cards: Flashcard[]): Flashcard[] {
  return [...cards].sort((a, b) => {
    const da = a.nextReview ? new Date(a.nextReview).getTime() : 0;
    const db = b.nextReview ? new Date(b.nextReview).getTime() : 0;
    return da - db;
  });
}

/* -------------------------------------------------------------------------- */
/* COMPONENTE PRINCIPAL                                                       */
/* -------------------------------------------------------------------------- */

export function StudySession({ deck, cards: initialCards, mode = "flip" }: StudySessionProps) {
  const written = mode === "written";
  // Fila de estudos (Para Repetição Espaçada é ideal revisar os mais atrasados primeiro)
  const [queue, setQueue] = useState<Flashcard[]>(() => sortByDue(initialCards));

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // Previne duplo clique
  // Dica revelada sob demanda na frente (zera a cada novo cartão / inversão).
  const [hintShown, setHintShown] = useState(false);
  // Avaliação em 2 passos: "choose" mostra Errei/Acertei; ao acertar, revela as
  // 3 notas (Difícil/Bom/Fácil) — carga mental baixa sem perder a precisão do SRS.
  const [gradeStep, setGradeStep] = useState<"choose" | "correct">("choose");
  // Feedback visual do botão Embaralhar (giro breve do ícone).
  const [shuffling, setShuffling] = useState(false);
  // Resiliência: cartões já graduados nesta sessão (p/ retomar sem repetir) e
  // contador de gravações em voo (otimistas) — evita perder save ao sair.
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set());
  const [pendingSaves, setPendingSaves] = useState(0);
  const restoredRef = useRef(false);
  const sessionKey = `${deck.title}|${mode}`;

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
    } else if (gradeStep === "choose") {
      // Passo 1: errei (1) ou acertei (2 / Enter / Espaço → revela as 3 notas).
      if (e.key === "1") handleRate("AGAIN");
      if (e.key === "2" || e.code === "Enter" || e.code === "Space") {
        e.preventDefault();
        setGradeStep("correct");
      }
    } else {
      // Passo 2 (acertou): grau de facilidade.
      if (e.key === "1") handleRate("HARD");
      if (e.key === "2") handleRate("GOOD");
      if (e.key === "3") handleRate("EASY");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFlipped, isFinished, isSaving, currentIndex, written, gradeStep]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // --- RESILIÊNCIA: RETOMAR / PERSISTIR / AVISAR AO SAIR ---

  // 1) RETOMA uma sessão salva (reload, voltou à página, fechou sem querer).
  //    Roda UMA vez. Defensivo: localStorage indisponível, JSON corrompido,
  //    sessão de outro baralho, expirada (>12h) ou sem cartões em comum → ignora.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    try {
      const raw = localStorage.getItem(SESSION_STORE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as SavedSession;
      if (!saved || saved.key !== sessionKey) return;
      if (Date.now() - saved.ts > SESSION_TTL_MS) {
        localStorage.removeItem(SESSION_STORE_KEY);
        return;
      }
      const done = new Set(Array.isArray(saved.doneIds) ? saved.doneIds : []);
      if (done.size === 0) return; // nada revisado ainda — começa normal
      // Sobreposição com os cartões atuais (o baralho pode ter mudado).
      const currentIds = new Set(initialCards.map((c) => c.id));
      if (!saved.cardIds?.some((id) => currentIds.has(id))) {
        localStorage.removeItem(SESSION_STORE_KEY);
        return;
      }
      // Remove os já graduados; reordena os restantes pelos mais atrasados.
      const remaining = sortByDue(initialCards.filter((c) => !done.has(c.id)));
      if (remaining.length === 0) {
        localStorage.removeItem(SESSION_STORE_KEY); // sessão já concluída
        return;
      }
      setQueue(remaining);
      setCurrentIndex(0);
      setDoneIds(done);
      if (saved.stats) setStats(saved.stats);
      setReverse(!!saved.reverse);
      // Dá controle ao usuário: retomou, mas pode preferir sessão nova.
      toast.info(`Retomando de onde você parou — ${done.size} já revisados.`, {
        duration: 6000,
        action: {
          label: "Recomeçar",
          onClick: () => {
            try {
              localStorage.removeItem(SESSION_STORE_KEY);
            } catch {
              /* ignora */
            }
            setQueue(sortByDue(initialCards));
            setCurrentIndex(0);
            setStats({ again: 0, hard: 0, good: 0, easy: 0 });
            setDoneIds(new Set());
            setIsFlipped(false);
            setReverse(false);
            setHintShown(false);
            setGradeStep("choose");
          },
        },
      });
    } catch {
      /* localStorage bloqueado/privado ou dado corrompido — segue do zero */
    }
  }, [sessionKey, initialCards]);

  // 2) PERSISTE o progresso a cada avaliação. Ao terminar, limpa.
  useEffect(() => {
    try {
      if (isFinished) {
        localStorage.removeItem(SESSION_STORE_KEY);
        return;
      }
      const total = doneIds.size + stats.again;
      if (total === 0) return; // sem progresso ainda — nada a salvar
      const payload: SavedSession = {
        key: sessionKey,
        cardIds: initialCards.map((c) => c.id),
        doneIds: [...doneIds],
        stats,
        reverse,
        ts: Date.now(),
      };
      localStorage.setItem(SESSION_STORE_KEY, JSON.stringify(payload));
    } catch {
      /* cota cheia / modo privado — ignora (a sessão segue na memória) */
    }
  }, [doneIds, stats, reverse, isFinished, sessionKey, initialCards]);

  // 3) AVISA antes de fechar/recarregar com progresso ou gravação em voo
  //    (cobre o save otimista que ainda não chegou ao banco). Nav interna do
  //    Next não dispara aqui — mas o localStorage acima já permite retomar.
  useEffect(() => {
    const hasProgress = !isFinished && (doneIds.size > 0 || stats.again > 0);
    if (!hasProgress && pendingSaves === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isFinished, doneIds, stats, pendingSaves]);

  // --- AVALIAÇÃO E LÓGICA DO ALGORITMO ---
  // OTIMISTA: avança IMEDIATAMENTE e grava no servidor em segundo plano. Antes,
  // o `await reviewFlashcard` travava o cartão esperando a escrita — que em modo
  // nuvem/réplica é um round-trip de rede (lento). Agora o estudo é instantâneo;
  // se a gravação falhar, avisa (a próxima revisão/sincronização recupera).
  const handleRate = (rating: ReviewRating) => {
    if (isSaving || !currentCard) return;
    setIsSaving(true);

    // 1. Stats locais (otimista).
    setStats((prev) => ({ ...prev, [rating.toLowerCase()]: prev[rating.toLowerCase() as keyof typeof prev] + 1 }));

    // 2. Marca como graduado (para RETOMAR sem repetir). AGAIN não gradua — o
    //    cartão volta nesta sessão e continua "pendente".
    if (rating !== "AGAIN") {
      setDoneIds((prev) => {
        const next = new Set(prev);
        next.add(currentCard.id);
        return next;
      });
    }

    // 3. Grava no servidor SEM bloquear a navegação. pendingSaves conta as
    //    escritas em voo — usado no aviso de saída para não perder um save.
    setPendingSaves((n) => n + 1);
    void reviewFlashcard(currentCard.id, rating)
      .catch((e) => {
        console.error("Falha ao salvar revisão:", e);
        toast.error("Não consegui salvar essa avaliação — verifique a conexão.");
      })
      .finally(() => setPendingSaves((n) => Math.max(0, n - 1)));

    // 4. Reaprendizado: se errou, o cartão volta algumas posições à frente (não
    // no fim) — reforça ainda nesta sessão, mas sem reaparecer na cara.
    let nextQueue = queue;
    if (rating === "AGAIN") {
      const insertAt = Math.min(currentIndex + 4, queue.length);
      nextQueue = [...queue.slice(0, insertAt), currentCard, ...queue.slice(insertAt)];
      setQueue(nextQueue);
    }

    // 5. Avança ou encerra. Usa o tamanho da fila JÁ atualizada — senão errar a
    // última carta encerraria a sessão sem reaprendê-la.
    if (currentIndex + 1 >= nextQueue.length) {
      setIsFinished(true);
    } else {
      setIsFlipped(false);
      setTypedAnswer(""); // limpa a resposta digitada para o próximo cartão
      setHintShown(false); // esconde a dica para o próximo cartão
      setGradeStep("choose"); // volta para Errei/Acertei no próximo cartão
      // Só a animação 3D de 150ms (debounce de duplo-clique) — não espera a rede.
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setIsSaving(false);
      }, 150);
    }
  };

  const restartFull = () => {
    window.location.reload(); // O método mais limpo para resetar servidor e cliente juntos aqui
  };

  // Embaralha só os cartões que ainda VÊM (mantém o atual e os já vistos no lugar).
  const shuffleRemaining = () => {
    const remaining = queue.length - currentIndex - 1;
    if (remaining < 2) {
      toast.info("Nada para embaralhar à frente.");
      return;
    }
    setQueue((prev) => {
      const head = prev.slice(0, currentIndex + 1);
      const tail = prev.slice(currentIndex + 1);
      for (let i = tail.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tail[i], tail[j]] = [tail[j], tail[i]];
      }
      return [...head, ...tail];
    });
    setShuffling(true);
    setTimeout(() => setShuffling(false), 600);
    toast.success(`${remaining} próximos cartões embaralhados`, { icon: <Shuffle className="h-4 w-4" />, duration: 1500 });
  };

  // Inverte termo/definição: volta a mostrar a "pergunta" (verso oculto de novo).
  const toggleReverse = () => {
    setReverse((r) => !r);
    setIsFlipped(false);
    setTypedAnswer("");
    setHintShown(false);
    setGradeStep("choose");
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
                    className={cn(
                        "h-12 w-12 rounded-xl shadow-sm transition-colors hover:text-primary hover:bg-primary/10",
                        shuffling ? "text-primary bg-primary/10" : "text-muted-foreground",
                    )}
                >
                    <Shuffle className={cn("h-5 w-5 transition-transform", shuffling && "animate-spin")} />
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

                    {/* DICA: revelada sob demanda na frente — puxa a memória sem
                        entregar a resposta. stopPropagation p/ não virar o cartão. */}
                    {currentCard?.hint && !isFlipped && (
                        <div className="mx-auto mt-6 flex w-full max-w-xl justify-center" onClick={(e) => e.stopPropagation()}>
                            {hintShown ? (
                                <div className="flex w-full items-start gap-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left animate-in fade-in slide-in-from-bottom-2">
                                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                                    <p className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-amber-700 dark:text-amber-300">
                                        {currentCard.hint}
                                    </p>
                                </div>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setHintShown(true)}
                                    className="h-10 gap-2 rounded-full border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700"
                                >
                                    <Lightbulb className="h-4 w-4" /> Dica
                                </Button>
                            )}
                        </div>
                    )}

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
            {gradeStep === "choose" ? (
                /* PASSO 1: errei ou acertei (Acertei revela as 3 notas). */
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pb-4">
                    <Button size="lg" disabled={isSaving} onClick={() => handleRate("AGAIN")} className={cn("flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white border border-rose-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-sm", suggestedRating === "AGAIN" && "ring-2 ring-rose-400 ring-offset-2 ring-offset-background")}>
                      <span className="flex items-center gap-1.5 text-base sm:text-lg"><X className="h-4 w-4" /> Errei</span>
                      <span className="text-[11px] font-bold opacity-90 tabular-nums">{previews?.AGAIN}</span>
                      <span className="hidden font-mono text-[9px] tracking-widest opacity-50 sm:block">tecla 1</span>
                    </Button>

                    <Button size="lg" disabled={isSaving} onClick={() => setGradeStep("correct")} className={cn("flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-sm", suggestedRating && suggestedRating !== "AGAIN" && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-background")}>
                      <span className="flex items-center gap-1.5 text-base sm:text-lg"><Check className="h-4 w-4" /> Acertei</span>
                      <span className="text-[11px] font-medium opacity-80">escolher dificuldade →</span>
                      <span className="hidden font-mono text-[9px] tracking-widest opacity-50 sm:block">tecla 2 / Espaço</span>
                    </Button>
                </div>
            ) : (
                /* PASSO 2 (acertou): grau de facilidade — alimenta o SRS. */
                <div className="space-y-3 pb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                        <Button size="lg" disabled={isSaving} onClick={() => handleRate("HARD")} className={cn("flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white border border-amber-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-sm", suggestedRating === "HARD" && "ring-2 ring-amber-400 ring-offset-2 ring-offset-background")}>
                          <span className="text-base sm:text-lg">Difícil</span>
                          <span className="text-[11px] font-bold opacity-90 tabular-nums">{previews?.HARD}</span>
                          <span className="hidden font-mono text-[9px] tracking-widest opacity-50 sm:block">tecla 1</span>
                        </Button>

                        <Button size="lg" disabled={isSaving} onClick={() => handleRate("GOOD")} className={cn("flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-sm", suggestedRating === "GOOD" && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-background")}>
                          <span className="text-base sm:text-lg">Bom</span>
                          <span className="text-[11px] font-bold opacity-90 tabular-nums">{previews?.GOOD}</span>
                          <span className="hidden font-mono text-[9px] tracking-widest opacity-50 sm:block">tecla 2</span>
                        </Button>

                        <Button size="lg" disabled={isSaving} onClick={() => handleRate("EASY")} className="flex-1 h-20 sm:h-24 rounded-[1.5rem] bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white border border-blue-500/20 font-bold transition-all hover:scale-105 active:scale-95 flex flex-col items-center justify-center gap-0.5 shadow-sm">
                          <span className="text-base sm:text-lg">Fácil</span>
                          <span className="text-[11px] font-bold opacity-90 tabular-nums">{previews?.EASY}</span>
                          <span className="hidden font-mono text-[9px] tracking-widest opacity-50 sm:block">tecla 3</span>
                        </Button>
                    </div>

                    {/* Salvaguarda: clicou Acertei sem querer? Volta para errei. */}
                    <div className="flex justify-center">
                        <button type="button" onClick={() => setGradeStep("choose")} className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline">
                          ← na verdade, errei
                        </button>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}