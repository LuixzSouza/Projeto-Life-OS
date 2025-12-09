"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// =========================================================
// 1. GESTÃO DE CARTEIRAS (CONTAS)
// =========================================================

export async function createAccount(formData: FormData) {
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const balance = parseFloat(formData.get("balance") as string) || 0;
  const color = formData.get("color") as string;

  const user = await prisma.user.findFirst();

  await prisma.account.create({
    data: { name, type, balance, color, userId: user?.id },
  });
  revalidatePath("/finance");
}

export async function updateAccount(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;
  // O saldo geralmente não se edita diretamente aqui, apenas via transações, mas o nome/cor sim.

  await prisma.account.update({
    where: { id },
    data: { name, color }
  });
  revalidatePath("/finance");
}

export async function deleteAccount(id: string) {
    // Apaga transações primeiro para não deixar órfãos
    await prisma.transaction.deleteMany({ where: { accountId: id } });
    await prisma.account.delete({ where: { id } });
    revalidatePath("/finance");
}


// =========================================================
// 2. GESTÃO DE TRANSAÇÕES (COM CORREÇÃO DE SALDO)
// =========================================================

export async function createTransaction(formData: FormData) {
  const description = formData.get("description") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const type = formData.get("type") as string; // INCOME ou EXPENSE
  const accountId = formData.get("accountId") as string;
  const category = formData.get("category") as string;

  if (!accountId || isNaN(amount)) throw new Error("Dados inválidos");

  await prisma.$transaction(async (tx) => {
      // 1. Cria transação
      await tx.transaction.create({
        data: { description, amount, type, accountId, category, date: new Date() },
      });

      // 2. Atualiza Saldo da Conta
      const account = await tx.account.findUnique({ where: { id: accountId } });
      if (account) {
          const newBalance = type === 'INCOME' 
            ? Number(account.balance) + amount 
            : Number(account.balance) - amount;
          
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
  const newAmount = parseFloat(formData.get("amount") as string);
  const newType = formData.get("type") as string;
  const newCategory = formData.get("category") as string;

  // Transação atômica para garantir consistência do saldo
  await prisma.$transaction(async (tx) => {
      const oldTx = await tx.transaction.findUnique({ where: { id } });
      if (!oldTx) throw new Error("Transação não encontrada");

      const account = await tx.account.findUnique({ where: { id: oldTx.accountId } });
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
          data: { description, amount: newAmount, type: newType, category: newCategory }
      });
  });

  revalidatePath("/finance");
}

export async function deleteTransaction(id: string) {
    await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.findUnique({ where: { id } });
        if(!transaction) return;

        // Reverte saldo antes de apagar
        const account = await tx.account.findUnique({ where: { id: transaction.accountId } });
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


// =========================================================
// 3. GESTÃO DE METAS (WISHLIST)
// =========================================================

export async function createWishlist(formData: FormData) {
    const name = formData.get("name") as string;
    const price = parseFloat(formData.get("price") as string);
    const saved = parseFloat(formData.get("saved") as string) || 0;
    const imageUrl = formData.get("imageUrl") as string;
    const productUrl = formData.get("productUrl") as string;
    const priority = formData.get("priority") as string;

    await prisma.wishlistItem.create({
        data: { 
            name, price, saved, imageUrl, productUrl, priority,
            status: saved >= price ? 'BOUGHT' : 'SAVING'
        }
    });
    revalidatePath("/finance");
}

export async function updateWishlist(formData: FormData) {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const price = parseFloat(formData.get("price") as string);
    const saved = parseFloat(formData.get("saved") as string); 
    const imageUrl = formData.get("imageUrl") as string;
    const productUrl = formData.get("productUrl") as string;
    const priority = formData.get("priority") as string;

    await prisma.wishlistItem.update({
        where: { id },
        data: { 
            name, price, saved, imageUrl, productUrl, priority,
            status: saved >= price ? 'BOUGHT' : 'SAVING'
        }
    });
    revalidatePath("/finance");
}

export async function addSavings(formData: FormData) {
    const id = formData.get("id") as string;
    const amount = parseFloat(formData.get("amount") as string);
    
    const item = await prisma.wishlistItem.findUnique({ where: { id }});
    if(item) {
        const newSaved = Number(item.saved) + amount;
        await prisma.wishlistItem.update({
            where: { id },
            data: { 
                saved: newSaved,
                status: newSaved >= Number(item.price) ? 'BOUGHT' : 'SAVING'
            }
        });
    }
    revalidatePath("/finance");
}

export async function deleteWishlist(id: string) {
    await prisma.wishlistItem.delete({ where: { id } });
    revalidatePath("/finance");
}


// =========================================================
// 4. GESTÃO DE CUSTOS FIXOS (RECURRING)
// =========================================================

export async function createRecurring(formData: FormData) {
    const title = formData.get("title") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const dayOfMonth = parseInt(formData.get("dayOfMonth") as string);
    
    await prisma.recurringExpense.create({
        data: { title, amount, dayOfMonth, category: "Mensal" }
    });
    revalidatePath("/finance");
}

export async function updateRecurring(formData: FormData) {
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const amount = parseFloat(formData.get("amount") as string);
    const dayOfMonth = parseInt(formData.get("dayOfMonth") as string);

    await prisma.recurringExpense.update({
        where: { id },
        data: { title, amount, dayOfMonth }
    });
    revalidatePath("/finance");
}

export async function deleteRecurring(id: string) {
    await prisma.recurringExpense.delete({ where: { id } });
    revalidatePath("/finance");
}