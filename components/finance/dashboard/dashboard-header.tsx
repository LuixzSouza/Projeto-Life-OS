"use client";

import Link from "next/link";
import { TrendingUp, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BankConnector, SyncButton } from "@/components/finance/bank-connector";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import type { DashboardAccount } from "./types";

interface DashboardHeaderProps {
  accounts: DashboardAccount[];
}

export function DashboardHeader({ accounts }: DashboardHeaderProps) {
  return (
    <div className="border-b border-border/40 bg-background/60 backdrop-blur-2xl pt-10 pb-8 px-6 md:px-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 sticky top-0 z-40">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
          Gestão Financeira <TrendingUp className="h-7 w-7 text-primary" />
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base mt-2 font-medium">Visão consolidada do seu patrimônio e fluxo de caixa.</p>
      </div>

      {/* Barra de Ações (Scroll Horizontal no Mobile ocultando a scrollbar) */}
      <div className="flex items-center gap-2 sm:gap-3 bg-muted/20 p-2 rounded-2xl border border-border/50 shadow-sm w-full xl:w-auto overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <SyncButton accounts={accounts} />
        <BankConnector />

        <div className="h-8 w-px bg-border/60 mx-1 hidden sm:block shrink-0" />

        <Link href="/finance/investments" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl h-10 border-dashed hover:border-primary/50 hover:text-primary transition-all active:scale-95">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline font-bold">Investimentos</span>
          </Button>
        </Link>

        <Link href="/finance/market" className="shrink-0">
          <Button variant="outline" size="sm" className="gap-2 rounded-xl h-10 border-dashed hover:border-primary/50 hover:text-primary transition-all active:scale-95">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline font-bold">Mercado</span>
          </Button>
        </Link>

        <div className="shrink-0">
          <TransactionDialog accounts={accounts} />
        </div>
      </div>
    </div>
  );
}
