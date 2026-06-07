"use server";

import type { PrismaClient } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { login, hashPassword } from "@/lib/auth";
import { setDbProfile, getEnvProfile, isEphemeralServerless, type DbProfile } from "@/lib/db-config";
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

/**
 * Traduz erros técnicos (Turso/libSQL/fs) em mensagens acionáveis em pt-BR.
 */
function friendlyError(error: unknown, mode: DbProfile["mode"]): string {
  const raw = error instanceof Error ? error.message : String(error);
  const low = raw.toLowerCase();

  // Réplica também fala com o Turso (espelho), então herda o mapeamento da nuvem.
  if (mode === "cloud" || mode === "replica") {
    if (low.includes("401") || low.includes("unauthor")) {
      return "Turso recusou o token (401). O formato está ok, mas este token NÃO vale para este banco. Gere um token NOVO abrindo o banco específico no dashboard (ou `turso db tokens create <nome-do-banco>`). Atenção: token de API da conta ≠ token do banco; e se o banco foi recriado, tokens antigos param de valer.";
    }
    if (low.includes("jwt") || low.includes("token")) {
      return "Falha de autenticação no Turso. Verifique o TURSO_AUTH_TOKEN (deve ser o JWT que começa com 'eyJ…', gerado para ESTE banco — não a URL).";
    }
    // HTTP 400 / SERVER_ERROR do Turso quase sempre = token inválido (é comum
    // colar a URL no campo do token por engano). Aponta direto pra causa.
    if (low.includes("400") || low.includes("server_error")) {
      return "O Turso rejeitou a conexão (HTTP 400). Quase sempre é o TURSO_AUTH_TOKEN errado — confirme que é o token JWT (começa com 'eyJ…'), NÃO a URL do banco. Gere com: turso db tokens create <nome-do-banco>.";
    }
    if (low.includes("enotfound") || low.includes("getaddrinfo") || low.includes("fetch failed") || low.includes("econnrefused") || low.includes("url")) {
      return "Não foi possível conectar ao banco Turso. Confira o TURSO_DATABASE_URL (formato libsql://...) e sua conexão.";
    }
  }

  if (low.includes("baseline")) {
    return "Arquivo de schema (baseline.sql) não encontrado no servidor. Problema de build/deploy.";
  }
  // Caso geral: devolve a mensagem original (já é informativa).
  return raw;
}

/**
 * Valida um perfil de nuvem ANTES de tentar conectar. Pega os erros de
 * configuração mais comuns (token ausente, ou a URL colada no campo do token)
 * e lança uma mensagem acionável — em vez de deixar o Turso responder um
 * "HTTP 400" críptico lá na frente.
 */
function assertValidCloudProfile(profile: DbProfile): void {
  // Vale para nuvem pura E réplica (ambas autenticam no Turso com um JWT).
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

export async function setupSystem(
  _prevState: SetupState | null,
  formData: FormData
): Promise<SetupState> {
  let tempPrisma: PrismaClient | null = null;
  // Cliente libSQL bruto (só no modo réplica) — guardado p/ fechar no finally.
  let tempLibsql: { close(): void } | null = null;
  // Default usado nas mensagens de erro antes de o perfil ser resolvido.
  let mode: DbProfile["mode"] = "local";

  try {
    console.log("🚀 Iniciando Setup Completo...");

    // --- PARTE 1: PERFIL DE BANCO (local OU nuvem) ---
    // Em deploy serverless (Vercel) o banco vem de env vars (TURSO_*) — nesse
    // caso ignoramos os campos do formulário e usamos o perfil já configurado.
    const envProfile = getEnvProfile();
    const { profile, storagePath } = envProfile
      ? { profile: envProfile, storagePath: "" }
      : resolveProfileFromForm(formData);
    mode = profile.mode;

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
    await ensureSchema(tempPrisma);

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
    return { error: friendlyError(error, mode) };
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
