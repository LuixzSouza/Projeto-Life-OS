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
                    data: { balance: { decrement: price } },
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

interface WishlistPlanResult {
    success: boolean;
    message: string;
}

/**
 * #26 do IA_ROADMAP — wishlist→meta com 1 clique: calcula o prazo realista
 * olhando a sobra média mensal REAL (últimos 3 meses fechados, mesma régua do
 * project_future) e cria uma tarefa-plano com a data prevista. A tarefa entra
 * na agenda/críticas e o briefing diário acompanha pelo prefixo "💰 Juntar para".
 */
export async function planWishlistGoal(id: string): Promise<WishlistPlanResult> {
    try {
        const userId = await requireUserId();
        const item = await prisma.wishlistItem.findFirst({
            where: { id, userId, deletedAt: null, status: { not: "BOUGHT" } },
            select: { id: true, name: true, price: true, priority: true },
        });
        if (!item) return { success: false, message: "Desejo não encontrado." };

        // Plano já aberto para este desejo? Não duplicar.
        const planTitle = `💰 Juntar para "${item.name}"`;
        const existing = await prisma.task.findFirst({
            where: { userId, deletedAt: null, isDone: false, title: planTitle },
            select: { id: true },
        });
        if (existing) return { success: false, message: "Já existe um plano aberto para este desejo." };

        // Quanto falta HOJE contra o saldo real das contas (mesma régua do card).
        const accounts = await prisma.account.findMany({ where: { userId }, select: { balance: true } });
        const balance = accounts.reduce((acc, a) => acc + Number(a.balance), 0);
        const price = Number(item.price);
        const missing = Math.max(price - balance, 0);
        if (missing <= 0) return { success: false, message: "Seu saldo já cobre este desejo — é só comprar. 🎉" };

        // Sobra média mensal REAL dos últimos 3 meses fechados.
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
        const totals = await prisma.transaction.groupBy({
            by: ["type"],
            where: { userId, deletedAt: null, date: { gte: threeMonthsAgo, lt: lastMonthEnd } },
            _sum: { amount: true },
        });
        const income = Number(totals.find((t) => t.type === "INCOME")?._sum.amount ?? 0);
        const expense = Number(totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0);
        const monthlyNet = (income - expense) / 3;

        const weeks = monthlyNet > 0 ? Math.ceil(missing / (monthlyNet / 4.33)) : null;
        const perWeek = weeks ? missing / weeks : null;
        const dueDate = weeks ? new Date(now.getTime() + weeks * 7 * 86400000) : null;
        if (dueDate) dueDate.setHours(12, 0, 0, 0);

        const description = [
            `Plano de compra gerado pelo Life OS em ${now.toLocaleDateString("pt-BR")}.`,
            `Preço: R$ ${price.toFixed(2)} · Falta no saldo: R$ ${missing.toFixed(2)}.`,
            monthlyNet > 0 && perWeek && weeks
                ? `Sobra média mensal real (últimos 3 meses fechados): R$ ${monthlyNet.toFixed(2)} → guardando ~R$ ${perWeek.toFixed(2)}/semana, a compra sai em ~${weeks} semana(s).`
                : "Sobra média mensal NEGATIVA nos últimos 3 meses — sem data realista nesse ritmo; o plano fica sem prazo até a maré virar.",
        ].join("\n");

        await prisma.task.create({
            data: {
                title: planTitle,
                description,
                priority: item.priority === "HIGH" || item.priority === "URGENT" ? "HIGH" : "MEDIUM",
                status: "TODO",
                dueDate,
                userId,
            },
            select: { id: true },
        });

        await logActivity({
            action: "CREATE",
            module: "finance",
            entityType: "wishlist",
            entityId: item.id,
            summary: `Montou o plano de compra de "${item.name}"`,
            meta: { weeks, missing },
        });

        revalidatePath("/finance");
        revalidatePath("/tasks");

        return {
            success: true,
            message: weeks && perWeek
                ? `Plano criado: guardando ~R$ ${perWeek.toFixed(0)}/semana, "${item.name}" sai em ~${weeks} semana(s).`
                : "Plano criado sem prazo: sua sobra mensal está negativa — o briefing acompanha mesmo assim.",
        };
    } catch (error) {
        console.error("Erro ao montar plano de compra:", error);
        return { success: false, message: "Erro ao montar o plano de compra." };
    }
}
