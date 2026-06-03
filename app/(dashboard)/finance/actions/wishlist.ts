"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseAmount } from "./helpers";

// =========================================================
// GESTÃO DE METAS (WISHLIST)
// =========================================================

export async function createWishlist(formData: FormData) {
    const name = formData.get("name") as string;
    const price = parseAmount(formData.get("price"));
    const saved = parseAmount(formData.get("saved"));
    const imageUrl = formData.get("imageUrl") as string;
    const productUrl = formData.get("productUrl") as string;
    const priority = (formData.get("priority") as string) || "MEDIUM";

    const userId = await requireUserId();

    await prisma.wishlistItem.create({
        data: {
            name, price, saved, imageUrl, productUrl, priority,
            status: saved >= price ? 'BOUGHT' : 'SAVING',
            userId
        }
    });
    revalidatePath("/finance");
}

export async function updateWishlist(formData: FormData) {
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const price = parseAmount(formData.get("price"));
    const saved = parseAmount(formData.get("saved"));
    const imageUrl = formData.get("imageUrl") as string;
    const productUrl = formData.get("productUrl") as string;
    const priority = (formData.get("priority") as string) || "MEDIUM";

    const userId = await requireUserId();

    await prisma.wishlistItem.updateMany({
        where: { id, userId },
        data: {
            name, price, saved, imageUrl, productUrl, priority,
            status: saved >= price ? 'BOUGHT' : 'SAVING'
        }
    });
    revalidatePath("/finance");
}

export async function addSavings(formData: FormData) {
    const id = formData.get("id") as string;
    const amount = parseAmount(formData.get("amount"));

    const userId = await requireUserId();

    const item = await prisma.wishlistItem.findFirst({ where: { id, userId }});
    if(item) {
        const newSaved = Number(item.saved) + amount;
        await prisma.wishlistItem.updateMany({
            where: { id, userId },
            data: {
                saved: newSaved,
                status: newSaved >= Number(item.price) ? 'BOUGHT' : 'SAVING'
            }
        });
    }
    revalidatePath("/finance");
}

export async function deleteWishlist(id: string) {
    const userId = await requireUserId();
    await prisma.wishlistItem.updateMany({ where: { id, userId }, data: { deletedAt: new Date() } });
    revalidatePath("/finance");
}
