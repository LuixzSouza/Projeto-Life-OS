"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check, Plus, Minus, Trash2, X, Timer, ChevronDown, ChevronUp, History, Flag, Trophy,
  List, Target, ChevronLeft, ChevronRight, CircleCheck, Replace, Volume2, VolumeX, AlertTriangle,
  EyeOff, MoreVertical, Pause, Lock, Play, Droplets, MapPin, Bell, BellOff, LogOut,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useWakeLock } from "./use-wake-lock";
import { sessionStats, estimatedOneRepMax, elapsedSeconds, EQUIPMENT_META, SET_TYPE_META, isWorkingSet, type Equipment, type SetType, type LiveSession, type LastPerf, type ExerciseHistoryPoint, type LiveTarget } from "./session-types";
import { RestOverlay } from "./rest-overlay";
import { WarmupOverlay } from "./warmup-overlay";
import { ExerciseDemoModal } from "./exercise-demo-modal";
import { ExerciseThumb } from "./exercise-thumb";
import { MusicButton } from "./music-button";
import { getAllMedia, persistMedia, mediaFor, setVideoFor, type MediaMap } from "./exercise-media";
import { isNotifyEnabled, isNotifySupported, setNotifyEnabled, showSessionNotification } from "./session-notify";
import { isSfxMuted, setSfxMuted, playSuccess, playRestEnd, playFinish, playCountdown, playWaterReminder, primeAudio, hapticTick, hapticExerciseDone, hapticRestEnd, vibrate } from "./sfx";

// Preferência do lembrete de água (minutos; 0 = desligado), persistida localmente.
const WATER_KEY = "lifeos:gym:water-min";
const WATER_STEPS = [20, 30, 45, 0] as const;
function loadWaterMinutes(): number {
  if (typeof window === "undefined") return 20;
  const n = parseInt(window.localStorage.getItem(WATER_KEY) ?? "20", 10);
  return Number.isFinite(n) && n >= 0 ? n : 20;
}

type Ex = LiveSession["exercises"][number];

function clock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// "Há X dias" a partir de um ISO (só roda no cliente, pós-hidratação — sem mismatch).
function relativeDays(iso?: string): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return null;
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "hoje";
  if (days === 1) return "ontem";
  if (days < 7) return `há ${days} dias`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `há ${weeks} sem`;
  const months = Math.max(1, Math.floor(days / 30));
  return `há ${months} ${months > 1 ? "meses" : "mês"}`;
}

// Exercício que contém a PRÓXIMA série não-feita (capa/preview na tela de descanso).
function nextSetExercise(exercises: Ex[]): { name: string; group?: string } | undefined {
  for (const ex of exercises) {
    if (ex.sets.some((s) => !s.done) && ex.name.trim()) return { name: ex.name, group: ex.group };
  }
  return undefined;
}

// Parceiro de bi-set: exercício de OUTRO grupo, ainda com séries pendentes, para
// intercalar no descanso do exercício atual.
function supersetPartner(exercises: Ex[], restExId: string | null): Ex | undefined {
  if (!restExId) return undefined;
  const rest = exercises.find((e) => e.id === restExId);
  if (!rest) return undefined;
  return exercises.find(
    (e) => e.id !== restExId && e.name.trim() && (e.group ?? "") !== (rest.group ?? "") && e.sets.some((s) => !s.done),
  );
}

const numOf = (v: string) => parseFloat((v || "").replace(",", ".")) || 0;

// Recorde: alguma série feita supera a "última vez" (mais carga, ou mesma carga e mais reps).
function isPR(ex: Ex, last?: LastPerf): boolean {
  if (!last) return false;
  const lastW = numOf(last.weight);
  const lastR = numOf(last.reps);
  let best: { w: number; r: number } | null = null;
  for (const s of ex.sets) {
    if (!s.done || !isWorkingSet(s)) continue; // aquecimento não vira recorde
    const w = numOf(s.weight), r = numOf(s.reps);
    if (!best || w > best.w || (w === best.w && r > best.r)) best = { w, r };
  }
  if (!best || best.w === 0) return false;
  return best.w > lastW || (best.w === lastW && best.r > lastR);
}

const allDone = (ex: Ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done);

// Carga é obrigatória para concluir a série, salvo equipamento de peso corporal.
function requiresWeight(ex: Ex): boolean {
  const meta = ex.equipment ? EQUIPMENT_META[ex.equipment] : null;
  return !(meta?.allowsZero ?? false);
}

export interface SessionControls {
  renameExercise: (exId: string, name: string) => void;
  replaceExercise: (exId: string, name: string, group?: string, equipment?: Equipment) => void;
  setExerciseEquipment: (exId: string, equipment: Equipment) => void;
  setRestSeconds: (seconds: number) => void;
  addExercise: (name: string, group?: string) => void;
  removeExercise: (exId: string) => void;
  addSet: (exId: string) => void;
  removeSet: (exId: string, setId: string) => void;
  updateSet: (exId: string, setId: string, field: "reps" | "weight", value: string) => void;
  toggleSetDone: (exId: string, setId: string) => void;
  setSetType: (exId: string, setId: string, type: SetType) => void;
}

// Descanso mínimo obrigatório (s) antes de liberar "pular" — induz a respeitar ao
// menos um descanso curto entre as séries, sem travar o treino por completo.
const MIN_REST_SECONDS = 15;

