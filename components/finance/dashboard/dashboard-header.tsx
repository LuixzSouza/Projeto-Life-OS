"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, BarChart3, Receipt, Plus, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BankConnector, SyncButton } from "@/components/finance/bank-connector";
import { TransactionDialog } from "@/components/finance/transaction-dialog";
import { ImportStatementDialog } from "@/components/finance/import-statement-dialog";
import { AskAiButton } from "@/components/ai/ask-ai-button";
import type { DashboardAccount } from "./types";

/**
 * Ações do header de Finanças — vivem no slot `actions` do PageHeader padrão
 * (que já cuida do scroll horizontal no mobile). Substitui o header custom
 * antigo, que fugia do design system.
 */
export function FinanceHeaderActions({ accounts }: { accounts: DashboardAccount[] }) {
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <AskAiButton
        q="Analise minhas finanças do mês: receitas, despesas, principais categorias de gasto e onde posso economizar."
        label="Analisar com IA"
        className="h-9"
      />

      {/* Importar extrato: o caminho GRATUITO de trazer dados do banco
          (OFX/CSV ou texto colado lido pela IA) — por isso vem primeiro. */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setImportOpen(true)}
        disabled={accounts.length === 0}
        title="Importar extrato (OFX, CSV ou texto com IA)"
        className="h-9 shrink-0 gap-1.5 rounded-xl border-border/40 font-medium"
      >
        <FileUp className="h-4 w-4" />
        <span className="hidden lg:inline">Importar extrato</span>
      </Button>
      <ImportStatementDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
      />

      <SyncButton accounts={accounts} />
      <BankConnector onOpenImport={() => setImportOpen(true)} />

      <div className="hidden h-5 w-px shrink-0 bg-border/60 sm:block" />

      <Link href="/finance/transactions" className="shrink-0">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-border/40 font-medium" title="Todas as transações">
          <Receipt className="h-4 w-4" />
          <span className="hidden lg:inline">Transações</span>
        </Button>
      </Link>

      <Link href="/finance/investments" className="shrink-0">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-border/40 font-medium" title="Investimentos">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden lg:inline">Investimentos</span>
        </Button>
      </Link>

      <Link href="/finance/market" className="shrink-0">
        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-xl border-border/40 font-medium" title="Mercado financeiro">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden lg:inline">Mercado</span>
        </Button>
      </Link>

      <div className="shrink-0">
        <TransactionDialog
          accounts={accounts}
          trigger={
            <Button size="sm" className="h-9 gap-1.5 rounded-xl font-semibold" disabled={accounts.length === 0}>
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nova transação</span>
              <span className="sm:hidden">Nova</span>
            </Button>
          }
        />
      </div>
    </div>
  );
}
