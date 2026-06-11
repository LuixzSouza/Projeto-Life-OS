"use client";

// Contexto com os IDs das tarefas BLOQUEADAS (dependência "bloqueada por" com
// bloqueadora ainda pendente). O board ([slug]/page) calcula no servidor e
// provê aqui; cada item de tarefa consome com 1 linha — sem prop-drilling
// pelas 5 views (lista, grade, compacta, por dia, kanban).

import { createContext, useContext, useMemo } from "react";

const BlockedTasksContext = createContext<ReadonlySet<string>>(new Set());

export function BlockedTasksProvider({ ids, children }: { ids: string[]; children: React.ReactNode }) {
  const set = useMemo(() => new Set(ids), [ids]);
  return <BlockedTasksContext.Provider value={set}>{children}</BlockedTasksContext.Provider>;
}

/** A tarefa está bloqueada por outra ainda pendente? */
export function useIsTaskBlocked(taskId: string): boolean {
  return useContext(BlockedTasksContext).has(taskId);
}
