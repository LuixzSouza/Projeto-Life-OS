import { prisma } from "@/lib/prisma";
import { ShoppingBag, Wallet, AlertCircle, Receipt, PiggyBank, TrendingUp, LineChart } from "lucide-react";
import { AccountsList } from "@/components/finance/accounts-list";
import { WishlistGrid } from "@/components/finance/wishlist-card";
import { FinanceOverview } from "@/components/finance/finance-overview";
import { RecurringCard, TransactionList } from "@/components/finance/finance-ui";
import { TransactionDialog } from "@/components/finance/transaction-dialog"; 
import { WishlistDialog } from "@/components/finance/wishlist-dialog";       
import { BankConnector } from "@/components/finance/bank-connector";
import { SyncButton } from "@/components/finance/sync-button";
import { calculateNetSalary } from "@/lib/finance-utils"; // Importando do novo arquivo
import { EmptyState } from "@/components/ui/empty-state"; // Importando Empty State
import { Button } from "@/components/ui/button";
import Link from "next/link";

// Página Async Principal
export default async function FinancePage() {
  // 1. Busca de Dados Robusta (Try/Catch para prevenir quebra total)
  try {
      const [user, accountsData, transactionsData, wishlistData, recurringData] = await Promise.all([
        prisma.user.findFirst(), // Buscando usuário para pegar o salário real
        prisma.account.findMany({ orderBy: { balance: 'desc' } }), // Ordenar por saldo maior
        prisma.transaction.findMany({ orderBy: { date: 'desc' }, take: 50, include: { account: true } }),
        prisma.wishlistItem.findMany({ orderBy: { priority: 'desc' } }),
        prisma.recurringExpense.findMany({ orderBy: { dayOfMonth: 'asc' } }) // Ordenar por dia de vencimento
      ]);

      // 2. Tratamento de Dados Seguro
      const accounts = accountsData.map(acc => ({ 
          ...acc, 
          balance: Number(acc.balance),
          isConnected: acc.isConnected ?? false
      }));
      
      const transactions = transactionsData.map(tx => ({ 
          ...tx, 
          amount: Number(tx.amount),
          account: tx.account ? { name: tx.account.name } : undefined
      }));
      
      const wishlist = wishlistData.map(item => ({ ...item, price: Number(item.price), saved: Number(item.saved) }));
      const recurring = recurringData.map(r => ({ ...r, amount: Number(r.amount) }));

      // 3. Cálculos de Totais e Salário Real
      const totalBalance = accounts.reduce((acc, item) => acc + item.balance, 0);
      const totalRecurring = recurring.reduce((acc, r) => acc + r.amount, 0);
      
      // Usa o salário do banco de dados, ou 0 se não estiver definido
      const SALARIO_BRUTO = (user && user?.salary) ? Number(user.salary) : 0;
      const { net: netSalary } = calculateNetSalary(SALARIO_BRUTO);

      // --- RENDERIZAÇÃO DA UI ---
      return (
        <div className="min-h-screen bg-zinc-50/50 dark:bg-black relative overflow-hidden">
          {/* Textura de Fundo Sutil para visual Premium */}
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none mix-blend-soft-light"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/5 via-transparent to-emerald-500/5 pointer-events-none"></div>

          <div className="relative p-6 md:p-10 space-y-10 pb-24 max-w-[1600px] mx-auto">
          
            {/* SEÇÃO 1: HEADER & ACTIONS TOOLBAR */}
            <section className="space-y-6">
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6">
                      <div className="space-y-1">
                          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                            Financeiro <TrendingUp className="h-6 w-6 text-emerald-500" />
                          </h1>
                          <p className="text-zinc-500 text-lg">Visão consolidada do seu patrimônio.</p>
                      </div>
                      
                      {/* TOOLBAR UNIFICADA */}
                      <div className="bg-white dark:bg-zinc-900 p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-wrap items-center gap-2">
                          <SyncButton accounts={accounts} />
                          
                          {/* NOVO BOTÃO: CENTRAL DE INVESTIMENTOS */}
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

                <FinanceOverview 
                    totalBalance={totalBalance} 
                    netSalary={netSalary} 
                    totalRecurring={totalRecurring} 
                    hasSalarySet={SALARIO_BRUTO > 0} // Passa flag para avisar se não tiver salário configurado
                />
            </section>

            {/* SEÇÃO 2: CARTEIRAS (Com Empty State) */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-zinc-500" /> Carteiras & Contas
                </h3>
                
                {accounts.length > 0 ? (
                   <AccountsList accounts={accounts} />
                ) : (
                   <EmptyState 
                     icon={Wallet}
                     title="Nenhuma conta conectada"
                     description="Adicione sua primeira conta bancária ou carteira manual para começar."
                     // Aqui você poderia colocar o botão que abre o dialog de criar conta
                     action={<Button variant="outline" size="sm">Criar Carteira</Button>} 
                   />
                )}
            </section>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent"></div>

            {/* SEÇÃO 3: EXTRATO E FIXOS (Com Empty States) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                {/* Extrato */}
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

                {/* Custos Fixos */}
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

            {/* SEÇÃO 4: METAS (Com Empty State) */}
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
                    <WishlistGrid items={wishlist} />
                  </div>
                ) : (
                  <EmptyState icon={PiggyBank} title="Sua lista está vazia" description="Adicione um item que você deseja comprar no futuro." />
                )}
            </section>
          </div>
        </div>
      );

  } catch (error) {
      // --- UI DE ERRO (Fallback Seguro) ---
      console.error("Erro crítico ao carregar página financeira:", error);
      return (
          <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-6">
              <div className="text-center max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-xl">
                  <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full w-fit mx-auto mb-4">
                      <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Erro ao carregar dados</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mb-6">
                      Não foi possível conectar ao seu banco de dados financeiro. Por favor, tente recarregar a página.
                  </p>
                  <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
              </div>
          </div>
      );
  }
}