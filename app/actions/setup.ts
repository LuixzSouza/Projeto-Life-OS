"use server";

import type { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { login, hashPassword } from "@/lib/auth";
import {
  setDbProfile,
  getEnvProfile,
  isEphemeralServerless,
  detectProviderFromUrl,
  type DbProfile,
} from "@/lib/db-config";
import { friendlyDbError } from "@/lib/db-errors";
import { dialectOf } from "@/lib/db-dialect";
import { reconnectPrisma, buildAdapterClient } from "@/lib/prisma";
import { ensureSchema } from "@/lib/db-bootstrap";
import { mergeSqliteIntoTurso } from "@/lib/db-migrate";
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
  const dbProvider = ((formData.get("dbProvider") as string) || "").trim();

  // --- PostgreSQL / Supabase (DATABASE_ROADMAP Fase 1/2) ---
  if (mode === "cloud" && (dbProvider === "postgres" || dbProvider === "supabase")) {
    let url = ((formData.get("pgUrl") as string) || "").trim();
    if (!url) throw new Error("A connection string do PostgreSQL é obrigatória.");
    // PEGADINHA #1 (Supabase): colaram a service_role key (JWT) em vez da
    // connection string do banco. A key da API NUNCA entra aqui.
    if (/^eyJ/.test(url)) {
      throw new Error(
        "Isso é uma API key (JWT), não a connection string. No Supabase use Settings → Database → Connection string (URI) — formato postgresql://usuario:senha@host:porta/banco."
      );
    }
    if (!/^postgres(ql)?:\/\//i.test(url)) {
      throw new Error("URL inválida. Use o formato postgresql://usuario:senha@host:porta/banco.");
    }
    // SSL por padrão em host remoto (segurança §3): adiciona sslmode=require
    // se faltar — self-hosted local (localhost) fica como está.
    const isLocalHost = /@(localhost|127\.0\.0\.1)[:/]/i.test(url);
    if (!isLocalHost && !/sslmode=/i.test(url)) {
      url += (url.includes("?") ? "&" : "?") + "sslmode=require";
    }
    // Detecção fina: URL *.supabase.co vira provider "supabase" mesmo se o
    // card escolhido foi o Postgres genérico (e vice-versa).
    const detected = detectProviderFromUrl(url);
    const provider = detected === "supabase" || detected === "postgres" ? detected : "postgres";
    return { profile: { mode: "cloud", provider, url }, storagePath: "" };
  }

  if (mode === "cloud") {
    const url = ((formData.get("tursoUrl") as string) || "").trim();
    const authToken = ((formData.get("tursoToken") as string) || "").trim() || undefined;
    if (!url) throw new Error("A URL do banco na nuvem (Turso) é obrigatória.");
    if (!/^(libsql|https?):\/\//.test(url)) {
      throw new Error("URL inválida. Use o formato libsql://... ou https://...");
    }
    return { profile: { mode: "cloud", provider: "turso", url, authToken }, storagePath: "" };
  }

  // Réplica embarcada: precisa de pasta local (arquivo) + Turso espelho (url/token).
  if (mode === "replica") {
    const storagePath = formData.get("storagePath") as string;
    const url = ((formData.get("tursoUrl") as string) || "").trim();
    const authToken = ((formData.get("tursoToken") as string) || "").trim() || undefined;
    if (!storagePath) throw new Error("A pasta local da réplica é obrigatória.");
    if (!url) throw new Error("A URL do banco espelho (Turso) é obrigatória.");
    if (!/^(libsql|https?):\/\//.test(url)) {
      throw new Error("URL inválida. Use o formato libsql://... ou https://...");
    }
    // Aceita pasta ou arquivo .db (usa a pasta dele). O cache da réplica usa um
    // nome PRÓPRIO (life_os.replica.db) para nunca confundir/sobrescrever um
    // life_os.db "local" que já exista na pasta — esse arquivo antigo é, na
    // verdade, a ORIGEM da migração para o Turso.
    const folder = storagePath.toLowerCase().endsWith(".db") ? path.dirname(storagePath) : storagePath;
    ensureWritableFolder(folder);
    const dbFilePath = path.join(folder, "life_os.replica.db");
    return {
      profile: { mode: "replica", databasePath: dbFilePath, syncUrl: url, authToken },
      storagePath: folder,
    };
  }

  const storagePath = formData.get("storagePath") as string;
  if (!storagePath) throw new Error("O caminho do banco de dados é obrigatório.");

  // Aceita um arquivo .db existente (conecta a ele) OU uma pasta (cria life_os.db).
  const isDbFile = storagePath.toLowerCase().endsWith(".db");
  const folder = isDbFile ? path.dirname(storagePath) : storagePath;
  ensureWritableFolder(folder);
  const dbFilePath = isDbFile ? storagePath : path.join(folder, "life_os.db");
  return { profile: { mode: "local", databasePath: dbFilePath }, storagePath: folder };
}

