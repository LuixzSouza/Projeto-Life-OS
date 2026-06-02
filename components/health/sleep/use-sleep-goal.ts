"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_SLEEP_GOAL } from "@/lib/sleep-math";

const KEY = "lifeos:sleep:goal";

// Store local da meta de sono (privacy-first). useSyncExternalStore evita
// mismatch de hidratação sem setState dentro de efeito.
let listeners: Array<() => void> = [];

function read(): number {
  if (typeof window === "undefined") return DEFAULT_SLEEP_GOAL;
  const v = localStorage.getItem(KEY);
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 && n <= 14 ? n : DEFAULT_SLEEP_GOAL;
}

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => { listeners = listeners.filter(l => l !== cb); };
}

export function useSleepGoal(): [number, (v: number) => void] {
  const goal = useSyncExternalStore(subscribe, read, () => DEFAULT_SLEEP_GOAL);
  const setGoal = (v: number) => {
    if (typeof window === "undefined") return;
    const safe = Math.max(4, Math.min(14, Math.round((v || DEFAULT_SLEEP_GOAL) * 2) / 2)); // passo de 0,5h
    localStorage.setItem(KEY, String(safe));
    listeners.forEach(l => l());
  };
  return [goal, setGoal];
}
