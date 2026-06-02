"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { fetchPluggyTransactions, createConnectToken, fetchPluggyAccounts } from "@/lib/pluggy";
import { requireUserId } from "@/lib/auth";

interface PluggyAccount {
  id: string;
  name: string;
  number: string;
  balance: number;
  type: "BANK" | "CREDIT"; // O que o erro mostrou
  subtype?: string;
}

// =========================================================
// INTEGRAÇÃO BANCÁRIA (PLUGGY)
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
    const userId = await requireUserId();
    // Forçamos o tipo aqui para o TS saber o que esperar
    const pluggyAccounts = await fetchPluggyAccounts(itemId) as PluggyAccount[];

    let createdCount = 0;

    for (const acc of pluggyAccounts) {
      const existing = await prisma.account.findFirst({
        where: { externalId: acc.id, userId }
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
            userId
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
    const userId = await requireUserId();
    const account = await prisma.account.findFirst({
        where: { id: localAccountId, userId }
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
            userId,
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
            category: t.category || "Geral",
            userId
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
