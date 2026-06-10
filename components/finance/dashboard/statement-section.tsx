"use client";

import Link from "next/link";
import { Receipt, AlertCircle, Plus, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RecurringCard, TransactionList } from "@/components/finance/finance-ui";
import { RecurringDialog } from "@/components/finance/recurring-dialog";
import type { DashboardTransaction, DashboardRecurring, DashboardAccount } from "./types";

interface StatementSectionProps {
  transactions: DashboardTransaction[];
  recurring: DashboardRecurring[];
  totalRecurring: number;
  accounts: DashboardAccount[];
}

export function StatementSection({ transactions, recurring, totalRecurring, accounts }: StatementSectionProps) {
  return (
    <section id="extrato" className="scroll-mt-36">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">

        {/* EXTRATO DE TRANSAÇÕES */}
        <div className="xl:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-foreground flex items-center gap-3">
              <div className="p-2 bg-foreground/5 rounded-xl"><Receipt className="h-5 w-5 text-primary" /></div>
              Histórico Recente
            </h3>
            <Link href="/finance/transactions">
              <Button variant="ghost" size="sm" className="h-9 px-4 rounded-xl gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 font-bold group transition-all">
                Ver tudo <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>

          {transactions.length > 0 ? (
            <div className="h-[500px] rounded-[2rem] border border-border/40 bg-card shadow-sm overflow-hidden flex flex-col">
              <TransactionList transactions={transactions} accounts={accounts} />
            </div>
          ) : (
            <div className="h-[500px] rounded-[2rem] border border-dashed border-border/60 bg-muted/10 flex flex-col transition-colors hover:bg-muted/20">
              <EmptyState
                icon={Receipt}
                title="Sem movimentações"
                description="Suas receitas e despesas registradas aparecerão aqui."
                className="m-auto border-none shadow-none bg-transparent"
              />
            </div>
          )}
        </div>

        {/* CUSTOS FIXOS */}
        <div className="space-y-5 sticky top-28">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-foreground flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-xl"><AlertCircle className="h-5 w-5 text-orange-500" /></div>
              Custos Fixos
            </h3>
            <RecurringDialog trigger={
              <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all active:scale-95 border-border/50 shadow-sm">
                <Plus className="h-5 w-5" />
              </Button>
            } />
          </div>

          {recurring.length > 0 ? (
            <RecurringCard total={totalRecurring} items={recurring} accounts={accounts} />
          ) : (
            <div className="h-[500px] rounded-[2rem] border border-dashed border-border/60 bg-muted/10 flex flex-col transition-colors hover:bg-muted/20">
              <EmptyState
                icon={AlertCircle}
                title="Sem custos fixos"
                description="Adicione assinaturas e contas mensais para prever seus gastos."
                className="m-auto border-none shadow-none bg-transparent"
                action={
                  <RecurringDialog
                    trigger={
                      <Button variant="outline" className="rounded-xl h-11 px-6 font-bold shadow-sm transition-all active:scale-95 bg-background">
                        Adicionar Fixo
                      </Button>
                    }
                  />
                }
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
