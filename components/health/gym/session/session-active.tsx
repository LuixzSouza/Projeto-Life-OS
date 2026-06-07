"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check, Plus, Trash2, X, Timer, ChevronDown, ChevronUp, History, Flag, Trophy,
  List, Target, ChevronLeft, ChevronRight, CircleCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useWakeLock } from "./use-wake-lock";
import { sessionStats, type LiveSession, type LastPerf } from "./session-types";
import { RestOverlay } from "./rest-overlay";
import { ExerciseDemoModal } from "./exercise-demo-modal";
import { ExerciseThumb } from "./exercise-thumb";
import { getAllMedia, persistMedia, mediaFor, setVideoFor, type MediaMap } from "./exercise-media";

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

// Rótulo da próxima série não-feita (para a tela de descanso).
function nextSetLabel(exercises: Ex[]): string | undefined {
  for (const ex of exercises) {
    const idx = ex.sets.findIndex((s) => !s.done);
    if (idx !== -1 && ex.name.trim()) {
      const s = ex.sets[idx];
      const target = s.weight || s.reps ? ` · ${s.weight || "?"}kg × ${s.reps || "?"}` : "";
      return `${ex.name} — série ${idx + 1}${target}`;
    }
  }
  return undefined;
}

const numOf = (v: string) => parseFloat((v || "").replace(",", ".")) || 0;

// Recorde: alguma série feita supera a "última vez" (mais carga, ou mesma carga e mais reps).
function isPR(ex: Ex, last?: LastPerf): boolean {
  if (!last) return false;
  const lastW = numOf(last.weight);
  const lastR = numOf(last.reps);
  let best: { w: number; r: number } | null = null;
  for (const s of ex.sets) {
    if (!s.done) continue;
    const w = numOf(s.weight), r = numOf(s.reps);
    if (!best || w > best.w || (w === best.w && r > best.r)) best = { w, r };
  }
  if (!best || best.w === 0) return false;
  return best.w > lastW || (best.w === lastW && best.r > lastR);
}

const allDone = (ex: Ex) => ex.sets.length > 0 && ex.sets.every((s) => s.done);

export interface SessionControls {
  renameExercise: (exId: string, name: string) => void;
  addExercise: (name: string, group?: string) => void;
  removeExercise: (exId: string) => void;
  addSet: (exId: string) => void;
  removeSet: (exId: string, setId: string) => void;
  updateSet: (exId: string, setId: string, field: "reps" | "weight", value: string) => void;
  toggleSetDone: (exId: string, setId: string) => void;
}

