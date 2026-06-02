"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseAmount } from "./helpers";

// =========================================================
// GESTÃO DE TRANSAÇÕES (COM CORREÇÃO DE SALDO)
// =========================================================

export async function createTransaction(formData: FormData) {
  const description = formData.get("description") as string;
  const amount = parseAmount(formData.get("amount"));
  const type = formData.get("type") as string;
  const accountId = formData.get("accountId") as string;
  const category = formData.get("category") as string;
  const dateStr = formData.get("date") as string;
  const date = dateStr ? new Date(dateStr) : new Date();

  if (!accountId || isNaN(amount)) throw new Error("Dados inválidos");

  const userId = await requireUserId();

  await prisma.$transaction(async (tx) => {
      // Garante que a conta pertence ao usuário
      const account = await tx.account.findFirst({ where: { id: accountId, userId } });
      if (!account) throw new Error("Conta não encontrada");

      await tx.transaction.create({
        data: { description, amount, type, accountId, category, date, userId },
      });

      // Só atualizamos saldo manualmente se a conta NÃO for automática (Pluggy)
      // Se for automática, o saldo virá da sincronização oficial
      if (account && !account.isConnected) {
          const currentBalance = Number(account.balance);
          const newBalance = type === 'INCOME' ? currentBalance + amount : currentBalance - amount;

          await tx.account.update({
              where: { id: accountId },
              data: { balance: newBalance }
          });
      }
  });

  revalidatePath("/finance");
}

export async function updateTransaction(formData: FormData) {
  const id = formData.get("id") as string;
  const description = formData.get("description") as string;
  const newAmount = parseAmount(formData.get("amount"));
  const newType = formData.get("type") as string;
  const newCategory = formData.get("category") as string;
  const dateStr = formData.get("date") as string;
  const newDate = dateStr ? new Date(dateStr) : new Date();

  const userId = await requireUserId();

  // Transação atômica para garantir consistência do saldo
  await prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findFirst({ where: { id, userId } });
      if (!oldTx) throw new Error("Transação não encontrada");

      const account = await tx.account.findFirst({ where: { id: oldTx.accountId, userId } });
      if (!account) throw new Error("Conta não encontrada");

      // 1. Reverter o impacto da transação antiga no saldo
      let tempBalance = Number(account.balance);
      if (oldTx.type === 'INCOME') tempBalance -= Number(oldTx.amount);
      else tempBalance += Number(oldTx.amount);

      // 2. Aplicar o impacto da nova transação
      if (newType === 'INCOME') tempBalance += newAmount;
      else tempBalance -= newAmount;

      // 3. Atualizar a conta com o novo saldo corrigido
      await tx.account.update({
          where: { id: account.id },
          data: { balance: tempBalance }
      });

      // 4. Atualizar a transação
      await tx.transaction.update({
          where: { id },
          data: { description, amount: newAmount, type: newType, category: newCategory, date: newDate }
      });
  });

  revalidatePath("/finance");
}

export async function deleteTransaction(id: string) {
    const userId = await requireUserId();
    await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.findFirst({ where: { id, userId } });
        if(!transaction) return;

        // Reverte saldo antes de apagar
        const account = await tx.account.findFirst({ where: { id: transaction.accountId, userId } });
        if(account) {
            const reversedBalance = transaction.type === 'INCOME'
                ? Number(account.balance) - Number(transaction.amount)
                : Number(account.balance) + Number(transaction.amount);

            await tx.account.update({ where: { id: transaction.accountId }, data: { balance: reversedBalance } });
        }

        await tx.transaction.delete({ where: { id } });
    });

    revalidatePath("/finance");
}
