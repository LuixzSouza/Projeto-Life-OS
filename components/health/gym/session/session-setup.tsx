"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Play, Trash2, X, Dumbbell, Star, Search, ArrowUp, ArrowDown, ClipboardList, Zap, ChevronLeft, Flame, Layers, Minus, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MuscleBodyIcon } from "../muscle-body-icon";
import { EXERCISES_BY_GROUP, MUSCLE_GROUPS, MUSCLE_META, groupOfExercise } from "../exercise-db";
import { ExerciseThumb } from "./exercise-thumb";
import { EQUIPMENT_META, guessEquipment, type Equipment, type Routine, type MuscleRecovery } from "./session-types";
import { smartOrder } from "./exercise-order";
import { playClick, primeAudio } from "./sfx";
import { RoutineShareButton, ImportRoutineButton } from "./routine-share-ui";
import { divisionToStart, planToStart } from "./plan-start";
import type { SharedPlan } from "./plan-share";
import type { PlanDivision, WorkoutPlan } from "./plan-types";
import type { StartOptions } from "./use-active-session";

type StartMode = "planned" | "free";

const GROUP_LABEL: Record<string, string> = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g.value, g.label]));

// Catálogo achatado (nome + grupo) p/ o autocomplete da busca "Adicionar outro".
const ALL_EXERCISES: { name: string; group: string }[] = Object.entries(EXERCISES_BY_GROUP)
  .flatMap(([group, names]) => names.map((name) => ({ name, group })));
