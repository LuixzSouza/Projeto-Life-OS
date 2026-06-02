"use server";

import { prisma } from "@/lib/prisma";
import { login, logout, verifyPassword } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isSystemInstalled } from "@/lib/db-config";

// 1. Definimos o tipo do estado (pode ser um erro ou nulo)
export type AuthState = {
  error?: string;
  message?: string;
} | null;

export async function authenticate(prevState: AuthState, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    // 2. Verificação de Segurança de Instalação
    if (!isSystemInstalled()) {
        return { error: "Sistema não instalado. Acesse /setup." };
    }

    // 3. Busca o usuário no banco
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 4. Verifica senha (hash bcrypt)
    if (!user || !(await verifyPassword(password, user.password))) {
      return { error: "Email ou senha incorretos." };
    }

    // 5. Cria a sessão
    await login(user.id);

  } catch (error) {
    // Tratamento específico para o erro de redirecionamento do Next.js
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        throw error;
    }
    
    console.error("Erro de Autenticação:", error);
    return { error: "Erro no servidor. Tente novamente." };
  }

  // 6. Redirecionamento (Sucesso)
  // Fora do try/catch para evitar conflito com o Next.js
  redirect("/dashboard");
}

export async function signOut() {
    await logout();
    redirect("/login");
}

