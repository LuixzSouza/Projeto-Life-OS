"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ============================================================================
// MANUTENÇÃO AVANÇADA
// ============================================================================

// Executa limpeza e compactação do SQLite
export async function optimizeDatabase() {
  try {
    const startTime = performance.now();

    // VACUUM: Reconstrói o banco para liberar espaço não utilizado
    await prisma.$executeRawUnsafe(`VACUUM;`);

    // OPTIMIZE: Melhora a performance de queries futuras
    await prisma.$executeRawUnsafe(`PRAGMA optimize;`);

    const duration = (performance.now() - startTime).toFixed(0);

    // Recalcula stats para mostrar a diferença
    revalidatePath("/settings");

    return {
      success: true,
      message: `Banco otimizado e compactado em ${duration}ms.`
    };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao otimizar banco de dados." };
  }
}

// Verifica se o arquivo .db está saudável
export async function checkDatabaseIntegrity() {
  try {
    // PRAGMA integrity_check: Verifica consistência e corrupção
    const result = await prisma.$queryRawUnsafe<{ integrity_check: string }[]>(`PRAGMA integrity_check;`);

    // O resultado vem como array. Se o primeiro item for "ok", está tudo certo.
    // O retorno do Raw pode variar, então tratamos como any seguro ou unknown
    const status =  Array.isArray(result) && result[0] ? Object.values(result[0])[0] : "unknown";

    if (status === "ok") {
      return { success: true, message: "Integridade verificada: 100% Saudável." };
    } else {
      return { success: false, message: `Problemas encontrados: ${status}` };
    }
  } catch (error) {
    return { success: false, message: "Falha ao rodar diagnóstico." };
  }
}
