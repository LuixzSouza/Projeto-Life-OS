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
  // Compacto no mobile (iPhone SE): título menor, descrição só no sm+ e a barra
  // de ações enxuta rolando na horizontal — sem comer meia tela do celular.
  return (
    <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col xl:flex-row justify-between items-start xl:items-center gap-2.5 px-4 py-2.5 sm:gap-4 sm:px-8 sm:py-4 xl:gap-6">
        <div className="flex items-center gap-2.5 min-w-0 sm:gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-11 sm:rounded-xl">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-2xl">
              Gestão Financeira
            </h1>
            <p className="mt-0.5 hidden text-sm text-muted-foreground sm:block">Visão consolidada do seu patrimônio e fluxo de caixa.</p>
          </div>
        </div>

        {/* Barra de Ações (Scroll Horizontal no Mobile ocultando a scrollbar) */}
        <div className="flex items-center gap-2 sm:gap-3 bg-muted/20 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border border-border/50 shadow-sm w-full xl:w-auto overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <SyncButton accounts={accounts} />
          <BankConnector />

          <div className="h-8 w-px bg-border/60 mx-1 hidden sm:block shrink-0" />

          <Link href="/finance/investments" className="shrink-0">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl h-9 sm:h-10 border-dashed hover:border-primary/50 hover:text-primary transition-all active:scale-95">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline font-bold">Investimentos</span>
            </Button>
          </Link>

          <Link href="/finance/market" className="shrink-0">
            <Button variant="outline" size="sm" className="gap-2 rounded-xl h-9 sm:h-10 border-dashed hover:border-primary/50 hover:text-primary transition-all active:scale-95">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline font-bold">Mercado</span>
            </Button>
          </Link>

          <div className="shrink-0">
            <TransactionDialog accounts={accounts} />
          </div>
        </div>
      </div>
    </header>
  );
}
