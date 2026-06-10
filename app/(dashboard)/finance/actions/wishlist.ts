"use server";

import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { parseAmount } from "./helpers";

// =========================================================
// LISTA DE DESEJOS (WISHLIST)
// =========================================================
// O "já dá pra comprar?" é calculado contra o saldo REAL das contas — não
// existe mais cofre virtual por item. O campo `saved` permanece no schema
// apenas por compatibilidade com dados antigos; nenhuma action o alimenta.

export async function createWishlist(formData: FormData) {
    const name = formData.get("name") as string;
    const price = parseAmount(formData.get("price"));
    const imageUrl = formData.get("imageUrl") as string;
    const productUrl = formData.get("productUrl") as string;
    const priority = (formData.get("priority") as string) || "MEDIUM";

    const userId = await requireUserId();

    await prisma.wishlistItem.create({
        data: { name, price, imageUrl, productUrl, priority, status: "SAVING", userId }
    });
    revalidatePath("/finance");
}

export async function updateWishlist(formData: FormData) {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const price = parseAmount(formData.get("price"));
    const imageUrl = formData.get("imageUrl") as string;
    const productUrl = formData.get("productUrl") as string;
    const priority = (formData.get("priority") as string) || "MEDIUM";

    const userId = await requireUserId();

    // status e saved ficam como estão — comprado só via buyWishlistItem.
    await prisma.wishlistItem.updateMany({
        where: { id, userId },
        data: { name, price, imageUrl, productUrl, priority }
    });
    revalidatePath("/finance");
}

interface BuyResult {
    success: boolean;
    message: string;
}

/**
 * Marca um desejo como comprado. Se `accountId` vier preenchido, registra a
 * despesa real na conta (e ajusta o saldo quando a conta não é sincronizada
 * automaticamente) — mesma regra de createTransaction.
 */
export async function buyWishlistItem(formData: FormData): Promise<BuyResult> {
    try {
        const id = formData.get("id") as string;
        const accountId = (formData.get("accountId") as string) || "";

        const userId = await requireUserId();

        const item = await prisma.wishlistItem.findFirst({
            where: { id, userId, deletedAt: null },
            select: { id: true, name: true, price: true, status: true },
        });
        if (!item) return { success: false, message: "Desejo não encontrado." };
        if (item.status === "BOUGHT") return { success: false, message: "Este desejo já foi comprado." };

        const price = Number(item.price);

        // ⚠️ Modo réplica: leituras fora da transação, escrita em lote com select {id}.
        const ops: Prisma.PrismaPromise<{ id: string } | Prisma.BatchPayload>[] = [];
        let transactionId: string | null = null;

        if (accountId) {
            const account = await prisma.account.findFirst({
                where: { id: accountId, userId },
                select: { id: true, isConnected: true, balance: true },
            });
            if (!account) return { success: false, message: "Conta não encontrada." };

            transactionId = randomUUID();
            ops.push(prisma.transaction.create({
                data: {
                    id: transactionId,
                    description: `Compra: ${item.name}`,
                    amount: price,
                    type: "EXPENSE",
                    accountId,
                    category: "Compras",
                    date: new Date(),
                    userId,
                },
                select: { id: true },
            }));

            // Saldo manual só em contas não sincronizadas (Pluggy cuida das suas).
            if (!account.isConnected) {
                ops.push(prisma.account.update({
                    where: { id: accountId },
                    data: { balance: Number(account.balance) - price },
                    select: { id: true },
                }));
            }
        }

        ops.push(prisma.wishlistItem.updateMany({
            where: { id, userId },
            data: { status: "BOUGHT" },
        }));

        await prisma.$transaction(ops);

        await logActivity({
            action: "COMPLETE",
            module: "finance",
            entityType: "wishlist",
            entityId: item.id,
            summary: `Desejo conquistado: ${item.name}`,
            meta: { price, withTransaction: !!transactionId },
        });

        revalidatePath("/finance");
        return {
            success: true,
            message: transactionId
                ? `"${item.name}" comprado — despesa registrada na conta. 🎉`
                : `"${item.name}" marcado como comprado. 🎉`,
        };
    } catch (error) {
        console.error("Erro ao comprar desejo:", error);
        return { success: false, message: "Erro ao registrar a compra." };
    }
}

export async function deleteWishlist(id: string) {
    const userId = await requireUserId();
    await prisma.wishlistItem.updateMany({ where: { id, userId }, data: { deletedAt: new Date() } });
    revalidatePath("/finance");
}
