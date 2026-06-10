"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Play, Trash2, X, Dumbbell, Star, Search, ArrowUp, ArrowDown, ClipboardList, Zap, ChevronLeft, Flame, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MuscleBodyIcon } from "../muscle-body-icon";
import { EXERCISES_BY_GROUP, MUSCLE_GROUPS } from "../exercise-db";
import { ExerciseThumb } from "./exercise-thumb";
import { EQUIPMENT_META, guessEquipment, type Equipment, type Routine } from "./session-types";
import { playClick, primeAudio } from "./sfx";
import { RoutineShareButton, ImportRoutineButton } from "./routine-share-ui";
import { divisionToStart, planToStart } from "./plan-start";
import type { SharedPlan } from "./plan-share";
import type { PlanDivision, WorkoutPlan } from "./plan-types";
import type { StartOptions } from "./use-active-session";

const REST_OPTIONS = [60, 90, 120, 180];

type StartMode = "planned" | "free";

const GROUP_LABEL: Record<string, string> = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g.value, g.label]));

// Nome sugerido a partir dos grupos (estilo dos apps: Push / Pull / Legs / Upper / Full Body).
function suggestSessionName(groups: string[]): string {
  if (groups.length === 0) return "";
  const has = (g: string) => groups.includes(g);
  const push = has("Peito") || has("Ombros") || has("Triceps");
  const pull = has("Costas") || has("Biceps");
  const legs = has("Pernas");
  if (legs && !push && !pull) return "Treino de Pernas";
  if (push && !pull && !legs) return "Push — Empurrar";
  if (pull && !push && !legs) return "Pull — Puxar";
  if (push && pull && !legs) return "Upper — Superiores";
  if (groups.length >= 3) return "Full Body";
  return groups.map((g) => GROUP_LABEL[g] ?? g).join(" & ");
}

interface PickedExercise { name: string; group?: string; equipment: Equipment; sets: number; reps: string; weight: string }

