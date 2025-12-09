"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { decrypt, encrypt } from "@/lib/crypto"; // Importando a segurança

// --- CRIAR ACESSO (Com Criptografia) ---
export async function createAccess(formData: FormData) {
  try {
    const title = formData.get("title") as string;
    const password = formData.get("password") as string;
    
    // Validação Básica
    if (!title || !password) {
      throw new Error("Título e Senha são obrigatórios.");
    }

    const username = formData.get("username") as string;
    const url = formData.get("url") as string;
    const category = formData.get("category") as string;
    const notes = formData.get("notes") as string;

    // Busca usuário dono (Em app real, pegaria da sessão)
    const user = await prisma.user.findFirst();

    // 🔒 CRIPTOGRAFAR A SENHA ANTES DE SALVAR
    const encryptedPassword = encrypt(password);

    await prisma.accessItem.create({
      data: {
        title,
        username: username || null,
        password: encryptedPassword, // Salva o hash, nunca o texto puro
        url: url || null,
        category: category || "OTHERS",
        notes: notes || null,
        userId: user?.id,
      },
    });

    revalidatePath("/access");
    return { success: true };

  } catch (error) {
    console.error("Erro ao criar acesso:", error);
    throw new Error("Falha ao salvar no cofre.");
  }
}

// --- ATUALIZAR ACESSO ---
export async function updateAccess(formData: FormData) {
  try {
    const id = formData.get("id") as string;
    const title = formData.get("title") as string;
    const password = formData.get("password") as string;

    if (!id || !title || !password) {
        throw new Error("Dados inválidos para atualização.");
    }

    // 🔒 CRIPTOGRAFAR A NOVA SENHA
    // Nota: Se o formulário enviar a senha já descriptografada (texto puro), 
    // nós a encriptamos novamente.
    const encryptedPassword = encrypt(password);

    await prisma.accessItem.update({
      where: { id },
      data: {
        title,
        username: formData.get("username") as string,
        password: encryptedPassword, // Atualiza com a nova encriptação
        url: formData.get("url") as string,
        category: formData.get("category") as string,
        notes: formData.get("notes") as string,
      },
    });

    revalidatePath("/access");
    return { success: true };

  } catch (error) {
    console.error("Erro ao atualizar acesso:", error);
    throw new Error("Falha ao atualizar o registro.");
  }
}

// --- DELETAR ACESSO ---
export async function deleteAccess(id: string) {
  try {
    await prisma.accessItem.delete({ where: { id } });
    revalidatePath("/access");
    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar:", error);
    throw new Error("Não foi possível remover o item.");
  }
}

export async function revealPassword(id: string) {
    const item = await prisma.accessItem.findUnique({
        where: { id },
        select: { password: true } // Busca apenas a senha criptografada
    });

    if (!item || !item.password) {
        throw new Error("Item não encontrado.");
    }

    // Descriptografa no servidor e retorna o texto plano para o cliente
    const plainPassword = decrypt(item.password);
    return plainPassword;
}