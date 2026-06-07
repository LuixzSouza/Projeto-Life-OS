"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveGymSession } from "@/app/(dashboard)/health/actions";
import { SessionSetup } from "./session-setup";
import { SessionActive, type SessionControls } from "./session-active";
import { SessionSummary } from "./session-summary";
import { useActiveSession } from "./use-active-session";
import { loadRoutines, saveRoutines } from "./session-storage";
import { addGalleryPhotos } from "./gym-gallery";
import { sessionStats, toStoredExercises, uid, type LastPerf, type Routine, type SaveGymSessionInput } from "./session-types";

/**
 * Sessão de treino ao vivo — overlay em tela cheia (isola a tela durante o treino).
 * Três fases: preparar (setup) → treinar (active) → resumo (summary). A sessão fica
 * persistida no localStorage, então sobrevive a refresh/navegação até ser salva.
 */
export function LiveSession({ lastPerf }: { lastPerf: LastPerf[] }) {
  const router = useRouter();
  const s = useActiveSession();
  // Init lazy: lê o localStorage uma vez (só renderiza após hidratar a sessão).
  const [routines, setRoutines] = useState<Routine[]>(loadRoutines);
  const [saving, startSave] = useTransition();

  const lastPerfMap = useMemo(
    () => Object.fromEntries(lastPerf.map((p) => [p.name.toLowerCase(), p])) as Record<string, LastPerf>,
    [lastPerf],
  );

  const controls: SessionControls = useMemo(() => ({
    renameExercise: s.renameExercise,
    addExercise: s.addExercise,
    removeExercise: s.removeExercise,
    addSet: s.addSet,
    removeSet: s.removeSet,
    updateSet: s.updateSet,
    toggleSetDone: s.toggleSetDone,
  }), [s.renameExercise, s.addExercise, s.removeExercise, s.addSet, s.removeSet, s.updateSet, s.toggleSetDone]);

  const handleSaveRoutine = (name: string) => {
    if (!s.session) return;
    const routine: Routine = {
      id: uid("rt"),
      name: name.trim(),
      muscleGroups: s.session.muscleGroups,
      exercises: s.session.exercises
        .filter((e) => e.name.trim())
        .map((e) => ({ name: e.name.trim(), group: e.group, sets: e.sets.length, reps: e.sets[0]?.reps || "12", weight: e.sets[0]?.weight || "" })),
    };
    const next = [routine, ...routines.filter((r) => r.name.toLowerCase() !== routine.name.toLowerCase())];
    setRoutines(next);
    saveRoutines(next);
    toast.success("Rotina salva!");
  };

  const handleSave = (feeling: string | null, notes: string | null, photos: string[]) => {
    if (!s.session) return;
    const session = s.session;
    const durationMin = Math.round(((session.finishedAt ?? session.startedAt) - session.startedAt) / 60000);
    const input: SaveGymSessionInput = {
      title: session.title,
      muscleGroups: session.muscleGroups,
      durationMin,
      feeling,
      notes,
      exercises: toStoredExercises(session.exercises),
    };
    startSave(async () => {
      const res = await saveGymSession(input);
      if (res.success) {
        // Fotos do dia → galeria local (IndexedDB).
        if (photos.length > 0) {
          const stats = sessionStats(session.exercises);
          const dateISO = new Date(session.startedAt).toISOString();
          await addGalleryPhotos(photos.map((dataUrl) => ({
            id: uid("ph"), dataUrl, date: dateISO, title: session.title,
            volume: stats.volume, durationMin, sets: stats.doneSets,
          })));
        }
        s.cancel(); // limpa o rascunho local
        toast.success(res.message);
        router.push("/health/gym");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  // Evita flash/mismatch antes de hidratar o localStorage.
  if (!s.hydrated) {
    return <div className="fixed inset-0 z-[60] bg-background" />;
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-background">
      {!s.session ? (
        <SessionSetup routines={routines} onStart={s.start} onClose={() => router.push("/health/gym")} />
      ) : s.session.finishedAt ? (
        <SessionSummary
          session={s.session}
          saving={saving}
          onSave={handleSave}
          onSaveRoutine={handleSaveRoutine}
          onBack={s.reopen}
        />
      ) : (
        <SessionActive
          session={s.session}
          lastPerf={lastPerfMap}
          controls={controls}
          onFinish={s.finish}
          onCancel={() => { s.cancel(); router.push("/health/gym"); }}
        />
      )}
    </div>
  );
}
