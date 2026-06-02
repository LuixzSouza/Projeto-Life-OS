"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseAmount } from "./helpers";

// =========================================================
// GESTÃO DE USUÁRIO (SALÁRIO)
// =========================================================

export async function updateSalary(amount: number) {
  const userId = await requireUserId();
  await prisma.user.update({
    where: { id: userId },
    data: { salary: amount },
  });
  revalidatePath("/finance");
  return { success: true };
}

// =========================================================
// GESTÃO DE CARTEIRAS (CONTAS)
// =========================================================

export async function createAccount(formData: FormData) {
  const name = formData.get("name") as string;
  const type = formData.get("type") as string;
  const balance = parseAmount(formData.get("balance"));
  const color = formData.get("color") as string;

  const userId = await requireUserId();

  await prisma.account.create({
    data: {
        name,
        type,
        balance,
        color,
        userId,
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

  const userId = await requireUserId();

  await prisma.account.updateMany({
    where: { id, userId },
    data: {
      name,
      color,
      balance,
    },
  });

  revalidatePath("/finance");
}

export async function deleteAccount(id: string) {
    const userId = await requireUserId();
    // Garante que a conta é do usuário antes de apagar transações vinculadas
    const account = await prisma.account.findFirst({ where: { id, userId } });
    if (!account) return;
    await prisma.transaction.deleteMany({ where: { accountId: id, userId } });
    await prisma.account.deleteMany({ where: { id, userId } });
    revalidatePath("/finance");
}
