"use client";

// Detalhe COMPLETO de um treino do histórico: séries reais (setLog) com tipo,
// carga, reps e RPE, notas por exercício, EDIÇÃO das séries pós-salvamento
// (recomputa o resumo — os gráficos passam a refletir a correção) e ação
// "Repetir treino" (inicia uma sessão ao vivo com os mesmos exercícios via
// pending-start). Modal ÚNICO controlado por estado no dashboard — nunca
// dentro do .map() da lista.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, Dumbbell, Flame, Layers, Loader2, Pencil, Play, Plus, Save, StickyNote, Timer, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { updateWorkoutExercises, type EditedExercise } from "@/app/(dashboard)/health/actions";
import { groupOfExercise, MUSCLE_META } from "./exercise-db";
import { exerciseVolume, num, workingSets } from "./gym-analytics";
import { savePendingStart } from "./session/session-storage";
import { EQUIPMENT_META, SET_TYPE_META, guessEquipment, guessTimed, type Equipment, type SetType, type StartOptions } from "./session/session-types";
import type { Exercise, GymWorkout } from "./gym-types";

const FEELING_LABEL: Record<string, string> = {
  GOOD: "Bom desempenho",
  TIRED: "Cansativo",
  HARD: "Intenso",
};

function isEquipment(v: string | undefined): v is Equipment {
  return !!v && v in EQUIPMENT_META;
}

/** Monta as opções de início de sessão a partir de um treino salvo (repetir). */
export function startOptionsFromWorkout(w: GymWorkout): StartOptions {
  const exercises = w.exercises
    .filter((ex) => ex.name.trim())
    .map((ex) => {
      // Quantidade planejada: séries de trabalho do setLog (feitas ou não);
      // sem setLog, cai no resumo legado.
      const planned = ex.setLog?.filter((s) => s.type !== "warmup").length || Math.round(num(ex.sets)) || 3;
      return {
        name: ex.name.trim(),
        group: ex.group || groupOfExercise(ex.name),
        equipment: isEquipment(ex.equipment) ? ex.equipment : guessEquipment(ex.name),
        sets: Math.max(1, planned),
        reps: ex.reps !== "0" ? ex.reps : undefined,
        weight: ex.weight !== "0" ? ex.weight : undefined,
        timed: ex.timed ?? guessTimed(ex.name),
      };
    });
  return {
    title: w.title,
    muscleGroups: (w.muscleGroup || "").split(", ").filter(Boolean),
    exercises,
  };
}

type DraftSet = EditedExercise["setLog"][number];

/** Rascunho de edição: exercícios SEM setLog ganham um, expandido do resumo
 *  legado (3×12·40kg → 3 linhas) — editar aqui "moderniza" o registro antigo. */
function toDrafts(exercises: Exercise[]): EditedExercise[] {
  return exercises
    .filter((ex) => ex.name.trim())
    .map((ex) => {
      const setLog: DraftSet[] = ex.setLog && ex.setLog.length > 0
        ? ex.setLog.map((s) => ({ ...s }))
        : Array.from({ length: Math.max(1, Math.round(num(ex.sets)) || 1) }, () => ({
            reps: ex.reps !== "0" ? ex.reps : "",
            weight: ex.weight !== "0" ? ex.weight : "",
            done: true,
            type: "normal",
          }));
      return {
        name: ex.name.trim(),
        equipment: ex.equipment,
        group: ex.group,
        timed: ex.timed,
        note: ex.note,
        setLog,
      };
    });
}

// Rotação do tipo na edição: Normal → Aquecimento → Falha → Drop → Normal.
function nextType(t?: string): SetType {
  return t === "normal" || !t ? "warmup" : t === "warmup" ? "failure" : t === "failure" ? "drop" : "normal";
}

// Uma linha de série do setLog em modo LEITURA.
function SetLine({ s, index, timed, perHand }: {
  s: NonNullable<Exercise["setLog"]>[number];
  index: number;
  timed: boolean;
  perHand: boolean;
}) {
  const type = (s.type ?? "normal") as SetType;
  const meta = SET_TYPE_META[type] ?? SET_TYPE_META.normal;
  const weight = num(s.weight);
  return (
    <div className={cn("flex items-center gap-2.5 rounded-lg px-2 py-1.5", s.done ? "bg-emerald-500/5" : "opacity-60")}>
      <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold tabular-nums", meta.tone)} title={meta.label}>
        {type === "normal" ? index + 1 : meta.short}
      </span>
      <span className="flex-1 font-mono text-sm tabular-nums">
        {weight > 0 ? `${s.weight}${perHand ? " kg/mão" : " kg"} × ` : ""}
        {timed ? `${s.reps}s` : `${s.reps} reps`}
      </span>
      {typeof s.rpe === "number" && (
        <span className="rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-bold text-violet-600 dark:text-violet-400" title="Esforço percebido registrado no treino">
          RPE {s.rpe}
        </span>
      )}
      {s.done ? (
        <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
          <Check className="h-3.5 w-3.5" /> feita
        </span>
      ) : (
        <span className="text-[10px] font-medium text-muted-foreground">não feita</span>
      )}
    </div>
  );
}

