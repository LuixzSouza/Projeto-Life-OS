"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseAmount, parseRecurrence, parseInstallments } from "./helpers";
import { asFrequency, installmentEndDate } from "@/lib/recurrence";

// =========================================================
// GESTÃO DE CUSTOS FIXOS (RECURRING)
// =========================================================

export async function createRecurring(formData: FormData) {
    const title = formData.get("title") as string;
    const amount = parseAmount(formData.get("amount"));
    const category = (formData.get("category") as string) || "Mensal";
    const { frequency, startDate, endDate: endDateField, dayOfMonth } = parseRecurrence(formData);
    const { installments, paidInstallments } = parseInstallments(formData);

    // Parcelado: fim calculado a partir das parcelas restantes.
    const endDate = installments && startDate
        ? installmentEndDate(startDate, asFrequency(frequency), installments, paidInstallments)
        : endDateField;

    const userId = await requireUserId();

    await prisma.recurringExpense.create({
        data: { title, amount, dayOfMonth, category, frequency, startDate, endDate, installments, paidInstallments, userId }
    });
    revalidatePath("/finance");
}

export async function updateRecurring(formData: FormData) {
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const amount = parseAmount(formData.get("amount"));
    const category = (formData.get("category") as string) || "Mensal";
    const { frequency, startDate, endDate: endDateField, dayOfMonth } = parseRecurrence(formData);
    const { installments, paidInstallments } = parseInstallments(formData);

    const endDate = installments && startDate
        ? installmentEndDate(startDate, asFrequency(frequency), installments, paidInstallments)
        : endDateField;

    const userId = await requireUserId();

    await prisma.recurringExpense.updateMany({
        where: { id, userId },
        data: { title, amount, dayOfMonth, category, frequency, startDate, endDate, installments, paidInstallments }
    });
    revalidatePath("/finance");
}

export async function deleteRecurring(id: string) {
    const userId = await requireUserId();
    await prisma.recurringExpense.deleteMany({ where: { id, userId } });
    revalidatePath("/finance");
}
