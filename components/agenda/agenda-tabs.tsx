"use client";

// Raiz das abas da Agenda: espelha a aba ativa na URL (?tab=blocks) SEM
// navegar — history.replaceState puro, zero re-render do servidor. Assim
// refresh mantém a aba e dá para deep-linkar (ex.: /agenda?tab=focus).

import { Tabs } from "@/components/ui/tabs";
import type { AgendaTab } from "./agenda-shared";

export function AgendaTabsRoot({
  initialTab,
  className,
  children,
}: {
  initialTab: AgendaTab;
  className?: string;
  children: React.ReactNode;
}) {
  const onChange = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <Tabs defaultValue={initialTab} onValueChange={onChange} className={className}>
      {children}
    </Tabs>
  );
}