export function SessionActive({
  session, lastPerf, volumeHistory, controls, onFinish, onCancel, onPause,
  onTogglePause, onEndWarmup, onExtendWarmup, onSetLocation,
}: {
  session: LiveSession;
  lastPerf: Record<string, LastPerf>;
  volumeHistory?: Record<string, ExerciseHistoryPoint[]>;
  controls: SessionControls;
  onFinish: () => void;
  onCancel: () => void;
  onPause: () => void;
  onTogglePause: () => void;
  onEndWarmup: () => void;
  onExtendWarmup: (minutes: number) => void;
  onSetLocation: (loc: { lat: number; lng: number } | undefined) => void;
}) {
  useWakeLock(true);

  const exercises = session.exercises;
  const firstIncomplete = (from = 0) => {
    for (let i = from; i < exercises.length; i++) if (!allDone(exercises[i])) return i;
    return -1;
  };

  const [mode, setMode] = useState<"list" | "focus">("list");
  const [focusIdx, setFocusIdx] = useState(0);
  // Direção da navegação no modo Foco (1 = avançar, -1 = voltar) — anima o slide.
  const [dir, setDir] = useState(1);
  // Tempo total visível? Toque no cronômetro esconde (modo foco: não ficar de olho
  // no relógio). O descanso entre séries continua aparecendo normalmente.
  const [showTime, setShowTime] = useState(true);
  // Confirmação de descarte (AlertDialog único, controlado por estado).
  const [discardOpen, setDiscardOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  // Sincroniza a preferência de mudo (store externo) só na montagem — ler no
  // initializer causaria mismatch de hidratação no SSR.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMuted(isSfxMuted()); }, []);
  const toggleMuted = () => { const m = !muted; setMuted(m); setSfxMuted(m); if (!m) primeAudio(); };

  // Biblioteca local de vídeos por exercício (init lazy — só roda no cliente).
  const [media, setMedia] = useState<MediaMap>(getAllMedia);
  const [demoFor, setDemoFor] = useState<string | null>(null);
  const saveVideo = (name: string, id: string | null) => {
    const next = setVideoFor(media, name, id);
    setMedia(next);
    persistMedia(next);
  };

  // Cronômetro de descanso: o fim fica num ref para o tick checar sem stale closure.
  // NÃO zera ao chegar a 0 — passa a contar o excedente (overtime) até o usuário seguir.
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [restExId, setRestExId] = useState<string | null>(null);
  // Duração do descanso ATUAL (pode ser o override do exercício, ex.: 120s no
  // agachamento) — base do anel de progresso, independente do padrão da sessão.
  const [restTotal, setRestTotal] = useState(session.restSeconds);
  // Bi-set: descanso "minimizado" — o cronômetro de A continua rodando em background
  // (vira uma pílula) enquanto a tela mostra o exercício B.
  const [restMinimized, setRestMinimized] = useState(false);
  const restEndsRef = useRef<number | null>(null);
  const buzzed = useRef(false);
  const setRest = (end: number | null) => {
    restEndsRef.current = end;
    buzzed.current = false;
    setRestEndsAt(end);
  };

  // Contagem regressiva falada: lembra o último segundo anunciado (sem repetir).
  const countedRef = useRef<number | null>(null);
  // Lembrete de água: minutos entre avisos (0 = desligado) e o último aviso.
  const [waterMinutes, setWaterMinutes] = useState(20);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setWaterMinutes(loadWaterMinutes()); }, []);
  // last = 0 → o primeiro tick adota o "agora" como base (sem Date.now no render).
  const waterRef = useRef<{ last: number; minutes: number }>({ last: 0, minutes: 20 });
  useEffect(() => { waterRef.current.minutes = waterMinutes; }, [waterMinutes]);
  const cycleWater = () => {
    const i = WATER_STEPS.indexOf(waterMinutes as (typeof WATER_STEPS)[number]);
    const next = WATER_STEPS[(i + 1) % WATER_STEPS.length];
    setWaterMinutes(next);
    waterRef.current.last = Date.now(); // zera a contagem ao mudar
    try { window.localStorage.setItem(WATER_KEY, String(next)); } catch { /* ignora */ }
    toast.info(next === 0 ? "Lembrete de água desligado." : `Vou te lembrar de beber água a cada ${next} min. 💧`);
  };

  const paused = !!session.pausedAt;
  const inWarmup = !!session.warmupEndsAt && !session.warmupDone;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (restEndsRef.current !== null) {
        // Voz "três, dois, um" nos últimos segundos do descanso (uma vez cada).
        const remaining = Math.round((restEndsRef.current - n) / 1000);
        if (remaining >= 1 && remaining <= 3 && countedRef.current !== remaining) {
          countedRef.current = remaining;
          playCountdown(remaining);
        }
        // Dispara mesmo com o descanso minimizado (o timer de A roda em background).
        if (n >= restEndsRef.current && !buzzed.current) {
          buzzed.current = true;
          countedRef.current = null;
          hapticRestEnd();
          playRestEnd();
        }
      }
      // Hidratação: aviso periódico (não atrapalha descanso em tela cheia: toast + voz).
      const w = waterRef.current;
      if (w.last === 0) w.last = n;
      if (w.minutes > 0 && n - w.last >= w.minutes * 60_000) {
        w.last = n;
        playWaterReminder();
        vibrate([120, 80, 120]);
        toast.info("💧 Hora de beber água!", { duration: 6000 });
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = elapsedSeconds(session, now);
  const restRemaining = restEndsAt ? Math.round((restEndsAt - now) / 1000) : 0;
  const warmupRemaining = session.warmupEndsAt ? Math.round((session.warmupEndsAt - now) / 1000) : 0;

  // --- Notificação fora do app: ao esconder a aba/app com treino rolando ---
  const [notifyOn, setNotifyOn] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setNotifyOn(isNotifyEnabled()); }, []);
  const sessionRef = useRef(session);
  useEffect(() => { sessionRef.current = session; }, [session]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      const s = sessionRef.current;
      if (s.finishedAt) return;
      const stats = sessionStats(s.exercises);
      showSessionNotification({
        title: s.title,
        elapsed: clock(elapsedSeconds(s, Date.now())),
        doneSets: stats.doneSets,
        totalSets: stats.totalSets,
      });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);
  const toggleNotify = async () => {
    const on = await setNotifyEnabled(!notifyOn);
    setNotifyOn(on);
    if (!on && !notifyOn) toast.error("Permissão de notificação negada pelo navegador.");
    else toast.info(on ? "Vou mostrar o treino na bandeja quando você sair do app." : "Notificações do treino desligadas.");
  };

  // --- Local do treino (GPS, opcional) ---
  const captureLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Este aparelho não dá acesso à localização.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onSetLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast.success("📍 Local do treino registrado — vai junto nas notas ao salvar.");
      },
      () => toast.error("Não consegui obter a localização (permissão negada?)."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  };

  const startRest = (exId: string) => {
    countedRef.current = null; // novo descanso → reanuncia o 3-2-1
    setRestExId(exId);
    setRestMinimized(false);
    // Descanso do exercício, se a ficha definiu um; senão, o padrão da sessão.
    const secs = exercises.find((e) => e.id === exId)?.target?.restSeconds ?? session.restSeconds;
    setRestTotal(secs);
    setRest(Date.now() + secs * 1000);
  };
  const adjustRest = (deltaSeconds: number) => {
    const base = restRemaining > 0 ? (restEndsRef.current ?? Date.now()) : Date.now();
    const end = Math.max(Date.now() - 2000, base + deltaSeconds * 1000);
    // Mantém o anel coerente quando o usuário estende além da duração programada.
    setRestTotal((t) => Math.max(t, Math.round((end - Date.now()) / 1000)));
    setRest(end);
  };
  // Define o tempo de descanso exato (e adota como novo padrão da sessão).
  const setRestExact = (seconds: number) => {
    controls.setRestSeconds(seconds);
    setRestTotal(seconds);
    setRest(Date.now() + seconds * 1000);
  };

  // Conclui/desmarca uma série. Ao concluir: valida carga (peso 0 bloqueia, salvo
  // peso corporal), toca som e inicia o descanso.
  const handleToggle = (exId: string, setId: string, wasDone: boolean) => {
    if (!wasDone) {
      const ex = exercises.find((e) => e.id === exId);
      const set = ex?.sets.find((s) => s.id === setId);
      if (ex && set && requiresWeight(ex) && numOf(set.weight) <= 0) {
        toast.warning("Informe a carga antes de concluir a série (peso 0).", {
          description: "Se for peso corporal, troque o equipamento para “Peso corporal”.",
        });
        return;
      }
      controls.toggleSetDone(exId, setId);
      playSuccess();
      // Feedback tátil: toque curto na série; vibração dupla se fechou o exercício.
      const willComplete = !!ex && ex.sets.every((s) => (s.id === setId ? true : s.done));
      if (willComplete) hapticExerciseDone();
      else hapticTick();
      // Em bi-set (descanso de A minimizado), concluir uma série de B NÃO reinicia o
      // descanso — preserva o cronômetro de A rodando na pílula.
      if (!restMinimized) startRest(exId);
    } else {
      controls.toggleSetDone(exId, setId);
    }
  };

  // Ao concluir o descanso: no modo Foco, VOLTA pro exercício cujo descanso rodava
  // se ele ainda tem séries (ex.: fez outro no meio — bi-set/desvio); senão avança
  // pro próximo incompleto (pulando os já concluídos).
  const handleRestDone = () => {
    setRest(null);
    setRestMinimized(false);
    if (mode === "focus") {
      const restIdx = restExId ? exercises.findIndex((e) => e.id === restExId) : -1;
      if (restIdx !== -1 && !allDone(exercises[restIdx]) && restIdx !== focusIdx) {
        setDir(restIdx > focusIdx ? 1 : -1);
        setFocusIdx(restIdx);
        return;
      }
      const cur = exercises[focusIdx];
      if (cur && allDone(cur)) {
        const next = firstIncomplete(focusIdx + 1);
        if (next !== -1) { setDir(1); setFocusIdx(next); }
      }
    }
  };

  const enterFocus = () => {
    const i = firstIncomplete();
    setFocusIdx(i === -1 ? 0 : i);
    setMode("focus");
  };

  // Bi-set: pula pro parceiro durante o descanso (faz B no descanso de A). O
  // cronômetro de A NÃO é cancelado — apenas minimizado (continua na pílula).
  const goSuperset = () => {
    const partner = supersetPartner(exercises, restExId);
    if (!partner) return;
    const i = exercises.findIndex((e) => e.id === partner.id);
    if (i === -1) return;
    setFocusIdx(i);
    setMode("focus");
    setRestMinimized(true);
  };

  // Nome do exercício cujo descanso está rodando (rótulo da pílula).
  const restExName = restExId ? exercises.find((e) => e.id === restExId)?.name : undefined;

  const handleFinish = () => { playFinish(); onFinish(); };

  const stats = useMemo(() => sessionStats(exercises), [exercises]);
  const nextEx = useMemo(() => nextSetExercise(exercises), [exercises]);
  // Enriquecimento p/ a tela de descanso produtiva: "última vez" + histórico de volume.
  const nextInfo = useMemo(() => {
    if (!nextEx) return null;
    const key = nextEx.name.toLowerCase();
    return { ...nextEx, last: lastPerf[key], history: volumeHistory?.[key] ?? [] };
  }, [nextEx, lastPerf, volumeHistory]);
  const partner = useMemo(() => supersetPartner(exercises, restExId), [exercises, restExId]);
  const demoId = demoFor ? mediaFor(media, demoFor)?.youtubeId : undefined;

  const idx = Math.min(focusIdx, Math.max(0, exercises.length - 1));
  const focusEx = exercises[idx];
  const pct = stats.totalSets > 0 ? Math.round((stats.doneSets / stats.totalSets) * 100) : 0;

  // "Próximo" no Foco pula exercícios já concluídos (sem repetir o que já foi feito);
  // se só restarem concluídos à frente, anda sequencial mesmo (revisão).
  const goNext = () => {
    const next = firstIncomplete(idx + 1);
    setDir(1);
    setFocusIdx(next !== -1 ? next : Math.min(exercises.length - 1, idx + 1));
  };

  // Remove o exercício em Foco e reposiciona no próximo pendente.
  const removeFocused = () => {
    if (!focusEx) return;
    controls.removeExercise(focusEx.id);
    setFocusIdx((i) => Math.max(0, Math.min(i, exercises.length - 2)));
    toast.info("Exercício removido do treino.");
  };

  // Toda troca de tela (Lista↔Foco, navegar exercício) volta o scroll pro topo —
  // sem isso a nova tela "começa lá embaixo" na posição da anterior.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: "start" });
  }, [mode, idx]);

  return (
    <div ref={rootRef} className="flex min-h-dvh flex-col bg-background">
      {/* HEADER fixo */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          {/* Cronômetro total — toque para ocultar (modo foco, sem ficar de olho no relógio) */}
          <button
            type="button"
            onClick={() => setShowTime((v) => !v)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg py-1 transition-colors hover:text-primary sm:gap-2"
            aria-label={showTime ? "Ocultar o tempo" : "Mostrar o tempo"}
            title={showTime ? "Ocultar o tempo" : "Mostrar o tempo"}
          >
            {showTime ? (
              <>
                <Timer className="h-5 w-5 text-primary" />
                <span className="font-mono text-lg font-bold tabular-nums tracking-tight sm:text-xl">{clock(elapsed)}</span>
              </>
            ) : (
              <>
                <EyeOff className="h-5 w-5 text-muted-foreground" />
                <span className="font-mono text-lg font-bold tabular-nums tracking-tight text-muted-foreground/50 sm:text-xl">--:--</span>
              </>
            )}
          </button>
          {/* Pausar/retomar o cronômetro (congela o tempo; nada se perde) */}
          <button
            type="button"
            onClick={onTogglePause}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
              paused ? "border-amber-400 bg-amber-400/15 text-amber-500" : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary",
            )}
            aria-label={paused ? "Retomar o cronômetro" : "Pausar o cronômetro"}
            title={paused ? "Retomar" : "Pausar o cronômetro"}
          >
            {paused ? <Play className="h-4 w-4 pl-0.5" /> : <Pause className="h-4 w-4" />}
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{session.title}</p>
            <p className="truncate text-[11px] text-muted-foreground">{stats.doneSets}/{stats.totalSets} séries · {stats.volume.toLocaleString("pt-BR")} kg</p>
          </div>

          {/* Mudo dos efeitos sonoros */}
          <Button variant="ghost" size="icon" onClick={toggleMuted} className="shrink-0 text-muted-foreground" aria-label={muted ? "Ativar sons" : "Silenciar sons"}>
            {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>

          {/* Menu de opções da sessão. z-[80]: o conteúdo portala pro body com z-50
              padrão e ficaria ATRÁS do overlay z-[60] da sessão (menu "fantasma"). */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" aria-label="Mais opções">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="z-[80] w-64">
              <DropdownMenuItem onClick={onTogglePause} className="gap-2">
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                {paused ? "Retomar cronômetro" : "Pausar cronômetro"}
                <span className="ml-auto text-[10px] text-muted-foreground">congela o tempo</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={cycleWater} className="gap-2">
                <Droplets className="h-4 w-4" /> Lembrete de água
                <span className="ml-auto text-[10px] font-semibold text-primary">{waterMinutes === 0 ? "desligado" : `${waterMinutes} min`}</span>
              </DropdownMenuItem>
              {isNotifySupported() && (
                <DropdownMenuItem onClick={() => void toggleNotify()} className="gap-2">
                  {notifyOn ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />} Notificar fora do app
                  <span className="ml-auto text-[10px] font-semibold text-primary">{notifyOn ? "ligado" : "desligado"}</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={captureLocation} className="gap-2">
                <MapPin className="h-4 w-4" /> {session.location ? "Atualizar local do treino" : "Registrar local do treino"}
                {session.location && <span className="ml-auto text-[10px] font-semibold text-emerald-600">✓ salvo</span>}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onPause} className="gap-2">
                <LogOut className="h-4 w-4" /> Pausar e sair
                <span className="ml-auto text-[10px] text-muted-foreground">salva o progresso</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDiscardOpen(true)} className="gap-2 text-destructive focus:text-destructive">
                <Trash2 className="h-4 w-4" /> Cancelar treino…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button onClick={handleFinish} className="h-9 shrink-0 gap-1.5 px-3 font-semibold sm:px-4">
            <Flag className="h-4 w-4" /> Finalizar
          </Button>
        </div>

        {/* Alternador Lista / Foco */}
        <div className="mx-auto flex max-w-2xl items-center justify-center px-4 pb-2">
          <div className="inline-flex rounded-lg border border-border/50 bg-muted/30 p-0.5">
            <button
              type="button"
              onClick={() => setMode("list")}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors", mode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
            >
              <List className="h-3.5 w-3.5" /> Lista
            </button>
            <button
              type="button"
              onClick={enterFocus}
              className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-semibold transition-colors", mode === "focus" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground")}
            >
              <Target className="h-3.5 w-3.5" /> Foco
            </button>
          </div>
        </div>

        {/* Barra de progresso da sessão (feedback visual conforme conclui as séries) */}
        <div className="h-1 w-full bg-muted/40">
          <div className="h-full bg-primary transition-[width] duration-500 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </header>

      {/* CONTEÚDO */}
      {mode === "list" ? (
        <main className="mx-auto w-full max-w-2xl flex-1 space-y-3 px-4 py-4 pb-28">
          {exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              last={ex.name ? lastPerf[ex.name.toLowerCase()] : undefined}
              youtubeId={ex.name ? mediaFor(media, ex.name)?.youtubeId : undefined}
              controls={controls}
              onToggle={handleToggle}
              onOpenDemo={() => ex.name.trim() && setDemoFor(ex.name)}
            />
          ))}
          <AddExercisePanel onAdd={controls.addExercise} groups={session.muscleGroups} />
        </main>
      ) : focusEx ? (
        <FocusView
          ex={focusEx}
          dir={dir}
          index={idx}
          total={exercises.length}
          last={focusEx.name ? lastPerf[focusEx.name.toLowerCase()] : undefined}
          youtubeId={focusEx.name ? mediaFor(media, focusEx.name)?.youtubeId : undefined}
          controls={controls}
          onToggle={handleToggle}
          onOpenDemo={() => focusEx.name.trim() && setDemoFor(focusEx.name)}
          doneFlags={exercises.map((e) => allDone(e))}
          hasPrev={idx > 0}
          hasNext={idx < exercises.length - 1}
          onPrev={() => { setDir(-1); setFocusIdx(Math.max(0, idx - 1)); }}
          onNext={goNext}
          onRemove={removeFocused}
        />
      ) : null}

      {/* Fase de aquecimento (antes da 1ª série) — timer próprio + sugestões */}
      <AnimatePresence>
        {inWarmup && (
          <WarmupOverlay
            remaining={warmupRemaining}
            muscleGroups={session.muscleGroups}
            onExtend={onExtendWarmup}
            onDone={onEndWarmup}
          />
        )}
      </AnimatePresence>

      {/* Treino pausado: cobre a tela até retomar (evita marcar série com o relógio parado) */}
      {paused && (
        <div className="fixed inset-0 z-[75] flex flex-col items-center justify-center bg-background/95 px-6 backdrop-blur">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500">
            <Pause className="h-7 w-7" />
          </span>
          <h2 className="text-lg font-bold">Treino pausado</h2>
          <p className="mt-1 font-mono text-4xl font-bold tabular-nums">{clock(elapsed)}</p>
          <p className="mt-1 text-xs text-muted-foreground">O cronômetro está congelado — nada foi perdido.</p>
          <Button onClick={onTogglePause} className="mt-6 h-12 gap-2 px-8 text-base font-bold">
            <Play className="h-5 w-5" /> Retomar treino
          </Button>
        </div>
      )}

      {/* Mini atalho de música (recolhido; some durante o descanso em tela cheia) */}
      {!(restEndsAt !== null && !restMinimized) && <MusicButton />}

      {/* Tela de descanso (100vh) — entra/sai com animação suave */}
      <AnimatePresence>
        {restEndsAt !== null && !restMinimized && (
          <RestOverlay
            total={restTotal}
            remaining={restRemaining}
            minRest={Math.min(restTotal, MIN_REST_SECONDS)}
            next={nextInfo}
            superset={partner ? { name: partner.name, group: partner.group } : null}
            onAdjust={adjustRest}
            onSetExact={setRestExact}
            onDone={handleRestDone}
            onSuperset={partner ? goSuperset : undefined}
            onMinimize={() => setRestMinimized(true)}
          />
        )}
      </AnimatePresence>

      {/* Pílula do descanso minimizado (bi-set): timer de A rodando em background */}
      {restEndsAt !== null && restMinimized && (
        <RestMiniPill
          remaining={restRemaining}
          label={restExName || undefined}
          onExpand={() => setRestMinimized(false)}
        />
      )}

      {/* Demonstração em vídeo */}
      {demoFor && (
        <ExerciseDemoModal name={demoFor} youtubeId={demoId} onClose={() => setDemoFor(null)} onSave={(id) => saveVideo(demoFor, id)} />
      )}

      {/* Confirmação de cancelamento (único, controlado por estado). Com séries já
          feitas, oferece salvar PARCIAL — desanimar no meio não apaga o que você fez. */}
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar este treino?</AlertDialogTitle>
            <AlertDialogDescription>
              {stats.doneSets > 0
                ? `Você já concluiu ${stats.doneSets} série${stats.doneSets > 1 ? "s" : ""} de verdade nesta sessão. Dá para salvar como treino parcial (conta no histórico) em vez de jogar tudo fora.`
                : "Você ainda não concluiu nenhuma série — descartar não apaga nada do histórico. Para guardar o rascunho sem finalizar, use “Pausar e sair”."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar treinando</AlertDialogCancel>
            {stats.doneSets > 0 && (
              <AlertDialogAction onClick={() => { setDiscardOpen(false); handleFinish(); }}>
                Salvar parcial
              </AlertDialogAction>
            )}
            <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Descartar tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---- Seletor de equipamento (muda a semântica da carga) ----
function EquipmentPicker({ value, onChange }: { value?: Equipment; onChange: (e: Equipment) => void }) {
  const keys = Object.keys(EQUIPMENT_META) as Equipment[];
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-hide">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
            value === k ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40",
          )}
        >
          {EQUIPMENT_META[k].short}
        </button>
      ))}
    </div>
  );
}

