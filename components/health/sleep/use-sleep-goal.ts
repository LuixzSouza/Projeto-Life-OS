"use client";

import { useState } from "react";
import { DEFAULT_SLEEP_GOAL } from "@/lib/sleep-math";
import { setSleepGoal as persistSleepGoal } from "@/app/(dashboard)/health/actions";

// Meta de sono centralizada no perfil (banco). O valor inicial chega do
// servidor (`initial`) e cada alteração persiste via server action — sincroniza
// entre dispositivos e sobrevive à limpeza de cache (antes vivia no localStorage).
export function useSleepGoal(initial?: number | null): [number, (v: number) => void] {
  const [goal, setGoalState] = useState<number>(initial ?? DEFAULT_SLEEP_GOAL);

  const setGoal = (v: number) => {
    const safe = Math.max(4, Math.min(14, Math.round((v || DEFAULT_SLEEP_GOAL) * 2) / 2)); // passo de 0,5h
    setGoalState(safe); // otimista — UI responde na hora
    void persistSleepGoal(safe).catch(() => { /* falha silenciosa: estado local mantido */ });
  };

  return [goal, setGoal];
}
