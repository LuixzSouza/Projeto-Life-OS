"use server";

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { login } from "@/lib/auth";

export async function setupSystem(formData: FormData) {
  const name = formData.get("name") as string;
  const bio = formData.get("bio") as string;
  
  // Validação de Segurança: Se não tem nome, não cria nada
  if (!name || name.trim() === "") {
      throw new Error("Nome é obrigatório.");
  }

  const aiProvider = formData.get("aiProvider") as string;
  const theme = formData.get("theme") as string;
  const currency = formData.get("currency") as string;
  const workStart = formData.get("workStart") as string;
  const workEnd = formData.get("workEnd") as string;

  const newUser = await prisma.user.create({
    data: {
      name: name,
      email: "admin@lifeos.local", // O email padrão que ele vai usar pra logar
      password: "admin", // A senha padrão
      bio: bio || "",
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`,
    }
  });

  // 1. Cria o Usuário Admin
  await prisma.user.create({
    data: {
      name: name,
      email: "admin@lifeos.local",
      password: "admin",
      bio: bio || "", // Garante string vazia se for null
      avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`,
    }
  });

  // 2. Cria as Configurações
  await prisma.settings.create({
    data: {
      aiProvider: aiProvider || "ollama",
      theme: theme || "system",
      currency: currency || "BRL",
      workStart: workStart || "09:00",
      workEnd: workEnd || "18:00",
      language: "pt-BR",
      aiModel: aiProvider === 'ollama' ? 'llama3' : 'gpt-3.5-turbo'
    }
  });

  await login(newUser.id);

  redirect("/dashboard");
}

export async function completeOnboarding() {
  const settings = await prisma.settings.findFirst();
  if (settings) {
    await prisma.settings.update({
      where: { id: settings.id },
      data: { onboardingCompleted: true }
    });
    revalidatePath("/");
  }
}