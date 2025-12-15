import { prisma } from "@/lib/prisma";
import { calculateNetSalary } from "@/lib/finance-utils";
import { Button } from "@/components/ui/button";
import { FinanceDashboardLoader } from "@/components/finance/finance-dashboard-loader";

export default async function FinancePage() {
  try {
      const [user, accountsData, transactionsData, wishlistData, recurringData] = await Promise.all([
        prisma.user.findFirst(),
        prisma.account.findMany({ orderBy: { balance: 'desc' } }),
        prisma.transaction.findMany({ 
            orderBy: { date: 'desc' }, 
            take: 50, 
            include: { account: true }
        }),
        prisma.wishlistItem.findMany({ orderBy: { priority: 'desc' } }),
        prisma.recurringExpense.findMany({ orderBy: { dayOfMonth: 'asc' } })
      ]);

      const accounts = accountsData.map(acc => ({ 
          ...acc, 
          balance: Number(acc.balance),
          isConnected: acc.isConnected ?? false
      }));
      
      const transactions = transactionsData.map(tx => ({ 
          ...tx, 
          amount: Number(tx.amount),
          account: tx.account ? { name: tx.account.name } : undefined,
          accountId: tx.accountId
      }));
      
      // ✅ CORREÇÃO AQUI: Mapeamento completo para wishlist
      const wishlist = wishlistData.map(item => ({ 
          ...item, 
          price: Number(item.price), 
          saved: Number(item.saved),
          image: item.imageUrl, // Mapeando imageUrl para image se necessário, ou vice-versa
          // imageUrl e productUrl já vêm no spread ...item se existirem no schema
      }));

      // ✅ CORREÇÃO AQUI: Mapeamento completo para recurring
      const recurring = recurringData.map(r => ({ 
          ...r, 
          amount: Number(r.amount),
          // category já vem no spread ...r se existir no schema. Se não, adicione um fallback:
          category: r.category || "Outros"
      }));

      const totalBalance = accounts.reduce((acc, item) => acc + item.balance, 0);
      const totalRecurring = recurring.reduce((acc, r) => acc + r.amount, 0);
      const SALARIO_BRUTO = (user && user?.salary) ? Number(user.salary) : 0;
      const { net: netSalary } = calculateNetSalary(SALARIO_BRUTO);

      return (
        <FinanceDashboardLoader 
          accounts={accounts}
          transactions={transactions}
          wishlist={wishlist}
          recurring={recurring}
          totalBalance={totalBalance}
          totalRecurring={totalRecurring}
          netSalary={netSalary}
          grossSalary={SALARIO_BRUTO}
          hasSalarySet={SALARIO_BRUTO > 0}
        />
      );

  } catch (error) {
      console.error("Erro crítico ao carregar página financeira:", error);
      return (
          <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-black p-6">
              <div className="text-center max-w-md p-8 bg-white dark:bg-zinc-900 rounded-2xl border border-red-100 dark:border-red-900/30 shadow-xl">
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Erro ao carregar dados</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 mb-6">Não foi possível conectar ao banco de dados.</p>
                  <form><Button formAction={async () => { "use server"; }}>Tentar Novamente</Button></form>
              </div>
          </div>
      );
  }
}