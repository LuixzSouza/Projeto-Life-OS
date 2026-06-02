import { PrismaClient } from "@prisma/client";
import { resolveDatabaseUrl } from "./db-config";

// URL de fallback usada quando o sistema ainda não foi instalado (/setup).
// Mantém o build/start do Next.js de pé sem um banco real configurado.
const FALLBACK_URL = "file:./setup_needed.db";

interface PrismaState {
  client: PrismaClient | null;
  url: string | null;
}

// Estado guardado no globalThis para sobreviver ao HMR do Next.js em dev
// (evita abrir múltiplas conexões a cada reload).
declare global {
  var __prismaState: PrismaState | undefined;
}

const state: PrismaState = globalThis.__prismaState ?? { client: null, url: null };
if (process.env.NODE_ENV !== "production") globalThis.__prismaState = state;

function buildClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * Retorna o PrismaClient apontando para o banco ATUAL. Se o perfil de banco
 * mudou desde a última chamada (ex.: logo após o /setup ou ao mover a pasta),
 * descarta o cliente antigo e cria um novo — sem precisar reiniciar o servidor.
 */
function getClient(): PrismaClient {
  const url = resolveDatabaseUrl() ?? FALLBACK_URL;

  if (state.client && state.url === url) {
    return state.client;
  }

  // URL mudou (ou primeira inicialização): reconstrói a conexão.
  if (state.client) {
    const old = state.client;
    // Fecha em background; não bloqueia a request atual.
    void old.$disconnect().catch(() => {});
  }

  if (url === FALLBACK_URL) {
    console.warn("⚠️ [PRISMA] Sistema não instalado. Aguardando configuração em /setup...");
  } else {
    console.log(`✅ [PRISMA] Conectado ao banco em: ${url}`);
  }

  state.client = buildClient(url);
  state.url = url;
  return state.client;
}

/**
 * Força o descarte do cliente atual. A próxima query reconecta usando o perfil
 * de banco mais recente. Chamar após gravar um novo perfil (setup / mover pasta).
 */
export async function reconnectPrisma(): Promise<void> {
  if (state.client) {
    await state.client.$disconnect().catch(() => {});
  }
  state.client = null;
  state.url = null;
}

// Proxy que delega cada acesso ao cliente vivo resolvido por getClient().
// Mantém o uso `prisma.user`, `prisma.$transaction`, etc. idêntico ao anterior,
// então nenhum dos imports espalhados pelo app precisa mudar.
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