/** Estado retornado para o wizard (useActionState). */
export interface SetupState {
  error?: string;
  /** true quando o erro indica que já existe conta — wizard sugere /login. */
  existing?: boolean;
}

// Tradução de erros técnicos: promovida para lib/db-errors.ts (Resiliência §2
// do DATABASE_ROADMAP) — o setup usa a MESMA tradução que o runtime.

/**
 * Valida um perfil de nuvem ANTES de tentar conectar. Pega os erros de
 * configuração mais comuns (token ausente, ou a URL colada no campo do token)
 * e lança uma mensagem acionável — em vez de deixar o Turso responder um
 * "HTTP 400" críptico lá na frente.
 */
function assertValidCloudProfile(profile: DbProfile): void {
  // Vale para Turso (nuvem) E réplica (ambas autenticam no Turso com um JWT).
  // Postgres/Supabase autenticam pela senha NA URL — validados no resolve.
  if (profile.mode === "cloud" && profile.provider !== "turso") return;
  if (profile.mode !== "cloud" && profile.mode !== "replica") return;
  const token = profile.authToken?.trim();
  if (!token) {
    throw new Error(
      "TURSO_AUTH_TOKEN ausente. Gere um token com `turso db tokens create <nome-do-banco>` e configure nas variáveis de ambiente do servidor."
    );
  }
  // O token é um JWT (começa com 'eyJ…'). Se vier uma URL, foi colado o campo errado.
  if (/^(libsql|wss?|https?):\/\//i.test(token)) {
    throw new Error(
      "TURSO_AUTH_TOKEN contém uma URL, não um token. O token é um JWT que começa com 'eyJ…' — confira se você não colou a URL do banco (TURSO_DATABASE_URL) no campo do token."
    );
  }
  // Um token Turso é um JWT: começa com 'eyJ' e tem 3 partes separadas por ponto.
  // Pega segredos truncados / colados pela metade antes de gastar uma viagem ao Turso.
  if (!/^eyJ[\w-]+\.[\w-]*\.[\w-]+$/.test(token)) {
    throw new Error(
      "TURSO_AUTH_TOKEN não parece um token válido. Deve ser o JWT completo (formato 'eyJ….….…', 3 partes) gerado para ESTE banco no dashboard do Turso."
    );
  }
}

/**
 * Testa uma connection string de Postgres/Supabase ANTES de instalar (botão
 * "Testar conexão" do wizard — UX de status §3). Pré-instalação não há login;
 * com o sistema instalado, exige sessão (não vira um proxy de teste aberto).
 */
export async function testPostgresSetupConnection(
  rawUrl: string
): Promise<{ success: boolean; message: string }> {
  const { isSystemInstalled } = await import("@/lib/db-config");
  if (isSystemInstalled()) {
    const { getCurrentUserId } = await import("@/lib/auth");
    if (!(await getCurrentUserId())) {
      return { success: false, message: "Faça login para testar conexões." };
    }
  }

  let url = (rawUrl || "").trim();
  if (!url) return { success: false, message: "Informe a connection string." };
  if (/^eyJ/.test(url)) {
    return {
      success: false,
      message: "Isso é uma API key (JWT), não a connection string. Use a URI postgresql://… do banco.",
    };
  }
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    return { success: false, message: "URL inválida. Use o formato postgresql://usuario:senha@host:porta/banco." };
  }
  const isLocalHost = /@(localhost|127\.0\.0\.1)[:/]/i.test(url);
  if (!isLocalHost && !/sslmode=/i.test(url)) {
    url += (url.includes("?") ? "&" : "?") + "sslmode=require";
  }
  const detected = detectProviderFromUrl(url);
  const provider = detected === "supabase" ? "supabase" : "postgres";
  const profile: DbProfile = { mode: "cloud", provider, url };

  const built = buildAdapterClient(profile);
  try {
    await built.client.$queryRawUnsafe("SELECT 1");
    return {
      success: true,
      message: provider === "supabase"
        ? "Conexão com o Supabase validada — pode concluir a instalação."
        : "Conexão com o PostgreSQL validada — pode concluir a instalação.",
    };
  } catch (error) {
    return { success: false, message: friendlyDbError(error, profile) };
  } finally {
    await built.client.$disconnect().catch(() => {});
  }
}