// Sem acento/caixa: "triceps" acha "Tríceps", "supino" acha "Supino Reto".
const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

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
  recovery = [],
  onStart,
  onClose,
  onImportRoutines,
  onImportPlans,
}: {
  routines: Routine[];
  plans?: WorkoutPlan[];
  recovery?: MuscleRecovery[];
  onStart: (opts: StartOptions) => void;
  onClose: () => void;
  onImportRoutines?: (routines: Routine[]) => void;
  onImportPlans?: (plans: SharedPlan[]) => void;
}) {
  const [title, setTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false); // não sobrescreve nome manual
  const [groups, setGroups] = useState<string[]>([]);
  const [picked, setPicked] = useState<PickedExercise[]>([]);
  // Descanso padrão DIGITÁVEL (segundos) — sem fileira de presets.
  const [restText, setRestText] = useState("90");
  const rest = Math.min(600, Math.max(10, parseInt(restText, 10) || 90));
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

  // Autocomplete do campo "Adicionar outro": casa por nome (sem acento) no catálogo
  // inteiro, mostra capa de cada um — quem não conhece pelo nome reconhece pelo movimento.
  const customMatches = useMemo(() => {
    const q = normalize(custom.trim());
    if (q.length < 2) return [];
    return ALL_EXERCISES
      .filter(({ name }) => normalize(name).includes(q) && !pickedNames.has(name.toLowerCase()))
      .slice(0, 6);
  }, [custom, pickedNames]);

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

  // Ordenação automática: compostos e grupos grandes primeiro (ver exercise-order.ts).
  const autoSort = () => {
    playClick();
    setPicked((prev) => smartOrder(prev));
    toast.success("Treino ordenado!", {
      description: "Compostos e grupos grandes primeiro; abdômen e cardio no fim — você rende mais enquanto está fresco.",
    });
  };

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

  // Divisão recomendada pra hoje: a que treina os músculos mais RECUPERADOS
  // (cruza com o mapa de recuperação). Some quando tudo está fadigado.
  const recommended = useMemo(() => recommendDivision(plans, recovery), [plans, recovery]);

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

        {/* Recomendado hoje: um toque inicia a divisão com os músculos mais descansados */}
        {recommended && (
          <button
            type="button"
            onClick={() => startDivisionNow(recommended.plan, recommended.div)}
            className="group relative mb-4 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card p-4 text-left shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
          >
            <span className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/15 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3 w-3" /> Recomendado hoje
                </span>
                <h2 className="mt-1.5 truncate text-lg font-bold">{recommended.div.label}</h2>
                <p className="truncate text-xs text-muted-foreground">{recommended.plan.name} · {recommended.reason}</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
                <Play className="h-5 w-5" />
              </span>
            </div>
            <div className="relative mt-3">
              <ThumbRow names={recommended.div.exercises} total={recommended.div.exercises.length} />
            </div>
          </button>
        )}

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
        <div className="mt-7 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {hasSaved ? <><Zap className="h-3.5 w-3.5 text-amber-500" /> Iniciar rápido</> : "Recebeu um treino de um amigo?"}
            </p>
            {onImportRoutines && <ImportRoutineButton onImport={onImportRoutines} onImportPlans={onImportPlans} />}
          </div>

          {/* Fichas do banco: cards ricos com prévia dos exercícios. Um toque na
              divisão (Treino A/B/C) já inicia; "Treinar tudo" junta todas. */}
          {plans.map((plan) => (
            <div key={plan.id} className="space-y-2">
              <p className="flex items-center gap-1.5 px-0.5 text-xs font-semibold text-muted-foreground">
                <ClipboardList className="h-3.5 w-3.5 text-primary" />
                {plan.name}
                {plan.divisions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => startPlanNow(plan)}
                    className="ml-auto inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
                  >
                    <Layers className="h-3 w-3" /> Treinar tudo
                  </button>
                )}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {plan.divisions.map((div) => (
                  <DivisionQuickCard key={div.id} div={div} recommended={recommended?.div.id === div.id} onStart={() => startDivisionNow(plan, div)} />
                ))}
              </div>
            </div>
          ))}

          {routines.length > 0 && (
            <div className="space-y-2">
              {plans.length > 0 && (
                <p className="flex items-center gap-1.5 px-0.5 text-xs font-semibold text-muted-foreground">
                  <Star className="h-3.5 w-3.5 text-amber-400" /> Rotinas deste aparelho
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                {routines.map((r) => (
                  <RoutineQuickCard key={r.id} routine={r} onStart={() => startRoutineNow(r)} />
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

        {/* Sugestões — com IMAGEM de demonstração: quem não conhece o exercício pelo
            nome reconhece pelo movimento (a capa anima os 2 frames). */}
        {suggestions.length > 0 && (
          <section className="space-y-2.5 rounded-xl border border-primary/15 bg-primary/[0.03] p-3">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
              <Plus className="h-3 w-3" /> Toque para adicionar
            </p>
            <div className="max-h-[320px] space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
              {suggestions.map(({ group, items }) => (
                <div key={group} className="space-y-1.5">
                  <span className="text-[10px] font-semibold text-muted-foreground">{group}</span>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {items.map((name) => {
                      const added = pickedNames.has(name.toLowerCase());
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => toggleExercise(name, group)}
                          className={cn(
                            "flex items-center gap-2 rounded-xl border p-1.5 text-left transition-all",
                            added ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border/50 bg-background hover:border-primary/50 hover:bg-primary/5",
                          )}
                        >
                          <ExerciseThumb name={name} group={group} showPlay={false} className="h-11 w-11 rounded-lg" />
                          <span className="min-w-0 flex-1 text-[11px] font-medium leading-tight">{name}</span>
                          <span
                            className={cn(
                              "mr-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                              added ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground/60",
                            )}
                          >
                            {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Exercício personalizado — com autocomplete ILUSTRADO do catálogo */}
        <section className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Buscar exercício</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
              placeholder="Digite o nome… (Enter para adicionar)"
              className="h-11 pl-9"
            />
          </div>
          {customMatches.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-border/40 bg-card/60 p-2 sm:grid-cols-3">
              {customMatches.map(({ name, group }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => { toggleExercise(name, group); setCustom(""); }}
                  className="flex items-center gap-2 rounded-lg border border-border/50 bg-background p-1.5 text-left transition-all hover:border-primary/50 hover:bg-primary/5"
                >
                  <ExerciseThumb name={name} group={group} showPlay={false} className="h-10 w-10 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-medium leading-tight">{name}</span>
                    <span className="block truncate text-[9px] text-muted-foreground">{GROUP_LABEL[group] ?? group}</span>
                  </span>
                  <Plus className="h-3.5 w-3.5 shrink-0 text-primary" />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Selecionados (reordenáveis — define a ordem do treino) */}
        {picked.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Ordem do treino ({picked.length})</p>
              <div className="flex items-center gap-2">
                <p className="hidden text-[10px] text-muted-foreground/70 sm:block">↑ ↓ reordenam</p>
                {picked.length > 1 && (
                  <button
                    type="button"
                    onClick={autoSort}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/10"
                    title="Compostos e grupos grandes primeiro, abdômen/cardio no fim"
                  >
                    <Sparkles className="h-3 w-3" /> Ordenar pra mim
                  </button>
                )}
              </div>
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

        {/* Descanso padrão — você digita o tempo (sem fileira de presets) */}
        <section className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descanso padrão entre séries</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRestText(String(Math.max(10, rest - 15)))}
              className="flex h-11 w-14 items-center justify-center gap-0.5 rounded-xl border border-border/60 bg-card text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              aria-label="Diminuir 15 segundos"
            >
              <Minus className="h-3.5 w-3.5" />15
            </button>
            <div className="relative flex-1">
              <Input
                inputMode="numeric"
                value={restText}
                onChange={(e) => setRestText(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="90"
                className="h-11 pr-24 text-center font-mono text-lg font-bold tabular-nums"
                aria-label="Descanso em segundos"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                seg · {Math.floor(rest / 60)}:{String(rest % 60).padStart(2, "0")}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRestText(String(Math.min(600, rest + 15)))}
              className="flex h-11 w-14 items-center justify-center gap-0.5 rounded-xl border border-border/60 bg-card text-sm font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              aria-label="Aumentar 15 segundos"
            >
              <Plus className="h-3.5 w-3.5" />15
            </button>
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

// ---- Cards de "Iniciar rápido" (prévia visual do treino, um toque pra começar) ----

// Grupos musculares de uma divisão: os declarados ou, na falta, deduzidos dos exercícios.
function divisionGroups(div: PlanDivision): string[] {
  if (div.muscleGroups.length) return div.muscleGroups;
  return Array.from(new Set(div.exercises.map((e) => e.group ?? groupOfExercise(e.name)).filter((g): g is string => !!g)));
}

// Divisão recomendada pra hoje: a de maior recuperação MÉDIA dos seus músculos.
// Sem registro recente de um grupo = 100% recuperado. Retorna null se tudo fadigado.
function recommendDivision(plans: WorkoutPlan[], recovery: MuscleRecovery[]): { plan: WorkoutPlan; div: PlanDivision; reason: string } | null {
  if (!recovery.length || !plans.length) return null;
  const recMap = new Map(recovery.map((r) => [r.group, r]));
  const recoveryOf = (g: string) => {
    const r = recMap.get(g);
    return r && r.lastTrainedAt ? r.recovery : 1;
  };
  let best: { plan: WorkoutPlan; div: PlanDivision; score: number; groups: string[] } | null = null;
  for (const plan of plans) {
    for (const div of plan.divisions) {
      if (div.exercises.length === 0) continue;
      const groups = divisionGroups(div);
      if (!groups.length) continue;
      const score = groups.reduce((a, g) => a + recoveryOf(g), 0) / groups.length;
      if (!best || score > best.score) best = { plan, div, score, groups };
    }
  }
  if (!best || best.score < 0.6) return null; // tudo cansado → não força
  const fresh = [...best.groups]
    .sort((a, b) => recoveryOf(b) - recoveryOf(a))
    .slice(0, 2)
    .map((g) => MUSCLE_META[g]?.label ?? g);
  const reason = fresh.length ? `${fresh.join(" e ")} descansado${fresh.length > 1 ? "s" : ""}` : "pronto pra treinar";
  return { plan: best.plan, div: best.div, reason };
}
function colorOf(groups: string[], fallback: string): string {
  const g = groups[0];
  return (g && MUSCLE_META[g]?.color) || fallback;
}

function ThumbRow({ names, total }: { names: { name: string; group?: string }[]; total: number }) {
  const preview = names.slice(0, 5);
  const extra = total - preview.length;
  if (preview.length === 0) return null;
  return (
    <div className="flex items-center gap-1">
      {preview.map((ex, i) => (
        <ExerciseThumb key={`${ex.name}-${i}`} name={ex.name} group={ex.group} showPlay={false} className="h-9 w-9 rounded-md" />
      ))}
      {extra > 0 && (
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">+{extra}</span>
      )}
    </div>
  );
}

function DivisionQuickCard({ div, recommended = false, onStart }: { div: PlanDivision; recommended?: boolean; onStart: () => void }) {
  const groups = divisionGroups(div);
  const color = colorOf(groups, "#6366f1");
  return (
    <button
      type="button"
      onClick={onStart}
      className={cn(
        "group flex flex-col gap-2.5 rounded-2xl border bg-card p-3 text-left shadow-sm transition-all hover:shadow-md",
        recommended ? "border-primary/50 ring-1 ring-primary/30" : "border-border/50 hover:border-primary/40",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span className="h-9 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 truncate text-sm font-bold">
            {div.label}
            {recommended && <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">hoje</span>}
          </p>
          <p className="truncate text-[11px] text-muted-foreground">
            {groups.map((g) => MUSCLE_META[g]?.label ?? g).join(" · ") || "Treino"} · {div.exercises.length} ex.
          </p>
        </div>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Play className="h-4 w-4" />
        </span>
      </div>
      <ThumbRow names={div.exercises} total={div.exercises.length} />
    </button>
  );
}

function RoutineQuickCard({ routine, onStart }: { routine: Routine; onStart: () => void }) {
  const groups = routine.muscleGroups.length
    ? routine.muscleGroups
    : Array.from(new Set(routine.exercises.map((e) => e.group ?? groupOfExercise(e.name)).filter((g): g is string => !!g)));
  const color = colorOf(groups, "#f59e0b");
  return (
    <div className="group relative flex flex-col gap-2.5 rounded-2xl border border-border/50 bg-card p-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      <RoutineShareButton
        routine={routine}
        className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
      />
      <button type="button" onClick={onStart} className="flex flex-col gap-2.5 text-left">
        <div className="flex items-center gap-2.5 pr-8">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${color}20` }}>
            <Star className="h-4 w-4" style={{ color }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{routine.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {groups.map((g) => MUSCLE_META[g]?.label ?? g).join(" · ") || "Rotina"} · {routine.exercises.length} ex.
            </p>
          </div>
        </div>
        <ThumbRow names={routine.exercises} total={routine.exercises.length} />
      </button>
    </div>
  );
}
