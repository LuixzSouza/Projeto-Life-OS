import { PrismaClient } from "@prisma/client";
import { getDatabasePath } from "./db-config";

const prismaClientSingleton = () => {
  // 1. Tenta pegar o caminho real do arquivo de config
  const dbPath = getDatabasePath();

  // 2. Lógica de Fallback (Segurança)
  // Se existir caminho, usa. Se não, usa um banco temporário na memória
  // ou um arquivo vazio para não travar o build/start.
  const url = dbPath 
    ? `file:${dbPath}` 
    : "file:./setup_needed.db"; 

  // 3. Log para você saber o que está acontecendo no terminal
  if (dbPath) {
    console.log(`✅ [PRISMA] Conectado ao banco principal em: ${dbPath}`);
  } else {
    console.warn(`⚠️ [PRISMA] Sistema não instalado. Aguardando configuração em /setup...`);
  }

  // 4. Inicializa o cliente
  return new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
    // Opcional: Logs de query para debug em desenvolvimento
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
};

// --- Singleton Pattern (Padrão para Next.js não criar múltiplas conexões) ---

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;