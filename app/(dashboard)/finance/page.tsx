import { prisma } from "@/lib/prisma";
import { calculateNetSalary } from "@/lib/finance-utils";
import { FinanceDashboardLoader } from "@/components/finance/finance-dashboard-loader";
import { getCurrentUserId } from "@/lib/auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ErrorState } from "@/components/ui/error-state";

export default async function FinancePage() {
  try {
    const userId = await getCurrentUserId();

    // Janela dos últimos 12 meses (o cliente decide quantos exibir: 3/6/12)
    const now = new Date();
    const FLOW_MONTHS = 12;
    const flowWindowStart = new Date(now.getFullYear(), now.getMonth() - (FLOW_MONTHS - 1), 1);

    const [
      user,
      accountsData,
      transactionsData,
      wishlistData,
      recurringData,
      flowTransactions,
    ] = await Promise.all([
      userId ? prisma.user.findUnique({ where: { id: userId } }) : null,
      prisma.account.findMany({ where: { userId }, orderBy: { balance: "desc" } }),
      prisma.transaction.findMany({
        where: { userId, deletedAt: null },
        orderBy: { date: "desc" },
        take: 50,
        include: { account: true },
      }),
      prisma.wishlistItem.findMany({ where: { userId, deletedAt: null }, orderBy: { priority: "desc" } }),
      prisma.recurringExpense.findMany({
        where: { userId },
        orderBy: { dayOfMonth: "asc" },
      }),
      // Transações da janela de 6 meses só para o gráfico de fluxo de caixa
      prisma.transaction.findMany({
        where: { userId, deletedAt: null, date: { gte: flowWindowStart } },
        select: { amount: true, type: true, date: true },
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
      account: tx.account ? { name: tx.account.name } : undefined,
    }));

    const wishlist = wishlistData.map((item) => ({
      ...item,
      price: Number(item.price),
      saved: Number(item.saved),
      image: item.imageUrl ?? null,
    }));

    const recurring = recurringData.map((r) => ({
      ...r,
      amount: Number(r.amount),
      category: r.category || "Outros",
    }));

    /* ---------------------------------------------------------------------- */
    /* FLUXO DE CAIXA MENSAL (últimos 6 meses)                                */
    /* ---------------------------------------------------------------------- */

    // Inicializa os 12 buckets (mais antigo -> atual) preservando a ordem
    const buckets = Array.from({ length: FLOW_MONTHS }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (FLOW_MONTHS - 1) + i, 1);
      const label = format(d, "LLL", { locale: ptBR }).replace(".", ""); // "jan", "fev"...
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: label.charAt(0).toUpperCase() + label.slice(1), // "Jan", "Fev"...
        income: 0,
        expense: 0,
      };
    });
    const bucketByKey = new Map(buckets.map((b) => [b.key, b]));

    for (const tx of flowTransactions) {
      const d = new Date(tx.date);
      const bucket = bucketByKey.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (!bucket) continue;
      const amount = Number(tx.amount);
      if (tx.type === "INCOME") bucket.income += amount;
      else bucket.expense += amount;
    }

    const monthlyFlow = buckets.map(({ month, income, expense }) => ({ month, income, expense }));

    // Mês atual = último bucket
    const current = buckets[buckets.length - 1];
    const monthIncome = current.income;
    const monthExpense = current.expense;

    /* ---------------------------------------------------------------------- */
    /* CÁLCULOS                                                               */
    /* ---------------------------------------------------------------------- */

    const totalBalance = accounts.reduce((acc, item) => acc + item.balance, 0);
    const totalRecurring = recurring.reduce((acc, r) => acc + r.amount, 0);

    const SALARIO_BRUTO = user?.salary ? Number(user.salary) : 0;
    const { net: netSalary } = calculateNetSalary(SALARIO_BRUTO);

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
        monthlyFlow={monthlyFlow}
        monthIncome={monthIncome}
        monthExpense={monthExpense}
      />
    );
  } catch (error) {
    console.error("Erro crítico ao carregar página financeira:", error);

    return (
      <ErrorState
        title="Erro ao carregar dados"
        description="Não foi possível conectar ao banco de dados. Tente novamente em alguns instantes."
        retryHref="/finance"
        retryLabel="Tentar novamente"
      />
    );
  }
}
