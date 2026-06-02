"use server";

// NÃO importamos a instância global 'prisma' aqui para evitar cache antigo
import { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { login, hashPassword } from "@/lib/auth";
import { setDbProfile } from "@/lib/db-config";
import { reconnectPrisma } from "@/lib/prisma";
import { ensureSchema } from "@/lib/db-bootstrap";
import { validatePasswordStrength } from "@/lib/password-policy";
import fs from "fs";
import path from "path";

/**
 * Garante que a pasta exista e seja gravável. Lança erro amigável caso
 * contrário (permissão / caminho inválido) ANTES de criar qualquer dado.
 */
function ensureWritableFolder(storagePath: string) {
  if (!fs.existsSync(storagePath)) {
    try {
      fs.mkdirSync(storagePath, { recursive: true });
    } catch {
      throw new Error(`Sem permissão para criar a pasta: ${storagePath}`);
    }
  }

  // Teste de escrita real (cria e remove um arquivo temporário).
  const probe = path.join(storagePath, ".lifeos_write_test");
  try {
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
  } catch {
    throw new Error(`A pasta existe mas não é gravável: ${storagePath}`);
  }
}

export async function setupSystem(formData: FormData) {
  let tempPrisma: PrismaClient | null = null;

  try {
    console.log("🚀 Iniciando Setup Completo...");

    // --- PARTE 1: CONFIGURAÇÃO DO ARQUIVO ---
    const storagePath = formData.get("storagePath") as string;
    if (!storagePath) throw new Error("O caminho do banco de dados é obrigatório.");

    ensureWritableFolder(storagePath);

    const dbFilePath = path.join(storagePath, "life_os.db");
    const dbUrl = `file:${dbFilePath}`;

    // --- PARTE 2: CONEXÃO DIRETA + CRIAÇÃO DE SCHEMA ---
    // Cliente NOVO apontando explicitamente para o banco escolhido (ignora
    // qualquer cache antigo). As tabelas são criadas via SQL baseline em
    // runtime — SEM depender de `npx prisma db push` (compatível com desktop).
    tempPrisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });

    console.log("📦 Garantindo schema no arquivo:", dbFilePath);
    await ensureSchema(tempPrisma);

    // Proteção de dados: se já existe um usuário, o banco é de uma instalação
    // anterior. Não sobrescrevemos — conectamos e orientamos a fazer login.
    const existingUsers = await tempPrisma.user.count();
    if (existingUsers > 0) {
      setDbProfile({ mode: "local", databasePath: dbFilePath });
      await reconnectPrisma();
      throw new Error(
        "Já existe um banco do Life OS nesta pasta. Conexão restaurada — faça login com sua conta existente."
      );
    }

    // --- PARTE 3: CRIAÇÃO DE DADOS ---
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const bio = formData.get("bio") as string;

    const aiProvider = (formData.get("aiProvider") as string) || "ollama";
    const theme = (formData.get("theme") as string) || "system";
    const currency = (formData.get("currency") as string) || "BRL";
    const workStart = (formData.get("workStart") as string) || "09:00";
    const workEnd = (formData.get("workEnd") as string) || "18:00";

    if (!name || !email || !password) throw new Error("Dados obrigatórios faltando.");

    const pwCheck = validatePasswordStrength(password);
    if (!pwCheck.valid) throw new Error(pwCheck.message!);

    console.log("👤 Inserindo Admin no banco...");

    const adminUser = await tempPrisma.user.create({
      data: {
        name,
        email,
        password: await hashPassword(password),
        bio: bio || "Admin",
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=06b6d4&color=fff&bold=true`,
      },
    });

    await tempPrisma.settings.create({
      data: {
        aiProvider, theme, currency, workStart, workEnd,
        language: "pt-BR",
        aiModel: aiProvider === "ollama" ? "llama3" : "gpt-4o",
        onboardingCompleted: true,
        userId: adminUser.id,
        storagePath: storagePath,
      },
    });

    // Conta Demo
    const demoEmail = "demo@lifeos.local";
    const demoExists = await tempPrisma.user.findUnique({ where: { email: demoEmail } });
    if (!demoExists) {
      await tempPrisma.user.create({
        data: {
          name: "Usuário Demo",
          email: demoEmail,
          password: await hashPassword("demo"),
          bio: "Conta de testes.",
          avatarUrl: `https://ui-avatars.com/api/?name=Demo&background=333&color=fff`,
        },
      });
    }

    console.log("✅ Dados inseridos com sucesso!");

    // --- PARTE 4: ATIVA O PERFIL E RECONECTA O CLIENTE GLOBAL ---
    // Salva o perfil ANTES de reconectar para que o prisma global passe a
    // apontar para o banco novo — assim o login imediato funciona SEM reiniciar.
    setDbProfile({ mode: "local", databasePath: dbFilePath });
    await reconnectPrisma();

    await login(adminUser.id);
  } catch (error) {
    console.error("❌ Erro CRÍTICO no Setup:", error);
    throw new Error(error instanceof Error ? error.message : "Falha desconhecida.");
  } finally {
    if (tempPrisma) {
      await tempPrisma.$disconnect();
    }
  }

  revalidatePath("/");
  redirect("/dashboard");
}

// Função auxiliar usada pelo componente de Tour
export async function completeOnboarding() {
  const { prisma } = await import("@/lib/prisma");

  try {
    const { getCurrentUserId } = await import("@/lib/auth");
    const userId = await getCurrentUserId();
    if (userId) {
      await prisma.settings.updateMany({
        where: { userId },
        data: { onboardingCompleted: true },
      });
      revalidatePath("/");
    }
  } catch (error) {
    console.error("Erro onboarding:", error);
  }
}
