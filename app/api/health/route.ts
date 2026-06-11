import { NextResponse } from "next/server";
import { prisma, getReplicaSyncInfo } from "@/lib/prisma";
import { getDbProfile } from "@/lib/db-config";
import { withDbRetry } from "@/lib/db-errors";

// Health check central (DATABASE roadmap · Resiliência item 1): o indicador de
// conexão do layout (e qualquer monitor externo) pergunta aqui se o banco
// responde, em qual modo e com que latência. Sem auth de propósito: não expõe
// dados — só o status — e precisa funcionar antes do login.
export const dynamic = "force-dynamic";

export interface HealthPayload {
  db: "ok" | "down";
  mode: "local" | "replica" | "cloud" | "none";
  latencyMs: number | null;
  /** Só no modo réplica: epoch ms do último pull manual bem-sucedido. */
  lastSyncAt: number | null;
  lastSyncError: string | null;
  /**
   * Resiliência §4 — modo somente-leitura de emergência: a leitura funciona
   * mas a escrita falha (disco cheio, quota do free tier). null = ainda não
   * sondado (o probe de escrita roda com throttle, não a cada poll).
   */
  writable: boolean | null;
}

// Probe de escrita com throttle: 1 escrita real a cada 5 min por servidor é o
// suficiente para detectar quota estourada sem gastar a própria quota. A
// tabela é exclusiva do probe (nunca toca dados de usuário) e o SQL é o
// denominador comum SQLite/Postgres.
const WRITE_PROBE_INTERVAL_MS = 5 * 60_000;
let lastProbeAt = 0;
let lastWritable: boolean | null = null;
let probeSignature: string | null = null;

async function probeWrite(signature: string): Promise<boolean | null> {
  const now = Date.now();
  // Trocou de banco (perfil) → o resultado antigo não vale mais.
  if (signature !== probeSignature) {
    probeSignature = signature;
    lastProbeAt = 0;
    lastWritable = null;
  }
  if (now - lastProbeAt < WRITE_PROBE_INTERVAL_MS) return lastWritable;
  lastProbeAt = now;
  try {
    await prisma.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS lifeos_write_probe (id INTEGER)');
    await prisma.$executeRawUnsafe("INSERT INTO lifeos_write_probe (id) VALUES (1)");
    await prisma.$executeRawUnsafe("DELETE FROM lifeos_write_probe");
    lastWritable = true;
  } catch {
    lastWritable = false;
  }
  return lastWritable;
}

export async function GET() {
  const profile = getDbProfile();
  const mode: HealthPayload["mode"] = profile?.mode ?? "none";
  const sync = mode === "replica" ? getReplicaSyncInfo() : { lastSyncAt: null, lastSyncError: null };

  const start = performance.now();
  try {
    // 1 retry com backoff: free tier hibernando não deve pintar o app de vermelho.
    await withDbRetry(() => prisma.$queryRawUnsafe("SELECT 1"));
    const latencyMs = Math.round(performance.now() - start);
    const writable = await probeWrite(JSON.stringify(profile ?? null));
    const payload: HealthPayload = { db: "ok", mode, latencyMs, writable, ...sync };
    return NextResponse.json(payload, { headers: { "Cache-Control": "no-store" } });
  } catch {
    const payload: HealthPayload = { db: "down", mode, latencyMs: null, writable: null, ...sync };
    return NextResponse.json(payload, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
