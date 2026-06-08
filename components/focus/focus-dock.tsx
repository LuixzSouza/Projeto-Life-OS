"use client";

// FocusDock — widget global do Modo Foco (Pomodoro + cronômetro).
// Montado UMA vez no layout do dashboard: como não desmonta na navegação do
// App Router, o timer persiste em todas as rotas. O estado também é gravado no
// localStorage, então sobrevive a refresh e ao fechar/reabrir a aba.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Timer, Play, Pause, RotateCcw, SkipForward, X, Settings2,
  Brain, Check, ChevronDown, Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type FocusState, type FocusStartRequest,
  DEFAULT_FOCUS_STATE, FOCUS_PRESETS, PHASE_META, FOCUS_START_EVENT,
  loadFocusState, saveFocusState, elapsedMs, remainingMs, consumeFocusStart,
  isPhaseComplete, nextBreakPhase, phaseDurationMin, formatClock, playChime,
} from "./focus-core";
import {
  getFocusableTasks, logFocusSession, getFocusToday,
  type FocusableTask, type FocusTodaySummary,
} from "@/app/(dashboard)/agenda/focus-actions";

const TICK_MS = 500;

export function FocusDock() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<FocusState>(DEFAULT_FOCUS_STATE);
  const [now, setNow] = useState<number>(() => Date.now());
  const [today, setToday] = useState<FocusTodaySummary>({ minutes: 0, sessions: 0, cycles: 0 });
  const [tasks, setTasks] = useState<FocusableTask[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTasks, setShowTasks] = useState(false);

  // Ref sempre apontando para o estado mais recente — o tick (assíncrono) lê
  // daqui para evitar closures obsoletas ao disparar conclusões de fase.
  const stateRef = useRef<FocusState>(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Persistência + ref a cada mudança.
  const update = useCallback((patch: Partial<FocusState> | ((s: FocusState) => Partial<FocusState>)) => {
    setState((prev) => {
      const delta = typeof patch === "function" ? patch(prev) : patch;
      const next = { ...prev, ...delta };
      saveFocusState(next);
      return next;
    });
  }, []);

  // Aplica um pedido externo de "iniciar foco" (▶ Foco num bloco da Agenda):
  // vincula rótulo/tarefa/bloco, ajusta a duração ao bloco e já começa a rodar.
  const applyStart = useCallback((req: FocusStartRequest) => {
    const at = Date.now();
    update((s) => ({
      label: req.label ?? s.label,
      taskId: req.taskId ?? null,
      eventId: req.eventId ?? null,
      focusMin: req.focusMin ? Math.min(180, Math.max(5, Math.round(req.focusMin))) : s.focusMin,
      mode: "POMODORO",
      phase: "focus",
      accumulatedMs: 0,
      phaseStartedAt: at,
      focusStartedAt: at,
      running: true,
      open: true,
    }));
  }, [update]);

  // Hidrata do localStorage só no cliente (evita mismatch de SSR). O setState vai
  // num microtask (callback assíncrono), não no corpo do effect — de propósito,
  // mesmo padrão de use-active-session. Carrega também o resumo do dia e consome
  // um pedido de início que tenha ficado pendente (ex.: setado antes de navegar).
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      const saved = loadFocusState();
      if (saved) setState(saved);
      setMounted(true);
      const pending = consumeFocusStart();
      if (pending) applyStart(pending);
    });
    getFocusToday().then((t) => { if (active) setToday(t); }).catch(() => {});
    return () => { active = false; };
  }, [applyStart]);

  // Escuta pedidos de início vindos da mesma sessão (dock já montado).
  useEffect(() => {
    const handler = () => {
      const req = consumeFocusStart();
      if (req) applyStart(req);
    };
    window.addEventListener(FOCUS_START_EVENT, handler);
    return () => window.removeEventListener(FOCUS_START_EVENT, handler);
  }, [applyStart]);

  // Registra um intervalo de FOCO concluído (ou parcial) no servidor.
  const logFocus = useCallback((minutes: number, startedAt: number, cycles = 1) => {
    const s = stateRef.current;
    if (minutes < 1) return;
    logFocusSession({
      label: s.label || (s.taskId ? tasks.find((t) => t.id === s.taskId)?.title : null) || null,
      minutes,
      mode: s.mode,
      cycles,
      taskId: s.taskId,
      eventId: s.eventId,
      startedAt,
    })
      .then((r) => setToday(r.today))
      .catch(() => {});
  }, [tasks]);

  // Avança da fase atual para a próxima (auto-continua rodando, fluxo Pomodoro).
  const advanceFromComplete = useCallback(() => {
    const s = stateRef.current;
    const at = Date.now();
    if (s.phase === "focus") {
      playChime("focus");
      const startedAt = s.focusStartedAt ?? at - s.focusMin * 60_000;
      logFocus(s.focusMin, startedAt);
      const breakPhase = nextBreakPhase(s);
      update({
        phase: breakPhase,
        focusCompleted: s.focusCompleted + 1,
        accumulatedMs: 0,
        phaseStartedAt: at,
        focusStartedAt: null,
      });
    } else {
      playChime("break");
      update({
        phase: "focus",
        accumulatedMs: 0,
        phaseStartedAt: at,
        focusStartedAt: at,
      });
    }
  }, [logFocus, update]);

  // Loop do relógio: só roda quando ativo. Recalcula o "now" e checa conclusão.
  useEffect(() => {
    if (!state.running) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      if (isPhaseComplete(stateRef.current, t)) advanceFromComplete();
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [state.running, advanceFromComplete]);

  // --- Controles ---------------------------------------------------------
  const start = useCallback(() => {
    const at = Date.now();
    update((s) => ({
      running: true,
      phaseStartedAt: at,
      focusStartedAt: s.phase === "focus" && s.focusStartedAt == null ? at : s.focusStartedAt,
      open: true,
    }));
  }, [update]);

  const pause = useCallback(() => {
    update((s) => {
      const extra = s.phaseStartedAt != null ? Date.now() - s.phaseStartedAt : 0;
      return { running: false, accumulatedMs: s.accumulatedMs + Math.max(0, extra), phaseStartedAt: null };
    });
  }, [update]);

  const toggleRun = useCallback(() => {
    if (stateRef.current.running) pause();
    else start();
  }, [start, pause]);

  // Reinicia o cronômetro da fase atual (zera o decorrido).
  const resetPhase = useCallback(() => {
    update((s) => ({
      accumulatedMs: 0,
      phaseStartedAt: s.running ? Date.now() : null,
      focusStartedAt: s.phase === "focus" ? (s.running ? Date.now() : null) : s.focusStartedAt,
    }));
  }, [update]);

  // Pula para a próxima fase. Num foco com ≥1 min, registra o parcial.
  const skip = useCallback(() => {
    const s = stateRef.current;
    const at = Date.now();
    if (s.phase === "focus") {
      const mins = Math.floor(elapsedMs(s, at) / 60_000);
      if (mins >= 1) {
        logFocus(mins, s.focusStartedAt ?? at - mins * 60_000);
        update((p) => ({
          phase: nextBreakPhase(p),
          focusCompleted: p.focusCompleted + 1,
          accumulatedMs: 0,
          phaseStartedAt: p.running ? at : null,
          focusStartedAt: null,
        }));
      } else {
        update((p) => ({
          phase: nextBreakPhase(p),
          accumulatedMs: 0,
          phaseStartedAt: p.running ? at : null,
          focusStartedAt: null,
        }));
      }
    } else {
      update({ phase: "focus", accumulatedMs: 0, phaseStartedAt: s.running ? at : null, focusStartedAt: s.running ? at : null });
    }
  }, [logFocus, update]);

  // Encerra a sessão: registra parcial de foco se houver e zera os contadores.
  const endSession = useCallback(() => {
    const s = stateRef.current;
    const at = Date.now();
    if (s.phase === "focus") {
      const mins = Math.floor(elapsedMs(s, at) / 60_000);
      if (mins >= 1) logFocus(mins, s.focusStartedAt ?? at - mins * 60_000);
    }
    update({ running: false, phase: "focus", accumulatedMs: 0, phaseStartedAt: null, focusStartedAt: null, focusCompleted: 0, eventId: null });
  }, [logFocus, update]);

  const loadTasks = useCallback(() => {
    if (tasksLoaded) return;
    getFocusableTasks().then((t) => { setTasks(t); setTasksLoaded(true); }).catch(() => setTasksLoaded(true));
  }, [tasksLoaded]);

  const pickTask = useCallback((task: FocusableTask | null) => {
    update((s) => ({
      taskId: task?.id ?? null,
      eventId: null, // vínculo manual com tarefa desfaz o vínculo de bloco
      label: task ? task.title : s.label,
    }));
    setShowTasks(false);
  }, [update]);

  const applyPreset = useCallback((focusMin: number, shortMin: number, longMin: number) => {
    update((s) => ({
      focusMin, shortMin, longMin,
      // Re-ancora a fase atual se estiver parada para refletir a nova duração.
      accumulatedMs: s.running ? s.accumulatedMs : 0,
    }));
  }, [update]);

  if (!mounted) return null;

  const phaseMeta = PHASE_META[state.phase];
  const elapsed = elapsedMs(state, now);
  const remaining = remainingMs(state, now);
  const displayMs = state.mode === "STOPWATCH" ? elapsed : Math.max(0, remaining ?? 0);
  const targetMs = phaseDurationMin(state, state.phase) * 60_000;
  const progress = state.mode === "STOPWATCH"
    ? Math.min(1, (elapsed % (60 * 60_000)) / (60 * 60_000))
    : Math.min(1, Math.max(0, 1 - (remaining ?? 0) / targetMs));
  const isActive = state.running || elapsed > 0;

  const selectedTask = state.taskId ? tasks.find((t) => t.id === state.taskId) ?? null : null;

  // --- PÍLULA RECOLHIDA --------------------------------------------------
  if (!state.open) {
    return (
      <div className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 md:right-6 md:bottom-6">
        <button
          onClick={() => update({ open: true })}
          className={cn(
            "group flex items-center gap-2.5 rounded-full border px-3.5 py-2.5 shadow-lg backdrop-blur transition-all hover:shadow-xl active:scale-95",
            isActive
              ? "border-border/40 bg-card/95"
              : "border-border/40 bg-card/95 hover:border-primary/40"
          )}
          style={isActive ? { boxShadow: `0 8px 30px -8px ${phaseMeta.color}66` } : undefined}
          aria-label="Abrir Modo Foco"
        >
          <span className="relative flex h-7 w-7 items-center justify-center">
            <Ring progress={progress} color={phaseMeta.color} size={28} stroke={3} />
            {isActive ? (
              <span className="absolute text-[8px] font-black tabular-nums" style={{ color: phaseMeta.color }}>
                {Math.ceil(displayMs / 60_000)}
              </span>
            ) : (
              <Timer className="absolute h-3.5 w-3.5 text-primary" />
            )}
          </span>
          {isActive ? (
            <span className="flex flex-col items-start leading-none">
              <span className="font-mono text-sm font-black tabular-nums text-foreground">{formatClock(displayMs)}</span>
              <span className="text-[8px] font-bold uppercase tracking-wider" style={{ color: phaseMeta.color }}>{phaseMeta.label}</span>
            </span>
          ) : (
            <span className="text-xs font-black uppercase tracking-wider text-foreground">Foco</span>
          )}
          {isActive && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); toggleRun(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); toggleRun(); } }}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background transition-transform hover:scale-105 active:scale-90"
            >
              {state.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="ml-0.5 h-3.5 w-3.5" />}
            </span>
          )}
        </button>
      </div>
    );
  }

  // --- PAINEL EXPANDIDO --------------------------------------------------
  return (
    <div className="fixed right-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 w-[calc(100vw-2rem)] max-w-[340px] md:right-6 md:bottom-6">
      <div className="overflow-hidden rounded-[1.75rem] border border-border/40 bg-card/95 shadow-2xl backdrop-blur animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Cabeçalho */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{ background: `linear-gradient(to bottom, ${phaseMeta.color}1a, transparent)` }}
        >
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${phaseMeta.color}1a`, color: phaseMeta.color }}>
              <Brain className="h-4 w-4" />
            </span>
            <div className="flex flex-col leading-none">
              <span className="text-xs font-black uppercase tracking-widest text-foreground">Modo Foco</span>
              <span className="mt-0.5 text-[10px] font-bold" style={{ color: phaseMeta.color }}>{phaseMeta.label}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setShowSettings((v) => !v)} className={cn("flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", showSettings && "bg-muted text-foreground")} aria-label="Ajustes">
              <Settings2 className="h-4 w-4" />
            </button>
            <button onClick={() => update({ open: false })} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Minimizar">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {showSettings ? (
          <SettingsPanel state={state} onPreset={applyPreset} onChange={update} onClose={() => setShowSettings(false)} />
        ) : (
          <div className="px-5 pb-5">
            {/* Relógio + anel */}
            <div className="relative mx-auto my-3 flex h-44 w-44 items-center justify-center">
              <Ring progress={progress} color={phaseMeta.color} size={176} stroke={8} />
              <div className="absolute flex flex-col items-center">
                <span className="font-mono text-4xl font-black tabular-nums text-foreground">{formatClock(displayMs)}</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {state.mode === "STOPWATCH" ? "Cronômetro" : `${phaseDurationMin(state, state.phase)} min`}
                </span>
                {/* Ciclos */}
                <div className="mt-2 flex items-center gap-1">
                  {Array.from({ length: state.longEvery }).map((_, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full transition-colors"
                      style={{ backgroundColor: i < (state.focusCompleted % state.longEvery) || (state.focusCompleted > 0 && state.focusCompleted % state.longEvery === 0) ? phaseMeta.color : "hsl(var(--muted-foreground) / 0.25)" }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Controles */}
            <div className="mb-4 flex items-center justify-center gap-2">
              <button onClick={resetPhase} className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-background text-muted-foreground transition-all hover:border-border hover:text-foreground active:scale-90" aria-label="Reiniciar fase">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={toggleRun}
                className="flex h-14 w-14 items-center justify-center rounded-full text-background shadow-lg transition-all hover:scale-105 active:scale-90"
                style={{ backgroundColor: phaseMeta.color }}
                aria-label={state.running ? "Pausar" : "Iniciar"}
              >
                {state.running ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
              </button>
              <button onClick={skip} className="flex h-11 w-11 items-center justify-center rounded-full border border-border/50 bg-background text-muted-foreground transition-all hover:border-border hover:text-foreground active:scale-90" aria-label="Pular fase">
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            {/* Vínculo: o que estou focando */}
            <div className="space-y-2">
              <div className="relative">
                <button
                  onClick={() => { setShowTasks((v) => !v); loadTasks(); }}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-border/40 bg-muted/20 px-3 py-2.5 text-left transition-colors hover:border-primary/30"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selectedTask?.projectColor ?? phaseMeta.color }} />
                    <span className={cn("truncate text-sm font-semibold", selectedTask ? "text-foreground" : "text-muted-foreground")}>
                      {selectedTask ? selectedTask.title : "Vincular a uma tarefa"}
                    </span>
                  </span>
                  <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", showTasks && "rotate-180")} />
                </button>

                {showTasks && (
                  <div className="absolute bottom-full left-0 right-0 z-10 mb-2 max-h-56 overflow-y-auto rounded-xl border border-border/40 bg-popover p-1.5 shadow-xl">
                    <button onClick={() => pickTask(null)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted">
                      <X className="h-3.5 w-3.5" /> Sem vínculo
                    </button>
                    {!tasksLoaded && <p className="px-2.5 py-2 text-xs text-muted-foreground">Carregando…</p>}
                    {tasksLoaded && tasks.length === 0 && <p className="px-2.5 py-2 text-xs text-muted-foreground">Nenhuma tarefa em aberto.</p>}
                    {tasks.map((t) => (
                      <button key={t.id} onClick={() => pickTask(t)} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.projectColor ?? "#6366f1" }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{t.title}</span>
                          {t.projectTitle && <span className="block truncate text-[10px] text-muted-foreground">{t.projectTitle}</span>}
                        </span>
                        {state.taskId === t.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Input
                value={state.label}
                onChange={(e) => update({ label: e.target.value })}
                placeholder="Rótulo livre (ex.: Estudo React)"
                className="h-10 rounded-xl border-border/40 bg-muted/20 text-sm"
              />
            </div>

            {/* Rodapé: resumo do dia + encerrar */}
            <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
              <div className="flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
                <span><b className="font-black text-foreground tabular-nums">{today.minutes}</b> min hoje</span>
                <span className="text-border">·</span>
                <span><b className="font-black text-foreground tabular-nums">{today.sessions}</b> sessões</span>
              </div>
              {isActive && (
                <button onClick={endSession} className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 transition-colors hover:text-destructive">
                  Encerrar
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------------------- Anel de progresso ----------------------------- */
function Ring({ progress, color, size, stroke }: { progress: number; color: string; size: number; stroke: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted-foreground/15" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - progress)}
        style={{ transition: "stroke-dashoffset 0.5s linear" }}
      />
    </svg>
  );
}

/* ----------------------------- Painel de ajustes ----------------------------- */
function SettingsPanel({
  state, onPreset, onChange, onClose,
}: {
  state: FocusState;
  onPreset: (f: number, s: number, l: number) => void;
  onChange: (patch: Partial<FocusState>) => void;
  onClose: () => void;
}) {
  const num = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? Math.min(180, n) : fallback;
  };
  return (
    <div className="space-y-4 px-5 pb-5 pt-1">
      {/* Modo */}
      <div className="grid grid-cols-2 gap-2">
        {(["POMODORO", "STOPWATCH"] as const).map((m) => (
          <button
            key={m}
            onClick={() => onChange({ mode: m })}
            className={cn(
              "rounded-xl border px-3 py-2.5 text-xs font-bold uppercase tracking-wider transition-all",
              state.mode === m ? "border-primary bg-primary/10 text-primary" : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border"
            )}
          >
            {m === "POMODORO" ? "Pomodoro" : "Cronômetro"}
          </button>
        ))}
      </div>

      {state.mode === "POMODORO" && (
        <>
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Presets</p>
            <div className="grid grid-cols-2 gap-2">
              {FOCUS_PRESETS.map((p) => {
                const active = state.focusMin === p.focusMin && state.shortMin === p.shortMin && state.longMin === p.longMin;
                return (
                  <button
                    key={p.label}
                    onClick={() => onPreset(p.focusMin, p.shortMin, p.longMin)}
                    className={cn(
                      "flex flex-col items-start rounded-xl border px-3 py-2 transition-all",
                      active ? "border-primary bg-primary/10" : "border-border/40 bg-muted/20 hover:border-border"
                    )}
                  >
                    <span className={cn("text-xs font-black", active ? "text-primary" : "text-foreground")}>{p.label}</span>
                    <span className="text-[10px] font-medium text-muted-foreground">{p.focusMin}/{p.shortMin}/{p.longMin}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Field label="Foco" value={state.focusMin} onChange={(v) => onChange({ focusMin: num(v, state.focusMin) })} />
            <Field label="Curta" value={state.shortMin} onChange={(v) => onChange({ shortMin: num(v, state.shortMin) })} />
            <Field label="Longa" value={state.longMin} onChange={(v) => onChange({ longMin: num(v, state.longMin) })} />
          </div>

          <Field
            label="Pausa longa a cada (focos)"
            value={state.longEvery}
            onChange={(v) => onChange({ longEvery: Math.min(12, Math.max(2, num(v, state.longEvery))) })}
            wide
          />
        </>
      )}

      <Button onClick={onClose} className="h-11 w-full rounded-xl bg-foreground text-background hover:bg-primary hover:text-white font-black uppercase tracking-widest text-[10px]">
        <Maximize2 className="mr-2 h-3.5 w-3.5" /> Voltar ao timer
      </Button>
    </div>
  );
}

function Field({ label, value, onChange, wide }: { label: string; value: number; onChange: (v: string) => void; wide?: boolean }) {
  return (
    <div className={cn("space-y-1.5", wide && "col-span-full")}>
      <label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{label}</label>
      <Input
        type="number"
        min={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-xl border-border/40 bg-muted/20 text-center font-mono text-sm font-bold"
      />
    </div>
  );
}