export function SessionActive({
  session, lastPerf, controls, onFinish, onCancel,
}: {
  session: LiveSession;
  lastPerf: Record<string, LastPerf>;
  controls: SessionControls;
  onFinish: () => void;
  onCancel: () => void;
}) {
  useWakeLock(true);

  const exercises = session.exercises;
  const firstIncomplete = (from = 0) => {
    for (let i = from; i < exercises.length; i++) if (!allDone(exercises[i])) return i;
    return -1;
  };

  const [mode, setMode] = useState<"list" | "focus">("list");
  const [focusIdx, setFocusIdx] = useState(0);

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
  const restEndsRef = useRef<number | null>(null);
  const buzzed = useRef(false);
  const setRest = (end: number | null) => {
    restEndsRef.current = end;
    buzzed.current = false;
    setRestEndsAt(end);
  };

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (restEndsRef.current !== null && n >= restEndsRef.current && !buzzed.current) {
        buzzed.current = true;
        if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([250, 120, 250]);
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = Math.floor((now - session.startedAt) / 1000);
  const restRemaining = restEndsAt ? Math.round((restEndsAt - now) / 1000) : 0;

  const startRest = () => setRest(Date.now() + session.restSeconds * 1000);
  const adjustRest = (deltaSeconds: number) => {
    const base = restRemaining > 0 ? (restEndsRef.current ?? Date.now()) : Date.now();
    setRest(Math.max(Date.now() - 2000, base + deltaSeconds * 1000));
  };

  const handleToggle = (exId: string, setId: string, wasDone: boolean) => {
    controls.toggleSetDone(exId, setId);
    if (!wasDone) startRest();
  };

  // Ao concluir o descanso: no modo Foco, avança pro próximo exercício incompleto.
  const handleRestDone = () => {
    setRest(null);
    if (mode === "focus") {
      const cur = exercises[focusIdx];
      if (cur && allDone(cur)) {
        const next = firstIncomplete(focusIdx + 1);
        if (next !== -1) setFocusIdx(next);
      }
    }
  };

  const enterFocus = () => {
    const i = firstIncomplete();
    setFocusIdx(i === -1 ? 0 : i);
    setMode("focus");
  };

  const stats = useMemo(() => sessionStats(exercises), [exercises]);
  const nextLabel = useMemo(() => nextSetLabel(exercises), [exercises]);
  const demoId = demoFor ? mediaFor(media, demoFor)?.youtubeId : undefined;

  const idx = Math.min(focusIdx, Math.max(0, exercises.length - 1));
  const focusEx = exercises[idx];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      {/* HEADER fixo */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary" />
            <span className="font-mono text-xl font-bold tabular-nums tracking-tight">{clock(elapsed)}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{session.title}</p>
            <p className="text-[11px] text-muted-foreground">{stats.doneSets}/{stats.totalSets} séries · {stats.volume.toLocaleString("pt-BR")} kg</p>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" aria-label="Descartar">
                <X className="h-5 w-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Descartar este treino?</AlertDialogTitle>
                <AlertDialogDescription>Você perderá as séries registradas nesta sessão. Essa ação não pode ser desfeita.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continuar treinando</AlertDialogCancel>
                <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Descartar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button onClick={onFinish} className="h-9 gap-1.5 font-semibold">
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
          index={idx}
          total={exercises.length}
          last={focusEx.name ? lastPerf[focusEx.name.toLowerCase()] : undefined}
          youtubeId={focusEx.name ? mediaFor(media, focusEx.name)?.youtubeId : undefined}
          controls={controls}
          onToggle={handleToggle}
          onOpenDemo={() => focusEx.name.trim() && setDemoFor(focusEx.name)}
          hasPrev={idx > 0}
          hasNext={idx < exercises.length - 1}
          onPrev={() => setFocusIdx(Math.max(0, idx - 1))}
          onNext={() => setFocusIdx(Math.min(exercises.length - 1, idx + 1))}
        />
      ) : null}

      {/* Tela de descanso (100vh) */}
      {restEndsAt !== null && (
        <RestOverlay total={session.restSeconds} remaining={restRemaining} nextLabel={nextLabel} onAdjust={adjustRest} onDone={handleRestDone} />
      )}

      {/* Demonstração em vídeo */}
      {demoFor && (
        <ExerciseDemoModal name={demoFor} youtubeId={demoId} onClose={() => setDemoFor(null)} onSave={(id) => saveVideo(demoFor, id)} />
      )}
    </div>
  );
}

