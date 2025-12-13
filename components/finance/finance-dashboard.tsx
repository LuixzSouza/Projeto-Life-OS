"use client";

import { ShoppingBag, Wallet, AlertCircle, Receipt, PiggyBank, TrendingUp, LineChart } from "lucide-react";
import { RecurringCard, TransactionList } from "@/components/finance/finance-ui";
import { TransactionDialog } from "@/components/finance/transaction-dialog"; 
import { WishlistDialog } from "@/components/finance/wishlist-dialog";       
import { BankConnector } from "@/components/finance/bank-connector";
import { SyncButton } from "@/components/finance/sync-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Usamos os componentes originais ou loaders que você já tem
// Se der erro de importação, verifique se os arquivos existem
import { FinanceOverviewLoader } from "@/components/finance/finance-overview-loader";
import { AccountsListLoader } from "@/components/finance/accounts-list-loader";
import { WishlistGridLoader } from "@/components/finance/wishlist-grid-loader";

// Tipagem dos dados que vêm do banco
interface FinanceDashboardProps {
  accounts: any[];
  transactions: any[];
  wishlist: any[];
  recurring: any[];
  totalBalance: number;
  totalRecurring: number;
  netSalary: number;
  hasSalarySet: boolean;
}

export function FinanceDashboard({
  accounts,
  transactions,
  wishlist,
  recurring,
  totalBalance,
  totalRecurring,
  netSalary,
  hasSalarySet
}: FinanceDashboardProps) {
  return (
    <div className="min-h-screen bg-zinc-50/50 dark:bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-soft-light"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>

      <div className="relative p-6 md:p-10 space-y-10 pb-24 max-w-[1600px] mx-auto">
      
        {/* SEÇÃO 1: HEADER & GRÁFICOS */}
        <section className="space-y-6">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
              <div className="space-y-1">
                  <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    Financeiro <TrendingUp className="h-6 w-6 text-emerald-500" />
                  </h1>
                  <p className="text-zinc-500 text-lg">Visão consolidada do seu patrimônio.</p>
              </div>
              
              <div className="bg-white dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center gap-2">
                  <SyncButton accounts={accounts} />
                  <Link href="/finance/investments">
                      <Button variant="outline" size="sm" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-900/20">
                          <LineChart className="h-4 w-4" /> Investimentos
                      </Button>
                  </Link>
                  <BankConnector />
                  <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 mx-1 hidden sm:block"></div>
                  <TransactionDialog accounts={accounts} />
              </div>
          </div>

          <FinanceOverviewLoader 
              totalBalance={totalBalance} 
              netSalary={netSalary} 
              totalRecurring={totalRecurring} 
              hasSalarySet={hasSalarySet} 
          />
        </section>

        {/* SEÇÃO 2: CARTEIRAS */}
        <section className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
              <Wallet className="h-5 w-5 text-zinc-500" /> Carteiras & Contas
            </h3>
            {accounts.length > 0 ? (
               <AccountsListLoader accounts={accounts} />
            ) : (
               <EmptyState 
                 icon={Wallet}
                 title="Nenhuma conta conectada"
                 description="Adicione sua primeira conta bancária ou carteira manual para começar."
                 action={<Button variant="outline" size="sm">Criar Carteira</Button>} 
               />
            )}
        </section>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent"></div>

        {/* SEÇÃO 3: EXTRATO E FIXOS */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
            <div className="xl:col-span-2 space-y-4">
               <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-zinc-500" /> Últimas Transações
               </h3>
               {transactions.length > 0 ? (
                  <div className="h-[500px] rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm overflow-hidden">
                      <TransactionList transactions={transactions} />
                  </div>
               ) : (
                  <EmptyState icon={Receipt} title="Sem movimentações" description="Suas receitas e despesas aparecerão aqui." className="h-[300px]" />
               )}
            </div>

            <div className="space-y-4">
               <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-zinc-500" /> Custos Fixos
               </h3>
               {recurring.length > 0 ? (
                  <div className="h-[500px]">
                    <RecurringCard total={totalRecurring} items={recurring} />
                  </div>
               ) : (
                  <EmptyState icon={AlertCircle} title="Sem custos fixos" description="Adicione suas assinaturas e contas mensais." className="h-[300px]" />
               )}
            </div>
        </div>

        {/* SEÇÃO 4: METAS */}
        <section className="space-y-6 pt-8 border-t border-dashed border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                      <ShoppingBag className="h-6 w-6 text-purple-500"/> Lista de Desejos & Metas
                  </h3>
                  <p className="text-sm text-zinc-500">Planejamento de longo prazo e sonhos de consumo.</p>
                </div>
                <WishlistDialog />
            </div>

            {wishlist.length > 0 ? (
              <div className="w-full">
                <WishlistGridLoader items={wishlist} />
              </div>
            ) : (
              <EmptyState icon={PiggyBank} title="Sua lista está vazia" description="Adicione um item que você deseja comprar no futuro." />
            )}
        </section>
      </div>
    </div>
  );
}