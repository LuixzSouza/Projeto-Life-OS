"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ShoppingBag, Wallet, Receipt, AlertCircle, TrendingUp, 
  Plus, BarChart3, ChevronRight 
} from "lucide-react";

// Componentes UI e Filhos
import { RecurringCard, TransactionList } from "@/components/finance/finance-ui";
import { TransactionDialog } from "@/components/finance/transaction-dialog"; 
import { WishlistDialog } from "@/components/finance/wishlist/wishlist-dialog";       
import { AccountDialog } from "@/components/finance/account/account-dialog";
import { RecurringDialog } from "@/components/finance/recurring-dialog";
import { BankConnector, SyncButton } from "@/components/finance/bank-connector";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FinanceOverview } from "@/components/finance/finance-overview";
import { AccountsList } from "@/components/finance/account/accounts-list";
import { WishlistGridLoader } from "@/components/finance/wishlist/wishlist-grid-loader";
import { cn } from "@/lib/utils";

// Tipagens
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
  
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden animate-in fade-in duration-700 pb-24">
      
      {/* Background Glows (Premium Feel) */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-1/4 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none -z-10" />

      <div className="relative mx-auto">
        
        {/* =========================================
            SEÇÃO 1: HEADER & KPI 
            ========================================= */}
        <section className="space-y-8">
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

          <div className="px-6 md:px-8 max-w-[1600px] mx-auto pt-4">
              <FinanceOverview 
                  totalBalance={totalBalance} 
                  netSalary={netSalary} 
                  grossSalary={grossSalary} 
                  totalRecurring={totalRecurring} 
                  hasSalarySet={hasSalarySet} 
              />
          </div>
        </section>

        {/* =========================================
            SEÇÃO 2: CARTEIRAS 
            ========================================= */}
        <section className="px-6 md:px-8 py-10 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-extrabold text-foreground flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-xl"><Wallet className="h-5 w-5 text-primary" /></div>
                  Minhas Contas
                </h3>
                {accounts.length > 0 && (
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground hidden sm:block bg-muted/50 px-3 py-1.5 rounded-full border border-border/50">
                        Deslize para ver mais →
                    </span>
                )}
            </div>
            
            {accounts.length > 0 ? (
               <AccountsList accounts={accounts} />
            ) : (
               <div className="rounded-[2rem] border border-dashed border-border/60 bg-muted/10 transition-colors hover:bg-muted/20">
                   <EmptyState 
                     icon={Wallet}
                     title="Nenhuma conta conectada"
                     description="Adicione sua primeira conta bancária ou carteira manual para começar a organizar seu dinheiro."
                     action={
                        <AccountDialog 
                            open={isAccountOpen} 
                            onOpenChange={setIsAccountOpen} 
                            trigger={
                                <Button className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20 transition-all active:scale-95" onClick={() => setIsAccountOpen(true)}>
                                    <Plus className="h-4 w-4 mr-2" /> Criar Carteira
                                </Button>
                            }
                        />
                     } 
                   />
               </div>
            )}
        </section>

        <div className="h-px w-full bg-border/50" />

        {/* =========================================
            SEÇÃO 3: DASHBOARD PRINCIPAL (Extrato & Fixos)
            ========================================= */}
        <section className="px-6 md:px-8 py-10 max-w-[1600px] mx-auto">
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
                        <TransactionList transactions={transactions} />
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
                    <RecurringCard total={totalRecurring} items={recurring} />
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

        <div className="h-px w-full bg-border/50" />

        {/* =========================================
            SEÇÃO 4: WISHLIST 
            ========================================= */}
        <section className="px-6 md:px-8 py-10 max-w-[1600px] mx-auto space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-2xl shadow-sm">
                      <ShoppingBag className="h-6 w-6 text-primary"/>
                  </div>
                  <div>
                      <h3 className="text-2xl font-extrabold text-foreground">Lista de Desejos</h3>
                      <p className="text-sm text-muted-foreground mt-0.5 font-medium">Planejamento de compras e metas financeiras.</p>
                  </div>
                </div>
                <WishlistDialog trigger={
                    <Button size="lg" className="rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95 px-8">
                        <Plus className="h-5 w-5 mr-2"/> Nova Meta
                    </Button>
                }/>
            </div>

            {wishlist.length > 0 ? (
              <div className="pt-4">
                  <WishlistGridLoader items={wishlist} />
              </div>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-border/60 bg-muted/10 mt-6 transition-colors hover:bg-muted/20">
                  <EmptyState 
                    icon={ShoppingBag} 
                    title="Sua lista está vazia" 
                    description="Adicione um item que você deseja comprar no futuro para acompanhar o progresso financeiro."
                    action={
                        <WishlistDialog 
                            trigger={
                                <Button variant="default" className="rounded-xl h-11 px-8 font-bold shadow-lg shadow-primary/20 mt-2 transition-all active:scale-95">
                                    <Plus className="h-4 w-4 mr-2"/> Criar Meta
                                </Button>
                            } 
                        />
                    }
                  />
              </div>
            )}
        </section>
      </div>
    </div>
  );
}