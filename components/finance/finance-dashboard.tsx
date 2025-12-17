"use client";

import { ShoppingBag, Wallet, Receipt, AlertCircle, TrendingUp, Plus, BarChart3 } from "lucide-react";
import { RecurringCard, TransactionList } from "@/components/finance/finance-ui";
import { TransactionDialog } from "@/components/finance/transaction-dialog"; 
import { WishlistDialog } from "@/components/finance/wishlist/wishlist-dialog";       
import { AccountDialog } from "@/components/finance/account/account-dialog"; // ✅ Importando AccountDialog
import { RecurringDialog } from "@/components/finance/recurring-dialog"; // ✅ Importando RecurringDialog
import { BankConnector } from "@/components/finance/bank-connector";
import { SyncButton } from "@/components/finance/sync-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react"; // Necessário para controlar estados locais se precisar

// Componentes Filhos
import { FinanceOverview } from "@/components/finance/finance-overview";
import { AccountsList } from "@/components/finance/account/accounts-list";
import { WishlistGridLoader } from "@/components/finance/wishlist/wishlist-grid-loader";

// Tipos... (Mantive igual para economizar espaço, mas use os mesmos do arquivo anterior)
export interface DashboardAccount { id: string; name: string; balance: number; color: string | null; type: string; isConnected: boolean; provider?: string | null; }
export interface DashboardTransaction { id: string; description: string; amount: number; date: Date; type: string; category: string; account?: { name: string }; accountId: string;}
export interface DashboardWishlist { id: string; name: string; price: number; saved: number; priority: string; image: string | null; imageUrl?: string | null; productUrl?: string | null; currentAmount?: number; }
export interface DashboardRecurring { id: string; title: string; amount: number; category: string; dayOfMonth: number; }

interface FinanceDashboardProps {
  accounts: DashboardAccount[];
  transactions: DashboardTransaction[];
  wishlist: DashboardWishlist[];
  recurring: DashboardRecurring[];
  totalBalance: number;
  totalRecurring: number;
  netSalary: number;
  grossSalary: number;
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
  grossSalary,
  hasSalarySet
}: FinanceDashboardProps) {
  
  // Estados para controlar diálogos do EmptyState se necessário, 
  // mas vamos tentar usar o Trigger direto primeiro.
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  return (
    <div className="min-h-screen bg-muted/20 relative overflow-hidden animate-in fade-in duration-500">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent pointer-events-none -z-10" />

      <div className="relative mx-auto">
      
        
        {/* SEÇÃO 1: HEADER & KPI */}
        <section className="space-y-8">
          <div className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                    Gestão Financeira <TrendingUp className="h-6 w-6 text-primary" />
                  </h1>
                  <p className="text-muted-foreground text-lg mt-1">Visão consolidada do seu patrimônio e fluxo de caixa.</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 bg-card p-1.5 rounded-xl border border-border shadow-sm">
                  <SyncButton accounts={accounts} />
                  <BankConnector />
                  <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
                    <Link href="/finance/investments">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-lg border-dashed hover:border-primary/60 hover:bg-primary/5 transition"
                      >
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="hidden sm:inline">Investimentos</span>
                      </Button>
                    </Link>
                    <Link href="/finance/market">
                      <Button variant="outline" size="sm" className="gap-2 rounded-lg border-dashed hover:border-primary/60 hover:bg-primary/5 transition">
                          <BarChart3 className="h-4 w-4 text-primary" />
                          <span className="hidden sm:inline">Bolsa & Mercado</span>
                      </Button>
                  </Link>
                  <TransactionDialog accounts={accounts} />
              </div>
          </div>

          <FinanceOverview 
              totalBalance={totalBalance} 
              netSalary={netSalary} 
              grossSalary={grossSalary} 
              totalRecurring={totalRecurring} 
              hasSalarySet={hasSalarySet} 
          />
        </section>

        {/* SEÇÃO 2: CARTEIRAS */}
        <section className="space-y-4 px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-muted-foreground" /> Minhas Contas
                </h3>
                {accounts.length > 0 && (
                    <span className="text-xs text-muted-foreground hidden sm:block">Deslize para ver mais →</span>
                )}
            </div>
            
            {accounts.length > 0 ? (
               <AccountsList accounts={accounts} />
            ) : (
               <EmptyState 
                 icon={Wallet}
                 title="Nenhuma conta conectada"
                 description="Adicione sua primeira conta bancária ou carteira manual para começar."
                 action={
                    /* ✅ Correção: Usando o AccountDialog com estado controlado ou trigger direto */
                    <AccountDialog 
                        open={isAccountOpen} 
                        onOpenChange={setIsAccountOpen} 
                        trigger={
                            <Button variant="outline" size="sm" onClick={() => setIsAccountOpen(true)}>
                                Criar Carteira
                            </Button>
                        }
                    />
                 } 
               />
            )}
        </section>

        <div className="h-px w-full bg-border " />

        {/* SEÇÃO 3: DASHBOARD PRINCIPAL */}
        <section className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
              
              {/* Extrato */}
              <div className="xl:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-muted-foreground" /> Histórico Recente
                    </h3>
                    <Link href="/finance/transactions">
                          <Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground">Ver tudo</Button>
                    </Link>
                </div>
                
                {transactions.length > 0 ? (
                    <div className="min-h-[500px] rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
                        <TransactionList transactions={transactions} />
                    </div>
                ) : (
                    <EmptyState icon={Receipt} title="Sem movimentações" description="Suas receitas e despesas aparecerão aqui." className="h-[400px]" />
                )}
              </div>

              {/* Custos Fixos */}
              <div className="space-y-4 sticky top-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-muted-foreground" /> Custos Fixos
                    </h3>
                    {/* ✅ Botão de Adicionar Recorrente no Header */}
                    <RecurringDialog />
                </div>

                {recurring.length > 0 ? (
                    <RecurringCard total={totalRecurring} items={recurring} />
                ) : (
                    <EmptyState 
                      icon={AlertCircle} 
                      title="Sem custos fixos" 
                      description="Adicione assinaturas e contas mensais." 
                      className="h-[300px]"
                      action={
                          /* ✅ Botão de Adicionar Recorrente no Empty State */
                          <RecurringDialog 
                              trigger={
                                  <Button variant="outline" size="sm">
                                      Adicionar Fixo
                                  </Button>
                              }
                          />
                      }
                    />
                )}
              </div>
          </div>
        </section>

        {/* SEÇÃO 4: WISHLIST */}
        <section className="space-y-6 pt-10 border-t border-dashed border-border px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold flex items-center gap-2 text-foreground">
                      <ShoppingBag className="h-6 w-6 text-primary"/> Lista de Desejos
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">Planejamento de compras e metas financeiras.</p>
                </div>
                <WishlistDialog />
            </div>

            {wishlist.length > 0 ? (
              <WishlistGridLoader items={wishlist} />
            ) : (
              <EmptyState 
                icon={ShoppingBag} 
                title="Sua lista está vazia" 
                description="Adicione um item que você deseja comprar no futuro para acompanhar o progresso."
                action={
                    /* ✅ Correção: Passando o trigger corretamente */
                    <WishlistDialog 
                        trigger={
                            <Button variant="outline" className="gap-2">
                                <Plus className="h-4 w-4"/> Adicionar Meta
                            </Button>
                        } 
                    />
                }
              />
            )}
        </section>
      </div>
    </div>
  );
}