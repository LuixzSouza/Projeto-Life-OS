"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- HELPERS ---

// Helper para converter string vazia em null (limpa o banco)
function getValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (!value || typeof value !== "string" || value.trim() === "") {
    return null;
  }
  return value.trim();
}

// Helper para pegar usuário (Simulação de Auth)
async function getAuthenticatedUserId() {
  // TODO: Substituir por auth() real quando configurado
  const user = await prisma.user.findFirst();
  return user?.id;
}


// --- 1. CREATE (CRIAR) ---

export async function createFriend(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Usuário não autenticado." };

    const name = formData.get("name") as string;
    if (!name) return { success: false, message: "O nome é obrigatório." };

    // Tratamento de Data
    const rawDate = formData.get("birthday") as string;
    const birthday = rawDate ? new Date(rawDate) : null;

    await prisma.friend.create({
      data: {
        userId: userId,
        name: name,
        
        // Campos Opcionais
        nickname: getValue(formData, "nickname"),
        proximity: (formData.get("proximity") as string) || "CASUAL",
        email: getValue(formData, "email"),
        phone: getValue(formData, "phone"),
        imageUrl: getValue(formData, "imageUrl"), // Foto (Link ou Base64)
        giftIdeas: getValue(formData, "giftIdeas"), // Ideias de presente
        
        // Datas
        birthday: birthday,

        // Social & Trabalho
        instagram: getValue(formData, "instagram"),
        linkedin: getValue(formData, "linkedin"),
        twitter: getValue(formData, "twitter"),
        jobTitle: getValue(formData, "jobTitle"),
        company: getValue(formData, "company"),

        // Pessoal
        pixKey: getValue(formData, "pixKey"),
        address: getValue(formData, "address"),
        notes: getValue(formData, "notes"),
      }
    });

    revalidatePath("/social");
    return { success: true, message: "Conexão criada com sucesso!" };

  } catch (error) {
    console.error("Erro ao criar:", error);
    return { success: false, message: "Erro ao criar contato." };
  }
}


// --- 2. UPDATE (ATUALIZAR) ---

export async function updateFriend(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Usuário não autenticado." };

    const id = formData.get("id") as string;
    const name = formData.get("name") as string;

    if (!id) return { success: false, message: "ID do contato não encontrado." };
    if (!name) return { success: false, message: "O nome é obrigatório." };

    const rawDate = formData.get("birthday") as string;
    const birthday = rawDate ? new Date(rawDate) : null;

    await prisma.friend.update({
      where: { 
        id: id,
        // Garante que só atualiza se pertencer ao usuário (Segurança)
        userId: userId 
      },
      data: {
        name: name,
        nickname: getValue(formData, "nickname"),
        proximity: (formData.get("proximity") as string) || "CASUAL",
        email: getValue(formData, "email"),
        phone: getValue(formData, "phone"),
        imageUrl: getValue(formData, "imageUrl"),
        giftIdeas: getValue(formData, "giftIdeas"),
        
        birthday: birthday,

        instagram: getValue(formData, "instagram"),
        linkedin: getValue(formData, "linkedin"),
        twitter: getValue(formData, "twitter"),
        jobTitle: getValue(formData, "jobTitle"),
        company: getValue(formData, "company"),

        pixKey: getValue(formData, "pixKey"),
        address: getValue(formData, "address"),
        notes: getValue(formData, "notes"),
      }
    });

    revalidatePath("/social");
    return { success: true, message: "Dados atualizados com sucesso!" };

  } catch (error) {
    console.error("Erro ao atualizar:", error);
    return { success: false, message: "Erro ao atualizar contato." };
  }
}


// --- 3. DELETE (DELETAR) ---

export async function deleteFriend(id: string) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Usuário não autenticado." };

    if (!id) return { success: false, message: "ID inválido." };

    await prisma.friend.delete({
      where: { 
        id: id,
        userId: userId // Garante que o usuário é dono do registro
      }
    });

    revalidatePath("/social");
    return { success: true, message: "Contato removido." };

  } catch (error) {
    console.error("Erro ao deletar:", error);
    return { success: false, message: "Erro ao excluir contato." };
  }
}