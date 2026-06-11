// Verificação de integridade AGENDADA (semanal) — MELHORIAS §4.
// Pega carona no fluxo de lembretes (mesmo truque do auto-backup): roda o
// PRAGMA integrity_check no máximo 1×/semana por máquina. Silenciosa quando
// está tudo bem; cria uma Notification HIGH quando encontra problema (a hora
// de restaurar um snapshot é ANTES da corrupção se espalhar).

import { prisma } from "@/lib/prisma";
import {
  getDbProfile,
  getLastIntegrityCheckAt,
  setLastIntegrityCheckAt,
  isEphemeralServerless,
} from "@/lib/db-config";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Roda a verificação semanal se estiver vencida. Best-effort. */
export async function runIntegrityCheckIfDue(userId: string): Promise<void> {
  // Só faz sentido onde existe um ARQUIVO SQLite (local/réplica) — na nuvem
  // pura o Turso é o responsável; em serverless não há arquivo nem marcador.
  if (isEphemeralServerless()) return;
  const mode = getDbProfile()?.mode;
  if (mode !== "local" && mode !== "replica") return;

  const last = getLastIntegrityCheckAt();
  const now = Date.now();
  if (now - last < WEEK_MS) return;

  // Marca ANTES de rodar (evita re-execução concorrente de outras abas).
  setLastIntegrityCheckAt(now);

  const result = await prisma.$queryRawUnsafe<Record<string, string>[]>("PRAGMA integrity_check;");
  const status = Array.isArray(result) && result[0] ? Object.values(result[0])[0] : "unknown";

  if (status === "ok") {
    console.log("🩺 [integrity] verificação semanal: banco saudável.");
    return;
  }

  console.error("🩺 [integrity] PROBLEMA encontrado:", status);
  const weekKey = new Date(now).toISOString().slice(0, 10);
  const entityId = `integrity:${weekKey}`;
  const exists = await prisma.notification.findFirst({
    where: { userId, type: "SYSTEM", entityType: "integrity", entityId },
    select: { id: true },
  });
  if (!exists) {
    await prisma.notification.create({
      data: {
        userId,
        type: "SYSTEM",
        title: "⚠️ Verificação de integridade encontrou problemas",
        body: `O banco local reportou: "${String(status).slice(0, 180)}". Restaure um snapshot recente em Configurações → Snapshots.`,
        entityType: "integrity",
        entityId,
        actionUrl: "/settings?tab=system",
        priority: "HIGH",
      },
    });
  }
}
