"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import type { ParsedTransaction } from "@/lib/statement-parser";

// Importa transações de um extrato (OFX/CSV já parseado no cliente) para uma conta.
// Deduplica por (conta + dia + valor + descrição) para não duplicar reimportações,
// e atualiza o saldo de uma vez só (em contas não automáticas).
export async function importTransactions(accountId: string, items: ParsedTransaction[]) {
  try {
    if (!accountId) return { success: false, message: "Selecione uma conta." };
    if (!Array.isArray(items) || items.length === 0) return { success: false, message: "Nenhum lançamento para importar." };

    const userId = await requireUserId();

    // ⚠️ Modo réplica: leituras/dedupe FORA da $transaction interativa (na transação
    // iriam ao primário, onde datas INTEGER estouram a conversão do Prisma) e
    // escritas em lote atômico com select: { id: true }.
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, isConnected: true, balance: true },
    });
    if (!account) throw new Error("Conta não encontrada.");

    let imported = 0;
    let skipped = 0;
    let balanceDelta = 0;
    const ops = [];
    const seenInFile = new Set<string>(); // dedupe entre linhas do PRÓPRIO arquivo

    for (const item of items) {
      const amount = Math.abs(Number(item.amount));
      if (!amount || isNaN(amount)) { skipped++; continue; }
      const type = item.type === "INCOME" ? "INCOME" : "EXPENSE";

      const date = new Date(`${item.date}T12:00:00`);
      if (isNaN(date.getTime())) { skipped++; continue; }

      // Dedupe: mesmo dia + valor + descrição na mesma conta.
      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
      const fileKey = `${item.date}|${type}|${amount}|${item.description}`;
      const exists = seenInFile.has(fileKey) || await prisma.transaction.findFirst({
        where: {
          accountId, userId, amount, type,
          description: item.description,
          date: { gte: dayStart, lte: dayEnd },
        },
        select: { id: true },
      });
      if (exists) { skipped++; continue; }
      seenInFile.add(fileKey);

      ops.push(prisma.transaction.create({
        data: {
          accountId, userId, amount, type, date,
          description: item.description || "Lançamento importado",
          category: "Importado",
        },
        select: { id: true },
      }));
      balanceDelta += type === "INCOME" ? amount : -amount;
      imported++;
    }

    // Atualiza saldo só em contas manuais (Pluggy sincroniza sozinho).
    if (imported > 0 && !account.isConnected) {
      ops.push(prisma.account.update({
        where: { id: accountId },
        data: { balance: Number(account.balance) + balanceDelta },
        select: { id: true },
      }));
    }
    if (ops.length > 0) await prisma.$transaction(ops);

    const result = { imported, skipped };

    if (result.imported > 0) {
      await logActivity({
        action: "CREATE",
        module: "finance",
        entityType: "transaction",
        entityId: accountId,
        summary: `Importou ${result.imported} lançamento(s) de extrato`,
        meta: { imported: result.imported, skipped: result.skipped },
      });
    }

    revalidatePath("/finance");
    const msg = result.imported > 0
      ? `${result.imported} lançamento(s) importado(s)${result.skipped ? ` · ${result.skipped} já existiam` : ""}.`
      : "Tudo já estava importado (nenhum lançamento novo).";
    return { success: true, message: msg, ...result };
  } catch (error) {
    console.error("Erro ao importar extrato:", error);
    return { success: false, message: error instanceof Error ? error.message : "Falha ao importar extrato." };
  }
}