export function SessionSetup({
  routines,
  plans = [],
  onStart,
  onClose,
  onImportRoutines,
  onImportPlans,
}: {
  routines: Routine[];
  plans?: WorkoutPlan[];
  onStart: (opts: StartOptions) => void;
  onClose: () => void;
  onImportRoutines?: (routines: Routine[]) => void;
  onImportPlans?: (plans: SharedPlan[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false); // não sobrescreve nome manual
  const [groups, setGroups] = useState<string[]>([]);
  const [picked, setPicked] = useState<PickedExercise[]>([]);
  const [rest, setRest] = useState(90);
  const [custom, setCustom] = useState("");
  // Tela inicial: escolher entre treino planejado (rotina salva) ou treino livre.
  const [startMode, setStartMode] = useState<StartMode | null>(null);
  // Antes de disparar QUALQUER treino, perguntamos do aquecimento (opções aqui).
  const [pendingStart, setPendingStart] = useState<StartOptions | null>(null);

  // Trocou de tela (inicial ↔ montagem)? Volta o scroll pro topo.
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: "start" });
  }, [startMode]);

  // Toda inicialização passa por aqui: guarda as opções e pergunta do aquecimento.
  const requestStart = (opts: StartOptions) => {
    primeAudio();
    playClick();
    setPendingStart(opts);
  };
  const launch = (warmupMinutes?: number) => {
    if (!pendingStart) return;
    playClick();
    onStart(warmupMinutes ? { ...pendingStart, warmupMinutes } : pendingStart);
  };

  // Alterna o grupo e, se o nome ainda for automático, sugere um título (Push/Pull/Legs…).
  const toggleGroup = (g: string) => {
    const next = groups.includes(g) ? groups.filter((x) => x !== g) : [...groups, g];
    setGroups(next);
    if (!titleEdited) setTitle(suggestSessionName(next));
  };

  const pickedNames = useMemo(() => new Set(picked.map((p) => p.name.toLowerCase())), [picked]);

  const suggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: { group: string; items: string[] }[] = [];
    for (const g of groups) {
      const items = (EXERCISES_BY_GROUP[g] || []).filter((n) => {
        const k = n.toLowerCase();
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      if (items.length) out.push({ group: g, items });
    }
    return out;
  }, [groups]);

  const toggleExercise = (name: string, group?: string) => {
    setPicked((prev) => {
      const exists = prev.some((p) => p.name.toLowerCase() === name.toLowerCase());
      if (exists) return prev.filter((p) => p.name.toLowerCase() !== name.toLowerCase());
      return [...prev, { name, group, equipment: guessEquipment(name), sets: 3, reps: "12", weight: "" }];
    });
  };

  const addCustom = () => {
    const name = custom.trim();
    if (!name || pickedNames.has(name.toLowerCase())) { setCustom(""); return; }
    setPicked((prev) => [...prev, { name, equipment: guessEquipment(name), sets: 3, reps: "12", weight: "" }]);
    setCustom("");
  };

  const setSets = (i: number, delta: number) =>
    setPicked((prev) => prev.map((p, idx) => (idx === i ? { ...p, sets: Math.max(1, p.sets + delta) } : p)));

  // Cicla o equipamento (Barra → Halter → Máquina → Cabo → Corpo → Outro).
  const cycleEquip = (i: number) =>
    setPicked((prev) => prev.map((p, idx) => {
      if (idx !== i) return p;
      const keys = Object.keys(EQUIPMENT_META) as Equipment[];
      const next = keys[(keys.indexOf(p.equipment) + 1) % keys.length];
      return { ...p, equipment: next };
    }));

  const move = (i: number, dir: -1 | 1) =>
    setPicked((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const loadRoutine = (r: Routine) => {
    setTitle(r.name);
    setTitleEdited(true);
    setGroups(r.muscleGroups);
    setPicked(r.exercises.map((e) => ({ name: e.name, group: e.group, equipment: guessEquipment(e.name), sets: e.sets, reps: e.reps, weight: e.weight })));
  };

  const begin = () => {
    requestStart({
      title: title.trim() || (groups.length ? groups.join(" + ") : "Treino"),
      muscleGroups: groups,
      exercises: picked.map((p) => ({ name: p.name, group: p.group, equipment: p.equipment, sets: p.sets, reps: p.reps, weight: p.weight })),
      restSeconds: rest,
    });
  };

  // Atalho: escolher uma rotina já dispara o treino (fluxo "planejado").
  const startRoutineNow = (r: Routine) => {
    requestStart({
      title: r.name,
      muscleGroups: r.muscleGroups,
      exercises: r.exercises.map((e) => ({ name: e.name, group: e.group, equipment: guessEquipment(e.name), sets: e.sets, reps: e.reps, weight: e.weight })),
      restSeconds: rest,
    });
  };

  // Ficha do banco: escolher a divisão (Treino A/B/C) já inicia, levando as metas.
  const startDivisionNow = (plan: WorkoutPlan, div: PlanDivision) => {
    requestStart(divisionToStart(plan, div));
  };

  // Ficha COMPLETA: todas as divisões de uma vez (dia de corpo todo).
  const startPlanNow = (plan: WorkoutPlan) => {
    requestStart(planToStart(plan));
  };

  // Total de opções salvas: cada divisão de ficha conta como um treino pronto.
  const plannedCount = routines.length + plans.reduce((acc, p) => acc + p.divisions.length, 0);
  const hasSaved = plannedCount > 0;

  // ---- Pergunta do aquecimento (overlay único, antes de qualquer treino) ----
  const warmupPrompt = pendingStart && (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 px-6 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-border/50 bg-card p-5 shadow-xl">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-500">
          <Flame className="h-6 w-6" />
        </span>
        <h2 className="text-center text-base font-bold">Vai aquecer antes?</h2>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          O aquecimento tem timer próprio e sugestões pros grupos de hoje — as séries começam depois.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          <Button onClick={() => launch(5)} className="h-11 gap-2 font-bold">
            <Flame className="h-4 w-4" /> Aquecer (5 min)
          </Button>
          <Button variant="outline" onClick={() => launch()} className="h-11 gap-2">
            <Play className="h-4 w-4" /> Direto pro treino
          </Button>
          <Button variant="ghost" onClick={() => setPendingStart(null)} className="h-9 text-xs text-muted-foreground">
            Voltar
          </Button>
        </div>
      </div>
    </div>
  );

  // ---- Tela inicial: dois modos de começar ----
  if (startMode === null) {
    return (
      <div ref={rootRef} className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-5">
        {warmupPrompt}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Dumbbell className="h-5 w-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold leading-tight">Treinar agora</h1>
              <p className="text-xs text-muted-foreground">Como você quer começar?</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid gap-3">
          {/* Planejado */}
          <button
            type="button"
            onClick={() => { primeAudio(); playClick(); setStartMode("planned"); }}
            className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardList className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">Treino planejado</span>
              <span className="block text-xs text-muted-foreground">
                {hasSaved ? `Comece por um dos seus ${plannedCount} treino(s) salvos (fichas e rotinas).` : "Use uma ficha ou rotina salva (você ainda não tem nenhuma)."}
              </span>
            </span>
            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{plannedCount}</span>
          </button>

          {/* Livre */}
          <button
            type="button"
            onClick={() => { primeAudio(); playClick(); setStartMode("free"); }}
            className="group flex items-center gap-4 rounded-2xl border border-border/50 bg-card p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-500">
              <Zap className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-bold">Treino livre</span>
              <span className="block text-xs text-muted-foreground">Monte na hora: escolha músculos e exercícios.</span>
            </span>
          </button>
        </div>

        {/* Atalho: fichas + rotinas para iniciar com um toque + importar/compartilhar */}
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {hasSaved ? "Iniciar rápido" : "Recebeu um treino de um amigo?"}
            </p>
            {onImportRoutines && <ImportRoutineButton onImport={onImportRoutines} onImportPlans={onImportPlans} />}
          </div>

          {/* Fichas do banco: um toque na divisão (Treino A/B/C) já inicia;
              "Treinar tudo" junta todas as divisões numa sessão só (corpo todo). */}
          {plans.map((plan) => (
            <div key={plan.id} className="space-y-1.5">
              <p className="flex items-center gap-1.5 text-xs font-semibold">
                <ClipboardList className="h-3.5 w-3.5 text-primary" />
                {plan.name}
              </p>
              <div className="flex flex-wrap gap-2">
                {plan.divisions.map((div) => (
                  <button
                    key={div.id}
                    type="button"
                    onClick={() => startDivisionNow(plan, div)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card py-1.5 pl-3 pr-3 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <Play className="h-3 w-3 text-primary" />
                    {div.label}
                    <span className="text-muted-foreground/60">{div.exercises.length} ex.</span>
                  </button>
                ))}
                {plan.divisions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => startPlanNow(plan)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 py-1.5 pl-3 pr-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    <Layers className="h-3 w-3" />
                    Treinar tudo
                    <span className="text-primary/60">{plan.divisions.reduce((a, d) => a + d.exercises.length, 0)} ex.</span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {routines.length > 0 && (
            <div className="space-y-1.5">
              {plans.length > 0 && (
                <p className="flex items-center gap-1.5 text-xs font-semibold">
                  <Star className="h-3.5 w-3.5 text-amber-400" /> Rotinas deste aparelho
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {routines.map((r) => (
                  <div
                    key={r.id}
                    className="inline-flex items-center rounded-full border border-border/60 bg-card pr-1 transition-colors hover:border-primary/40"
                  >
                    <button
                      type="button"
                      onClick={() => startRoutineNow(r)}
                      className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-3 text-xs font-medium hover:bg-primary/5"
                    >
                      <Star className="h-3.5 w-3.5 text-amber-400" />
                      {r.name}
                      <span className="text-muted-foreground/60">{r.exercises.length} ex.</span>
                    </button>
                    <RoutineShareButton routine={r} className="ml-0.5 flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-primary" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-5">
      {warmupPrompt}
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Button variant="ghost" size="icon" onClick={() => setStartMode(null)} aria-label="Voltar" className="shrink-0">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight">{startMode === "planned" ? "Treino planejado" : "Treino livre"}</h1>
            <p className="text-xs text-muted-foreground">Monte sua sessão e inicie quando estiver pronto.</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pb-28">
        {/* Fichas do banco: tocar na divisão INICIA o treino (mantém as metas de
            reps/RIR/descanso — carregar no editor as perderia). */}
        {startMode === "planned" && plans.length > 0 && (
          <section className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Suas fichas <span className="font-normal normal-case text-muted-foreground/70">— toque para iniciar</span>
            </p>
            <div className="space-y-2">
              {plans.map((plan) => (
                <div key={plan.id} className="rounded-xl border border-border/40 bg-card p-2.5">
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold">
                    <ClipboardList className="h-3.5 w-3.5 text-primary" /> {plan.name}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.divisions.map((div) => (
                      <button
                        key={div.id}
                        type="button"
                        onClick={() => startDivisionNow(plan, div)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
                      >
                        <Play className="h-3 w-3 text-primary" />
                        {div.label}
                        <span className="text-muted-foreground/60">{div.exercises.length} ex.</span>
                      </button>
                    ))}
                    {plan.divisions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => startPlanNow(plan)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
                      >
                        <Layers className="h-3 w-3" /> Treinar tudo
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Rotinas salvas */}
        {routines.length > 0 && (
          <section className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Suas rotinas</p>
            <div className="flex flex-wrap gap-2">
              {routines.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => loadRoutine(r)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <Star className="h-3.5 w-3.5 text-amber-400" />
                  {r.name}
                  <span className="text-muted-foreground/60">{r.exercises.length} ex.</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Nome */}
        <section className="space-y-2">
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Nome da sessão
            {!titleEdited && title && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">automático</span>}
          </label>
          <Input
            value={title}
            onChange={(e) => { setTitle(e.target.value); setTitleEdited(true); }}
            placeholder="Selecione os grupos e o nome aparece sozinho…"
            className="h-11"
          />
        </section>

        {/* Grupos */}
        <section className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">O que vai treinar?</label>
          <div className="grid grid-cols-4 gap-2">
            {MUSCLE_GROUPS.map((g) => {
              const on = groups.includes(g.value);
              return (
                <button
                  key={g.value}
                  type="button"
                  onClick={() => toggleGroup(g.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-all",
                    on ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border/40 bg-muted/20 hover:border-primary/40",
                  )}
                >
                  <MuscleBodyIcon group={g.value} className="h-9 w-7" />
                  <span className={cn("text-[10px] font-semibold", on ? "text-primary" : "text-muted-foreground")}>{g.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Sugestões */}
        {suggestions.length > 0 && (
          <section className="space-y-2.5 rounded-xl border border-primary/15 bg-primary/[0.03] p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
              <Plus className="h-3 w-3" /> Toque para adicionar
            </p>
            <div className="max-h-[200px] space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
              {suggestions.map(({ group, items }) => (
                <div key={group} className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground">{group}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((name) => {
                      const added = pickedNames.has(name.toLowerCase());
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleExercise(name, group)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all",
                            added ? "border-primary bg-primary text-primary-foreground" : "border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5",
                          )}
                        >
                          {added ? "✓ " : "+ "}{name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Exercício personalizado */}
        <section className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Adicionar outro</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
              placeholder="Exercício fora da lista… (Enter)"
              className="h-11 pl-9"
            />
          </div>
        </section>

        {/* Selecionados (reordenáveis — define a ordem do treino) */}
        {picked.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ordem do treino ({picked.length})</p>
              <p className="text-[10px] text-muted-foreground/70">use ↑ ↓ para reordenar</p>
            </div>
            <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40">
              {picked.map((p, i) => (
                <li key={`${p.name}-${i}`} className="flex items-center gap-2.5 bg-card px-2.5 py-2">
                  <span className="w-5 shrink-0 text-center text-xs font-mono font-bold text-muted-foreground/60">{i + 1}</span>
                  <ExerciseThumb name={p.name} group={p.group} showPlay={false} className="h-9 w-9 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <button
                      type="button"
                      onClick={() => cycleEquip(i)}
                      className="mt-0.5 inline-flex items-center rounded-full border border-border/50 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      title="Trocar equipamento"
                    >
                      {EQUIPMENT_META[p.equipment].label}
                    </button>
                  </div>
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-30" aria-label="Mover para cima">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === picked.length - 1} className="text-muted-foreground/60 transition-colors hover:text-foreground disabled:opacity-30" aria-label="Mover para baixo">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-0.5 rounded-lg border border-border/50 bg-muted/30">
                    <button type="button" onClick={() => setSets(i, -1)} className="px-2 py-1 text-muted-foreground hover:text-foreground">−</button>
                    <span className="min-w-[3rem] text-center text-xs font-mono tabular-nums">{p.sets}×</span>
                    <button type="button" onClick={() => setSets(i, 1)} className="px-2 py-1 text-muted-foreground hover:text-foreground">+</button>
                  </div>
                  <button type="button" onClick={() => toggleExercise(p.name, p.group)} className="text-muted-foreground hover:text-destructive" aria-label="Remover">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Descanso padrão */}
        <section className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descanso padrão entre séries</label>
          <div className="flex gap-2">
            {REST_OPTIONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRest(r)}
                className={cn(
                  "flex-1 rounded-xl border py-2 text-sm font-semibold transition-all",
                  rest === r ? "border-primary bg-primary/5 text-primary ring-1 ring-primary/30" : "border-border/40 text-muted-foreground hover:border-primary/40",
                )}
              >
                {r < 60 ? `${r}s` : `${Math.floor(r / 60)}:${String(r % 60).padStart(2, "0")}`}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Rodapé fixo: iniciar */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border/40 bg-background/95 pb-safe backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1 text-xs text-muted-foreground">
            {picked.length > 0 ? `${picked.length} exercício(s) prontos` : "Adicione exercícios para começar"}
          </div>
          <Button onClick={begin} disabled={picked.length === 0} className="h-12 shrink-0 gap-2 px-5 text-base font-bold sm:px-6">
            <Play className="h-5 w-5" /> Iniciar treino
          </Button>
        </div>
      </div>
    </div>
  );
}