export async function setupSystem(
  _prevState: SetupState | null,
  formData: FormData
): Promise<SetupState> {
  let tempPrisma: PrismaClient | null = null;
  // Cliente libSQL bruto (só no modo réplica) — guardado p/ fechar no finally.
  let tempLibsql: { close(): void } | null = null;
  // Perfil resolvido — usado p/ traduzir erros por provedor (null até resolver).
  let profileForErrors: DbProfile | null = null;

  try {
    console.log("🚀 Iniciando Setup Completo...");

    // --- PARTE 1: PERFIL DE BANCO (local OU nuvem) ---
    // Em deploy serverless (Vercel) o banco vem de env vars (TURSO_*) — nesse
    // caso ignoramos os campos do formulário e usamos o perfil já configurado.
    const envProfile = getEnvProfile();
    const { profile, storagePath } = envProfile
      ? { profile: envProfile, storagePath: "" }
      : resolveProfileFromForm(formData);
    profileForErrors = profile;

    // Pega config de nuvem inválida (token ausente / URL no lugar do token)
    // antes de gastar uma viagem ao Turso só pra receber um 400 opaco.
    assertValidCloudProfile(profile);

    // --- PARTE 2: CONEXÃO DIRETA + CRIAÇÃO DE SCHEMA ---
    // Cliente NOVO para o destino escolhido (ignora cache antigo). As tabelas
    // são criadas via SQL baseline em runtime — SEM `npx prisma db push`.
    const built = buildAdapterClient(profile);
    tempPrisma = built.client;
    tempLibsql = built.libsql;

    // Réplica: puxa o estado atual do Turso espelho ANTES de checar/instalar.
    // Assim, se o espelho já tiver dados (instalação anterior), detectamos pelo
    // count de usuários e não recriamos schema à toa. Best-effort no 1º uso.
    if (built.libsql) {
      console.log("🔄 Sincronizando réplica com o Turso espelho...");
      try {
        await built.libsql.sync();
      } catch (e) {
        console.warn("⚠️ Primeiro sync da réplica falhou (seguindo p/ criar schema):", e);
      }
    }

    console.log(`📦 Garantindo schema (${profile.mode})...`);
    await ensureSchema(tempPrisma, dialectOf(profile));

    // --- PARTE 2b: MIGRAÇÃO AUTOMÁTICA (modo réplica) ---
    // Se a pasta escolhida já tiver um life_os.db "local" com dados (instalação
    // anterior), mesclamos tudo para o Turso ANTES de checar usuários — assim o
    // count abaixo já reflete os dados importados e o usuário cai no login da
    // própria conta, sem recriar admin nem perder nada.
    if (profile.mode === "replica" && storagePath) {
      const legacyLocal = path.join(storagePath, "life_os.db");
      if (fs.existsSync(legacyLocal)) {
        try {
          console.log("📤 Migrando dados locais existentes para o Turso (mesclar)...");
          const r = await mergeSqliteIntoTurso(legacyLocal, {
            url: profile.syncUrl,
            authToken: profile.authToken,
          });
          console.log(
            `✅ Migração: ${r.inserted} inseridas / ${r.skipped} já existiam (${r.tables} tabelas).`
          );
          // Re-sincroniza para a réplica local enxergar o que acabou de subir.
          if (built.libsql) await built.libsql.sync().catch(() => {});
        } catch (e) {
          console.warn("⚠️ Migração local→Turso falhou (seguindo sem importar):", e);
        }
      }
    }

    // Proteção de dados: se já existe usuário, o banco é de uma instalação
    // anterior. Não sobrescrevemos — conectamos e orientamos a fazer login.
    const existingUsers = await tempPrisma.user.count();
    if (existingUsers > 0) {
      setDbProfile(profile);
      await reconnectPrisma();
      return {
        existing: true,
        error: "Já existe um banco do Life OS neste destino. Conexão restaurada — é só fazer login com sua conta.",
      };
    }

    // --- PARTE 3: CRIAÇÃO DE DADOS ---
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const bio = formData.get("bio") as string;

    // "gemini" era o id antigo do wizard; o canônico no sistema é "google".
    const rawProvider = (formData.get("aiProvider") as string) || "ollama";
    const aiProvider = rawProvider === "gemini" ? "google" : rawProvider;
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
    // Todos suportam tool-calling (requisito do loop agêntico do Cérebro Digital).
    const DEFAULT_MODELS: Record<string, string> = {
      ollama: "llama3.1",
      openai: "gpt-4o",
      anthropic: "claude-sonnet-4-6",
      groq: "llama-3.3-70b-versatile",
      google: "gemini-2.5-flash", // 2.0-flash ficou sem cota no free tier
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

    // Conta Demo — APENAS no desktop local. Em deploy hospedado (Vercel/Turso) a
    // instância é pública: uma conta com senha conhecida ("demo") seria uma porta
    // dos fundos. Por isso só semeamos a demo em ambiente local.
    if (!isEphemeralServerless()) {
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
    return { error: friendlyDbError(error, profileForErrors) };
  } finally {
    if (tempPrisma) {
      await tempPrisma.$disconnect();
    }
    // Para o timer de syncInterval do cliente temporário da réplica.
    if (tempLibsql) {
      try {
        tempLibsql.close();
      } catch {
        /* noop */
      }
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