function ExerciseDetail({ ex }: { ex: Exercise }) {
  const group = ex.group || groupOfExercise(ex.name);
  const color = group ? MUSCLE_META[group]?.color : undefined;
  const equipment = isEquipment(ex.equipment) ? EQUIPMENT_META[ex.equipment].short : null;
  const timed = !!ex.timed;
  const perHand = ex.equipment === "dumbbell";
  const volume = timed ? 0 : Math.round(exerciseVolume(ex));
  const done = ex.setLog?.filter((s) => s.done).length ?? 0;

  return (
    <section className="overflow-hidden rounded-2xl border border-border/40 bg-card shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-border/40 px-3 py-2.5">
        {color && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />}
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{ex.name}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          {equipment && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">{equipment}</span>
          )}
          {timed && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">⏱ tempo</span>
          )}
          {volume > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary" title="Volume das séries de trabalho feitas">
              {volume.toLocaleString("pt-BR")} kg
            </span>
          )}
        </div>
      </div>
      <div className="space-y-1 p-2">
        {ex.setLog && ex.setLog.length > 0 ? (
          <>
            {ex.setLog.map((s, i) => {
              // Numeração só das séries normais (aquecimento/falha/drop mostram a sigla).
              const normalIdx = ex.setLog!.slice(0, i).filter((x) => (x.type ?? "normal") === "normal").length;
              return <SetLine key={i} s={s} index={normalIdx} timed={timed} perHand={perHand} />;
            })}
            {done === 0 && <p className="px-2 pb-1 text-[11px] text-muted-foreground">Nenhuma série concluída neste exercício.</p>}
          </>
        ) : (
          <p className="px-2 py-1.5 font-mono text-sm text-muted-foreground">
            {ex.sets}×{timed ? `${ex.reps}s` : ex.reps}{num(ex.weight) > 0 ? ` · ${ex.weight} kg` : ""}
            <span className="ml-2 font-sans text-[10px]">(registro resumido — sem séries detalhadas)</span>
          </p>
        )}
        {ex.note && (
          <p className="flex items-start gap-1.5 px-2 pb-1 pt-0.5 text-[11px] italic leading-snug text-muted-foreground">
            <StickyNote className="mt-px h-3 w-3 shrink-0 text-amber-500" />
            {ex.note}
          </p>
        )}
      </div>
    </section>
  );
}

