"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { decrypt, encrypt } from "@/lib/crypto";

// --- CRIAR ACESSO ---
export async function createAccess(formData: FormData) {
  try {
    const title = formData.get("title") as string;
    const password = formData.get("password") as string;
    
    if (!title || !password) {
      throw new Error("Título e Senha são obrigatórios.");
    }

    const encryptedPassword = encrypt(password);

    await prisma.accessItem.create({
      data: {
        title,
        username: (formData.get("username") as string) || null,
        password: encryptedPassword,
        url: (formData.get("url") as string) || null,
        category: (formData.get("category") as string) || "OTHERS",
        // ✅ AQUI: Garantindo que as notas sejam salvas
        notes: (formData.get("notes") as string) || null, 
        // ✅ AQUI: Garantindo que o cliente seja salvo
        client: (formData.get("client") as string) || null, 
        userId: null, // Se tiver auth, coloque o ID do usuário aqui
      },
    });

    revalidatePath("/access");
    return { success: true };

  } catch (error) {
    console.error("Erro ao criar:", error);
    throw new Error("Falha ao salvar no cofre.");
  }
}

// --- ATUALIZAR ACESSO ---
export async function updateAccess(formData: FormData) {
  try {
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const submittedPassword = formData.get("password") as string;

    if (!id || !title) throw new Error("Dados inválidos.");

    // Busca item atual para não quebrar a senha se ela não mudou
    const currentItem = await prisma.accessItem.findUnique({ where: { id } });
    if (!currentItem) throw new Error("Item não encontrado");

    // Verifica se precisa re-criptografar a senha
    let finalPassword = currentItem.password;
    if (submittedPassword && submittedPassword !== currentItem.password) {
        finalPassword = encrypt(submittedPassword);
    }

    await prisma.accessItem.update({
      where: { id },
      data: {
        title,
        username: (formData.get("username") as string) || null,
        password: finalPassword,
        url: (formData.get("url") as string) || null,
        category: (formData.get("category") as string) || "OTHERS",
        // ✅ AQUI: Atualizando as notas
        notes: (formData.get("notes") as string) || null, 
        // ✅ AQUI: Atualizando o cliente
        client: (formData.get("client") as string) || null, 
      },
    });

    revalidatePath("/access");
    return { success: true };

  } catch (error) {
    console.error("Erro ao atualizar:", error);
    throw new Error("Falha ao atualizar.");
  }
}

// --- DELETAR ---
export async function deleteAccess(id: string) {
  try {
    await prisma.accessItem.delete({ where: { id } });
    revalidatePath("/access");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar:", error);
    throw new Error("Erro ao deletar.");
  }
}

// --- REVELAR SENHA ---
export async function revealPassword(id: string) {
    const item = await prisma.accessItem.findUnique({
        where: { id },
        select: { password: true }
    });

    if (!item?.password) throw new Error("Senha não encontrada.");

    try {
        return decrypt(item.password);
    } catch {
        return "Erro de Descriptografia";
    }
}