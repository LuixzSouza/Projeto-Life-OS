"use client";

import { Wallet } from "lucide-react";
import { type CashFlowPoint } from "@/components/finance/cash-flow-chart";
import { FinanceOverview } from "@/components/finance/finance-overview";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";

import { FinanceHeaderActions } from "@/components/finance/dashboard/dashboard-header";
import { MonthlySummary } from "@/components/finance/dashboard/monthly-summary";
import { AccountsSection } from "@/components/finance/dashboard/accounts-section";
import { StatementSection } from "@/components/finance/dashboard/statement-section";
import { RecurringChargesSection } from "@/components/finance/dashboard/recurring-charges-section";
import { WishlistSection } from "@/components/finance/dashboard/wishlist-section";
import { BudgetSection } from "@/components/finance/dashboard/budget-section";
import type { BudgetSnapshot } from "@/lib/budget-buckets";

// Re-export dos tipos (mantém compatibilidade com imports existentes)
export type {
  DashboardAccount,
  DashboardTransaction,
  DashboardWishlist,
  DashboardRecurring,
  DashboardRecurringCharge,
  DashboardClientOption,
} from "@/components/finance/dashboard/types";

import type {
  DashboardAccount,
  DashboardTransaction,
  DashboardWishlist,
  DashboardRecurring,
  DashboardRecurringCharge,
  DashboardClientOption,
} from "@/components/finance/dashboard/types";

interface FinanceDashboardProps {
  accounts: DashboardAccount[];
  transactions: DashboardTransaction[];
  wishlist: DashboardWishlist[];
  recurring: DashboardRecurring[];
  recurringCharges: DashboardRecurringCharge[];
  clients: DashboardClientOption[];
  totalBalance: number;
  totalRecurring: number;
  totalCharges: number;
  netSalary: number;
  grossSalary: number;
  hasSalarySet: boolean;
  monthlyFlow: CashFlowPoint[];
  monthIncome: number;
  monthExpense: number;
  /** Orçamento 75/10/15 do mês (calculado no servidor). */
  budget: BudgetSnapshot;
}

export function FinanceDashboard({
  accounts,
  transactions,
  wishlist,
  recurring,
  recurringCharges,
  clients,
  totalBalance,
  totalRecurring,
  totalCharges,
  netSalary,
  grossSalary,
  hasSalarySet,
  monthlyFlow,
  monthIncome,
  monthExpense,
  budget
}: FinanceDashboardProps) {
  return (
    <PageShell>
      <PageHeader
        icon={<Wallet className="h-6 w-6" />}
        title="Financeiro"
        description="Patrimônio, fluxo de caixa e orçamento — tudo num lugar só."
        actions={<FinanceHeaderActions accounts={accounts} />}
      >
        {/* Navegação por seções: a página é longa — um toque leva direto ao bloco */}
        <nav className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 scrollbar-hide">
          {[
            { id: "resumo", label: "Resumo" },
            { id: "orcamento", label: "Orçamento" },
            { id: "contas", label: "Contas" },
            { id: "extrato", label: "Extrato" },
            { id: "cobrancas", label: "Cobranças" },
            { id: "desejos", label: "Wishlist" },
          ].map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 rounded-full border border-border/40 bg-muted/30 px-3 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
            >
              {s.label}
            </a>
          ))}
        </nav>
      </PageHeader>

      <PageContainer className="space-y-10 pb-24">
        {/* VISÃO GLOBAL */}
        <FinanceOverview
          totalBalance={totalBalance}
          netSalary={netSalary}
          grossSalary={grossSalary}
          totalRecurring={totalRecurring}
          hasSalarySet={hasSalarySet}
        />

        {/* RESUMO DO MÊS */}
        <MonthlySummary
          totalBalance={totalBalance}
          monthIncome={monthIncome}
          monthExpense={monthExpense}
          monthlyFlow={monthlyFlow}
        />

        {/* ORÇAMENTO 75/10/15 + PROJEÇÃO (some sem renda-base) */}
        <BudgetSection budget={budget} monthlyFlow={monthlyFlow} wishlist={wishlist} totalBalance={totalBalance} />

        {/* CARTEIRAS */}
        <AccountsSection accounts={accounts} />

        {/* EXTRATO & CUSTOS FIXOS */}
        <StatementSection transactions={transactions} recurring={recurring} totalRecurring={totalRecurring} accounts={accounts} />

        {/* COBRANÇAS RECORRENTES (RECEITAS A RECEBER) */}
        <RecurringChargesSection charges={recurringCharges} totalCharges={totalCharges} clients={clients} />

        {/* WISHLIST */}
        <WishlistSection wishlist={wishlist} accounts={accounts} totalBalance={totalBalance} />
      </PageContainer>
    </PageShell>
  );
}
