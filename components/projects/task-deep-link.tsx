"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const RING = ["ring-2", "ring-primary", "ring-offset-2", "ring-offset-background"];

/**
 * Lê ?task=ID na URL, rola até o cartão da tarefa (#task-ID) e destaca por uns segundos.
 * Usado para "abrir" uma tarefa vinda de uma menção/link de nota.
 */
export function TaskDeepLink() {
  const params = useSearchParams();
  const taskId = params.get("task");

  useEffect(() => {
    if (!taskId) return;
    // Espera o board renderizar antes de procurar o elemento.
    const t = setTimeout(() => {
      const el = document.getElementById(`task-${taskId}`);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add(...RING, "rounded-2xl", "transition");
      setTimeout(() => el.classList.remove(...RING), 2600);
    }, 450);
    return () => clearTimeout(t);
  }, [taskId]);

  return null;
}
