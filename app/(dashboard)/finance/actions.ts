"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fetchPluggyTransactions, createConnectToken, fetchPluggyAccounts } from "@/lib/pluggy";

interface PluggyAccount {
  id: string;
  name: string;
  number: string;
  balance: number;
  type: "BANK" | "CREDIT"; // O que o erro mostrou
  subtype?: string;
}

// Helper para garantir que números venham corretos do formulário
const parseAmount = (value: FormDataEntryValue | null) => {
  if (!value) return 0;
  const stringValue = value.toString().replace(/[^\d.,-]/g, '').replace(',', '.');
  const float = parseFloat(stringValue);
  return isNaN(float) ? 0 : float;
};

// =========================================================
// 0. GESTÃO DE USUÁRIO (SALÁRIO)
// =========================================================

export async function updateSalary(amount: number) {
  const user = await prisma.user.findFirst();
  if (user) {
    await prisma.user.update({
      where: { id: user.id },
      data: { salary: amount },
    });
    revalidatePath("/finance");
    return { success: true };
  }
  return { success: false, error: "Usuário não encontrado" };
}

// =========================================================
// 1. GESTÃO DE CARTEIRAS (CONTAS)
// =========================================================

export async function createAccount(formData: FormData) {
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const balance = parseAmount(formData.get("balance"));
  const color = formData.get("color") as string;

  const user = await prisma.user.findFirst();

  await prisma.account.create({
    data: { 
        name, 
        type, 
        balance, 
        color, 
        userId: user?.id,
        isConnected: false // Contas manuais começam desconectadas
    },
  });
  revalidatePath("/finance");
}

export async function updateAccount(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;

  // Ler e parsear o balance enviado pelo formulário
  const balance = parseAmount(formData.get("balance"));

  await prisma.account.update({
    where: { id },
    data: {
      name,
      color,
      balance, 
    },
  });

  revalidatePath("/finance");
}

export async function deleteAccount(id: string) {
    await prisma.transaction.deleteMany({ where: { accountId: id } });
    await prisma.account.delete({ where: { id } });
    revalidatePath("/finance");
}


// =========================================================
// 2. GESTÃO DE TRANSAÇÕES (COM CORREÇÃO DE SALDO)
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

  await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: { description, amount, type, accountId, category, date },
      });

      const account = await tx.account.findUnique({ where: { id: accountId } });
      
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
          data: { description, amount: newAmount, type: newType, category: newCategory, date: newDate }
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
    const price = parseAmount(formData.get("price"));
    const saved = parseAmount(formData.get("saved"));
    const imageUrl = formData.get("imageUrl") as string;
    const productUrl = formData.get("productUrl") as string;
    const priority = (formData.get("priority") as string) || "MEDIUM";

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
    const price = parseAmount(formData.get("price"));
    const saved = parseAmount(formData.get("saved")); 
    const imageUrl = formData.get("imageUrl") as string;
    const productUrl = formData.get("productUrl") as string;
    const priority = (formData.get("priority") as string) || "MEDIUM";

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
    const amount = parseAmount(formData.get("amount"));
    
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
    const amount = parseAmount(formData.get("amount"));
    const dayOfMonth = parseInt(formData.get("dayOfMonth") as string);
    const category = (formData.get("category") as string) || "Mensal";
    
    await prisma.recurringExpense.create({
        data: { title, amount, dayOfMonth, category }
    });
    revalidatePath("/finance");
}

export async function updateRecurring(formData: FormData) {
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const amount = parseAmount(formData.get("amount"));
    const dayOfMonth = parseInt(formData.get("dayOfMonth") as string);
    const category = (formData.get("category") as string) || "Mensal";

    await prisma.recurringExpense.update({
        where: { id },
        data: { title, amount, dayOfMonth, category }
    });
    revalidatePath("/finance");
}

export async function deleteRecurring(id: string) {
    await prisma.recurringExpense.delete({ where: { id } });
    revalidatePath("/finance");
}


// =========================================================
// 5. INTEGRAÇÃO BANCÁRIA (PLUGGY)
// =========================================================

export async function createConnectTokenAction() {
  try {
    return await createConnectToken();
  } catch (error) {
    console.error("Erro ao criar token Pluggy:", error);
    throw new Error("Falha ao iniciar conexão bancária. Verifique suas chaves de API.");
  }
}

export async function linkAccountToPluggyAction(itemId: string) {
  try {
    const user = await prisma.user.findFirst();
    // Forçamos o tipo aqui para o TS saber o que esperar
    const pluggyAccounts = await fetchPluggyAccounts(itemId) as PluggyAccount[];

    let createdCount = 0;

    for (const acc of pluggyAccounts) {
      const existing = await prisma.account.findFirst({
        where: { externalId: acc.id }
      });

      if (!existing) {
        await prisma.account.create({
          data: {
            name: `${acc.name} (${acc.number || 'Conta'})`, 
            // CORREÇÃO: Comparamos acc.type com "BANK" (que é o que o Pluggy envia para contas corrente/poupança)
            type: acc.type === 'BANK' ? 'CHECKING' : 'SAVINGS', 
            balance: acc.balance,
            color: "#820ad1", 
            isConnected: true,
            provider: "PLUGGY",
            externalId: acc.id,
            userId: user?.id
          }
        });
        createdCount++;
      } else {
        await prisma.account.update({
          where: { id: existing.id },
          data: { balance: acc.balance }
        });
      }
    }

    revalidatePath("/finance");
    return { success: true, message: `${createdCount} novas contas integradas!` };

  } catch (error) {
    console.error("Erro ao vincular conta:", error);
    return { success: false, message: "Erro ao processar dados do banco." };
  }
}

export async function syncBankAccount(localAccountId: string) {
  try {
    const account = await prisma.account.findUnique({ 
        where: { id: localAccountId } 
    });

    if (!account?.externalId) throw new Error("Conta não conectada.");

    const externalTrans = await fetchPluggyTransactions(account.externalId);

    let count = 0;
    for (const t of externalTrans) {
      const date = new Date(t.date);
      date.setHours(0,0,0,0);

      const exists = await prisma.transaction.findFirst({
        where: { 
            accountId: localAccountId,
            description: t.description, 
            date: {
                gte: date,
                lte: new Date(date.getTime() + 24 * 60 * 60 * 1000)
            },
            amount: Math.abs(t.amount) 
        }
      });

      if (!exists) {
        await prisma.transaction.create({
          data: {
            accountId: localAccountId,
            description: t.description,
            amount: Math.abs(t.amount),
            type: t.amount < 0 ? 'EXPENSE' : 'INCOME',
            date: new Date(t.date),
            category: t.category || "Geral" 
          }
        });
        count++;
      }
    }

    // CORREÇÃO DO ANY: Usamos a interface PluggyAccount para o find
    const pluggyAccounts = await fetchPluggyAccounts(account.externalId) as PluggyAccount[]; 
    const currentPluggyAcc = pluggyAccounts.find((a: PluggyAccount) => a.id === account.externalId);
    
    if (currentPluggyAcc) {
        await prisma.account.update({
            where: { id: localAccountId },
            data: { balance: currentPluggyAcc.balance }
        });
    }

    revalidatePath("/finance");
    return { success: true, message: `${count} novas transações sincronizadas.` };

  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro na sincronização automática." };
  }
}