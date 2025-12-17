import { prisma } from "@/lib/prisma";
import { calculateNetSalary } from "@/lib/finance-utils";
import { Button } from "@/components/ui/button";
import { FinanceDashboardLoader } from "@/components/finance/finance-dashboard-loader";

export default async function FinancePage() {
  try {
    const [
      user,
      accountsData,
      transactionsData,
      wishlistData,
      recurringData,
    ] = await Promise.all([
      prisma.user.findFirst(),
      prisma.account.findMany({ orderBy: { balance: "desc" } }),
      prisma.transaction.findMany({
        orderBy: { date: "desc" },
        take: 50,
        include: { account: true },
      }),
      prisma.wishlistItem.findMany({ orderBy: { priority: "desc" } }),
      prisma.recurringExpense.findMany({
        orderBy: { dayOfMonth: "asc" },
      }),
    ]);

    /* ---------------------------------------------------------------------- */
    /* NORMALIZAÇÃO DOS DADOS                                                  */
    /* ---------------------------------------------------------------------- */

    const accounts = accountsData.map((acc) => ({
      ...acc,
      balance: Number(acc.balance),
      isConnected: acc.isConnected ?? false,
    }));

    const transactions = transactionsData.map((tx) => ({
      ...tx,
      amount: Number(tx.amount),
      accountId: tx.accountId,
      account: tx.account
        ? { name: tx.account.name }
        : undefined,
    }));

    const wishlist = wishlistData.map((item) => ({
      ...item,
      price: Number(item.price),
      saved: Number(item.saved),
      image: item.imageUrl ?? null, // explícito e seguro
    }));

    const recurring = recurringData.map((r) => ({
      ...r,
      amount: Number(r.amount),
      category: r.category || "Outros",
    }));

    /* ---------------------------------------------------------------------- */
    /* CÁLCULOS                                                               */
    /* ---------------------------------------------------------------------- */

    const totalBalance = accounts.reduce(
      (acc, item) => acc + item.balance,
      0
    );

    const totalRecurring = recurring.reduce(
      (acc, r) => acc + r.amount,
      0
    );

    const SALARIO_BRUTO =
      user?.salary ? Number(user.salary) : 0;

    const { net: netSalary } =
      calculateNetSalary(SALARIO_BRUTO);

    /* ---------------------------------------------------------------------- */
    /* RENDER                                                                 */
    /* ---------------------------------------------------------------------- */

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
    console.error(
      "Erro crítico ao carregar página financeira:",
      error
    );

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">
            Erro ao carregar dados
          </h2>

          <p className="text-sm text-muted-foreground">
            Não foi possível conectar ao banco de dados.
            Tente novamente em alguns instantes.
          </p>

          <Button
            onClick={() => {
              // força reload da rota
              window.location.reload();
            }}
            className="w-full"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }
}
