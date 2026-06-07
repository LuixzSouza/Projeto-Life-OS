"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseAmount, parseRecurrence, parseInstallments } from "./helpers";
import { asFrequency, installmentEndDate } from "@/lib/recurrence";

// =========================================================
// COBRANÇAS RECORRENTES (RECEITAS A RECEBER TODO MÊS)
// Vinculadas a um Cliente (Negócios) e a um contrato RECURRING (Billing),
// que é a origem das Invoices geradas em generateReminders.
// =========================================================

/** Resolve o cliente escolhido garantindo que pertence ao usuário. "none"/vazio → sem cliente. */
async function resolveClient(formData: FormData, userId: string): Promise<{ id: string; name: string } | null> {
  const clientId = (formData.get("clientId") as string)?.trim();
  if (!clientId || clientId === "none") return null;
  const client = await prisma.client.findFirst({
    where: { id: clientId, userId, deletedAt: null },
    select: { id: true, name: true },
  });
  return client ? { id: client.id, name: client.name } : null;
}

/** Cria o contrato que serve de origem para as faturas (RECURRING ou INSTALLMENT). */
async function createChargeBilling(
  userId: string,
  clientId: string,
  title: string,
  amount: number,
  dayOfMonth: number,
  startDate: Date | null,
  installments: number | null,
): Promise<string> {
  const billing = await prisma.billing.create({
    data: {
      clientId,
      title,
      totalValue: installments ? amount * installments : amount,
      type: installments ? "INSTALLMENT" : "RECURRING",
      installments: installments ?? 1,
      billingDay: dayOfMonth,
      ...(startDate ? { startDate } : {}),
      status: "ACTIVE",
      userId,
    },
    select: { id: true },
  });
  return billing.id;
}

export async function createRecurringCharge(formData: FormData) {
  const title = formData.get("title") as string;
  const amount = parseAmount(formData.get("amount"));
  const category = (formData.get("category") as string) || "Cobrança";
  const { frequency, startDate, endDate: endDateField, dayOfMonth } = parseRecurrence(formData);
  const { installments, paidInstallments } = parseInstallments(formData);

  // Parcelado: o fim é CALCULADO (startDate + parcelas restantes), não digitado.
  const endDate = installments && startDate
    ? installmentEndDate(startDate, asFrequency(frequency), installments, paidInstallments)
    : endDateField;

  const userId = await requireUserId();
  const client = await resolveClient(formData, userId);

  const billingId = client ? await createChargeBilling(userId, client.id, title, amount, dayOfMonth, startDate, installments) : null;

  await prisma.recurringCharge.create({
    data: {
      title,
      amount,
      dayOfMonth,
      category,
      frequency,
      startDate,
      endDate,
      installments,
      paidInstallments,
      clientId: client?.id ?? null,
      clientName: client?.name ?? null,
      billingId,
      userId,
    },
  });
  revalidatePath("/finance");
  revalidatePath("/business");
}

export async function updateRecurringCharge(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const amount = parseAmount(formData.get("amount"));
  const category = (formData.get("category") as string) || "Cobrança";
  const { frequency, startDate, endDate: endDateField, dayOfMonth } = parseRecurrence(formData);
  const { installments, paidInstallments } = parseInstallments(formData);

  const endDate = installments && startDate
    ? installmentEndDate(startDate, asFrequency(frequency), installments, paidInstallments)
    : endDateField;

  const userId = await requireUserId();
  const client = await resolveClient(formData, userId);

  // Estado atual (escopado) para decidir se reaproveita ou cria um novo contrato.
  const existing = await prisma.recurringCharge.findFirst({
    where: { id, userId },
    select: { clientId: true, billingId: true },
  });
  if (!existing) return;

  let billingId = existing.billingId;

  if (!client) {
    // Cliente removido: desvincula (mantém o contrato antigo intacto p/ histórico).
    billingId = null;
  } else if (existing.billingId && existing.clientId === client.id) {
    // Mesmo cliente: sincroniza o contrato existente.
    await prisma.billing.updateMany({
      where: { id: existing.billingId, userId },
      data: {
        title,
        totalValue: installments ? amount * installments : amount,
        billingDay: dayOfMonth,
        type: installments ? "INSTALLMENT" : "RECURRING",
        installments: installments ?? 1,
      },
    });
  } else {
    // Cliente novo (ou ainda sem contrato): cria o contrato.
    billingId = await createChargeBilling(userId, client.id, title, amount, dayOfMonth, startDate, installments);
  }

  await prisma.recurringCharge.updateMany({
    where: { id, userId },
    data: {
      title,
      amount,
      dayOfMonth,
      category,
      frequency,
      startDate,
      endDate,
      installments,
      paidInstallments,
      clientId: client?.id ?? null,
      clientName: client?.name ?? null,
      billingId,
    },
  });
  revalidatePath("/finance");
  revalidatePath("/business");
}

export async function deleteRecurringCharge(id: string) {
  const userId = await requireUserId();
  // Remove só a cobrança; o contrato/faturas já emitidos permanecem no Negócios (histórico).
  await prisma.recurringCharge.deleteMany({ where: { id, userId } });
  revalidatePath("/finance");
}
