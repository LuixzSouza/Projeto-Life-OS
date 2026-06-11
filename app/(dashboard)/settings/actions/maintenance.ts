"use server";

import { prisma } from "@/lib/prisma";
import { getDbProfile } from "@/lib/db-config";
import { isSqliteFamily } from "@/lib/db-dialect";
import { revalidatePath } from "next/cache";

// ============================================================================
// MANUTENÇÃO AVANÇADA
// ============================================================================

// Executa limpeza e compactação do SQLite
export async function optimizeDatabase() {
  // VACUUM/PRAGMA são dialeto SQLite (gate de dialeto): não existem no
  // Postgres/MySQL e não fazem sentido sobre Turso/réplica (o primário é
  // gerenciado na nuvem). Só roda no modo Local, onde há um arquivo .db real.
  const mode = getDbProfile()?.mode;
  if (mode !== "local" || !isSqliteFamily()) {
    return {
      success: false,
      message:
        mode == null
          ? "Banco não configurado."
          : "Otimização (VACUUM) só no modo Local. No Híbrido/Nuvem o Turso cuida disso automaticamente.",
    };
  }

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
  // PRAGMA integrity_check é dialeto SQLite e só faz sentido sobre um ARQUIVO
  // local (Local/Híbrido). Nuvem (Turso/Postgres/...) é gerenciada pelo serviço.
  if (getDbProfile()?.mode === "cloud" || !isSqliteFamily()) {
    return {
      success: false,
      message: "Diagnóstico de arquivo não se aplica a bancos na nuvem — o provedor cuida da integridade.",
    };
  }

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
