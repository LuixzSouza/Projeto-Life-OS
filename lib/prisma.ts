import { PrismaClient } from "@prisma/client";
import { getDatabasePath } from "./db-config";

// Função que cria o cliente com a URL dinâmica
const prismaClientSingleton = () => {
  const dbPath = getDatabasePath();
  const url = `file:${dbPath}`; // Formato que o SQLite exige

  console.log(`🔌 Conectando ao Banco de Dados em: ${dbPath}`);

  return new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
  });
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;