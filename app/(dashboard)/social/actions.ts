"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/auth";

// --- HELPERS DE FORMATAÇÃO ---

// Limpa a string e converte vazios em null para manter o banco limpo
function getValue(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (!value || typeof value !== "string" || value.trim() === "") {
    return null;
  }
  return value.trim();
}

// Tratamento seguro de datas para evitar o "Bug do Dia Anterior"
function parseDateSafe(rawDate: string | null): Date | null {
  if (!rawDate) return null;
  // Adicionar T12:00:00Z força a data a cair no meio-dia em UTC.
  // Isso impede que fusos horários locais (-03:00) empurrem o aniversário para o dia anterior.
  return new Date(`${rawDate}T12:00:00Z`);
}

// Extrai e formata todos os campos. (Evita repetir código no Create e Update)
function extractFriendData(formData: FormData) {
  return {
    name: formData.get("name") as string,
    nickname: getValue(formData, "nickname"),
    tags: getValue(formData, "tags"),
    proximity: (formData.get("proximity") as string) || "CASUAL",
    email: getValue(formData, "email"),
    phone: getValue(formData, "phone"),
    imageUrl: getValue(formData, "imageUrl"),
    giftIdeas: getValue(formData, "giftIdeas"),
    birthday: parseDateSafe(getValue(formData, "birthday")),
    instagram: getValue(formData, "instagram"),
    linkedin: getValue(formData, "linkedin"),
    twitter: getValue(formData, "twitter"),
    jobTitle: getValue(formData, "jobTitle"),
    company: getValue(formData, "company"),
    pixKey: getValue(formData, "pixKey"),
    address: getValue(formData, "address"),
    notes: getValue(formData, "notes"),
  };
}

// Helper para pegar o ID do usuário autenticado (sessão JWT)
async function getAuthenticatedUserId() {
  return await getCurrentUserId();
}


// --- 1. CREATE (CRIAR) ---

export async function createFriend(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Sessão expirada. Autentique-se novamente." };

    const data = extractFriendData(formData);
    if (!data.name) return { success: false, message: "O nome é obrigatório." };

    await prisma.friend.create({
      data: {
        userId,
        ...data
      }
    });

    revalidatePath("/social");
    return { success: true, message: "Conexão salva com sucesso!" };

  } catch (error) {
    console.error("Erro ao criar:", error);
    return { success: false, message: "Erro ao salvar contato." };
  }
}


// --- 2. UPDATE (ATUALIZAR) ---

export async function updateFriend(formData: FormData) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Sessão expirada. Autentique-se novamente." };

    const id = formData.get("id") as string;
    if (!id) return { success: false, message: "ID do contato inválido." };

    const data = extractFriendData(formData);
    if (!data.name) return { success: false, message: "O nome é obrigatório." };

    // Usamos updateMany em vez de update para poder checar id e userId juntos
    // sem dar erro de chave composta no Prisma.
    const result = await prisma.friend.updateMany({
      where: { 
        id: id,
        userId: userId 
      },
      data: data
    });

    if (result.count === 0) {
      return { success: false, message: "Contato não encontrado ou permissão negada." };
    }

    revalidatePath("/social");
    return { success: true, message: "Perfil atualizado!" };

  } catch (error) {
    console.error("Erro ao atualizar:", error);
    return { success: false, message: "Erro ao atualizar dados do contato." };
  }
}


// --- 3. DELETE (DELETAR) ---

export async function deleteFriend(id: string) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) return { success: false, message: "Sessão expirada. Autentique-se novamente." };
    if (!id) return { success: false, message: "ID inválido." };

    const result = await prisma.friend.deleteMany({
      where: { 
        id: id,
        userId: userId 
      }
    });

    if (result.count === 0) {
        return { success: false, message: "Contato não encontrado ou permissão negada." };
    }

    revalidatePath("/social");
    return { success: true, message: "Conexão removida do seu acervo." };

  } catch (error) {
    console.error("Erro ao deletar:", error);
    return { success: false, message: "Erro crítico ao excluir contato." };
  }
}