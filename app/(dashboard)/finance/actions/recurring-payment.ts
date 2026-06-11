"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { parseDateField } from "./helpers";

// =========================================================
// PAGAMENTO DE CUSTO FIXO (espelho do "Recebi" das faturas, lado despesa)
// Lança a despesa real na conta e marca a OCORRÊNCIA como paga (idempotente).
// =========================================================

export async function payRecurringExpense(formData: FormData) {
  const recurringExpenseId = formData.get("recurringExpenseId") as string;
  const accountId = formData.get("accountId") as string;
  const dueDate = parseDateField(formData.get("dueDate"));
  if (!recurringExpenseId || !accountId || !dueDate) {
    return { success: false, message: "Dados incompletos." };
  }

  const userId = await requireUserId();

  try {
    // Leituras FORA da transação (modo réplica: leituras na $transaction interativa
    // vão ao primário e estouram conversão de datas INTEGER); escritas em lote.
    const expense = await prisma.recurringExpense.findFirst({
      where: { id: recurringExpenseId, userId },
      select: { id: true, title: true, category: true, amount: true },
    });
    if (!expense) throw new Error("Custo fixo não encontrado.");

    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, isConnected: true, balance: true },
    });
    if (!account) throw new Error("Conta não encontrada.");

    // Idempotência: a ocorrência já foi paga? (o unique recurringExpenseId_dueDate
    // também barra corrida no create do lote abaixo)
    const existing = await prisma.recurringExpensePayment.findUnique({
      where: { recurringExpenseId_dueDate: { recurringExpenseId, dueDate } },
      select: { id: true },
    });
    if (existing) throw new Error("Esta parcela/mês já está paga.");

    const value = Number(expense.amount);

    // Conta CONECTADA (Pluggy): NÃO criamos a transação manual — o Pluggy importa a
    // despesa real do banco e duplicaria o lançamento. Em conta comum, lançamos a
    // despesa e abatemos o saldo.
    const ops = [];
    let transactionId: string | null = null;
    if (!account.isConnected) {
      transactionId = randomUUID();
      ops.push(
        prisma.transaction.create({
          data: {
            id: transactionId,
            description: `${expense.title} (conta fixa)`,
            amount: value,
            type: "EXPENSE",
            category: expense.category || "Conta fixa",
            accountId,
            date: new Date(),
            userId,
          },
          select: { id: true },
        }),
        prisma.account.update({
          where: { id: account.id },
          data: { balance: { decrement: value } },
          select: { id: true },
        }),
      );
    }

    ops.push(prisma.recurringExpensePayment.create({
      data: { recurringExpenseId, dueDate, amount: value, transactionId, userId },
      select: { id: true },
    }));
    await prisma.$transaction(ops);

    await logActivity({
      action: "EXPENSE",
      module: "finance",
      entityType: "recurringExpense",
      entityId: recurringExpenseId,
      summary: "Pagou uma conta fixa",
    });
    revalidatePath("/finance");
    return { success: true, message: "Pagamento lançado no Financeiro!" };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Falha ao registrar pagamento." };
  }
}

export async function undoRecurringExpensePayment(formData: FormData) {
  const recurringExpenseId = formData.get("recurringExpenseId") as string;
  const dueDate = parseDateField(formData.get("dueDate"));
  if (!recurringExpenseId || !dueDate) return { success: false, message: "Dados incompletos." };

  const userId = await requireUserId();

  try {
    // Leituras FORA da transação (mesma regra do payRecurringExpense); escritas em lote.
    const payment = await prisma.recurringExpensePayment.findFirst({
      where: { recurringExpenseId, dueDate, userId },
      select: {
        id: true,
        transaction: { select: { id: true, accountId: true, amount: true } },
      },
    });
    if (!payment) throw new Error("Pagamento não encontrado.");

    const ops = [];
    if (payment.transaction) {
      const account = await prisma.account.findFirst({
        where: { id: payment.transaction.accountId, userId },
        select: { id: true, isConnected: true, balance: true },
      });
      if (account && !account.isConnected) {
        ops.push(prisma.account.update({
          where: { id: account.id },
          data: { balance: { increment: Number(payment.transaction.amount) } },
          select: { id: true },
        }));
      }
      ops.push(prisma.transaction.delete({ where: { id: payment.transaction.id }, select: { id: true } }));
    }
    ops.push(prisma.recurringExpensePayment.delete({ where: { id: payment.id }, select: { id: true } }));
    await prisma.$transaction(ops);

    revalidatePath("/finance");
    return { success: true, message: "Pagamento desfeito." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Falha ao desfazer." };
  }
}
