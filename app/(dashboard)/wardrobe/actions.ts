"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId, requireUserId } from "@/lib/auth";
import { getProductPreview, inlineImageAsBase64 } from "@/lib/product-preview";
import { logActivity } from "@/lib/activity";
import { splitDataUrl, imageRefHelpers } from "@/lib/image-store";
import { createHash } from "crypto";

const wardrobeRefs = imageRefHelpers("/api/wardrobe-image/");

// Externaliza a foto da peça: um data URL base64 vira linha em WardrobeImage (base64
// fora da linha do WardrobeItem) e devolve a ref /api/wardrobe-image/<id>. Ref já
// existente ou URL externa → devolve como está. Vazio → remove a foto. Idempotente
// por sha256 (o form reenvia imageUrl a cada save; sem dedup, duplicaria linhas).
// A ref usa o id da IMAGEM (não do item), então trocar a foto gera nova ref
// (cache-safe). Pré-condição: `itemId` pertence a `userId`.
async function externalizeWardrobeImage(
  itemId: string,
  userId: string,
  src: string | null,
): Promise<string | null> {
  if (!src) {
    await prisma.wardrobeImage.deleteMany({ where: { itemId, userId } });
    return null;
  }
  const parsed = splitDataUrl(src);
  if (!parsed) {
    // Já é ref existente ou URL externa → mantém; limpa quaisquer linhas restantes.
    const keepId = wardrobeRefs.idFromRef(src);
    await prisma.wardrobeImage.deleteMany({
      where: { itemId, userId, ...(keepId ? { id: { not: keepId } } : {}) },
    });
    return src;
  }
  const hash = createHash("sha256").update(parsed.data).digest("hex");
  const existing = await prisma.wardrobeImage.findFirst({
    where: { itemId, userId, hash },
    select: { id: true },
  });
  const id =
    existing?.id ??
    (
      await prisma.wardrobeImage.create({
        data: { itemId, userId, mime: parsed.mime, data: parsed.data, hash },
        select: { id: true },
      })
    ).id;
  // 1:1 — remove fotos antigas do item (libera espaço).
  await prisma.wardrobeImage.deleteMany({ where: { itemId, userId, id: { not: id } } });
  return wardrobeRefs.ref(id);
}

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

// Helper para pegar o ID do usuário autenticado (sessão JWT)
async function getAuthenticatedUserId() {
  return await getCurrentUserId();
}

// --- 1. CREATE (ADICIONAR PEÇA) ---
export async function createWardrobeItem(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Usuário não autenticado." };

    const name = formData.get("name") as string;
    if (!name) return { success: false, message: "O nome da peça é obrigatório." };

    const created = await prisma.wardrobeItem.create({
      data: {
        userId: userId,
        name: name,
        category: (formData.get("category") as string) || "OUTROS",

        // Detalhes Opcionais
        brand: getValue(formData, "brand"),
        size: getValue(formData, "size"),
        color: getValue(formData, "color"),
        season: getValue(formData, "season"),
        // imageUrl entra depois: a foto base64 é externalizada (precisa do id do item).
        imageUrl: null,

        // Numéricos, Booleanos e Enums
        price: parsePrice(formData.get("price")),
        status: parseStatus(formData.get("status")), // ✅ Validação segura, sem 'any'
        isFavorite: formData.get("isFavorite") === "true",
      }
    });

    // Externaliza a foto (base64 → WardrobeImage) e grava só a ref na peça.
    const rawImage = getValue(formData, "imageUrl");
    if (rawImage) {
      const imageUrl = await externalizeWardrobeImage(created.id, userId, rawImage);
      await prisma.wardrobeItem.update({ where: { id: created.id, userId }, data: { imageUrl } });
    }

    await logActivity({
      action: "CREATE",
      module: "wardrobe",
      entityType: "wardrobeItem",
      entityId: created.id,
      summary: `Adicionou "${created.name}" ao closet`,
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

    // Posse antes de externalizar (o externalize grava linhas atreladas ao item).
    const owns = await prisma.wardrobeItem.findFirst({ where: { id, userId }, select: { id: true } });
    if (!owns) return { success: false, message: "Peça não encontrada." };

    // Externaliza a foto (base64 → WardrobeImage) e grava só a ref na peça.
    const imageUrl = await externalizeWardrobeImage(id, userId, getValue(formData, "imageUrl"));

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
        imageUrl,

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
// Soft-delete: a peça vai para a Lixeira (deletedAt). Restaurar/excluir: ver /trash.
export async function deleteWardrobeItem(id: string) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Erro de autenticação." };

    const item = await prisma.wardrobeItem.findFirst({ where: { id, userId }, select: { name: true } });
    await prisma.wardrobeItem.updateMany({
      where: {
        id: id,
        userId: userId
      },
      data: { deletedAt: new Date() }
    });

    await logActivity({
      action: "DELETE",
      module: "wardrobe",
      entityType: "wardrobeItem",
      entityId: id,
      summary: item ? `Moveu "${item.name}" para a lixeira` : "Removeu uma peça",
    });

    revalidatePath("/wardrobe");
    return { success: true, message: "Peça movida para a lixeira." };

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
  } catch {
    return { success: false };
  }
}

// --- 6. IMPORTAR FOTO DE PRODUTO (cola o link da loja) ---
// Usa a lógica compartilhada (OG + JSON-LD + fallback Microlink) e embute a
// imagem em base64 para persistir a foto e evitar problemas de CORS.
export async function fetchProductPreview(rawUrl: string) {
  await requireUserId();
  try {
    const preview = await getProductPreview(rawUrl);
    if (!preview.success || !preview.image) {
      return { success: false as const, message: preview.message || "Não encontrei uma imagem nesse link." };
    }

    const image = await inlineImageAsBase64(preview.image);
    return {
      success: true as const,
      image,
      title: preview.title,
      brand: preview.brand,
    };
  } catch (error) {
    console.error("Erro ao importar produto:", error);
    return { success: false as const, message: "Falha ao importar a partir do link." };
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
      } catch {
        return { success: false, message: "Erro ao registrar o uso da peça." };
      }
}