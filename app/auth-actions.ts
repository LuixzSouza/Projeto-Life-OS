"use server";

import { prisma } from "@/lib/prisma";
import { login, logout } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function authenticate(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Verificação simples (em produção real usaria bcrypt, mas para local serve)
  if (!user || user.password !== password) {
    return { error: "Email ou senha incorretos." };
  }

  // Cria a sessão
  await login(user.id);

  redirect("/dashboard");
}

export async function signOut() {
    await logout();
    redirect("/login");
}