// Editor de um exercício (modo edição): linhas com tipo/carga/reps/feita/remover.
function ExerciseEditor({ ex, onChange }: { ex: EditedExercise; onChange: (next: EditedExercise) => void }) {
  const timed = !!ex.timed;
  const perHand = ex.equipment === "dumbbell";
  const patchSet = (i: number, patch: Partial<DraftSet>) =>
    onChange({ ...ex, setLog: ex.setLog.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });
  const removeSet = (i: number) => onChange({ ...ex, setLog: ex.setLog.filter((_, idx) => idx !== i) });
  const addSet = () => {
    const last = ex.setLog[ex.setLog.length - 1];
    onChange({ ...ex, setLog: [...ex.setLog, { reps: last?.reps ?? "", weight: last?.weight ?? "", done: true, type: "normal" }] });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-sm">
      <div className="flex items-center gap-2.5 border-b border-border/40 bg-primary/5 px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{ex.name}</p>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-primary">editando</span>
      </div>
      <div className="space-y-1.5 p-2">
        <div className="grid grid-cols-[1.75rem_1fr_1fr_2.25rem_1.5rem] items-center gap-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          <span className="text-center">Tipo</span>
          <span className="text-center">{timed ? "+kg" : perHand ? "Carga/mão" : "Carga (kg)"}</span>
          <span className="text-center">{timed ? "Seg" : "Reps"}</span>
          <span className="text-center">Feita</span>
          <span />
        </div>
        {ex.setLog.map((s, i) => {
          const type = (s.type ?? "normal") as SetType;
          const meta = SET_TYPE_META[type] ?? SET_TYPE_META.normal;
          const normalIdx = ex.setLog.slice(0, i).filter((x) => (x.type ?? "normal") === "normal").length;
          return (
            <div key={i} className="grid grid-cols-[1.75rem_1fr_1fr_2.25rem_1.5rem] items-center gap-1.5">
              <button
                type="button"
                onClick={() => patchSet(i, { type: nextType(s.type) })}
                className={cn("mx-auto flex h-7 w-7 items-center justify-center rounded-md border text-[10px] font-bold tabular-nums", meta.tone)}
                title={`${meta.label} — toque para alternar`}
                aria-label={`Tipo da série: ${meta.label}`}
              >
                {type === "normal" ? normalIdx + 1 : meta.short}
              </button>
              <Input inputMode="decimal" value={s.weight === "0" ? "" : s.weight} onChange={(e) => patchSet(i, { weight: e.target.value })} placeholder="0" className="h-9 text-center font-mono text-sm" aria-label="Carga (kg)" />
              <Input inputMode="numeric" value={s.reps === "0" ? "" : s.reps} onChange={(e) => patchSet(i, { reps: e.target.value })} placeholder="0" className="h-9 text-center font-mono text-sm" aria-label={timed ? "Segundos" : "Repetições"} />
              <button
                type="button"
                onClick={() => patchSet(i, { done: !s.done })}
                className={cn(
                  "mx-auto flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                  s.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border/60 text-muted-foreground hover:border-emerald-500/60",
                )}
                aria-label={s.done ? "Marcar como não feita" : "Marcar como feita"}
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => removeSet(i)}
                disabled={ex.setLog.length === 1}
                className="mx-auto text-muted-foreground/50 hover:text-destructive disabled:opacity-30"
                aria-label="Remover série"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
        <Button type="button" variant="ghost" onClick={addSet} className="h-8 w-full gap-1.5 border border-dashed border-border/50 text-xs font-semibold text-muted-foreground hover:border-primary/40">
          <Plus className="h-3.5 w-3.5" /> Adicionar série
        </Button>
      </div>
    </section>
  );
}

export function WorkoutDetailModal({ workout, onClose }: { workout: GymWorkout | null; onClose: () => void }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [drafts, setDrafts] = useState<EditedExercise[]>([]);
  const [saving, startSave] = useTransition();
  if (!workout) return null;
  const w = workout;

  const totalVolume = Math.round(w.exercises.filter((e) => !e.timed).reduce((acc, e) => acc + exerciseVolume(e), 0));
  const totalSets = w.exercises.reduce((acc, e) => acc + workingSets(e).length, 0);

  const repeat = () => {
    savePendingStart(startOptionsFromWorkout(w));
    onClose();
    router.push("/health/gym/session");
  };

  const startEdit = () => {
    setDrafts(toDrafts(w.exercises));
    setEditing(true);
  };

  const saveEdit = () => {
    startSave(async () => {
      const res = await updateWorkoutExercises(w.id, drafts);
      if (res.success) {
        toast.success(res.message);
        setEditing(false);
        onClose();
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const close = () => {
    setEditing(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) close(); }}>
      <DialogContent size="lg">
        <DialogHeader
          icon={<Dumbbell />}
          title={w.title}
          description={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{format(new Date(w.date), "dd 'de' MMMM',' HH:mm", { locale: ptBR })}</span>
              <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" />{w.duration} min</span>
              <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" />{totalSets} séries</span>
              {totalVolume > 0 && <span className="inline-flex items-center gap-1"><Dumbbell className="h-3.5 w-3.5" />{totalVolume.toLocaleString("pt-BR")} kg</span>}
              {w.feeling && <span className="inline-flex items-center gap-1"><Flame className="h-3.5 w-3.5" />{FEELING_LABEL[w.feeling] ?? w.feeling}</span>}
            </span>
          }
        />
        <DialogBody className="custom-scrollbar space-y-3">
          {editing ? (
            drafts.map((ex, i) => (
              <ExerciseEditor
                key={i}
                ex={ex}
                onChange={(next) => setDrafts((prev) => prev.map((d, idx) => (idx === i ? next : d)))}
              />
            ))
          ) : (
            <>
              {w.exercises.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Sem exercícios registrados nesta sessão.</p>
              ) : (
                w.exercises.map((ex, i) => <ExerciseDetail key={i} ex={ex} />)
              )}
              {w.notes && (
                <div className="rounded-2xl border border-border/40 bg-muted/10 px-3 py-2.5">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notas da sessão</p>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">{w.notes}</p>
                </div>
              )}
            </>
          )}
        </DialogBody>
        <DialogFooter>
          {editing ? (
            <>
              <Button variant="outline" onClick={() => setEditing(false)} disabled={saving}>Cancelar</Button>
              <Button onClick={saveEdit} disabled={saving} className="gap-2 font-semibold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar séries
              </Button>
            </>
          ) : (
            <>
              {w.exercises.length > 0 && (
                <Button variant="outline" onClick={startEdit} className="gap-2">
                  <Pencil className="h-4 w-4" /> Editar séries
                </Button>
              )}
              <Button onClick={repeat} className="gap-2 font-semibold">
                <Play className="h-4 w-4" /> Repetir este treino
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