// ---- Linhas de série (reutilizadas em Lista e Foco) ----
function SetRows({ ex, controls, onToggle, big = false }: {
  ex: Ex;
  controls: SessionControls;
  onToggle: (exId: string, setId: string, wasDone: boolean) => void;
  big?: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem_2rem] items-center gap-2 px-1 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        <span className="text-center">#</span>
        <span className="text-center">Carga (kg)</span>
        <span className="text-center">Reps</span>
        <span className="text-center">Ok</span>
        <span />
      </div>
      <div className="space-y-1.5">
        {ex.sets.map((s, i) => (
          <div key={s.id} className={cn("grid grid-cols-[2rem_1fr_1fr_2.5rem_2rem] items-center gap-2 rounded-lg p-1 transition-colors", s.done && "bg-emerald-500/5")}>
            <span className="text-center text-xs font-mono text-muted-foreground">{i + 1}</span>
            <Input inputMode="decimal" value={s.weight} onChange={(e) => controls.updateSet(ex.id, s.id, "weight", e.target.value)} placeholder="0" className={cn("text-center font-mono", big ? "h-12 text-lg" : "h-10 text-base")} />
            <Input inputMode="numeric" value={s.reps} onChange={(e) => controls.updateSet(ex.id, s.id, "reps", e.target.value)} placeholder="0" className={cn("text-center font-mono", big ? "h-12 text-lg" : "h-10 text-base")} />
            <button
              type="button"
              onClick={() => onToggle(ex.id, s.id, s.done)}
              className={cn("mx-auto flex items-center justify-center rounded-lg border transition-all", big ? "h-11 w-11" : "h-9 w-9", s.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border/60 text-muted-foreground hover:border-emerald-500/60")}
              aria-label={s.done ? "Desmarcar série" : "Marcar série feita"}
            >
              <Check className={big ? "h-6 w-6" : "h-5 w-5"} />
            </button>
            <button type="button" onClick={() => controls.removeSet(ex.id, s.id)} className="mx-auto text-muted-foreground/50 hover:text-destructive" aria-label="Remover série" disabled={ex.sets.length === 1}>
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button type="button" variant="ghost" onClick={() => controls.addSet(ex.id)} className="mt-1.5 w-full gap-1.5 border border-dashed border-border/50 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground">
        <Plus className="h-4 w-4" /> Adicionar série
      </Button>
    </>
  );
}

function LastAndPR({ last, pr }: { last?: LastPerf; pr: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {last && (
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <History className="h-3 w-3" /> última vez: {last.weight}kg × {last.reps} ({last.sets} séries)
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

  return (
    <section className={cn("overflow-hidden rounded-2xl border bg-card shadow-sm transition-colors", allDone(ex) ? "border-emerald-500/30" : "border-border/40")}>
      <div className="flex items-center gap-2.5 px-2.5 py-2.5">
        <ExerciseThumb name={ex.name || "?"} group={ex.group} youtubeId={youtubeId} onClick={onOpenDemo} className="h-12 w-12 rounded-lg" />

        {ex.name ? (
          <button type="button" onClick={() => setOpen((v) => !v)} className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold">{ex.name}</p>
            <LastAndPR last={last} pr={pr} />
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

      {open && <div className="border-t border-border/40 p-2"><SetRows ex={ex} controls={controls} onToggle={onToggle} /></div>}
    </section>
  );
}

// ---- Modo Foco: um exercício por vez ----
function FocusView({ ex, index, total, last, youtubeId, controls, onToggle, onOpenDemo, hasPrev, hasNext, onPrev, onNext }: {
  ex: Ex;
  index: number;
  total: number;
  last?: LastPerf;
  youtubeId?: string;
  controls: SessionControls;
  onToggle: (exId: string, setId: string, wasDone: boolean) => void;
  onOpenDemo: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const done = allDone(ex);
  const pr = isPR(ex, last);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-4 pb-28">
      {/* Progresso */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground">Exercício {index + 1} de {total}</span>
        <div className="flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span key={i} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-5 bg-primary" : "w-1.5 bg-muted")} />
          ))}
        </div>
      </div>

      {/* Capa grande animada (toca → demonstração) */}
      <ExerciseThumb key={ex.id} name={ex.name || "?"} group={ex.group} youtubeId={youtubeId} size="lg" onClick={onOpenDemo} className="aspect-video w-full rounded-2xl" />

      {/* Nome + última vez/PR */}
      <div className="mt-3">
        {ex.name ? (
          <h2 className="text-xl font-bold tracking-tight">{ex.name}</h2>
        ) : (
          <Input autoFocus defaultValue="" onBlur={(e) => controls.renameExercise(ex.id, e.target.value)} placeholder="Nome do exercício…" className="h-10 text-lg font-bold" />
        )}
        <div className="mt-1"><LastAndPR last={last} pr={pr} /></div>
      </div>

      {/* Séries (grandes) */}
      <div className="mt-4 rounded-2xl border border-border/40 bg-card p-3 shadow-sm">
        <SetRows ex={ex} controls={controls} onToggle={onToggle} big />
      </div>

      {/* Navegação */}
      <div className="mt-5 flex items-center gap-3">
        <Button variant="outline" onClick={onPrev} disabled={!hasPrev} className="h-12 flex-1 gap-1.5">
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        {hasNext ? (
          <Button onClick={onNext} className={cn("h-12 flex-1 gap-1.5 text-base font-bold", done && "animate-pulse")}>
            {done ? <CircleCheck className="h-5 w-5" /> : null} Próximo <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-sm font-bold text-emerald-600">
            <CircleCheck className="h-5 w-5" /> Último exercício
          </div>
        )}
      </div>
    </main>
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
