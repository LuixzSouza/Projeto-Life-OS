"use client";

import dynamic from "next/dynamic";
import type { ComponentProps } from "react";

// Carrega o componente apenas no navegador (Cliente), ignorando o Servidor
const AccountsList = dynamic(
  () => import("./accounts-list").then((mod) => mod.AccountsList),
  {
    ssr: false, // O segredo para o gráfico não quebrar o build
    loading: () => <div className="h-[200px] w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
  }
);

export function AccountsListLoader(props: ComponentProps<typeof AccountsList>) {
  return <AccountsList {...props} />;
}