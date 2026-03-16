import { prisma } from "@/lib/prisma";
import { TransactionsView } from "@/components/finance/transactions-view";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function TransactionsPage() {
  let accountsData;
  let transactionsData;
  let hasError = false;

  // 1. O TRY/CATCH FICA APENAS COM A LÓGICA DO BANCO DE DADOS
  try {
    const result = await Promise.all([
      prisma.account.findMany({ 
        orderBy: { name: "asc" } 
      }),
      prisma.transaction.findMany({
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
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl text-center space-y-4">
          <h2 className="text-2xl font-bold text-foreground">
            Erro ao carregar dados
          </h2>
          <p className="text-sm text-muted-foreground">
            Não foi possível carregar o histórico de transações. 
            Tente novamente em alguns instantes.
          </p>
          <Link href="/finance/transactions" className="block w-full">
             <Button className="w-full">
               Tentar novamente
             </Button>
          </Link>
        </div>
      </div>
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