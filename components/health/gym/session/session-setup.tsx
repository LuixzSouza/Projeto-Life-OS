"use client";

import { useMemo, useState } from "react";
import { Plus, Play, Trash2, X, Dumbbell, Star, Search, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MuscleBodyIcon } from "../muscle-body-icon";
import { EXERCISES_BY_GROUP, MUSCLE_GROUPS } from "../exercise-db";
import { ExerciseThumb } from "./exercise-thumb";
import type { Routine } from "./session-types";
import type { StartOptions } from "./use-active-session";

const REST_OPTIONS = [60, 90, 120, 180];

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

interface PickedExercise { name: string; group?: string; sets: number; reps: string; weight: string }

export function SessionSetup({
  routines,
  onStart,
  onClose,
}: {
  routines: Routine[];
  onStart: (opts: StartOptions) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [titleEdited, setTitleEdited] = useState(false); // não sobrescreve nome manual
  const [groups, setGroups] = useState<string[]>([]);
  const [picked, setPicked] = useState<PickedExercise[]>([]);
  const [rest, setRest] = useState(90);
  const [custom, setCustom] = useState("");

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
      return [...prev, { name, group, sets: 3, reps: "12", weight: "" }];
    });
  };

  const addCustom = () => {
    const name = custom.trim();
    if (!name || pickedNames.has(name.toLowerCase())) { setCustom(""); return; }
    setPicked((prev) => [...prev, { name, sets: 3, reps: "12", weight: "" }]);
    setCustom("");
  };

  const setSets = (i: number, delta: number) =>
    setPicked((prev) => prev.map((p, idx) => (idx === i ? { ...p, sets: Math.max(1, p.sets + delta) } : p)));

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
    setPicked(r.exercises.map((e) => ({ name: e.name, group: e.group, sets: e.sets, reps: e.reps, weight: e.weight })));
  };

  const begin = () => {
    onStart({
      title: title.trim() || (groups.length ? groups.join(" + ") : "Treino"),
      muscleGroups: groups,
      exercises: picked.map((p) => ({ name: p.name, group: p.group, sets: p.sets, reps: p.reps, weight: p.weight })),
      restSeconds: rest,
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-5">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight">Novo treino</h1>
            <p className="text-xs text-muted-foreground">Monte sua sessão e inicie quando estiver pronto.</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Fechar">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pb-28">
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
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{p.name}</span>
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
      <div className="fixed inset-x-0 bottom-0 border-t border-border/40 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <div className="flex-1 text-xs text-muted-foreground">
            {picked.length > 0 ? `${picked.length} exercício(s) prontos` : "Adicione exercícios para começar"}
          </div>
          <Button onClick={begin} disabled={picked.length === 0} className="h-12 gap-2 px-6 text-base font-bold">
            <Play className="h-5 w-5" /> Iniciar treino
          </Button>
        </div>
      </div>
    </div>
  );
}
