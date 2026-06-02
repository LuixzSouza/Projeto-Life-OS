import { prisma } from "@/lib/prisma";
import { TransactionsView } from "@/components/finance/transactions-view";
import { getCurrentUserId } from "@/lib/auth";
import { ErrorState } from "@/components/ui/error-state";

export default async function TransactionsPage() {
  let accountsData;
  let transactionsData;
  let hasError = false;

  // 1. O TRY/CATCH FICA APENAS COM A LÓGICA DO BANCO DE DADOS
  try {
    const userId = await getCurrentUserId();
    const result = await Promise.all([
      prisma.account.findMany({
        where: { userId },
        orderBy: { name: "asc" }
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: "desc" },
        include: { account: true },
      }),
    ]);
    
    accountsData = result[0];
    transactionsData = result[1];

  } catch (error) {
    console.error("Erro crítico ao carregar página de transações:", error);
    hasError = true; // Sinalizamos o erro, mas não retornamos JSX aqui!
  }

  // 2. RENDERIZAÇÃO DE ERRO (FORA DO TRY/CATCH)
  if (hasError || !accountsData || !transactionsData) {
    return (
      <ErrorState
        title="Erro ao carregar dados"
        description="Não foi possível carregar o histórico de transações. Tente novamente em alguns instantes."
        retryHref="/finance/transactions"
        retryLabel="Tentar novamente"
      />
    );
  }

  // 3. NORMALIZAÇÃO DOS DADOS (Ocorrerá apenas se não houver erro)
  const accounts = accountsData.map((acc) => ({
    id: acc.id,
    name: acc.name,
  }));

  const transactions = transactionsData.map((tx) => ({
    id: tx.id,
    description: tx.description,
    amount: Number(tx.amount), // Conversão Segura de Decimal para Number
    type: tx.type,
    category: tx.category,
    date: tx.date,
    accountId: tx.accountId,
    account: tx.account ? { name: tx.account.name } : undefined,
  }));

  // 4. RENDERIZAÇÃO DE SUCESSO (FORA DO TRY/CATCH)
  return (
    <TransactionsView 
      transactions={transactions} 
      accounts={accounts} 
    />
  );
}