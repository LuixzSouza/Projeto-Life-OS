"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseAmount } from "./helpers";

// =========================================================
// GESTÃO DE CUSTOS FIXOS (RECURRING)
// =========================================================

export async function createRecurring(formData: FormData) {
    const title = formData.get("title") as string;
    const amount = parseAmount(formData.get("amount"));
    const dayOfMonth = parseInt(formData.get("dayOfMonth") as string);
    const category = (formData.get("category") as string) || "Mensal";

    const userId = await requireUserId();

    await prisma.recurringExpense.create({
        data: { title, amount, dayOfMonth, category, userId }
    });
    revalidatePath("/finance");
}

export async function updateRecurring(formData: FormData) {
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const amount = parseAmount(formData.get("amount"));
    const dayOfMonth = parseInt(formData.get("dayOfMonth") as string);
    const category = (formData.get("category") as string) || "Mensal";

    const userId = await requireUserId();

    await prisma.recurringExpense.updateMany({
        where: { id, userId },
        data: { title, amount, dayOfMonth, category }
    });
    revalidatePath("/finance");
}

export async function deleteRecurring(id: string) {
    const userId = await requireUserId();
    await prisma.recurringExpense.deleteMany({ where: { id, userId } });
    revalidatePath("/finance");
}