// ---- Pílula do descanso minimizado (bi-set): cronômetro de A rodando no canto ----
function RestMiniPill({ remaining, label, onExpand }: { remaining: number; label?: string; onExpand: () => void }) {
  const over = remaining <= 0;
  const s = Math.abs(Math.floor(remaining));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return (
    <button
      type="button"
      onClick={onExpand}
      className={cn(
        "fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-full border px-4 py-2.5 shadow-lg backdrop-blur transition-colors",
        over ? "animate-pulse border-red-500/50 bg-red-500/95 text-white" : "border-border/50 bg-card/95 text-foreground",
      )}
    >
      <Timer className={cn("h-4 w-4", over ? "text-white" : "text-primary")} />
      <span className="font-mono text-base font-bold tabular-nums">{over ? "+" : ""}{mm}:{ss}</span>
      <span className="max-w-[42vw] truncate text-xs opacity-80">{over ? "Volte ao descanso!" : `descanso${label ? ` · ${label}` : ""}`}</span>
      <ChevronUp className="h-4 w-4 opacity-70" />
    </button>
  );
}

// ---- Campo de carga com modificadores rápidos (−/+ 2,5 kg) ao lado do input ----
function WeightStepper({ value, onChange, big, placeholder = "0", disabled = false }: { value: string; onChange: (v: string) => void; big?: boolean; placeholder?: string; disabled?: boolean }) {
  const step = (delta: number) => {
    if (disabled) return;
    const cur = parseFloat((value || "0").replace(",", ".")) || 0;
    const next = Math.max(0, Math.round((cur + delta) * 100) / 100);
    onChange(String(next));
  };
  return (
    <div className={cn("flex items-stretch overflow-hidden rounded-lg border border-border/60 bg-background", big ? "h-12" : "h-10", disabled && "opacity-50")}>
      <button type="button" tabIndex={-1} disabled={disabled} onClick={() => step(-2.5)} className="flex items-center px-1.5 text-muted-foreground transition-colors hover:bg-muted/50 active:bg-muted disabled:pointer-events-none" aria-label="Diminuir 2,5 kg">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <input
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn("w-full min-w-0 border-0 bg-transparent text-center font-mono outline-none placeholder:text-muted-foreground/40 disabled:cursor-not-allowed", big ? "text-lg" : "text-base")}
      />
      <button type="button" tabIndex={-1} disabled={disabled} onClick={() => step(2.5)} className="flex items-center px-1.5 text-muted-foreground transition-colors hover:bg-muted/50 active:bg-muted disabled:pointer-events-none" aria-label="Aumentar 2,5 kg">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Próximo tipo na rotação: Normal → Aquecimento → Falha → Normal.
function nextSetType(t?: SetType): SetType {
  return t === "warmup" ? "failure" : t === "failure" ? "normal" : "warmup";
}

// Cor da rep digitada vs. a meta da ficha: abaixo do mínimo = âmbar; na/acima da
// faixa = verde; vazio/sem meta = neutro. Aquecimento não é avaliado.
function repTone(reps: string, type: SetType, target?: LiveTarget): string {
  if (!target || type === "warmup") return "";
  const r = parseFloat((reps || "").replace(",", ".")) || 0;
  if (r <= 0) return "";
  return r < target.minReps ? "text-amber-600" : "text-emerald-600";
}

// ---- Linhas de série (reutilizadas em Lista e Foco) ----
function SetRows({ ex, controls, onToggle, big = false, last }: {
  ex: Ex;
  controls: SessionControls;
  onToggle: (exId: string, setId: string, wasDone: boolean) => void;
  big?: boolean;
  last?: LastPerf;
}) {
  const perHand = ex.equipment === "dumbbell";
  // Peso corporal: a carga vira "extra opcional" (colete/anilha) — não faz sentido
  // exigir peso; a coluna muda de rótulo e o fantasma fica vazio.
  const bodyweight = ex.equipment === "bodyweight";
  const target = ex.target;
  const targetReps = target ? (target.minReps === target.maxReps ? `${target.minReps}` : `${target.minReps}-${target.maxReps}`) : null;
  // Alvo-fantasma: última execução; sem histórico, cai pra meta da ficha.
  const ghostW = bodyweight ? "—" : last?.weight && last.weight !== "0" ? last.weight : "0";
  const ghostR = last?.reps && last.reps !== "0" ? last.reps : targetReps ?? "0";
  // Série ATUAL = primeira não-concluída. Só ela é editável (foco numa série por vez):
  // as anteriores ficam travadas mas podem ser reabertas pelo "Ok"; as próximas ficam
  // bloqueadas até chegar a vez. Evita preencher o treino todo de uma vez e quebrar o ritmo.
  const activeIdx = ex.sets.findIndex((s) => !s.done);
  return (
    <>
      {target && (
        <div className="mb-1.5 flex items-center gap-1.5 rounded-lg bg-primary/5 px-2 py-1 text-[11px] font-medium text-primary">
          <Target className="h-3 w-3" /> Meta: {ex.sets.length} × {targetReps} reps
          {target.intensity && <span className="text-primary/70">· {target.intensity.type} {target.intensity.value}</span>}
        </div>
      )}
      <div className="grid grid-cols-[1.75rem_1.4fr_1fr_2.5rem_1.75rem] items-center gap-1.5 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        <span className="text-center">Tipo</span>
        <span className="text-center">{perHand ? "Carga/mão" : bodyweight ? "+kg (opcional)" : "Carga (kg)"}</span>
        <span className="text-center">Reps</span>
        <span className="text-center">Ok</span>
        <span />
      </div>
      <div className="space-y-1.5">
        {ex.sets.map((s, i) => {
          const type = s.type ?? "normal";
          const meta = SET_TYPE_META[type];
          const isActive = i === activeIdx;
          const isFuture = activeIdx !== -1 && i > activeIdx;
          // Só a série atual edita carga/reps/tipo. Concluídas: travadas, mas o "Ok"
          // reabre (corrigir erro). Futuras: tudo bloqueado até chegar a vez.
          const inputsLocked = !isActive;
          const checkDisabled = isFuture;
          return (
            <div
              key={s.id}
              className={cn(
                "grid grid-cols-[1.75rem_1.4fr_1fr_2.5rem_1.75rem] items-center gap-1.5 rounded-lg p-1 transition-all",
                s.done && "bg-emerald-500/5",
                isActive && "bg-primary/5 ring-1 ring-primary/25",
                isFuture && "opacity-45",
              )}
            >
              <button
                type="button"
                disabled={inputsLocked}
                onClick={() => controls.setSetType(ex.id, s.id, nextSetType(type))}
                className={cn("mx-auto flex h-7 w-7 items-center justify-center rounded-md border text-[11px] font-bold tabular-nums transition-colors disabled:pointer-events-none", meta.tone)}
                title={`Série: ${meta.label} — toque para alternar (A/N/F)`}
                aria-label={`Tipo da série: ${meta.label}`}
              >
                {type === "normal" ? i + 1 : meta.short}
              </button>
              <WeightStepper value={s.weight} onChange={(v) => controls.updateSet(ex.id, s.id, "weight", v)} big={big} placeholder={ghostW} disabled={inputsLocked} />
              <Input inputMode="numeric" value={s.reps} disabled={inputsLocked} onChange={(e) => controls.updateSet(ex.id, s.id, "reps", e.target.value)} placeholder={ghostR} className={cn("text-center font-mono font-semibold placeholder:font-normal placeholder:text-muted-foreground/40 disabled:opacity-50", repTone(s.reps, type, target), big ? "h-12 text-lg" : "h-10 text-base")} />
              <button
                type="button"
                disabled={checkDisabled}
                onClick={() => onToggle(ex.id, s.id, s.done)}
                className={cn(
                  "mx-auto flex items-center justify-center rounded-lg border transition-all disabled:pointer-events-none",
                  big ? "h-11 w-11" : "h-9 w-9",
                  s.done ? "border-emerald-500 bg-emerald-500 text-white" : isActive ? "border-emerald-500/70 text-emerald-600 hover:border-emerald-500 hover:bg-emerald-500/10" : "border-border/60 text-muted-foreground",
                )}
                aria-label={s.done ? "Desmarcar série" : checkDisabled ? "Série bloqueada (conclua a anterior)" : "Marcar série feita"}
              >
                {checkDisabled ? <Lock className={big ? "h-5 w-5" : "h-4 w-4"} /> : <Check className={big ? "h-6 w-6" : "h-5 w-5"} />}
              </button>
              <button type="button" onClick={() => controls.removeSet(ex.id, s.id)} className="mx-auto text-muted-foreground/50 hover:text-destructive disabled:pointer-events-none disabled:opacity-30" aria-label="Remover série" disabled={ex.sets.length === 1}>
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
      <Button type="button" variant="ghost" onClick={() => controls.addSet(ex.id)} className="mt-1.5 w-full gap-1.5 border border-dashed border-border/50 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground">
        <Plus className="h-4 w-4" /> Adicionar série <span className="text-muted-foreground/50">(clona a anterior)</span>
      </Button>
    </>
  );
}

function LastAndPR({ last, pr, orm = 0 }: { last?: LastPerf; pr: boolean; orm?: number }) {
  const rel = relativeDays(last?.date);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {last && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <History className="h-3 w-3 shrink-0" /> última vez: {last.sets}×{last.reps} · {last.weight}kg{rel ? ` · ${rel}` : ""}
        </span>
      )}
      {orm > 0 && (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary" title="1RM estimado (Epley) das séries de trabalho">
          1RM ~{orm}kg
        </span>
      )}
      {pr && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
          <Trophy className="h-3 w-3" /> Recorde!
        </span>
      )}
    </div>
  );
}

// Botão de trocar exercício (erro do usuário) — input inline que substitui o movimento.
function SwapControl({ ex, controls, iconOnly = false }: { ex: Ex; controls: SessionControls; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(ex.name);
  const submit = () => {
    const name = value.trim();
    if (name) controls.replaceExercise(ex.id, name, ex.group, ex.equipment);
    setOpen(false);
  };
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { setValue(ex.name); setOpen(true); }}
        className={cn("text-muted-foreground hover:text-primary", iconOnly ? "" : "inline-flex items-center gap-1 text-xs font-medium")}
        aria-label="Trocar exercício"
      >
        <Replace className="h-4 w-4" /> {!iconOnly && "Trocar"}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <Input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
        placeholder="Trocar por…"
        className="h-8 w-40 text-sm"
      />
      <Button size="sm" className="h-8 px-2" onClick={submit}>OK</Button>
    </div>
  );
}

// ---- Card de um exercício (modo Lista) ----
function ExerciseCard({ ex, last, youtubeId, controls, onToggle, onOpenDemo }: {
  ex: Ex;
  last?: LastPerf;
  youtubeId?: string;
  controls: SessionControls;
  onToggle: (exId: string, setId: string, wasDone: boolean) => void;
  onOpenDemo: () => void;
}) {
  const [open, setOpen] = useState(true);
  const doneCount = ex.sets.filter((s) => s.done).length;
  const pr = isPR(ex, last);
  const orm = estimatedOneRepMax(ex);

  return (
    <section className={cn("overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors", allDone(ex) ? "border-emerald-500/30" : "border-border/40")}>
      <div className="flex items-center gap-2.5 px-2.5 py-2.5">
        <ExerciseThumb name={ex.name || "?"} group={ex.group} youtubeId={youtubeId} onClick={onOpenDemo} className="h-12 w-12 rounded-lg" />

        {ex.name ? (
          <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold">{ex.name}</p>
            <LastAndPR last={last} pr={pr} orm={orm} />
          </button>
        ) : (
          <div className="min-w-0 flex-1">
            <Input autoFocus defaultValue="" onBlur={(e) => controls.renameExercise(ex.id, e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} placeholder="Nome do exercício…" className="h-8 text-sm" />
          </div>
        )}

        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">{doneCount}/{ex.sets.length}</span>
        <button type="button" onClick={() => setOpen((v) => !v)} className="text-muted-foreground" aria-label={open ? "Recolher" : "Expandir"}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <button type="button" onClick={() => controls.removeExercise(ex.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remover exercício">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {open && (
        <div className="space-y-2.5 border-t border-border/40 p-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <EquipmentPicker value={ex.equipment} onChange={(eq) => controls.setExerciseEquipment(ex.id, eq)} />
            {ex.name && <SwapControl ex={ex} controls={controls} />}
          </div>
          <SetRows ex={ex} controls={controls} onToggle={onToggle} last={last} />
        </div>
      )}
    </section>
  );
}

// Slide do modo Foco: entra do lado para onde se navega, sai para o lado oposto.
const focusVariants = {
  enter: (d: number) => ({ x: d >= 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d >= 0 ? -48 : 48, opacity: 0 }),
};

// ---- Modo Foco: um exercício por vez ----
function FocusView({ ex, dir, index, total, doneFlags, last, youtubeId, controls, onToggle, onOpenDemo, hasPrev, hasNext, onPrev, onNext, onRemove }: {
  ex: Ex;
  dir: number;
  index: number;
  total: number;
  doneFlags: boolean[];
  last?: LastPerf;
  youtubeId?: string;
  controls: SessionControls;
  onToggle: (exId: string, setId: string, wasDone: boolean) => void;
  onOpenDemo: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRemove: () => void;
}) {
  const done = allDone(ex);
  const pr = isPR(ex, last);
  const orm = estimatedOneRepMax(ex);
  const [confirmNext, setConfirmNext] = useState(false);

  // Bloqueia/Confirma o "Próximo" se a série atual não foi concluída.
  const handleNext = () => {
    if (!done && !confirmNext) {
      setConfirmNext(true);
      return;
    }
    setConfirmNext(false);
    onNext();
  };

  // Some o aviso ao concluir tudo ou ao trocar de exercício (reset de flag de UI).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setConfirmNext(false); }, [ex.id, done]);

  return (
    <AnimatePresence mode="popLayout" custom={dir} initial={false}>
    <motion.main
      key={ex.id}
      custom={dir}
      variants={focusVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4 pb-28"
    >
      {/* Progresso: bolinhas preenchidas de verde nos exercícios já concluídos */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">
          Exercício {index + 1} de {total}
          {doneFlags.filter(Boolean).length > 0 && (
            <span className="text-emerald-600"> · {doneFlags.filter(Boolean).length} feito{doneFlags.filter(Boolean).length > 1 ? "s" : ""}</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-5" : "w-1.5",
                doneFlags[i] ? "bg-emerald-500" : i === index ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>
      </div>

      {/* Capa grande animada (toca → demonstração) */}
      <ExerciseThumb key={ex.id} name={ex.name || "?"} group={ex.group} youtubeId={youtubeId} size="lg" onClick={onOpenDemo} className="aspect-video w-full rounded-2xl" />

      {/* Nome + última vez/PR + trocar */}
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {ex.name ? (
            <h2 className="truncate text-xl font-bold tracking-tight">{ex.name}</h2>
          ) : (
            <Input autoFocus defaultValue="" onBlur={(e) => controls.renameExercise(ex.id, e.target.value)} placeholder="Nome do exercício…" className="h-10 text-lg font-bold" />
          )}
          <div className="mt-1"><LastAndPR last={last} pr={pr} orm={orm} /></div>
        </div>
        {ex.name && (
          <div className="flex shrink-0 items-center gap-2.5 pt-1">
            <SwapControl ex={ex} controls={controls} />
            <button type="button" onClick={onRemove} className="text-muted-foreground hover:text-destructive" aria-label="Remover exercício do treino" title="Remover exercício">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* Equipamento */}
      <div className="mt-3">
        <EquipmentPicker value={ex.equipment} onChange={(eq) => controls.setExerciseEquipment(ex.id, eq)} />
      </div>

      {/* Séries (grandes) */}
      <div className="mt-3 rounded-2xl border border-border/40 bg-card p-3 shadow-sm">
        <SetRows ex={ex} controls={controls} onToggle={onToggle} big last={last} />
      </div>

      {/* Aviso de série incompleta */}
      {confirmNext && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-600">
          <AlertTriangle className="h-4 w-4 shrink-0" /> Ainda há séries não concluídas. Toque em “Avançar mesmo assim” para continuar.
        </div>
      )}

      {/* Navegação */}
      <div className="mt-4 flex items-center gap-3">
        <Button variant="outline" onClick={onPrev} disabled={!hasPrev} className="h-12 flex-1 gap-1.5">
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        {hasNext ? (
          <Button
            onClick={handleNext}
            variant={confirmNext ? "destructive" : "default"}
            className={cn("h-12 flex-1 gap-1.5 text-base font-bold", done && "animate-pulse")}
          >
            {done ? <CircleCheck className="h-5 w-5" /> : null} {confirmNext ? "Avançar mesmo assim" : "Próximo"} <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-sm font-bold text-emerald-600">
            <CircleCheck className="h-5 w-5" /> Último exercício
          </div>
        )}
      </div>
    </motion.main>
    </AnimatePresence>
  );
}

// ---- Painel de adicionar exercício (modo Lista) ----
function AddExercisePanel({ groups, onAdd }: { groups: string[]; onAdd: (name: string, group?: string) => void }) {
  const [value, setValue] = useState("");
  const submit = () => {
    const name = value.trim();
    if (!name) return;
    onAdd(name);
    setValue("");
  };
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-dashed border-border/50 bg-card/50 p-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
        placeholder={groups.length ? `Adicionar exercício (${groups.join(", ")})…` : "Adicionar exercício…"}
        className="h-10 border-none bg-transparent shadow-none focus-visible:ring-0"
      />
      <Button type="button" size="sm" onClick={submit} disabled={!value.trim()} className="shrink-0 gap-1.5">
        <Plus className="h-4 w-4" /> Incluir
      </Button>
    </div>
  );
}
