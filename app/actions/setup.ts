"use server";

import type { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { login, hashPassword } from "@/lib/auth";
import { setDbProfile, getEnvProfile, type DbProfile } from "@/lib/db-config";
import { reconnectPrisma, buildClient } from "@/lib/prisma";
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

  const probe = path.join(storagePath, ".lifeos_write_test");
  try {
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
  } catch {
    throw new Error(`A pasta existe mas não é gravável: ${storagePath}`);
  }
}

/**
 * Resolve o perfil de banco a partir do formulário do wizard.
 * - local: valida/cria a pasta e aponta para `<pasta>/life_os.db`.
 * - cloud: valida a URL do Turso (libSQL) e o token.
 * Retorna também o `storagePath` para gravar em Settings (vazio na nuvem).
 */
function resolveProfileFromForm(formData: FormData): {
  profile: DbProfile;
  storagePath: string;
} {
  const mode = (formData.get("storageMode") as string) || "local";

  if (mode === "cloud") {
    const url = ((formData.get("tursoUrl") as string) || "").trim();
    const authToken = ((formData.get("tursoToken") as string) || "").trim() || undefined;
    if (!url) throw new Error("A URL do banco na nuvem (Turso) é obrigatória.");
    if (!/^(libsql|https?):\/\//.test(url)) {
      throw new Error("URL inválida. Use o formato libsql://... ou https://...");
    }
    return { profile: { mode: "cloud", provider: "turso", url, authToken }, storagePath: "" };
  }

  const storagePath = formData.get("storagePath") as string;
  if (!storagePath) throw new Error("O caminho do banco de dados é obrigatório.");
  ensureWritableFolder(storagePath);
  const dbFilePath = path.join(storagePath, "life_os.db");
  return { profile: { mode: "local", databasePath: dbFilePath }, storagePath };
}

export async function setupSystem(formData: FormData) {
  let tempPrisma: PrismaClient | null = null;

  try {
    console.log("🚀 Iniciando Setup Completo...");

    // --- PARTE 1: PERFIL DE BANCO (local OU nuvem) ---
    // Em deploy serverless (Vercel) o banco vem de env vars (TURSO_*) — nesse
    // caso ignoramos os campos do formulário e usamos o perfil já configurado.
    const envProfile = getEnvProfile();
    const { profile, storagePath } = envProfile
      ? { profile: envProfile, storagePath: "" }
      : resolveProfileFromForm(formData);

    // --- PARTE 2: CONEXÃO DIRETA + CRIAÇÃO DE SCHEMA ---
    // Cliente NOVO para o destino escolhido (ignora cache antigo). As tabelas
    // são criadas via SQL baseline em runtime — SEM `npx prisma db push`.
    tempPrisma = buildClient(profile);

    console.log(`📦 Garantindo schema (${profile.mode})...`);
    await ensureSchema(tempPrisma);

    // Proteção de dados: se já existe usuário, o banco é de uma instalação
    // anterior. Não sobrescrevemos — conectamos e orientamos a fazer login.
    const existingUsers = await tempPrisma.user.count();
    if (existingUsers > 0) {
      setDbProfile(profile);
      await reconnectPrisma();
      throw new Error(
        "Já existe um banco do Life OS neste destino. Conexão restaurada — faça login com sua conta existente."
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

    // Modelo padrão por provedor (o usuário pode trocar depois em Configurações).
    const DEFAULT_MODELS: Record<string, string> = {
      ollama: "llama3",
      openai: "gpt-4o",
      groq: "llama-3.3-70b-versatile",
      gemini: "gemini-1.5-flash",
    };

    await tempPrisma.settings.create({
      data: {
        aiProvider, theme, currency, workStart, workEnd,
        language: "pt-BR",
        aiModel: DEFAULT_MODELS[aiProvider] ?? "gpt-4o",
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
    // Salva o perfil ANTES de reconectar para que o prisma global aponte para o
    // destino novo — assim o login imediato funciona SEM reiniciar o servidor.
    setDbProfile(profile);
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
