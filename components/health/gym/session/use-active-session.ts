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
    setSession({
      startedAt: Date.now(),
      title: opts.title.trim() || "Treino",
      muscleGroups: opts.muscleGroups,
      exercises: exercises.length ? exercises : [{ id: uid("ex"), name: "", sets: [emptySet()] }],
      restSeconds: opts.restSeconds ?? DEFAULT_REST,
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
      e.id === exId ? { ...e, sets: e.sets.map((s) => (s.id === setId ? { ...s, done: !s.done } : s)) } : e,
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
    setTitle, setRestSeconds,
    addExercise, removeExercise, renameExercise, replaceExercise, setExerciseEquipment, setExerciseNote,
    addSet, removeSet, updateSet, toggleSetDone, setSetType,
  };
}
