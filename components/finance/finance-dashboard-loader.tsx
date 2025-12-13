"use client";

import dynamic from "next/dynamic";

// Importa o Dashboard inteiro desativando o SSR
const FinanceDashboard = dynamic(
  () => import("./finance-dashboard").then((mod) => mod.FinanceDashboard),
  { 
    ssr: false, // Aqui funciona porque este arquivo é "use client"
    loading: () => (
      <div className="min-h-screen bg-zinc-50 dark:bg-black p-10 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-zinc-500 animate-pulse">Carregando painel financeiro...</p>
        </div>
      </div>
    )
  }
);

// Repassa todas as props para o componente real
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function FinanceDashboardLoader(props: any) {
  return <FinanceDashboard {...props} />;
}