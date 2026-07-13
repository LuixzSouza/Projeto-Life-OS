"use client";

import { useCallback, useEffect, useState } from "react";
import { type Equipment, type LiveExercise, type LiveSession, type LiveSet, type SetType, type StartOptions, guessEquipment, uid } from "./session-types";
import { clearActiveSession, loadActiveSession, saveActiveSession } from "./session-storage";

export type { StartOptions } from "./session-types";

const DEFAULT_REST = 90; // segundos

function emptySet(prev?: LiveSet): LiveSet {
  // Pré-preenche carga/reps com a série anterior (acelera o registro repetitivo).
  return { id: uid("set"), reps: prev?.reps ?? "", weight: prev?.weight ?? "", done: false };
}

export function useActiveSession() {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Hidrata do localStorage só no cliente (evita mismatch de SSR). O setState vai
  // num microtask (callback assíncrono) — não no corpo do effect — de propósito.
  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (!active) return;
      setSession(loadActiveSession());
      setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  // Persiste a cada mudança (resumível após refresh).
  useEffect(() => {
    if (!hydrated) return;
    if (session) saveActiveSession(session);
  }, [session, hydrated]);

  const start = useCallback((opts: StartOptions) => {
    const exercises: LiveExercise[] = opts.exercises.map((e) => ({
      id: uid("ex"),
      name: e.name,
      group: e.group,
      equipment: e.equipment,
      target: e.target,
      sets: Array.from({ length: Math.max(1, e.sets) }, () => ({
        id: uid("set"), reps: e.reps ?? "", weight: e.weight ?? "", done: false,
      })),
    }));
    const now = Date.now();
    setSession({
      startedAt: now,
      title: opts.title.trim() || "Treino",
      muscleGroups: opts.muscleGroups,
      exercises: exercises.length ? exercises : [{ id: uid("ex"), name: "", sets: [emptySet()] }],
      restSeconds: opts.restSeconds ?? DEFAULT_REST,
      // Aquecimento pedido no início: a sessão abre na fase de aquecimento.
      ...(opts.warmupMinutes && opts.warmupMinutes > 0
        ? { warmupEndsAt: now + opts.warmupMinutes * 60_000 }
        : { warmupDone: true }),
    });
  }, []);

  const cancel = useCallback(() => {
    clearActiveSession();
    setSession(null);
  }, []);

  const finish = useCallback(() => {
    setSession((s) => (s ? { ...s, finishedAt: Date.now() } : s));
  }, []);

  const reopen = useCallback(() => {
    setSession((s) => (s ? { ...s, finishedAt: undefined } : s));
  }, []);

  // Marca a sessão como "mexida agora" (zera a contagem de obsolescência ao retomar
  // um treino antigo). A própria gravação carimba updatedAt.
  const touch = useCallback(() => {
    setSession((s) => (s ? { ...s, updatedAt: Date.now() } : s));
  }, []);

  // Pausa/retoma o CRONÔMETRO (congela o tempo decorrido; nada é perdido).
  const togglePause = useCallback(() => {
    setSession((s) => {
      if (!s) return s;
      if (s.pausedAt) {
        return { ...s, pausedAt: undefined, pausedMs: (s.pausedMs ?? 0) + (Date.now() - s.pausedAt) };
      }
      return { ...s, pausedAt: Date.now() };
    });
  }, []);

  // Conclui (ou estende) a fase de aquecimento.
  const endWarmup = useCallback(() => {
    setSession((s) => (s ? { ...s, warmupDone: true, warmupEndsAt: undefined } : s));
  }, []);
  const extendWarmup = useCallback((extraMinutes: number) => {
    setSession((s) => {
      if (!s) return s;
      const base = Math.max(Date.now(), s.warmupEndsAt ?? Date.now());
      return { ...s, warmupEndsAt: base + extraMinutes * 60_000 };
    });
  }, []);

  // Local do treino (GPS) — anexado às notas no salvamento.
  const setLocation = useCallback((location: { lat: number; lng: number } | undefined) => {
    setSession((s) => (s ? { ...s, location } : s));
  }, []);

  // Helper para mutar imutavelmente os exercícios.
  const mutate = useCallback((fn: (exs: LiveExercise[]) => LiveExercise[]) => {
    setSession((s) => (s ? { ...s, exercises: fn(s.exercises) } : s));
  }, []);

  const setTitle = useCallback((title: string) => setSession((s) => (s ? { ...s, title } : s)), []);
  const setRestSeconds = useCallback((restSeconds: number) => setSession((s) => (s ? { ...s, restSeconds } : s)), []);

  const addExercise = useCallback((name: string, group?: string) => {
    mutate((exs) => [...exs, { id: uid("ex"), name, group, equipment: name ? guessEquipment(name) : undefined, sets: [emptySet()] }]);
  }, [mutate]);

  const removeExercise = useCallback((exId: string) => {
    mutate((exs) => exs.filter((e) => e.id !== exId));
  }, [mutate]);

  // Reordena um exercício (−1 sobe, +1 desce) — útil ao adicionar no meio do treino.
  const moveExercise = useCallback((exId: string, dir: -1 | 1) => {
    mutate((exs) => {
      const i = exs.findIndex((e) => e.id === exId);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= exs.length) return exs;
      const copy = [...exs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }, [mutate]);

  // "Fazer depois": manda o exercício pro FIM da fila (máquina ocupada) — preserva
  // as séries já feitas; você volta a ele quando liberar.
  const skipExercise = useCallback((exId: string) => {
    mutate((exs) => {
      const i = exs.findIndex((e) => e.id === exId);
      if (i === -1 || i === exs.length - 1) return exs; // não achou ou já é o último
      const copy = [...exs];
      const [moved] = copy.splice(i, 1);
      copy.push({ ...moved, postponed: true }); // marca p/ o lembrete "adiados"
      return copy;
    });
  }, [mutate]);

  const renameExercise = useCallback((exId: string, name: string) => {
    mutate((exs) => exs.map((e) => (e.id === exId ? { ...e, name } : e)));
  }, [mutate]);

  // Troca o exercício (erro do usuário): mantém a quantidade de séries, mas zera
  // cargas/reps/conclusão — é outro movimento, então os números antigos não valem.
  const replaceExercise = useCallback((exId: string, name: string, group?: string, equipment?: Equipment) => {
    mutate((exs) => exs.map((e) =>
      e.id === exId
        ? {
            ...e,
            name,
            group: group ?? e.group,
            equipment: equipment ?? e.equipment,
            sets: e.sets.map(() => ({ id: uid("set"), reps: "", weight: "", done: false })),
          }
        : e,
    ));
  }, [mutate]);

  const setExerciseEquipment = useCallback((exId: string, equipment: Equipment) => {
    mutate((exs) => exs.map((e) => (e.id === exId ? { ...e, equipment } : e)));
  }, [mutate]);

  const setExerciseNote = useCallback((exId: string, note: string) => {
    mutate((exs) => exs.map((e) => (e.id === exId ? { ...e, note } : e)));
  }, [mutate]);

  const addSet = useCallback((exId: string) => {
    mutate((exs) => exs.map((e) =>
      e.id === exId ? { ...e, sets: [...e.sets, emptySet(e.sets[e.sets.length - 1])] } : e,
    ));
  }, [mutate]);

  // "Não aguentei o peso" → insere uma série de CARGA REDUZIDA (~80%, arredondada a
  // 2,5 kg) logo após a série atual, marcada como drop. O usuário só ajusta as reps.
  const dropSet = useCallback((exId: string, afterSetId: string) => {
    mutate((exs) => exs.map((e) => {
      if (e.id !== exId) return e;
      const idx = e.sets.findIndex((s) => s.id === afterSetId);
      if (idx === -1) return e;
      const base = e.sets[idx];
      const w = parseFloat(String(base.weight).replace(",", ".")) || 0;
      const reduced = w > 0 ? Math.max(0, Math.round((w * 0.8) / 2.5) * 2.5) : 0;
      const dropped = { id: uid("set"), reps: "", weight: reduced ? String(reduced) : "", done: false, type: "drop" as const };
      return { ...e, sets: [...e.sets.slice(0, idx + 1), dropped, ...e.sets.slice(idx + 1)] };
    }));
  }, [mutate]);

  // Prepende uma rampa de séries de AQUECIMENTO (type "warmup") antes das séries de
  // trabalho. Não conta para volume/recorde; o aquecimento vem antes na execução.
  const addWarmupSets = useCallback((exId: string, sets: { weight: string; reps: string }[]) => {
    if (sets.length === 0) return;
    mutate((exs) => exs.map((e) => {
      if (e.id !== exId) return e;
      const warm: LiveSet[] = sets.map((w) => ({ id: uid("set"), reps: w.reps, weight: w.weight, done: false, type: "warmup" as const }));
      return { ...e, sets: [...warm, ...e.sets] };
    }));
  }, [mutate]);

  const removeSet = useCallback((exId: string, setId: string) => {
    mutate((exs) => exs.map((e) =>
      e.id === exId ? { ...e, sets: e.sets.filter((s) => s.id !== setId) } : e,
    ));
  }, [mutate]);

  const updateSet = useCallback((exId: string, setId: string, field: "reps" | "weight", value: string) => {
    mutate((exs) => exs.map((e) =>
      e.id === exId ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)) } : e,
    ));
  }, [mutate]);

  const toggleSetDone = useCallback((exId: string, setId: string) => {
    mutate((exs) => exs.map((e) =>
      e.id === exId
        ? {
            ...e,
            sets: e.sets.map((s) =>
              // Concluir carimba o instante real (prova de execução); desmarcar limpa.
              s.id === setId ? { ...s, done: !s.done, doneAt: !s.done ? Date.now() : undefined } : s,
            ),
          }
        : e,
    ));
  }, [mutate]);

  const setSetType = useCallback((exId: string, setId: string, type: SetType) => {
    mutate((exs) => exs.map((e) =>
      e.id === exId ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, type } : s)) } : e,
    ));
  }, [mutate]);

  return {
    session, hydrated,
    start, cancel, finish, reopen, touch,
    togglePause, endWarmup, extendWarmup, setLocation,
    setTitle, setRestSeconds,
    addExercise, removeExercise, moveExercise, skipExercise, renameExercise, replaceExercise, setExerciseEquipment, setExerciseNote,
    addSet, dropSet, addWarmupSets, removeSet, updateSet, toggleSetDone, setSetType,
  };
}
