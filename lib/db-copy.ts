// ============================================================================
// MOTOR DE CÓPIA ENTRE BANCOS (DATABASE_ROADMAP · Fase 3)
// ============================================================================
// Copia a INSTÂNCIA INTEIRA (todos os usuários, todos os models) de um client
// Prisma para outro — via Prisma, não via SQL — então funciona entre QUALQUER
// par de dialetos (SQLite→Postgres, Turso→arquivo local...). É o
// mergeSqliteIntoTurso generalizado (aquele é sqlite_master-only).
//
// Regras de ouro:
//  - A ORIGEM NUNCA É ESCRITA (mesma filosofia do modo réplica).
//  - Ordem pai→filho vem de COPY_MODEL_ORDER (derivada do registro do backup
//    v3 — toda mudança de schema mantém um lugar só em dia).
//  - `createMany` em lotes com fallback linha-a-linha (não depende de
//    skipDuplicates, que não existe em todo dialeto).
//  - Hierarquias (parentId p/ o próprio model) entram em 2 passos.

import type { PrismaClient } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { COPY_MODEL_ORDER } from "./full-backup";

type Row = Record<string, unknown>;

// Delegate estrutural mínimo — os clients derivados (postgres) são
// estruturalmente idênticos ao canônico, então o acesso dinâmico é seguro.
interface CopyDelegate {
  findMany(): Promise<unknown[]>;
  createMany(args: { data: never[] }): Promise<unknown>;
  updateMany(args: { where: Row; data: Row }): Promise<unknown>;
}

function delegateOf(client: PrismaClient, model: string): CopyDelegate | null {
  const key = model.charAt(0).toLowerCase() + model.slice(1);
  const candidate = (client as unknown as Record<string, unknown>)[key];
  if (!candidate || typeof candidate !== "object") return null;
  return candidate as CopyDelegate;
}

// Campos escalares/enum do schema atual por model (via DMMF) — qualquer coisa
// fora disso (relações embutidas, colunas removidas) é descartada da cópia.
const scalarCache = new Map<string, Set<string> | null>();

function scalarFields(model: string): Set<string> | null {
  const cached = scalarCache.get(model);
  if (cached !== undefined) return cached;
  let result: Set<string> | null = null;
  try {
    const m = Prisma.dmmf.datamodel.models.find((mm) => mm.name === model);
    if (m) {
      result = new Set(
        m.fields.filter((f) => f.kind === "scalar" || f.kind === "enum").map((f) => f.name),
      );
    }
  } catch {
    result = null;
  }
  scalarCache.set(model, result);
  return result;
}

/**
 * Diferente do sanitize do backup (que lê JSON), aqui as linhas vêm VIVAS do
 * Prisma: Date e Decimal são objetos legítimos e DEVEM passar — o client de
 * destino os normaliza para o dialeto dele.
 */
function sanitizeLiveRow(model: string, raw: Row): Row {
  const allowed = scalarFields(model);
  const out: Row = {};
  for (const [key, value] of Object.entries(raw)) {
    if (allowed && !allowed.has(key)) continue;
    out[key] = value;
  }
  return out;
}

function chunk<T>(items: T[], size: number): T[][] {
  const parts: T[][] = [];
  for (let i = 0; i < items.length; i += size) parts.push(items.slice(i, i + size));
  return parts;
}

export interface CopyModelReport {
  model: string;
  source: number;
  copied: number;
  skipped: number;
}

export interface CopyReport {
  models: CopyModelReport[];
  totalSource: number;
  totalCopied: number;
  totalSkipped: number;
}

/**
 * Copia todos os dados de `source` para `target` (ambos com o schema já
 * garantido via ensureSchema). Linhas que o destino recusar (ex.: id já
 * existente num destino não-vazio) são contadas como `skipped` — a cópia
 * nunca aborta no meio por causa de uma linha.
 */
export async function copyDatabase(
  source: PrismaClient,
  target: PrismaClient,
  onProgress?: (model: string, copied: number, total: number) => void,
): Promise<CopyReport> {
  const models: CopyModelReport[] = [];

  for (const spec of COPY_MODEL_ORDER) {
    const src = delegateOf(source, spec.model);
    const dst = delegateOf(target, spec.model);
    if (!src || !dst) continue; // model fora do client (não deve acontecer)

    const rawRows = (await src.findMany()) as Row[];
    if (rawRows.length === 0) {
      models.push({ model: spec.model, source: 0, copied: 0, skipped: 0 });
      continue;
    }

    const deferredParents: { id: string; parentId: string }[] = [];
    const rows = rawRows.map((raw) => {
      const row = sanitizeLiveRow(spec.model, raw);
      if (spec.selfRefField) {
        const parent = row[spec.selfRefField];
        row[spec.selfRefField] = null;
        if (typeof row.id === "string" && typeof parent === "string") {
          deferredParents.push({ id: row.id, parentId: parent });
        }
      }
      return row;
    });

    let copied = 0;
    let skipped = 0;
    for (const part of chunk(rows, 100)) {
      try {
        await dst.createMany({ data: part as never[] });
        copied += part.length;
      } catch {
        // Lote recusado (id duplicado, FK ausente...) → linha a linha.
        for (const row of part) {
          try {
            await dst.createMany({ data: [row] as never[] });
            copied++;
          } catch (rowError) {
            skipped++;
            if (skipped <= 3) {
              console.warn(`[db-copy] linha pulada em ${spec.model}:`, rowError);
            }
          }
        }
      }
      onProgress?.(spec.model, copied, rows.length);
    }

    // 2º passo das hierarquias (todos os pais já inseridos).
    for (const link of deferredParents) {
      try {
        await dst.updateMany({
          where: { id: link.id },
          data: { [spec.selfRefField as string]: link.parentId },
        });
      } catch {
        // pai pulado no 1º passo — a linha fica sem hierarquia, dado preservado
      }
    }

    models.push({ model: spec.model, source: rawRows.length, copied, skipped });
  }

  const totalSource = models.reduce((sum, m) => sum + m.source, 0);
  const totalCopied = models.reduce((sum, m) => sum + m.copied, 0);
  const totalSkipped = models.reduce((sum, m) => sum + m.skipped, 0);
  return { models, totalSource, totalCopied, totalSkipped };
}
