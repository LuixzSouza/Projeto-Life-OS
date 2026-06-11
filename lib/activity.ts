import { prisma } from "./prisma";
import { getCurrentUserId } from "./auth";

/**
 * Registro de atividade (auditoria / linha do tempo) — escreve no ActivityLog.
 * É best-effort: NUNCA lança (não pode derrubar a mutação que o chamou).
 *
 * Ex.: await logActivity({ action: "CREATE", module: "tasks",
 *        entityType: "task", entityId: t.id, summary: `Criou "${t.title}"` })
 */
export async function logActivity(input: {
  action: string; // CREATE | UPDATE | DELETE | COMPLETE | ...
  module: string; // finance | tasks | studies | ...
  summary?: string;
  entityType?: string;
  entityId?: string;
  meta?: unknown; // serializado em JSON
}): Promise<void> {
  try {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await prisma.activityLog.create({
      data: {
        userId,
        action: input.action,
        module: input.module,
        summary: input.summary ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        meta: input.meta != null ? JSON.stringify(input.meta) : null,
      },
    });
  } catch (e) {
    console.error("[activity] falha ao registrar:", e);
  }
}

export interface ClientActivity {
  id: string;
  action: string;
  module: string;
  summary: string | null;
  entityType: string | null;
  entityId: string | null;
  meta: string | null; // JSON serializado (ex.: { value: 1200 } em lançamentos)
  createdAt: string;
}

function toClient(a: {
  id: string; action: string; module: string; summary: string | null;
  entityType: string | null; entityId: string | null; meta: string | null; createdAt: Date;
}): ClientActivity {
  return {
    id: a.id,
    action: a.action,
    module: a.module,
    summary: a.summary,
    entityType: a.entityType,
    entityId: a.entityId,
    meta: a.meta,
    createdAt: a.createdAt.toISOString(),
  };
}

export async function getRecentActivity(limit = 30): Promise<ClientActivity[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const rows = await prisma.activityLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(toClient);
}

/** Página seguinte do histórico (cursor por data — "Carregar mais"). */
export async function getActivityBefore(beforeISO: string, limit = 120): Promise<ClientActivity[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const before = new Date(beforeISO);
  if (Number.isNaN(before.getTime())) return [];
  const rows = await prisma.activityLog.findMany({
    where: { userId, createdAt: { lt: before } },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), 200),
  });
  return rows.map(toClient);
}

const DAY_MS = 864e5;
const HEATMAP_WEEKS = 15;

const localDayKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export interface ActivityInsights {
  /** Registros desde sempre. */
  total: number;
  /** Últimos 7 dias × 7 anteriores (tendência). */
  last7: number;
  prev7: number;
  /** Dias seguidos com pelo menos 1 registro (terminando hoje ou ontem). */
  streakDays: number;
  /** Dias com atividade dentro da janela do heatmap. */
  activeDays: number;
  /** Módulo mais ativo da janela. */
  topModule: string | null;
  topModuleCount: number;
  /** Janela do heatmap: HEATMAP_WEEKS semanas fechando hoje (domingo→sábado). */
  heatmap: { date: string; count: number }[];
}

/**
 * Métricas da Linha do Tempo numa passada só: 1 count + 1 findMany enxuto da
 * janela do heatmap, todo o resto calculado em JS (réplica/libSQL: nada de
 * _max/_min de DateTime em aggregate — ver memória do projeto).
 */
export async function getActivityInsights(): Promise<ActivityInsights> {
  const userId = await getCurrentUserId();
  const empty: ActivityInsights = {
    total: 0, last7: 0, prev7: 0, streakDays: 0, activeDays: 0,
    topModule: null, topModuleCount: 0, heatmap: [],
  };
  if (!userId) return empty;

  // Janela: começa no DOMINGO de (hoje − 15 semanas) para o grid alinhar.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowStart = new Date(today.getTime() - (HEATMAP_WEEKS * 7 - 1) * DAY_MS);
  windowStart.setDate(windowStart.getDate() - windowStart.getDay());

  const [total, rows] = await Promise.all([
    prisma.activityLog.count({ where: { userId } }),
    prisma.activityLog.findMany({
      where: { userId, createdAt: { gte: windowStart } },
      select: { createdAt: true, module: true },
      orderBy: { createdAt: "desc" },
      take: 5000,
    }),
  ]);

  const perDay = new Map<string, number>();
  const perModule = new Map<string, number>();
  let last7 = 0;
  let prev7 = 0;
  const sevenAgo = new Date(today.getTime() - 6 * DAY_MS);
  const fourteenAgo = new Date(today.getTime() - 13 * DAY_MS);
  for (const r of rows) {
    const k = localDayKey(r.createdAt);
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
    perModule.set(r.module, (perModule.get(r.module) ?? 0) + 1);
    if (r.createdAt >= sevenAgo) last7++;
    else if (r.createdAt >= fourteenAgo) prev7++;
  }

  // Streak: dias consecutivos com registro, terminando hoje (ou ontem, se hoje
  // ainda não teve nada — a sequência não "quebra" de manhã cedo).
  let streakDays = 0;
  let cursor = new Date(today);
  if (!perDay.has(localDayKey(cursor))) cursor = new Date(cursor.getTime() - DAY_MS);
  while (perDay.has(localDayKey(cursor))) {
    streakDays++;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  const top = [...perModule.entries()].sort((a, b) => b[1] - a[1])[0] ?? null;

  const heatmap: { date: string; count: number }[] = [];
  for (let d = new Date(windowStart); d <= today; d = new Date(d.getTime() + DAY_MS)) {
    const k = localDayKey(d);
    heatmap.push({ date: k, count: perDay.get(k) ?? 0 });
  }

  return {
    total,
    last7,
    prev7,
    streakDays,
    activeDays: perDay.size,
    topModule: top?.[0] ?? null,
    topModuleCount: top?.[1] ?? 0,
    heatmap,
  };
}
