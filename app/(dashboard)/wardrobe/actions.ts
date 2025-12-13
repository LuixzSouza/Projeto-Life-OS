"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

type WardrobeStatus = "IN_CLOSET" | "LAUNDRY" | "REPAIR" | "DONATED" | "WISH_LIST";

// Helper para converter string vazia em null
function getValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

// CORREÇÃO AQUI: Tipagem explícita em vez de 'any'
function parsePrice(value: FormDataEntryValue | null): number | null {
  if (!value || typeof value !== "string") return null;
  
  const stringValue = value.replace("R$", "").trim();
  const cleanValue = stringValue.replace(/\./g, "").replace(",", ".");
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? null : parsed;
}

// Helper para pegar usuário
async function getAuthenticatedUserId() {
  const user = await prisma.user.findFirst();
  return user?.id;
}

// --- 1. CREATE (ADICIONAR PEÇA) ---
export async function createWardrobeItem(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Usuário não encontrado." };

    const name = formData.get("name") as string;
    if (!name) return { success: false, message: "Nome da peça é obrigatório." };

    await prisma.wardrobeItem.create({
      data: {
        userId,
        name,
        category: (formData.get("category") as string) || "OUTROS",
        
        // Detalhes Opcionais
        brand: getValue(formData, "brand"),
        size: getValue(formData, "size"),
        color: getValue(formData, "color"),
        season: getValue(formData, "season"),
        imageUrl: getValue(formData, "imageUrl"),
        
        // Numéricos e Enums
        price: parsePrice(formData.get("price")),
        // ✅ CORREÇÃO: Forçamos o tipo com any para o Prisma aceitar
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: ((formData.get("status") as string) || "IN_CLOSET") as any,
        isFavorite: formData.get("isFavorite") === "true",
      }
    });

    revalidatePath("/wardrobe");
    return { success: true, message: "Peça adicionada ao closet!" };

  } catch (error) {
    console.error("Erro ao criar peça:", error);
    return { success: false, message: "Erro ao salvar item." };
  }
}

// --- 2. UPDATE (EDITAR PEÇA) ---
export async function updateWardrobeItem(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Erro de autenticação." };

    const id = formData.get("id") as string;
    if (!id) return { success: false, message: "ID inválido." };

    await prisma.wardrobeItem.update({
      where: { id, userId },
      data: {
        name: formData.get("name") as string,
        category: formData.get("category") as string,
        
        brand: getValue(formData, "brand"),
        size: getValue(formData, "size"),
        color: getValue(formData, "color"),
        season: getValue(formData, "season"),
        imageUrl: getValue(formData, "imageUrl"),
        
        price: parsePrice(formData.get("price")),
        // ✅ CORREÇÃO: Forçamos o tipo com any
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: (formData.get("status") as string) as any,
      }
    });

    revalidatePath("/wardrobe");
    return { success: true, message: "Peça atualizada!" };

  } catch (error) {
    console.error("Erro ao atualizar:", error);
    return { success: false, message: "Erro ao atualizar item." };
  }
}

// --- 3. DELETE (REMOVER) ---
export async function deleteWardrobeItem(id: string) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Erro de autenticação." };

    await prisma.wardrobeItem.delete({
      where: { id, userId }
    });

    revalidatePath("/wardrobe");
    return { success: true, message: "Peça removida do closet." };

  } catch (error) {
    return { success: false, message: "Erro ao excluir." };
  }
}

// --- 4. TOGGLE FAVORITE (Ação Rápida) ---
export async function toggleFavoriteItem(id: string, currentState: boolean) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false };

    await prisma.wardrobeItem.update({
      where: { id, userId },
      data: { isFavorite: !currentState }
    });

    revalidatePath("/wardrobe");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// --- 5. REGISTRAR USO (Para o Cost Per Wear) ---
export async function wearItem(id: string) {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) return { success: false };
    
        await prisma.wardrobeItem.update({
          where: { id, userId },
          data: { 
              wearCount: { increment: 1 }, 
              lastWorn: new Date()         
          }
        });
    
        revalidatePath("/wardrobe");
        return { success: true, message: "Uso registrado! 👗" };
      } catch (error) {
        return { success: false, message: "Erro ao registrar uso." };
      }
}