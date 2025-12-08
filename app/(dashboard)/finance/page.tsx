import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { createAccount, createTransaction } from "./actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Importamos os tipos gerados pelo Prisma para corrigir os erros de 'any'
import { Account, Transaction } from "@prisma/client";

export default async function FinancePage() {
  // Busca dados (Agora com os tipos reconhecidos após o 'npx prisma generate')
  const accounts: Account[] = await prisma.account.findMany();
  
  // Usamos um tipo estendido para incluir a conta na transação
  type TransactionWithAccount = Transaction & { account: Account };

  const transactions: TransactionWithAccount[] = await prisma.transaction.findMany({
    orderBy: { date: 'desc' },
    take: 10,
    include: { account: true }
  });

  // Cálculo de Saldo Total (Tipagem explícita no reduce)
  const totalBalance = accounts.reduce((acc: number, item: Account) => {
    return acc + Number(item.balance);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Financeiro</h1>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nova Transação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Movimentação</DialogTitle>
            </DialogHeader>
            <form action={createTransaction} className="space-y-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input name="description" placeholder="Ex: Almoço, Salário..." required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor (R$)</Label>
                  <Input name="amount" type="number" step="0.01" placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <select name="type" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="EXPENSE">Despesa (Saída)</option>
                    <option value="INCOME">Receita (Entrada)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Conta</Label>
                <select name="accountId" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                    {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Input name="category" placeholder="Ex: Alimentação" />
              </div>
              <Button type="submit" className="w-full">Salvar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {totalBalance.toFixed(2)}</div>
          </CardContent>
        </Card>
        
        {accounts.length === 0 && (
           <Card className="border-dashed border-2 bg-zinc-50 dark:bg-zinc-900/50">
             <CardHeader>
               <CardTitle className="text-sm">Comece aqui</CardTitle>
             </CardHeader>
             <CardContent>
               <form action={createAccount} className="flex gap-2">
                 <Input name="name" placeholder="Nome da conta (ex: Nubank)" required />
                 <input type="hidden" name="type" value="CORRENTE" />
                 <input type="hidden" name="balance" value="0" />
                 <Button type="submit" size="sm">Criar</Button>
               </form>
             </CardContent>
           </Card>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimas Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.length === 0 ? (
                <p className="text-sm text-zinc-500">Nenhuma movimentação registrada.</p>
            ) : transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${t.type === 'INCOME' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {t.type === 'INCOME' ? <ArrowUpCircle className="h-4 w-4" /> : <ArrowDownCircle className="h-4 w-4" />}
                  </div>
                  <div>
                    <p className="font-medium">{t.description}</p>
                    <p className="text-xs text-zinc-500">{t.category} • {t.account.name}</p>
                  </div>
                </div>
                <div className={`font-bold ${t.type === 'INCOME' ? 'text-green-600' : 'text-zinc-900 dark:text-zinc-100'}`}>
                  {t.type === 'INCOME' ? '+' : '-'} R$ {Number(t.amount).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}