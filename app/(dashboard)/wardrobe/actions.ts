"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- TIPOS ---
type WardrobeStatus = "IN_CLOSET" | "LAUNDRY" | "REPAIR" | "DONATED" | "WISH_LIST";

// Array com os status válidos para validação de segurança
const VALID_STATUSES: WardrobeStatus[] = ["IN_CLOSET", "LAUNDRY", "REPAIR", "DONATED", "WISH_LIST"];

// --- HELPERS ---

// Helper para converter string vazia em null
function getValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

// Tipagem explícita e limpeza de moeda BR
function parsePrice(value: FormDataEntryValue | null): number | null {
  if (!value || typeof value !== "string") return null;
  
  const stringValue = value.replace("R$", "").trim();
  const cleanValue = stringValue.replace(/\./g, "").replace(",", ".");
  
  const parsed = parseFloat(cleanValue);
  return isNaN(parsed) ? null : parsed;
}

// Helper de Segurança para Status
function parseStatus(value: FormDataEntryValue | null): WardrobeStatus {
  if (!value || typeof value !== "string") return "IN_CLOSET";
  
  const statusStr = value.toUpperCase() as WardrobeStatus;
  
  // Se o status enviado for válido, retorna ele. Senão, fallback para IN_CLOSET.
  if (VALID_STATUSES.includes(statusStr)) {
    return statusStr;
  }
  return "IN_CLOSET";
}

// Helper para pegar usuário (Simulação/Pronto para Auth Real)
async function getAuthenticatedUserId() {
  const user = await prisma.user.findFirst();
  return user?.id;
}

// --- 1. CREATE (ADICIONAR PEÇA) ---
export async function createWardrobeItem(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Usuário não autenticado." };

    const name = formData.get("name") as string;
    if (!name) return { success: false, message: "O nome da peça é obrigatório." };

    await prisma.wardrobeItem.create({
      data: {
        userId: userId,
        name: name,
        category: (formData.get("category") as string) || "OUTROS",
        
        // Detalhes Opcionais
        brand: getValue(formData, "brand"),
        size: getValue(formData, "size"),
        color: getValue(formData, "color"),
        season: getValue(formData, "season"),
        imageUrl: getValue(formData, "imageUrl"),
        
        // Numéricos, Booleanos e Enums
        price: parsePrice(formData.get("price")),
        status: parseStatus(formData.get("status")), // ✅ Validação segura, sem 'any'
        isFavorite: formData.get("isFavorite") === "true",
      }
    });

    revalidatePath("/wardrobe");
    return { success: true, message: "Peça adicionada ao closet!" };

  } catch (error) {
    console.error("Erro ao criar peça:", error);
    return { success: false, message: "Falha ao salvar a peça." };
  }
}

// --- 2. UPDATE (EDITAR PEÇA) ---
export async function updateWardrobeItem(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Erro de autenticação." };

    const id = formData.get("id") as string;
    if (!id) return { success: false, message: "ID do item não encontrado." };

    await prisma.wardrobeItem.update({
      where: { 
        id: id,
        userId: userId // Proteção: garante que o item pertence ao usuário logado
      },
      data: {
        name: formData.get("name") as string,
        category: formData.get("category") as string,
        
        brand: getValue(formData, "brand"),
        size: getValue(formData, "size"),
        color: getValue(formData, "color"),
        season: getValue(formData, "season"),
        imageUrl: getValue(formData, "imageUrl"),
        
        price: parsePrice(formData.get("price")),
        status: parseStatus(formData.get("status")), // ✅ Validação segura
      }
    });

    revalidatePath("/wardrobe");
    return { success: true, message: "Detalhes da peça atualizados!" };

  } catch (error) {
    console.error("Erro ao atualizar peça:", error);
    return { success: false, message: "Falha ao atualizar o item." };
  }
}

// --- 3. DELETE (REMOVER PEÇA) ---
export async function deleteWardrobeItem(id: string) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Erro de autenticação." };

    await prisma.wardrobeItem.delete({
      where: { 
        id: id,
        userId: userId 
      }
    });

    revalidatePath("/wardrobe");
    return { success: true, message: "Peça removida do closet." };

  } catch (error) {
    console.error("Erro ao excluir peça:", error);
    return { success: false, message: "Erro ao excluir a peça." };
  }
}

// --- 4. TOGGLE FAVORITE (Ação Rápida no Card) ---
export async function toggleFavoriteItem(id: string, currentState: boolean) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false };

    await prisma.wardrobeItem.update({
      where: { 
        id: id,
        userId: userId 
      },
      data: { isFavorite: !currentState }
    });

    revalidatePath("/wardrobe");
    return { success: true };
  } catch (error) {
    return { success: false };
  }
}

// --- 5. REGISTRAR USO (Para cálculo de Cost Per Wear) ---
export async function wearItem(id: string) {
    try {
        const userId = await getAuthenticatedUserId();
        if (!userId) return { success: false, message: "Não autenticado." };
    
        await prisma.wardrobeItem.update({
          where: { 
            id: id,
            userId: userId 
          },
          data: { 
              wearCount: { increment: 1 }, 
              lastWorn: new Date(),
              // Opcional: Se a pessoa usar a peça, garante que ela está "No Closet" 
              // e não "Na Lavanderia" ou "Emprestada"
              status: "IN_CLOSET" 
          }
        });
    
        revalidatePath("/wardrobe");
        return { success: true, message: "Uso registrado! 👗" };
      } catch (error) {
        return { success: false, message: "Erro ao registrar o uso da peça." };
      }
}