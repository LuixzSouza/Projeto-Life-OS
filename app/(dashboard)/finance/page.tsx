import { prisma } from "@/lib/prisma";
import { Plus, ShoppingBag } from "lucide-react"; // Importar ícones usados no texto
import { AccountsList } from "@/components/finance/accounts-list";
import { WishlistGrid } from "@/components/finance/wishlist-card";
import { FinanceOverview } from "@/components/finance/finance-overview";
import { RecurringCard, TransactionList } from "@/components/finance/finance-ui";

import { TransactionDialog } from "@/components/finance/transaction-dialog"; // <--- Novo
import { WishlistDialog } from "@/components/finance/wishlist-dialog";       // <--- Novo

// Função Auxiliar de INSS (Simplificada 2024)
const calculateNetSalary = (gross: number) => {
    let inss = 0;
    if (gross <= 1412) inss = gross * 0.075;
    else if (gross <= 2666.68) inss = gross * 0.09;
    else if (gross <= 4000.03) inss = gross * 0.12;
    else inss = gross * 0.14; 
    
    const fgts = gross * 0.08;
    const net = gross - inss; 
    
    return { net, inss, fgts };
}

export default async function FinancePage() {
  // 1. Busca Paralela de Dados (Performance)
  const [accountsData, transactionsData, wishlistData, recurringData] = await Promise.all([
    prisma.account.findMany(),
    prisma.transaction.findMany({ orderBy: { date: 'desc' }, take: 50, include: { account: true } }),
    prisma.wishlistItem.findMany({ orderBy: { priority: 'desc' } }),
    prisma.recurringExpense.findMany()
  ]);

  // 2. Tratamento de Dados (Decimal -> Number para o Frontend)
  const accounts = accountsData.map(acc => ({ ...acc, balance: Number(acc.balance) }));
  
  const transactions = transactionsData.map(tx => ({ 
      ...tx, 
      amount: Number(tx.amount),
      // Mapeamos a conta dentro da transação para garantir compatibilidade
      account: tx.account ? { name: tx.account.name } : undefined
  }));
  
  const wishlist = wishlistData.map(item => ({ ...item, price: Number(item.price), saved: Number(item.saved) }));
  const recurring = recurringData.map(r => ({ ...r, amount: Number(r.amount) }));

  // 3. Cálculos de Totais
  const totalBalance = accounts.reduce((acc, item) => acc + item.balance, 0);
  const totalRecurring = recurring.reduce((acc, r) => acc + r.amount, 0);
  
  // Salário (Pode vir de Settings no futuro)
  const SALARIO_BRUTO = 5000; 
  const { net, inss, fgts } = calculateNetSalary(SALARIO_BRUTO);

  return (
    <div className="min-h-screen bg-gray-50/30 dark:bg-black p-6 md:p-10 space-y-12 pb-20">
      
      {/* SEÇÃO 1: HEADER & OVERVIEW */}
      <section className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                  <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Financeiro</h1>
                  <p className="text-zinc-500">Gestão inteligente de patrimônio.</p>
              </div>
              
              {/* Modal de Nova Transação (Client Component) */}
              <TransactionDialog accounts={accounts} />
          </div>

          <FinanceOverview 
              totalBalance={totalBalance} 
              netSalary={net} 
              totalRecurring={totalRecurring} 
          />
      </section>

      {/* SEÇÃO 2: CARTEIRAS (Adicionar/Remover Contas) */}
      <section>
          <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">Carteiras & Contas</h3>
          </div>
          <AccountsList accounts={accounts} />
      </section>

      {/* SEÇÃO 3: EXTRATO E CUSTOS FIXOS */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Extrato com Filtros */}
          <div className="xl:col-span-2 h-[500px]">
               <TransactionList transactions={transactions} />
          </div>
          {/* Assinaturas e Fixos */}
          <div className="h-[500px]">
               <RecurringCard total={totalRecurring} items={recurring} />
          </div>
      </div>

      {/* SEÇÃO 4: METAS DE COMPRA */}
      <section className="space-y-6 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold flex items-center gap-2 text-zinc-800 dark:text-zinc-200">
                    <ShoppingBag className="h-6 w-6 text-purple-500"/> Lista de Desejos & Metas
                </h3>
                <p className="text-sm text-zinc-500">Planejamento de longo prazo e sonhos.</p>
              </div>
              
              {/* Modal de Nova Meta (Client Component) */}
              <WishlistDialog />
          </div>

          <div className="w-full">
            <WishlistGrid items={wishlist} />
          </div>
      </section>

    </div>
  );
}