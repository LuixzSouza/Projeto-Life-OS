"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Criar uma nova conta (Ex: Nubank)
export async function createAccount(formData: FormData) {
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const initialBalance = parseFloat(formData.get("balance") as string);

  await prisma.account.create({
    data: {
      name,
      type,
      balance: initialBalance,
    },
  });

  revalidatePath("/finance"); // Atualiza a tela sem recarregar
}

// Criar uma transação (Ex: Compra no mercado)
export async function createTransaction(formData: FormData) {
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as string; // INCOME ou EXPENSE
  const accountId = formData.get("accountId") as string;
  const category = formData.get("category") as string;

  // 1. Cria a transação
  await prisma.transaction.create({
    data: {
      description,
      amount,
      type,
      accountId,
      category,
      date: new Date(),
    },
  });

  // 2. Atualiza o saldo da conta
  const currentAccount = await prisma.account.findUnique({ where: { id: accountId } });
  
  if (currentAccount) {
    const newBalance = type === "INCOME" 
      ? Number(currentAccount.balance) + amount 
      : Number(currentAccount.balance) - amount;

    await prisma.account.update({
      where: { id: accountId },
      data: { balance: newBalance },
    });
  }

  revalidatePath("/finance");
}