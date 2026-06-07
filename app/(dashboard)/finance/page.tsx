import { prisma } from "@/lib/prisma";
import { calculateNetSalary } from "@/lib/finance-utils";
import { monthlyEquivalent, asFrequency, hasEnded, currentDueOccurrence } from "@/lib/recurrence";
import { syncRecurringChargeInvoices } from "@/lib/notifications";
import { FinanceDashboardLoader } from "@/components/finance/finance-dashboard-loader";
import { getCurrentUserId } from "@/lib/auth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ErrorState } from "@/components/ui/error-state";

export default async function FinancePage() {
  try {
    const userId = await getCurrentUserId();

    // Materializa as faturas das cobranças do mês (idempotente) para o progresso ficar atual.
    if (userId) await syncRecurringChargeInvoices(userId).catch(() => {});

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
      recurringChargesData,
      clientsData,
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
        // active: true alinha com cobranças/agenda/notificações — um custo fixo
        // pausado some de todas as telas e dos totais, sem divergir entre elas.
        where: { userId, active: true },
        orderBy: { dayOfMonth: "asc" },
      }),
      userId
        ? prisma.recurringCharge.findMany({
            where: { userId, active: true },
            orderBy: { dayOfMonth: "asc" },
          })
        : [],
      // Clientes (Negócios) para o seletor das cobranças recorrentes
      prisma.client.findMany({
        where: { userId, deletedAt: null },
        select: { id: true, name: true, company: true },
        orderBy: { name: "asc" },
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

    // Pagamentos de custos fixos já lançados (para marcar a ocorrência atual como paga).
    const recurringPaymentsData = userId
      ? await prisma.recurringExpensePayment.findMany({
          where: { userId },
          select: { recurringExpenseId: true, dueDate: true },
        })
      : [];
    const paidSet = new Set(
      recurringPaymentsData.map((p) => `${p.recurringExpenseId}:${p.dueDate.toISOString().slice(0, 10)}`),
    );

    const recurring = recurringData.map((r) => {
      const due = currentDueOccurrence({
        dayOfMonth: r.dayOfMonth, frequency: r.frequency, startDate: r.startDate, createdAt: r.createdAt, endDate: r.endDate,
      });
      const currentDueDate = due ? due.toISOString().slice(0, 10) : null;
      return {
        id: r.id,
        title: r.title,
        amount: Number(r.amount),
        category: r.category || "Outros",
        dayOfMonth: r.dayOfMonth,
        frequency: r.frequency,
        startDate: r.startDate ? r.startDate.toISOString() : null,
        endDate: r.endDate ? r.endDate.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        installments: r.installments ?? null,
        paidInstallments: r.paidInstallments,
        currentDueDate,
        currentPaid: currentDueDate ? paidSet.has(`${r.id}:${currentDueDate}`) : false,
      };
    });

    // Progresso real das cobranças com contrato: nº de faturas pagas por contrato (Negócios).
    const chargeBillingIds = recurringChargesData
      .map((c) => c.billingId)
      .filter((x): x is string => !!x);
    const paidByBilling = new Map<string, number>();
    if (userId && chargeBillingIds.length > 0) {
      const paidGroups = await prisma.invoice.groupBy({
        by: ["billingId"],
        where: { userId, billingId: { in: chargeBillingIds }, status: "PAID" },
        _count: true,
      });
      for (const g of paidGroups) {
        if (g.billingId) paidByBilling.set(g.billingId, g._count);
      }
    }

    const recurringCharges = recurringChargesData.map((c) => ({
      id: c.id,
      title: c.title,
      amount: Number(c.amount),
      category: c.category || "Cobrança",
      dayOfMonth: c.dayOfMonth,
      clientId: c.clientId ?? null,
      clientName: c.clientName ?? null,
      frequency: c.frequency,
      startDate: c.startDate ? c.startDate.toISOString() : null,
      endDate: c.endDate ? c.endDate.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
      installments: c.installments ?? null,
      paidInstallments: c.paidInstallments,
      paidCount: c.billingId ? (paidByBilling.get(c.billingId) ?? 0) : 0,
    }));

    const clients = clientsData.map((c) => ({
      id: c.id,
      name: c.name,
      company: c.company ?? null,
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
    // Totais normalizados para "por mês" (um plano anual conta como 1/12, semanal ×4.33, etc.).
    // Itens já encerrados (endDate no passado / parcelamento quitado) não entram no recorrente atual.
    const totalRecurring = recurring.reduce((acc, r) => acc + (hasEnded(r.endDate) ? 0 : monthlyEquivalent(r.amount, asFrequency(r.frequency))), 0);
    const totalCharges = recurringCharges.reduce((acc, c) => acc + (hasEnded(c.endDate) ? 0 : monthlyEquivalent(c.amount, asFrequency(c.frequency))), 0);

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
        recurringCharges={recurringCharges}
        clients={clients}
        totalBalance={totalBalance}
        totalRecurring={totalRecurring}
        totalCharges={totalCharges}
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
