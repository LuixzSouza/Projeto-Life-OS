"use server";

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
    await prisma.$transaction(async (tx) => {
      const expense = await tx.recurringExpense.findFirst({ where: { id: recurringExpenseId, userId } });
      if (!expense) throw new Error("Custo fixo não encontrado.");

      const account = await tx.account.findFirst({ where: { id: accountId, userId } });
      if (!account) throw new Error("Conta não encontrada.");

      // Idempotência: a ocorrência já foi paga?
      const existing = await tx.recurringExpensePayment.findUnique({
        where: { recurringExpenseId_dueDate: { recurringExpenseId, dueDate } },
        select: { id: true },
      });
      if (existing) throw new Error("Esta parcela/mês já está paga.");

      const value = Number(expense.amount);

      // Conta CONECTADA (Pluggy): NÃO criamos a transação manual — o Pluggy importa a
      // despesa real do banco e duplicaria o lançamento. Em conta comum, lançamos a
      // despesa e abatemos o saldo.
      let transactionId: string | null = null;
      if (!account.isConnected) {
        const transaction = await tx.transaction.create({
          data: {
            description: `${expense.title} (conta fixa)`,
            amount: value,
            type: "EXPENSE",
            category: expense.category || "Conta fixa",
            accountId,
            date: new Date(),
            userId,
          },
        });
        transactionId = transaction.id;
        await tx.account.update({
          where: { id: account.id },
          data: { balance: Number(account.balance) - value },
        });
      }

      await tx.recurringExpensePayment.create({
        data: { recurringExpenseId, dueDate, amount: value, transactionId, userId },
      });
    });

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
    await prisma.$transaction(async (tx) => {
      const payment = await tx.recurringExpensePayment.findFirst({
        where: { recurringExpenseId, dueDate, userId },
        include: { transaction: true },
      });
      if (!payment) throw new Error("Pagamento não encontrado.");

      if (payment.transaction) {
        const account = await tx.account.findFirst({ where: { id: payment.transaction.accountId, userId } });
        if (account && !account.isConnected) {
          await tx.account.update({
            where: { id: account.id },
            data: { balance: Number(account.balance) + Number(payment.transaction.amount) },
          });
        }
        await tx.transaction.delete({ where: { id: payment.transaction.id } });
      }
      await tx.recurringExpensePayment.delete({ where: { id: payment.id } });
    });

    revalidatePath("/finance");
    return { success: true, message: "Pagamento desfeito." };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Falha ao desfazer." };
  }
}
