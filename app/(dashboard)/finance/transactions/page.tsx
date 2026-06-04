import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionsView } from "@/components/finance/transactions-view";
import { getCurrentUserId } from "@/lib/auth";
import { ErrorState } from "@/components/ui/error-state";

// Tamanho da página da lista detalhada (o resumo e o gráfico continuam exatos,
// pois são agregados no banco sobre TODO o período filtrado).
const PAGE_SIZE = 50;

type SearchParams = {
  period?: string;
  type?: string;
  account?: string;
  q?: string;
  page?: string;
};

/** Início do período selecionado (null = "tudo", sem corte por data). */
function periodStartDate(period: string): Date | null {
  const now = new Date();
  switch (period) {
    case "6m":
      return subMonths(now, 6);
    case "24m":
      return subMonths(now, 24);
    case "all":
      return null;
    case "12m":
    default:
      return subMonths(now, 12);
  }
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const period = sp.period ?? "12m";
  const typeFilter =
    sp.type === "INCOME" || sp.type === "EXPENSE" ? sp.type : "ALL";
  const accountFilter = sp.account ?? "ALL";
  const search = (sp.q ?? "").trim();
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  let accountsData;
  let pageRows;
  let summaryByType;
  let chartRows;
  let totalCount = 0;
  let hasError = false;

  try {
    const userId = await getCurrentUserId();
    const periodStart = periodStartDate(period);
    const sixMonthsAgo = subMonths(new Date(), 6);

    // Filtro base (período + tipo + conta + busca), aplicado em TODAS as queries.
    const where: Prisma.TransactionWhereInput = {
      userId,
      deletedAt: null,
      ...(periodStart ? { date: { gte: periodStart } } : {}),
      ...(typeFilter !== "ALL" ? { type: typeFilter } : {}),
      ...(accountFilter !== "ALL" ? { accountId: accountFilter } : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search } },
              { category: { contains: search } },
            ],
          }
        : {}),
    };

    // Gráfico: só os últimos 6 meses (dentro dos demais filtros), colunas mínimas.
    const chartWhere: Prisma.TransactionWhereInput = {
      ...where,
      date: { gte: sixMonthsAgo },
    };

    const result = await Promise.all([
      prisma.account.findMany({
        where: { userId },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      // Página atual da lista detalhada (só PAGE_SIZE linhas saem do banco).
      prisma.transaction.findMany({
        where,
        orderBy: { date: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { account: { select: { name: true } } },
      }),
      // Resumo do período inteiro — agregado no banco (1 linha por tipo).
      prisma.transaction.groupBy({
        by: ["type"],
        where,
        _sum: { amount: true },
      }),
      prisma.transaction.count({ where }),
      // Dados do gráfico (6 meses, 3 colunas) — agregados em JS abaixo.
      prisma.transaction.findMany({
        where: chartWhere,
        select: { date: true, type: true, amount: true },
      }),
    ]);

    accountsData = result[0];
    pageRows = result[1];
    summaryByType = result[2];
    totalCount = result[3];
    chartRows = result[4];
  } catch (error) {
    console.error("Erro crítico ao carregar página de transações:", error);
    hasError = true;
  }

  if (hasError || !accountsData || !pageRows || !summaryByType || !chartRows) {
    return (
      <ErrorState
        title="Erro ao carregar dados"
        description="Não foi possível carregar o histórico de transações. Tente novamente em alguns instantes."
        retryHref="/finance/transactions"
        retryLabel="Tentar novamente"
      />
    );
  }

  // Resumo (Decimal -> number) — exato sobre todo o período filtrado.
  const income = Number(
    summaryByType.find((s) => s.type === "INCOME")?._sum.amount ?? 0
  );
  const expense = Number(
    summaryByType.find((s) => s.type === "EXPENSE")?._sum.amount ?? 0
  );
  const summary = { income, expense, balance: income - expense };

  // Gráfico mensal (últimos 6 meses). Datas são salvas em T12:00:00Z (convenção do
  // projeto), então o bucket por mês é estável em UTC no servidor.
  const monthsMap: Record<
    string,
    { month: string; income: number; expense: number; timestamp: number }
  > = {};
  for (const t of chartRows) {
    const d = new Date(t.date);
    const monthStr = format(d, "MMM/yy", { locale: ptBR }).replace(".", "");
    if (!monthsMap[monthStr]) {
      monthsMap[monthStr] = {
        month: monthStr,
        income: 0,
        expense: 0,
        timestamp: d.getTime(),
      };
    }
    const amt = Number(t.amount);
    if (t.type === "INCOME") monthsMap[monthStr].income += amt;
    else monthsMap[monthStr].expense += amt;
  }
  const monthlyStats = Object.values(monthsMap)
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-6);

  const accounts = accountsData.map((acc) => ({ id: acc.id, name: acc.name }));

  const transactions = pageRows.map((tx) => ({
    id: tx.id,
    description: tx.description,
    amount: Number(tx.amount),
    type: tx.type,
    category: tx.category,
    date: tx.date,
    accountId: tx.accountId,
    account: tx.account ? { name: tx.account.name } : undefined,
  }));

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <TransactionsView
      transactions={transactions}
      accounts={accounts}
      summary={summary}
      monthlyStats={monthlyStats}
      totalCount={totalCount}
      page={page}
      totalPages={totalPages}
      filters={{ period, type: typeFilter, account: accountFilter, q: search }}
    />
  );
}
