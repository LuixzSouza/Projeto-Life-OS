"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

// Importa o componente original dinamicamente, DESATIVANDO o SSR
const FinanceOverview = dynamic(
  () => import("./finance-overview").then((mod) => mod.FinanceOverview),
  {
    ssr: false, // Isso resolve o erro "window is not defined" do Recharts
    loading: () => <div className="h-[300px] w-full bg-zinc-100 dark:bg-zinc-800 rounded-2xl animate-pulse" />
  }
);

export function FinanceOverviewLoader(props: ComponentProps<typeof FinanceOverview>) {
  return <FinanceOverview {...props} />;
}