"use client";

import { type CashFlowPoint } from "@/components/finance/cash-flow-chart";
import { FinanceOverview } from "@/components/finance/finance-overview";

import { DashboardHeader } from "@/components/finance/dashboard/dashboard-header";
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
    <div className="min-h-screen bg-background relative overflow-hidden animate-in fade-in duration-700 pb-24">

      {/* Background Glows (Premium Feel) */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="relative mx-auto">

        {/* SEÇÃO 1: HEADER & VISÃO GLOBAL */}
        <section className="space-y-8">
          <DashboardHeader accounts={accounts} />

          <div className="px-6 md:px-8 max-w-7xl mx-auto pt-4">
            <FinanceOverview
              totalBalance={totalBalance}
              netSalary={netSalary}
              grossSalary={grossSalary}
              totalRecurring={totalRecurring}
              hasSalarySet={hasSalarySet}
            />
          </div>
        </section>

        {/* SEÇÃO 1.5: RESUMO DO MÊS */}
        <MonthlySummary
          totalBalance={totalBalance}
          monthIncome={monthIncome}
          monthExpense={monthExpense}
          monthlyFlow={monthlyFlow}
        />

        {/* SEÇÃO 1.75: ORÇAMENTO 75/10/15 + PROJEÇÃO (some sem renda-base) */}
        <BudgetSection budget={budget} monthlyFlow={monthlyFlow} wishlist={wishlist} />

        {/* SEÇÃO 2: CARTEIRAS */}
        <AccountsSection accounts={accounts} />

        <div className="h-px w-full bg-border/50" />

        {/* SEÇÃO 3: EXTRATO & CUSTOS FIXOS */}
        <StatementSection transactions={transactions} recurring={recurring} totalRecurring={totalRecurring} accounts={accounts} />

        <div className="h-px w-full bg-border/50" />

        {/* SEÇÃO 3.5: COBRANÇAS RECORRENTES (RECEITAS A RECEBER) */}
        <RecurringChargesSection charges={recurringCharges} totalCharges={totalCharges} clients={clients} />

        <div className="h-px w-full bg-border/50" />

        {/* SEÇÃO 4: WISHLIST */}
        <WishlistSection wishlist={wishlist} />
      </div>
    </div>
  );
}
