"use server";

import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { parseAmount } from "./helpers";

// =========================================================
// GESTÃO DE TRANSAÇÕES (COM CORREÇÃO DE SALDO)
// =========================================================
// ⚠️ REGRA (modo réplica/Turso): NÃO ler colunas DateTime dentro de $transaction
// interativa — leituras na transação vão ao PRIMÁRIO, onde datas INTEGER (ms)
// estouram a conversão do Prisma. Padrão: ler ANTES com prisma normal e escrever
// em lote via prisma.$transaction([...]) com select: { id: true }.

export async function createTransaction(formData: FormData) {
  const description = formData.get("description") as string;
  const amount = parseAmount(formData.get("amount"));
  const type = formData.get("type") as string;
  const accountId = formData.get("accountId") as string;
  const category = formData.get("category") as string;
  const dateStr = formData.get("date") as string;
  // T12:00:00Z: regra de ouro de <input type="date"> (bug do "dia anterior"). É a
  // convenção do app (transactions-view normaliza por isso); sem ela, formatDate
  // mostra o dia errado em fusos negativos (Brasil).
  const date = dateStr ? new Date(`${dateStr}T12:00:00Z`) : new Date();

  if (!accountId || isNaN(amount)) throw new Error("Dados inválidos");

  const userId = await requireUserId();

  // Garante que a conta pertence ao usuário (leitura FORA da transação — ver regra acima)
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId },
    select: { id: true, isConnected: true, balance: true },
  });
  if (!account) throw new Error("Conta não encontrada");

  const createdId = randomUUID();
  const ops: Prisma.PrismaPromise<{ id: string }>[] = [
    prisma.transaction.create({
      data: { id: createdId, description, amount, type, accountId, category, date, userId },
      select: { id: true },
    }),
  ];

  // Só atualizamos saldo manualmente se a conta NÃO for automática (Pluggy)
  // Se for automática, o saldo virá da sincronização oficial
  if (!account.isConnected) {
    // Update ATÔMICO (increment/decrement): dois dispositivos lançando ao
    // mesmo tempo não perdem um o saldo do outro (read-modify-write perdia).
    ops.push(prisma.account.update({
      where: { id: accountId },
      data: { balance: type === "INCOME" ? { increment: amount } : { decrement: amount } },
      select: { id: true },
    }));
  }
  await prisma.$transaction(ops);

  await logActivity({
    action: type === "INCOME" ? "INCOME" : "EXPENSE",
    module: "finance",
    entityType: "transaction",
    entityId: createdId,
    summary: `${type === "INCOME" ? "Receita" : "Despesa"}: ${description || category}`,
    meta: { amount, type, category },
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
  // T12:00:00Z: mesma convenção do create (evita o bug do "dia anterior").
  const newDate = dateStr ? new Date(`${dateStr}T12:00:00Z`) : new Date();

  const userId = await requireUserId();

  // Leituras FORA da transação (ver regra acima); escritas em lote atômico.
  const oldTx = await prisma.transaction.findFirst({
    where: { id, userId, deletedAt: null },
    select: { id: true, accountId: true, type: true, amount: true },
  });
  if (!oldTx) throw new Error("Transação não encontrada");

  const account = await prisma.account.findFirst({
    where: { id: oldTx.accountId, userId },
    select: { id: true, balance: true },
  });
  if (!account) throw new Error("Conta não encontrada");

  // Delta líquido (reverter a antiga + aplicar a nova) num increment ATÔMICO:
  // não perde escrita concorrente de outro dispositivo.
  const oldEffect = oldTx.type === "INCOME" ? Number(oldTx.amount) : -Number(oldTx.amount);
  const newEffect = newType === "INCOME" ? newAmount : -newAmount;
  const delta = newEffect - oldEffect;

  await prisma.$transaction([
    prisma.account.update({
      where: { id: account.id },
      data: { balance: { increment: delta } },
      select: { id: true },
    }),
    prisma.transaction.update({
      where: { id },
      data: { description, amount: newAmount, type: newType, category: newCategory, date: newDate },
      select: { id: true },
    }),
  ]);

  revalidatePath("/finance");
}

// Soft-delete: o lançamento vai para a Lixeira (deletedAt) e o saldo é REVERTIDO
// (um item na lixeira não conta no saldo). Restaurar reaplica; ver app/(dashboard)/trash.
export async function deleteTransaction(id: string) {
    const userId = await requireUserId();

    // Leituras FORA da transação (ver regra acima); escritas em lote atômico.
    const transaction = await prisma.transaction.findFirst({
      where: { id, userId, deletedAt: null },
      select: { id: true, accountId: true, type: true, amount: true },
    });
    if (!transaction) return;

    const ops = [];

    // Reverte o impacto no saldo — só em contas NÃO automáticas (Pluggy sincroniza sozinho).
    const account = await prisma.account.findFirst({
      where: { id: transaction.accountId, userId },
      select: { id: true, isConnected: true, balance: true },
    });
    if (account && !account.isConnected) {
      ops.push(prisma.account.update({
        where: { id: transaction.accountId },
        data: {
          balance: transaction.type === "INCOME"
            ? { decrement: Number(transaction.amount) }
            : { increment: Number(transaction.amount) },
        },
        select: { id: true },
      }));
    }

    ops.push(prisma.transaction.updateMany({ where: { id, userId }, data: { deletedAt: new Date() } }));
    await prisma.$transaction(ops);

    await logActivity({
      action: "DELETE",
      module: "finance",
      entityType: "transaction",
      entityId: id,
      summary: "Moveu um lançamento para a lixeira",
    });

    revalidatePath("/finance");
}
