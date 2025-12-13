"use client";

import dynamic from "next/dynamic";

// Carrega o componente apenas no navegador (Cliente), ignorando o Servidor
const AccountsList = dynamic(
  () => import("./accounts-list").then((mod) => mod.AccountsList),
  {
    ssr: false, // O segredo para o gráfico não quebrar o build
    loading: () => <div className="h-[200px] w-full bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />
  }
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AccountsListLoader(props: any) {
  return <AccountsList {...props} />;
}