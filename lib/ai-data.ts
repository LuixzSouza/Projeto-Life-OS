// Camada de acesso a dados da IA — "enxuta por design".
//
// Objetivo: a IA NUNCA lê o banco inteiro. Tudo aqui devolve projeções
// compactas (poucos campos), agregações feitas em SQL e paginação. Assim o
// custo de token não cresce com o volume de dados ("pronto pra vida").
//
// Módulo server-only: importado só por actions/tools.ts (nunca por client).
import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { encrypt } from "@/lib/crypto";
import { asEnum, coerceEnum, TASK_STATUSES, TASK_PRIORITIES, CLIENT_STATUSES } from "@/lib/enums";
import type { AIModule, ToolArgs, MutationResult, AnalysisMetric } from "@/app/(dashboard)/ai/actions/types";

/* ----------------------------------------------------------------------------
   HELPERS
   ---------------------------------------------------------------------------- */

const LIST_DEFAULT = 5;
const LIST_MAX = 25;

function clampLimit(n?: number): number {
  if (!n || n < 1) return LIST_DEFAULT;
  return Math.min(Math.floor(n), LIST_MAX);
}

/** Remove acentos ("café" → "cafe") para busca tolerante. */
function deaccent(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Variantes do termo de busca (original + sem acento), únicas. */
function searchVariants(s: string): string[] {
  const base = s.trim();
  return [...new Set([base, deaccent(base)])].filter(Boolean);
}

/**
 * Filtro OR multi-campo × multi-variante: acha "café da manhã" buscando
 * "cafe", em qualquer um dos campos informados. (Resolve a maior parte da
 * distância até a busca semântica com ~20% do esforço.)
 * Genérico sobre o WhereInput do modelo — o cast fica encapsulado aqui.
 */
function orContains<TWhere>(fields: string[], term: string): { OR: TWhere[] } {
  const OR: TWhere[] = [];
  for (const field of fields) {
    for (const v of searchVariants(term)) {
      OR.push({ [field]: { contains: v } } as TWhere);
    }
  }
  return { OR };
}

// Datas vindas de <input type="date"> ("YYYY-MM-DD") recebem T12:00:00Z para
// não escorregar de dia por fuso (regra do CLAUDE.md). ISO completo passa direto.
function parseAIDate(s?: string): Date | undefined {
  if (!s) return undefined;
  const v = s.length <= 10 ? `${s}T12:00:00Z` : s;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function startOfThisMonth(): Date {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1);
}

// Rota a revalidar por módulo (para a UI refletir mutações da IA na hora).
const REVALIDATE: Record<AIModule, string[]> = {
  FINANCE: ["/finance", "/agenda", "/dashboard"],
  HEALTH: ["/health", "/agenda"],
  TASKS: ["/projects", "/agenda", "/dashboard"],
  PROJECTS: ["/projects"],
  STUDIES: ["/studies", "/agenda"],
  ENTERTAINMENT: ["/entertainment", "/agenda"],
  CRM: ["/business"],
  FRIENDS: ["/social", "/agenda"],
  VAULT: ["/access"],
  WARDROBE: ["/wardrobe", "/agenda"],
  AGENDA: ["/agenda", "/dashboard"],
  NUTRITION: ["/health/nutrition", "/health", "/dashboard"],
  SLEEP: ["/health/sleep", "/health", "/dashboard"],
  HABITS: ["/health", "/dashboard"],
};

// Dia local como Date "T12:00:00Z" — convenção do HabitLog (1 log por dia).
function habitDayKey(d?: Date): Date {
  const n = d ?? new Date();
  const iso = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
  return new Date(`${iso}T12:00:00Z`);
}

function revalidate(module: AIModule) {
  for (const path of REVALIDATE[module]) revalidatePath(path);
}

/* ----------------------------------------------------------------------------
   LEITURA — queryModule (list compacto + summary agregado)
   ---------------------------------------------------------------------------- */

export async function queryModule(userId: string, args: ToolArgs): Promise<Record<string, unknown>> {
  const mod = args.module;
  if (!mod) return { erro: "Informe o módulo." };

  const mode = args.mode ?? "list";
  const take = clampLimit(args.limit);
  const skip = args.offset && args.offset > 0 ? Math.floor(args.offset) : 0;
  const search = args.search?.trim();

  if (mode === "summary") return querySummary(userId, mod);

  switch (mod) {
    case "FINANCE": {
      const where = { userId, deletedAt: null, ...(search ? orContains<Prisma.TransactionWhereInput>(["description", "category"], search) : {}), ...(args.category ? { category: args.category } : {}) };
      const [rows, total] = await Promise.all([
        prisma.transaction.findMany({ where, orderBy: { date: "desc" }, take, skip, select: { id: true, description: true, amount: true, type: true, category: true, date: true } }),
        prisma.transaction.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        transacoes: rows.map((t) => ({ id: t.id, descricao: t.description, valor: Number(t.amount), tipo: t.type, categoria: t.category, data: t.date.toISOString().slice(0, 10) })),
      };
    }
    case "TASKS": {
      const where = { userId, deletedAt: null, ...(search ? orContains<Prisma.TaskWhereInput>(["title", "description"], search) : {}), ...(args.status ? { status: args.status } : {}) };
      const [rows, total] = await Promise.all([
        prisma.task.findMany({ where, orderBy: [{ isDone: "asc" }, { dueDate: "asc" }], take, skip, select: { id: true, title: true, status: true, priority: true, isDone: true, dueDate: true } }),
        prisma.task.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        tarefas: rows.map((t) => ({ id: t.id, titulo: t.title, status: t.status, prioridade: t.priority, concluida: t.isDone, vence: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null })),
      };
    }
    case "PROJECTS": {
      const where = { userId, deletedAt: null, ...(search ? orContains<Prisma.ProjectWhereInput>(["title", "description"], search) : {}), ...(args.status ? { status: args.status } : {}) };
      const [rows, total] = await Promise.all([
        prisma.project.findMany({ where, orderBy: { updatedAt: "desc" }, take, skip, select: { id: true, title: true, status: true, _count: { select: { tasks: true } } } }),
        prisma.project.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        projetos: rows.map((p) => ({ id: p.id, titulo: p.title, status: p.status, tarefas: p._count.tasks })),
      };
    }
    case "HEALTH": {
      const where = { userId, ...(search ? orContains<Prisma.WorkoutWhereInput>(["title", "type", "notes"], search) : {}) };
      const [rows, total] = await Promise.all([
        prisma.workout.findMany({ where, orderBy: { date: "desc" }, take, skip, select: { id: true, title: true, type: true, duration: true, date: true } }),
        prisma.workout.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        treinos: rows.map((w) => ({ id: w.id, titulo: w.title, tipo: w.type, minutos: w.duration, data: w.date.toISOString().slice(0, 10) })),
      };
    }
    case "STUDIES": {
      // Busca por matéria OU pelas notas da sessão (com variantes sem acento).
      const where: Prisma.StudySessionWhereInput = {
        userId,
        ...(search
          ? { OR: searchVariants(search).flatMap((v): Prisma.StudySessionWhereInput[] => [{ subject: { title: { contains: v } } }, { notesRaw: { contains: v } }]) }
          : {}),
      };
      const [rows, total] = await Promise.all([
        prisma.studySession.findMany({ where, orderBy: { date: "desc" }, take, skip, select: { id: true, durationMinutes: true, focusLevel: true, date: true, subject: { select: { title: true } } } }),
        prisma.studySession.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        sessoes: rows.map((s) => ({ id: s.id, materia: s.subject?.title ?? "—", minutos: s.durationMinutes, foco: s.focusLevel, data: s.date.toISOString().slice(0, 10) })),
      };
    }
    case "ENTERTAINMENT": {
      const where = { userId, deletedAt: null, ...(search ? orContains<Prisma.MediaItemWhereInput>(["title", "overview"], search) : {}), ...(args.status ? { status: args.status } : {}) };
      const [rows, total] = await Promise.all([
        prisma.mediaItem.findMany({ where, orderBy: { updatedAt: "desc" }, take, skip, select: { id: true, title: true, type: true, status: true, rating: true } }),
        prisma.mediaItem.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        midias: rows.map((m) => ({ id: m.id, titulo: m.title, tipo: m.type, status: m.status, nota: m.rating })),
      };
    }
    case "CRM": {
      const where = { userId, deletedAt: null, ...(search ? orContains<Prisma.ClientWhereInput>(["name", "company", "notes"], search) : {}), ...(args.status ? { status: args.status } : {}) };
      const [rows, total] = await Promise.all([
        prisma.client.findMany({ where, orderBy: { updatedAt: "desc" }, take, skip, select: { id: true, name: true, company: true, status: true, phone: true } }),
        prisma.client.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        clientes: rows.map((c) => ({ id: c.id, nome: c.name, empresa: c.company, status: c.status, telefone: c.phone })),
      };
    }
    case "FRIENDS": {
      const where = { userId, deletedAt: null, ...(search ? orContains<Prisma.FriendWhereInput>(["name", "company", "notes"], search) : {}) };
      const [rows, total] = await Promise.all([
        prisma.friend.findMany({ where, orderBy: { name: "asc" }, take, skip, select: { id: true, name: true, phone: true, proximity: true, company: true } }),
        prisma.friend.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        contatos: rows.map((f) => ({ id: f.id, nome: f.name, telefone: f.phone, proximidade: f.proximity, empresa: f.company })),
      };
    }
    case "VAULT": {
      // NUNCA retornar a senha em leitura.
      const where = { userId, ...(search ? orContains<Prisma.AccessItemWhereInput>(["title", "username", "category"], search) : {}) };
      const [rows, total] = await Promise.all([
        prisma.accessItem.findMany({ where, orderBy: { title: "asc" }, take, skip, select: { id: true, title: true, username: true, category: true, url: true } }),
        prisma.accessItem.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        acessos: rows.map((a) => ({ id: a.id, titulo: a.title, usuario: a.username, categoria: a.category, url: a.url })),
        aviso: "Senhas nunca são expostas por segurança.",
      };
    }
    case "WARDROBE": {
      const where = { userId, deletedAt: null, ...(search ? orContains<Prisma.WardrobeItemWhereInput>(["name", "brand", "color"], search) : {}), ...(args.category ? { category: args.category } : {}) };
      const [rows, total] = await Promise.all([
        prisma.wardrobeItem.findMany({ where, orderBy: { updatedAt: "desc" }, take, skip, select: { id: true, name: true, category: true, brand: true, color: true, status: true } }),
        prisma.wardrobeItem.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        pecas: rows.map((w) => ({ id: w.id, nome: w.name, categoria: w.category, marca: w.brand, cor: w.color, status: w.status })),
      };
    }
    case "AGENDA": {
      const where = { userId, deletedAt: null, startTime: { gte: new Date() }, ...(search ? orContains<Prisma.EventWhereInput>(["title", "location", "description"], search) : {}) };
      const [rows, total] = await Promise.all([
        prisma.event.findMany({ where, orderBy: { startTime: "asc" }, take, skip, select: { id: true, title: true, startTime: true, location: true } }),
        prisma.event.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        eventos: rows.map((e) => ({ id: e.id, titulo: e.title, quando: e.startTime.toISOString().slice(0, 16).replace("T", " "), local: e.location })),
      };
    }
    case "NUTRITION": {
      const where = { userId, ...(search ? orContains<Prisma.MealWhereInput>(["title", "items"], search) : {}), ...(args.category ? { type: args.category } : {}) };
      const [rows, total] = await Promise.all([
        prisma.meal.findMany({ where, orderBy: { date: "desc" }, take, skip, select: { id: true, title: true, type: true, calories: true, protein: true, carbs: true, fat: true, date: true } }),
        prisma.meal.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        refeicoes: rows.map((m) => ({ id: m.id, titulo: m.title, tipo: m.type, kcal: m.calories, proteina_g: m.protein, carbo_g: m.carbs, gordura_g: m.fat, data: m.date.toISOString().slice(0, 10) })),
      };
    }
    case "SLEEP": {
      const where = { userId, type: "SLEEP" };
      const [rows, total] = await Promise.all([
        prisma.healthMetric.findMany({ where, orderBy: { date: "desc" }, take, skip, select: { id: true, value: true, date: true } }),
        prisma.healthMetric.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        noites: rows.map((r) => ({ id: r.id, horas: r.value, data: r.date.toISOString().slice(0, 10) })),
      };
    }
    case "HABITS": {
      const where = { userId, archived: false, ...(search ? orContains<Prisma.HabitWhereInput>(["name"], search) : {}) };
      const [rows, total] = await Promise.all([
        prisma.habit.findMany({
          where, orderBy: { sortOrder: "asc" }, take, skip,
          select: { id: true, name: true, icon: true, logs: { where: { date: habitDayKey() }, select: { status: true }, take: 1 } },
        }),
        prisma.habit.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        habitos: rows.map((h) => ({ id: h.id, nome: h.name, icone: h.icon, hoje: h.logs[0]?.status ?? "PENDENTE" })),
      };
    }
    default:
      return { erro: `Módulo ${mod} não suportado para leitura.` };
  }
}

async function querySummary(userId: string, module: AIModule): Promise<Record<string, unknown>> {
  const monthStart = startOfThisMonth();

  switch (module) {
    case "FINANCE": {
      const [accounts, totals, byCat] = await Promise.all([
        prisma.account.findMany({ where: { userId }, select: { balance: true } }),
        prisma.transaction.groupBy({ by: ["type"], where: { userId, deletedAt: null, date: { gte: monthStart } }, _sum: { amount: true } }),
        prisma.transaction.groupBy({ by: ["category"], where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: monthStart } }, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 5 }),
      ]);
      const saldo = accounts.reduce((acc, a) => acc + Number(a.balance), 0);
      const receita = Number(totals.find((t) => t.type === "INCOME")?._sum.amount ?? 0);
      const despesa = Number(totals.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0);
      return {
        saldo_total: saldo,
        contas: accounts.length,
        mes_atual: { receita, despesa, resultado: receita - despesa },
        top_categorias_despesa: byCat.map((c) => ({ categoria: c.category, total: Number(c._sum.amount ?? 0) })),
      };
    }
    case "TASKS": {
      const now = new Date();
      const [pendentes, vencidas, concluidas, byStatus] = await Promise.all([
        prisma.task.count({ where: { userId, deletedAt: null, isDone: false } }),
        prisma.task.count({ where: { userId, deletedAt: null, isDone: false, dueDate: { lt: now } } }),
        prisma.task.count({ where: { userId, deletedAt: null, isDone: true } }),
        prisma.task.groupBy({ by: ["status"], where: { userId, deletedAt: null, isDone: false }, _count: { _all: true } }),
      ]);
      return { pendentes, vencidas, concluidas, por_status: byStatus.map((s) => ({ status: s.status, total: s._count._all })) };
    }
    case "HEALTH": {
      const [treinosMes, ultimoPeso] = await Promise.all([
        prisma.workout.count({ where: { userId, date: { gte: monthStart } } }),
        prisma.bodyMeasurement.findFirst({ where: { userId }, orderBy: { date: "desc" }, select: { weight: true, date: true } }),
      ]);
      return { treinos_no_mes: treinosMes, peso_atual: ultimoPeso ? { kg: ultimoPeso.weight, data: ultimoPeso.date.toISOString().slice(0, 10) } : null };
    }
    case "STUDIES": {
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const agg = await prisma.studySession.aggregate({ where: { userId, date: { gte: since } }, _sum: { durationMinutes: true }, _count: { _all: true } });
      return { ultimos_7_dias: { sessoes: agg._count._all, minutos: agg._sum.durationMinutes ?? 0 } };
    }
    case "ENTERTAINMENT": {
      const byStatus = await prisma.mediaItem.groupBy({ by: ["status"], where: { userId, deletedAt: null }, _count: { _all: true } });
      return { por_status: byStatus.map((s) => ({ status: s.status, total: s._count._all })) };
    }
    case "PROJECTS": {
      const byStatus = await prisma.project.groupBy({ by: ["status"], where: { userId, deletedAt: null }, _count: { _all: true } });
      return { por_status: byStatus.map((s) => ({ status: s.status, total: s._count._all })) };
    }
    case "CRM": {
      const [clientes, byStatus] = await Promise.all([
        prisma.client.count({ where: { userId, deletedAt: null } }),
        prisma.client.groupBy({ by: ["status"], where: { userId, deletedAt: null }, _count: { _all: true } }),
      ]);
      return { clientes, por_status: byStatus.map((s) => ({ status: s.status, total: s._count._all })) };
    }
    case "FRIENDS": {
      const total = await prisma.friend.count({ where: { userId, deletedAt: null } });
      return { contatos: total };
    }
    case "VAULT": {
      const total = await prisma.accessItem.count({ where: { userId } });
      return { acessos_guardados: total };
    }
    case "WARDROBE": {
      const [total, byCat] = await Promise.all([
        prisma.wardrobeItem.count({ where: { userId, deletedAt: null } }),
        prisma.wardrobeItem.groupBy({ by: ["category"], where: { userId, deletedAt: null }, _count: { _all: true }, orderBy: { _count: { category: "desc" } }, take: 5 }),
      ]);
      return { pecas: total, por_categoria: byCat.map((c) => ({ categoria: c.category, total: c._count._all })) };
    }
    case "AGENDA": {
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const proximos = await prisma.event.count({ where: { userId, deletedAt: null, startTime: { gte: now, lte: in7 } } });
      return { eventos_proximos_7_dias: proximos };
    }
    case "NUTRITION": {
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [today, week, settings] = await Promise.all([
        prisma.meal.aggregate({ where: { userId, date: { gte: dayStart } }, _sum: { calories: true, protein: true, carbs: true, fat: true }, _count: { _all: true } }),
        prisma.meal.aggregate({ where: { userId, date: { gte: weekStart } }, _sum: { calories: true }, _count: { _all: true } }),
        prisma.settings.findUnique({ where: { userId }, select: { calorieGoalOverride: true } }),
      ]);
      return {
        hoje: {
          refeicoes: today._count._all,
          kcal: today._sum.calories ?? 0,
          proteina_g: today._sum.protein ?? 0,
          carbo_g: today._sum.carbs ?? 0,
          gordura_g: today._sum.fat ?? 0,
        },
        ultimos_7_dias: { refeicoes: week._count._all, kcal_total: week._sum.calories ?? 0 },
        meta_kcal_dia: settings?.calorieGoalOverride ?? null,
      };
    }
    case "SLEEP": {
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [last, week, settings] = await Promise.all([
        prisma.healthMetric.findFirst({ where: { userId, type: "SLEEP" }, orderBy: { date: "desc" }, select: { value: true, date: true } }),
        prisma.healthMetric.aggregate({ where: { userId, type: "SLEEP", date: { gte: weekStart } }, _avg: { value: true }, _count: { _all: true } }),
        prisma.settings.findUnique({ where: { userId }, select: { sleepGoalHours: true } }),
      ]);
      return {
        ultima_noite: last ? { horas: last.value, data: last.date.toISOString().slice(0, 10) } : null,
        ultimos_7_dias: { registros: week._count._all, media_horas: week._avg.value ? Number(week._avg.value.toFixed(1)) : null },
        meta_horas: settings?.sleepGoalHours ?? null,
      };
    }
    case "HABITS": {
      const today = habitDayKey();
      const [ativos, feitos, falhados] = await Promise.all([
        prisma.habit.count({ where: { userId, archived: false } }),
        prisma.habitLog.count({ where: { userId, date: today, status: "DONE" } }),
        prisma.habitLog.count({ where: { userId, date: today, status: "FAILED" } }),
      ]);
      return { habitos_ativos: ativos, feitos_hoje: feitos, falhados_hoje: falhados, pendentes_hoje: Math.max(0, ativos - feitos - falhados) };
    }
    default:
      return { erro: `Resumo não disponível para ${module}.` };
  }
}

/* ----------------------------------------------------------------------------
   ANÁLISE — analyze_system_data (COMPARE / TREND / GROUP)
   Agregações SQL em UMA chamada — substitui a IA improvisar com vários query
   (caro e lento). Tudo bounded: janelas de no máx. 90 dias, top-N pequenos.
   ---------------------------------------------------------------------------- */

interface PeriodRange { start: Date; end: Date; label: string }

/** "YYYY-MM" → intervalo [início do mês, início do mês seguinte). */
function parseMonth(s?: string): PeriodRange | null {
  if (!s || !/^\d{4}-\d{2}$/.test(s.trim())) return null;
  const [y, m] = s.trim().split("-").map(Number);
  if (m < 1 || m > 12) return null;
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 1), label: s.trim() };
}

/** Valor agregado de uma métrica num intervalo (valor principal + contagem). */
async function metricAggregate(userId: string, metric: AnalysisMetric, start: Date, end: Date): Promise<{ valor: number; registros: number; unidade: string }> {
  const dateRange = { gte: start, lt: end };
  switch (metric) {
    case "EXPENSE":
    case "INCOME": {
      const agg = await prisma.transaction.aggregate({
        where: { userId, deletedAt: null, type: metric, date: dateRange },
        _sum: { amount: true }, _count: { _all: true },
      });
      return { valor: Number(agg._sum.amount ?? 0), registros: agg._count._all, unidade: "valor" };
    }
    case "WEIGHT": {
      const agg = await prisma.bodyMeasurement.aggregate({
        where: { userId, date: dateRange }, _avg: { weight: true }, _count: { _all: true },
      });
      return { valor: Number((agg._avg.weight ?? 0).toFixed(1)), registros: agg._count._all, unidade: "kg (média)" };
    }
    case "SLEEP": {
      const agg = await prisma.healthMetric.aggregate({
        where: { userId, type: "SLEEP", date: dateRange }, _avg: { value: true }, _count: { _all: true },
      });
      return { valor: Number((agg._avg.value ?? 0).toFixed(1)), registros: agg._count._all, unidade: "horas/noite (média)" };
    }
    case "WORKOUTS": {
      const agg = await prisma.workout.aggregate({
        where: { userId, date: dateRange }, _sum: { duration: true }, _count: { _all: true },
      });
      return { valor: agg._count._all, registros: agg._sum.duration ?? 0, unidade: "treinos (registros=minutos)" };
    }
    case "STUDY_MINUTES": {
      const agg = await prisma.studySession.aggregate({
        where: { userId, date: dateRange }, _sum: { durationMinutes: true }, _count: { _all: true },
      });
      return { valor: agg._sum.durationMinutes ?? 0, registros: agg._count._all, unidade: "minutos" };
    }
    case "CALORIES": {
      const agg = await prisma.meal.aggregate({
        where: { userId, date: dateRange }, _sum: { calories: true }, _count: { _all: true },
      });
      return { valor: agg._sum.calories ?? 0, registros: agg._count._all, unidade: "kcal" };
    }
  }
}

/** Pontos diários (data+valor) de uma métrica — base da série do TREND. */
async function metricPoints(userId: string, metric: AnalysisMetric, start: Date): Promise<{ date: Date; value: number }[]> {
  const range = { gte: start };
  switch (metric) {
    case "EXPENSE":
    case "INCOME": {
      const rows = await prisma.transaction.findMany({
        where: { userId, deletedAt: null, type: metric, date: range },
        select: { date: true, amount: true },
      });
      return rows.map((r) => ({ date: r.date, value: Number(r.amount) }));
    }
    case "WEIGHT": {
      const rows = await prisma.bodyMeasurement.findMany({ where: { userId, date: range }, select: { date: true, weight: true } });
      return rows.map((r) => ({ date: r.date, value: r.weight }));
    }
    case "SLEEP": {
      const rows = await prisma.healthMetric.findMany({ where: { userId, type: "SLEEP", date: range }, select: { date: true, value: true } });
      return rows.map((r) => ({ date: r.date, value: r.value }));
    }
    case "WORKOUTS": {
      const rows = await prisma.workout.findMany({ where: { userId, date: range }, select: { date: true, duration: true } });
      return rows.map((r) => ({ date: r.date, value: r.duration }));
    }
    case "STUDY_MINUTES": {
      const rows = await prisma.studySession.findMany({ where: { userId, date: range }, select: { date: true, durationMinutes: true } });
      return rows.map((r) => ({ date: r.date, value: r.durationMinutes }));
    }
    case "CALORIES": {
      const rows = await prisma.meal.findMany({ where: { userId, date: range }, select: { date: true, calories: true } });
      return rows.map((r) => ({ date: r.date, value: r.calories ?? 0 }));
    }
  }
}

export async function analyzeModule(userId: string, args: ToolArgs): Promise<Record<string, unknown>> {
  const kind = args.analysis;
  const metric = args.metric;

  if (kind === "COMPARE") {
    if (!metric) return { erro: "COMPARE exige metric." };
    const a = parseMonth(args.periodA);
    const b = parseMonth(args.periodB);
    if (!a || !b) return { erro: "COMPARE exige periodA e periodB no formato YYYY-MM (ex.: 2026-05)." };
    const [ra, rb] = await Promise.all([
      metricAggregate(userId, metric, a.start, a.end),
      metricAggregate(userId, metric, b.start, b.end),
    ]);
    const abs = Number((rb.valor - ra.valor).toFixed(2));
    const pct = ra.valor !== 0 ? Number((((rb.valor - ra.valor) / Math.abs(ra.valor)) * 100).toFixed(1)) : null;
    return {
      metrica: metric, unidade: ra.unidade,
      periodo_a: { mes: a.label, valor: ra.valor, registros: ra.registros },
      periodo_b: { mes: b.label, valor: rb.valor, registros: rb.registros },
      variacao_b_vs_a: { absoluta: abs, percentual: pct },
    };
  }

  if (kind === "TREND") {
    if (!metric) return { erro: "TREND exige metric." };
    const days = Math.min(Math.max(Math.floor(args.days ?? 30), 7), 90);
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    const points = await metricPoints(userId, metric, start);

    // Agrega por dia (soma; para WEIGHT/SLEEP o "ponto do dia" é o último valor).
    const byDay = new Map<string, number>();
    const replace = metric === "WEIGHT" || metric === "SLEEP";
    for (const p of points.sort((x, y) => x.date.getTime() - y.date.getTime())) {
      const key = p.date.toISOString().slice(0, 10);
      byDay.set(key, replace ? p.value : (byDay.get(key) ?? 0) + p.value);
    }
    const serie = [...byDay.entries()].map(([d, v]) => ({ d: d.slice(5), v: Number(v.toFixed(1)) }));
    if (serie.length === 0) return { metrica: metric, janela_dias: days, serie: [], resumo: "Sem registros no período." };

    const vals = serie.map((s) => s.v);
    const media = Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1));
    // Tendência: média da 2ª metade vs 1ª metade da janela.
    const half = Math.floor(serie.length / 2);
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const a1 = avg(vals.slice(0, half));
    const a2 = avg(vals.slice(half));
    const tendencia = a1 !== 0 ? Number((((a2 - a1) / Math.abs(a1)) * 100).toFixed(1)) : null;

    return {
      metrica: metric, janela_dias: days,
      resumo: { dias_com_registro: serie.length, media_diaria: media, minimo: Math.min(...vals), maximo: Math.max(...vals), tendencia_pct: tendencia },
      serie,
    };
  }

  if (kind === "GROUP") {
    const mod = args.module;
    if (!mod) return { erro: "GROUP exige module (FINANCE, TASKS, ENTERTAINMENT, NUTRITION, HEALTH, PROJECTS ou WARDROBE)." };
    const monthStart = startOfThisMonth();
    switch (mod) {
      case "FINANCE": {
        const rows = await prisma.transaction.groupBy({
          by: ["category"], where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: monthStart } },
          _sum: { amount: true }, _count: { _all: true }, orderBy: { _sum: { amount: "desc" } }, take: 10,
        });
        return { agrupamento: "despesas do mês por categoria", grupos: rows.map((r) => ({ categoria: r.category, total: Number(r._sum.amount ?? 0), lancamentos: r._count._all })) };
      }
      case "TASKS": {
        const rows = await prisma.task.groupBy({ by: ["status"], where: { userId, deletedAt: null }, _count: { _all: true } });
        return { agrupamento: "tarefas por status", grupos: rows.map((r) => ({ status: r.status, total: r._count._all })) };
      }
      case "ENTERTAINMENT": {
        const rows = await prisma.mediaItem.groupBy({ by: ["status"], where: { userId, deletedAt: null }, _count: { _all: true } });
        return { agrupamento: "mídias por status", grupos: rows.map((r) => ({ status: r.status, total: r._count._all })) };
      }
      case "NUTRITION": {
        const rows = await prisma.meal.groupBy({
          by: ["type"], where: { userId, date: { gte: monthStart } }, _sum: { calories: true }, _count: { _all: true },
        });
        return { agrupamento: "refeições do mês por tipo", grupos: rows.map((r) => ({ tipo: r.type, kcal_total: r._sum.calories ?? 0, refeicoes: r._count._all })) };
      }
      case "HEALTH": {
        const rows = await prisma.workout.groupBy({
          by: ["type"], where: { userId, date: { gte: monthStart } }, _sum: { duration: true }, _count: { _all: true },
        });
        return { agrupamento: "treinos do mês por tipo", grupos: rows.map((r) => ({ tipo: r.type, treinos: r._count._all, minutos: r._sum.duration ?? 0 })) };
      }
      case "PROJECTS": {
        const rows = await prisma.project.groupBy({ by: ["status"], where: { userId, deletedAt: null }, _count: { _all: true } });
        return { agrupamento: "projetos por status", grupos: rows.map((r) => ({ status: r.status, total: r._count._all })) };
      }
      case "WARDROBE": {
        const rows = await prisma.wardrobeItem.groupBy({ by: ["category"], where: { userId, deletedAt: null }, _count: { _all: true }, orderBy: { _count: { category: "desc" } }, take: 10 });
        return { agrupamento: "peças por categoria", grupos: rows.map((r) => ({ categoria: r.category, total: r._count._all })) };
      }
      default:
        return { erro: `GROUP não suportado para ${mod}.` };
    }
  }

  return { erro: "Informe analysis: COMPARE, TREND ou GROUP." };
}

/* ----------------------------------------------------------------------------
   MEMÓRIA PERSISTENTE — manage_memory (SAVE / LIST / DELETE)
   Fatos curtos que sobrevivem entre conversas. Injetados no system prompt
   (por isso o teto: memória é contexto pago em token a cada turno).
   ---------------------------------------------------------------------------- */

const MEMORY_MAX = 50;          // teto de memórias por usuário
const MEMORY_MAX_LEN = 280;     // 1 fato = 1 frase curta

export async function manageMemory(userId: string, args: ToolArgs): Promise<Record<string, unknown>> {
  switch (args.action) {
    case "SAVE": {
      const content = args.content?.trim() || args.title?.trim() || args.description?.trim();
      if (!content) return { ok: false, erro: "SAVE exige o campo content (o fato a lembrar)." };
      const count = await prisma.aiMemory.count({ where: { userId } });
      if (count >= MEMORY_MAX) {
        return { ok: false, erro: `Limite de ${MEMORY_MAX} memórias atingido. Liste (LIST) e apague (DELETE) alguma antes de salvar outra.` };
      }
      const m = await prisma.aiMemory.create({ data: { content: content.slice(0, MEMORY_MAX_LEN), userId } });
      revalidatePath("/settings");
      return { ok: true, id: m.id, resumo: "Memória salva. Vou lembrar disso nas próximas conversas." };
    }
    case "LIST": {
      const rows = await prisma.aiMemory.findMany({
        where: { userId }, orderBy: { createdAt: "desc" },
        select: { id: true, content: true, createdAt: true },
      });
      return {
        total: rows.length,
        memorias: rows.map((m) => ({ id: m.id, fato: m.content, desde: m.createdAt.toISOString().slice(0, 10) })),
      };
    }
    case "DELETE": {
      if (!args.id) return { ok: false, erro: "DELETE exige o id da memória (use LIST para encontrá-lo)." };
      const r = await prisma.aiMemory.deleteMany({ where: { id: args.id, userId } });
      revalidatePath("/settings");
      return r.count > 0
        ? { ok: true, resumo: "Memória apagada." }
        : { ok: false, erro: `Memória ${args.id} não encontrada.` };
    }
    default:
      return { ok: false, erro: "Ação inválida. Use SAVE, LIST ou DELETE." };
  }
}

/** Memórias para injeção no system prompt (mais recentes primeiro, bounded). */
export async function getMemoriesForPrompt(userId: string, take = 20): Promise<{ id: string; content: string }[]> {
  return prisma.aiMemory.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    select: { id: true, content: true },
  });
}

/* ----------------------------------------------------------------------------
   ESCRITA — mutateModule (CREATE / UPDATE / DELETE em todos os módulos)
   ---------------------------------------------------------------------------- */

export async function mutateModule(userId: string, args: ToolArgs): Promise<MutationResult> {
  const { module, action } = args;
  if (!module) return { ok: false, summary: "Informe o módulo." };
  if (!action) return { ok: false, summary: "Informe a ação (CREATE, UPDATE ou DELETE)." };

  if (action === "DELETE") return handleDelete(userId, args);
  if (action !== "CREATE" && action !== "UPDATE") {
    return { ok: false, summary: "Ação inválida para mutate_system_data — use CREATE, UPDATE ou DELETE." };
  }

  const result = action === "CREATE" ? await handleCreate(userId, args) : await handleUpdate(userId, args);
  if (result.ok) revalidate(module);
  return result;
}

/* --- DELETE (com confirmação obrigatória) --- */
async function handleDelete(userId: string, args: ToolArgs): Promise<MutationResult> {
  const { module, id, confirm } = args;
  if (!id) return { ok: false, summary: "DELETE exige o id. Busque o registro primeiro com query_system_data." };

  const label = await recordLabel(userId, module!, id);
  if (label === null) return { ok: false, summary: `Nenhum registro encontrado em ${module} com id ${id}.` };

  if (confirm !== true) {
    return {
      ok: false,
      pending: true,
      module: module!,
      id,
      label,
      summary: `CONFIRMAÇÃO NECESSÁRIA antes de apagar [${module}] "${label}". Pergunte ao usuário se ele confirma a exclusão. Só apague chamando mutate_system_data de novo com action=DELETE, o mesmo id e confirm=true.`,
    };
  }

  await deleteRecord(userId, module!, id);
  revalidate(module!);
  return { ok: true, id, summary: `Apagado [${module}] "${label}".` };
}

// Rótulo curto do registro (para preview de exclusão e mensagens).
async function recordLabel(userId: string, module: AIModule, id: string): Promise<string | null> {
  switch (module) {
    case "FINANCE": return (await prisma.transaction.findFirst({ where: { id, userId }, select: { description: true } }))?.description ?? null;
    case "TASKS": return (await prisma.task.findFirst({ where: { id, userId }, select: { title: true } }))?.title ?? null;
    case "PROJECTS": return (await prisma.project.findFirst({ where: { id, userId }, select: { title: true } }))?.title ?? null;
    case "HEALTH": return (await prisma.workout.findFirst({ where: { id, userId }, select: { title: true } }))?.title ?? null;
    case "STUDIES": return (await prisma.studySession.findFirst({ where: { id, userId }, select: { id: true } }))?.id ? "sessão de estudo" : null;
    case "ENTERTAINMENT": return (await prisma.mediaItem.findFirst({ where: { id, userId }, select: { title: true } }))?.title ?? null;
    case "CRM": return (await prisma.client.findFirst({ where: { id, userId }, select: { name: true } }))?.name ?? null;
    case "FRIENDS": return (await prisma.friend.findFirst({ where: { id, userId }, select: { name: true } }))?.name ?? null;
    case "VAULT": return (await prisma.accessItem.findFirst({ where: { id, userId }, select: { title: true } }))?.title ?? null;
    case "WARDROBE": return (await prisma.wardrobeItem.findFirst({ where: { id, userId }, select: { name: true } }))?.name ?? null;
    case "AGENDA": return (await prisma.event.findFirst({ where: { id, userId }, select: { title: true } }))?.title ?? null;
    case "NUTRITION": return (await prisma.meal.findFirst({ where: { id, userId }, select: { title: true } }))?.title ?? null;
    case "SLEEP": {
      const m = await prisma.healthMetric.findFirst({ where: { id, userId, type: "SLEEP" }, select: { value: true } });
      return m ? `sono de ${m.value}h` : null;
    }
    case "HABITS": return (await prisma.habit.findFirst({ where: { id, userId }, select: { name: true } }))?.name ?? null;
    default: return null;
  }
}

async function deleteRecord(userId: string, module: AIModule, id: string): Promise<void> {
  switch (module) {
    case "FINANCE": {
      // Apaga o lançamento e reverte o saldo da conta de forma ATÔMICA: ou os dois
      // passos acontecem, ou nenhum (evita saldo inconsistente se falhar no meio).
      // ⚠️ Modo réplica: leitura FORA da $transaction (na transação iria ao primário,
      // onde datas INTEGER estouram a conversão); escritas em lote.
      const t = await prisma.transaction.findFirst({ where: { id, userId }, select: { amount: true, type: true, accountId: true } });
      if (!t) return;
      const delta = t.type === "INCOME" ? -Number(t.amount) : Number(t.amount);
      await prisma.$transaction([
        prisma.transaction.deleteMany({ where: { id, userId } }),
        prisma.account.updateMany({ where: { id: t.accountId, userId }, data: { balance: { increment: delta } } }),
      ]);
      return;
    }
    case "TASKS": await prisma.task.deleteMany({ where: { id, userId } }); return;
    case "PROJECTS": await prisma.project.deleteMany({ where: { id, userId } }); return;
    case "HEALTH": await prisma.workout.deleteMany({ where: { id, userId } }); return;
    case "STUDIES": await prisma.studySession.deleteMany({ where: { id, userId } }); return;
    case "ENTERTAINMENT": await prisma.mediaItem.deleteMany({ where: { id, userId } }); return;
    case "CRM": await prisma.client.deleteMany({ where: { id, userId } }); return;
    case "FRIENDS": await prisma.friend.deleteMany({ where: { id, userId } }); return;
    case "VAULT": await prisma.accessItem.deleteMany({ where: { id, userId } }); return;
    case "WARDROBE": await prisma.wardrobeItem.deleteMany({ where: { id, userId } }); return;
    case "AGENDA": await prisma.event.deleteMany({ where: { id, userId } }); return;
    case "NUTRITION": await prisma.meal.deleteMany({ where: { id, userId } }); return;
    case "SLEEP": await prisma.healthMetric.deleteMany({ where: { id, userId, type: "SLEEP" } }); return;
    case "HABITS": await prisma.habit.deleteMany({ where: { id, userId } }); return; // logs caem em cascata
  }
}

/* --- CREATE --- */
async function handleCreate(userId: string, args: ToolArgs): Promise<MutationResult> {
  const { module, title, description, value, category, status, date } = args;
  const due = parseAIDate(date);

  switch (module) {
    case "TASKS": {
      if (!title) return { ok: false, summary: "Tarefa exige título." };
      const t = await prisma.task.create({ data: { title, description: description ?? null, priority: coerceEnum(category, TASK_PRIORITIES, "MEDIUM"), status: coerceEnum(status, TASK_STATUSES, "TODO"), dueDate: due ?? null, userId } });
      return { ok: true, id: t.id, summary: `Tarefa criada: "${t.title}" (id ${t.id}).` };
    }
    case "FINANCE": {
      if (!title || value == null) return { ok: false, summary: "Lançamento exige descrição (title) e valor (value)." };
      const account = await prisma.account.findFirst({ where: { userId }, select: { id: true } });
      if (!account) return { ok: false, summary: "Nenhuma conta cadastrada. Crie uma conta antes de lançar." };
      const type = category === "INCOME" ? "INCOME" : "EXPENSE";
      const delta = type === "INCOME" ? value : -value;
      // Cria o lançamento e aplica o saldo de forma ATÔMICA (lote — sem transação
      // interativa, que no modo réplica leria datas INTEGER do primário).
      const txId = randomUUID();
      await prisma.$transaction([
        prisma.transaction.create({
          data: { id: txId, description: title, amount: value, type, category: description ?? "Geral", date: due ?? new Date(), accountId: account.id, userId },
          select: { id: true },
        }),
        prisma.account.updateMany({ where: { id: account.id, userId }, data: { balance: { increment: delta } } }),
      ]);
      return { ok: true, id: txId, summary: `Lançado ${type} de ${value} (id ${txId}).` };
    }
    case "HEALTH": {
      if (category === "WEIGHT" && value != null) {
        const b = await prisma.bodyMeasurement.create({ data: { weight: value, height: 0, gender: "N/A", userId } });
        return { ok: true, id: b.id, summary: `Peso de ${value}kg registrado.` };
      }
      if (category === "ENERGY" && value != null) {
        // Check-in de energia do dia (1-5) — base do journaling noturno guiado.
        const energy = Math.min(Math.max(Math.round(value), 1), 5);
        const day = due ?? new Date();
        const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
        const c = await prisma.energyCheckin.upsert({
          where: { userId_date: { userId, date: dayStart } },
          update: { energy, ...(description != null ? { note: description } : {}) },
          create: { userId, date: dayStart, energy, note: description ?? null },
        });
        return { ok: true, id: c.id, summary: `Check-in registrado: energia ${energy}/5${description ? " com nota" : ""}.` };
      }
      if (!title) return { ok: false, summary: "Treino exige título (ou use category=WEIGHT + value para peso)." };
      const w = await prisma.workout.create({ data: { title, type: category ?? "Geral", duration: value ?? 30, intensity: "MEDIUM", notes: description ?? null, date: due ?? new Date(), userId } });
      return { ok: true, id: w.id, summary: `Treino registrado: "${w.title}".` };
    }
    case "STUDIES": {
      if (value != null) {
        // Sessão de estudo: encontra ou cria a matéria pelo título informado.
        const subjectTitle = category ?? title ?? "Geral";
        let subject = await prisma.studySubject.findFirst({ where: { userId, title: subjectTitle }, select: { id: true } });
        if (!subject) subject = await prisma.studySubject.create({ data: { title: subjectTitle, userId }, select: { id: true } });
        const s = await prisma.studySession.create({ data: { durationMinutes: value, focusLevel: 3, date: due ?? new Date(), subjectId: subject.id, notesRaw: description ?? null, userId } });
        return { ok: true, id: s.id, summary: `Sessão de ${value}min em "${subjectTitle}" registrada.` };
      }
      if (!title) return { ok: false, summary: "Estudo exige título (anotação) ou value (minutos da sessão)." };
      // Notas criadas pela IA caem na Entrada (Inbox) para você organizar depois.
      let inbox = await prisma.notebook.findFirst({ where: { userId, isInbox: true }, select: { id: true } });
      if (!inbox) inbox = await prisma.notebook.create({ data: { userId, name: "Entrada", isInbox: true, color: "#64748b", icon: "inbox", position: -1 }, select: { id: true } });
      const n = await prisma.studyNote.create({ data: { title, content: description ?? "", userId, notebookId: inbox.id } });
      return { ok: true, id: n.id, summary: `Anotação "${n.title}" salva na Entrada.` };
    }
    case "ENTERTAINMENT": {
      if (!title) return { ok: false, summary: "Mídia exige título." };
      const m = await prisma.mediaItem.create({ data: { title, type: category ?? "MOVIE", status: status ?? "PLAN_TO_WATCH", overview: description ?? null, userId } });
      return { ok: true, id: m.id, summary: `Mídia "${m.title}" adicionada.` };
    }
    case "FRIENDS": {
      if (!title) return { ok: false, summary: "Contato exige nome (title)." };
      const f = await prisma.friend.create({ data: { name: title, notes: description ?? null, company: category ?? null, userId } });
      return { ok: true, id: f.id, summary: `Contato "${f.name}" salvo.` };
    }
    case "CRM": {
      if (!title) return { ok: false, summary: "Cliente exige nome (title)." };
      const c = await prisma.client.create({ data: { name: title, company: category ?? null, notes: description ?? null, status: coerceEnum(status, CLIENT_STATUSES, "ACTIVE"), userId } });
      return { ok: true, id: c.id, summary: `Cliente "${c.name}" salvo no CRM.` };
    }
    case "PROJECTS": {
      if (!title) return { ok: false, summary: "Projeto exige título." };
      const slug = `${title.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${Date.now().toString(36)}`;
      const p = await prisma.project.create({ data: { title, slug, description: description ?? null, status: status ?? "ACTIVE", userId } });
      return { ok: true, id: p.id, summary: `Projeto "${p.title}" criado.` };
    }
    case "VAULT": {
      if (!title || !description) return { ok: false, summary: "Acesso exige title e a senha em description." };
      // Senha SEMPRE cifrada at-rest, igual ao módulo de Acessos (lib/crypto).
      const a = await prisma.accessItem.create({ data: { title, username: category ?? "", password: encrypt(description), category: "GERAL", userId } });
      return { ok: true, id: a.id, summary: `Acesso "${a.title}" guardado no cofre.` };
    }
    case "WARDROBE": {
      if (!title) return { ok: false, summary: "Peça exige nome (title)." };
      const w = await prisma.wardrobeItem.create({ data: { name: title, category: category ?? "GENERAL", brand: description ?? null, userId } });
      return { ok: true, id: w.id, summary: `Peça "${w.name}" adicionada ao closet.` };
    }
    case "AGENDA": {
      if (!title) return { ok: false, summary: "Evento exige título." };
      const start = due ?? new Date();
      const ev = await prisma.event.create({ data: { title, startTime: start, endTime: new Date(start.getTime() + 60 * 60 * 1000), description: description ?? null, location: category ?? null, userId } });
      return { ok: true, id: ev.id, summary: `Evento "${ev.title}" agendado.` };
    }
    case "NUTRITION": {
      if (!title) return { ok: false, summary: "Refeição exige título (title). value=kcal e category=BREAKFAST|LUNCH|SNACK|DINNER são opcionais." };
      const mealType = ["BREAKFAST", "LUNCH", "SNACK", "DINNER"].includes(category ?? "") ? category! : "SNACK";
      const m = await prisma.meal.create({
        data: { title, items: description ?? "", calories: value != null ? Math.round(value) : null, type: mealType, date: due ?? new Date(), userId },
      });
      return { ok: true, id: m.id, summary: `Refeição "${m.title}" registrada (${m.calories ?? "?"} kcal).` };
    }
    case "SLEEP": {
      if (value == null) return { ok: false, summary: "Sono exige value (horas dormidas, ex.: 7.5)." };
      // 1 registro por dia (mesma regra da tela de Sono): atualiza se já existir.
      const base = due ?? new Date();
      const dayStart = new Date(base); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(base); dayEnd.setHours(23, 59, 59, 999);
      const existing = await prisma.healthMetric.findFirst({ where: { userId, type: "SLEEP", date: { gte: dayStart, lte: dayEnd } }, select: { id: true } });
      if (existing) {
        await prisma.healthMetric.updateMany({ where: { id: existing.id, userId }, data: { value } });
        return { ok: true, id: existing.id, summary: `Sono do dia atualizado para ${value}h.` };
      }
      const s = await prisma.healthMetric.create({ data: { type: "SLEEP", value, date: base, userId } });
      return { ok: true, id: s.id, summary: `Sono de ${value}h registrado.` };
    }
    case "HABITS": {
      if (!title) return { ok: false, summary: "Hábito exige nome (title)." };
      const h = await prisma.habit.create({ data: { name: title, userId } });
      return { ok: true, id: h.id, summary: `Hábito "${h.name}" criado. Marque-o com UPDATE + status=DONE.` };
    }
    default:
      return { ok: false, summary: `CREATE não suportado para ${module}.` };
  }
}

/* --- UPDATE --- */
async function handleUpdate(userId: string, args: ToolArgs): Promise<MutationResult> {
  const { module, id, title, description, value, category, status, date } = args;
  if (!id) return { ok: false, summary: "UPDATE exige o id. Busque o registro primeiro." };
  const due = parseAIDate(date);

  switch (module) {
    case "TASKS": {
      const data: { title?: string; description?: string; priority?: string; status?: string; isDone?: boolean; dueDate?: Date } = {};
      if (title) data.title = title;
      if (description != null) data.description = description;
      const pr = asEnum(category, TASK_PRIORITIES);
      if (pr) data.priority = pr;
      const st = asEnum(status, TASK_STATUSES);
      if (st) { data.status = st; data.isDone = st === "DONE"; }
      if (due) data.dueDate = due;
      const r = await prisma.task.updateMany({ where: { id, userId }, data });
      return r.count > 0 ? { ok: true, id, summary: `Tarefa ${id} atualizada.` } : { ok: false, summary: `Tarefa ${id} não encontrada.` };
    }
    case "FINANCE": {
      // Por segurança, UPDATE não altera valor (evita drift de saldo); só metadados.
      const data: { description?: string; category?: string; date?: Date } = {};
      if (title) data.description = title;
      if (description != null) data.category = description;
      if (due) data.date = due;
      const r = await prisma.transaction.updateMany({ where: { id, userId }, data });
      return r.count > 0 ? { ok: true, id, summary: `Lançamento ${id} atualizado (valor inalterado — apague e recrie para mudar o valor).` } : { ok: false, summary: `Lançamento ${id} não encontrado.` };
    }
    case "ENTERTAINMENT": {
      const data: { title?: string; status?: string; rating?: number; overview?: string } = {};
      if (title) data.title = title;
      if (status) data.status = status;
      if (value != null) data.rating = value;
      if (description != null) data.overview = description;
      const r = await prisma.mediaItem.updateMany({ where: { id, userId }, data });
      return r.count > 0 ? { ok: true, id, summary: `Mídia ${id} atualizada.` } : { ok: false, summary: `Mídia ${id} não encontrada.` };
    }
    case "PROJECTS": {
      const data: { title?: string; description?: string; status?: string } = {};
      if (title) data.title = title;
      if (description != null) data.description = description;
      if (status) data.status = status;
      const r = await prisma.project.updateMany({ where: { id, userId }, data });
      return r.count > 0 ? { ok: true, id, summary: `Projeto ${id} atualizado.` } : { ok: false, summary: `Projeto ${id} não encontrado.` };
    }
    case "CRM": {
      const data: { name?: string; company?: string; status?: string; notes?: string } = {};
      if (title) data.name = title;
      if (category) data.company = category;
      const cs = asEnum(status, CLIENT_STATUSES);
      if (cs) data.status = cs;
      if (description != null) data.notes = description;
      const r = await prisma.client.updateMany({ where: { id, userId }, data });
      return r.count > 0 ? { ok: true, id, summary: `Cliente ${id} atualizado.` } : { ok: false, summary: `Cliente ${id} não encontrado.` };
    }
    case "FRIENDS": {
      const data: { name?: string; notes?: string; company?: string } = {};
      if (title) data.name = title;
      if (description != null) data.notes = description;
      if (category) data.company = category;
      const r = await prisma.friend.updateMany({ where: { id, userId }, data });
      return r.count > 0 ? { ok: true, id, summary: `Contato ${id} atualizado.` } : { ok: false, summary: `Contato ${id} não encontrado.` };
    }
    case "WARDROBE": {
      const data: { name?: string; category?: string; status?: string; brand?: string } = {};
      if (title) data.name = title;
      if (category) data.category = category;
      if (status) data.status = status;
      if (description != null) data.brand = description;
      const r = await prisma.wardrobeItem.updateMany({ where: { id, userId }, data });
      return r.count > 0 ? { ok: true, id, summary: `Peça ${id} atualizada.` } : { ok: false, summary: `Peça ${id} não encontrada.` };
    }
    case "AGENDA": {
      const data: { title?: string; description?: string; location?: string; startTime?: Date } = {};
      if (title) data.title = title;
      if (description != null) data.description = description;
      if (category) data.location = category;
      if (due) data.startTime = due;
      const r = await prisma.event.updateMany({ where: { id, userId }, data });
      return r.count > 0 ? { ok: true, id, summary: `Evento ${id} atualizado.` } : { ok: false, summary: `Evento ${id} não encontrado.` };
    }
    case "HEALTH": {
      const data: { title?: string; type?: string; duration?: number; notes?: string } = {};
      if (title) data.title = title;
      if (category) data.type = category;
      if (value != null) data.duration = value;
      if (description != null) data.notes = description;
      const r = await prisma.workout.updateMany({ where: { id, userId }, data });
      return r.count > 0 ? { ok: true, id, summary: `Treino ${id} atualizado.` } : { ok: false, summary: `Treino ${id} não encontrado.` };
    }
    case "STUDIES": {
      // id refere-se a uma sessão de estudo (mesmo alvo de query/delete).
      const data: { durationMinutes?: number; date?: Date; notesRaw?: string } = {};
      if (value != null) data.durationMinutes = value;
      if (due) data.date = due;
      if (description != null) data.notesRaw = description;
      const r = await prisma.studySession.updateMany({ where: { id, userId }, data });
      return r.count > 0 ? { ok: true, id, summary: `Sessão de estudo ${id} atualizada.` } : { ok: false, summary: `Sessão ${id} não encontrada.` };
    }
    case "VAULT": {
      // title=título, category=usuário, description=nova senha (re-cifrada).
      const data: { title?: string; username?: string; password?: string } = {};
      if (title) data.title = title;
      if (category) data.username = category;
      if (description != null && description !== "") data.password = encrypt(description);
      const r = await prisma.accessItem.updateMany({ where: { id, userId }, data });
      return r.count > 0 ? { ok: true, id, summary: `Acesso ${id} atualizado.` } : { ok: false, summary: `Acesso ${id} não encontrado.` };
    }
    case "NUTRITION": {
      const data: { title?: string; items?: string; calories?: number; type?: string; date?: Date } = {};
      if (title) data.title = title;
      if (description != null) data.items = description;
      if (value != null) data.calories = Math.round(value);
      if (category && ["BREAKFAST", "LUNCH", "SNACK", "DINNER"].includes(category)) data.type = category;
      if (due) data.date = due;
      const r = await prisma.meal.updateMany({ where: { id, userId }, data });
      return r.count > 0 ? { ok: true, id, summary: `Refeição ${id} atualizada.` } : { ok: false, summary: `Refeição ${id} não encontrada.` };
    }
    case "SLEEP": {
      const data: { value?: number; date?: Date } = {};
      if (value != null) data.value = value;
      if (due) data.date = due;
      const r = await prisma.healthMetric.updateMany({ where: { id, userId, type: "SLEEP" }, data });
      return r.count > 0 ? { ok: true, id, summary: `Registro de sono ${id} atualizado.` } : { ok: false, summary: `Registro de sono ${id} não encontrado.` };
    }
    case "HABITS": {
      const habit = await prisma.habit.findFirst({ where: { id, userId }, select: { id: true, name: true } });
      if (!habit) return { ok: false, summary: `Hábito ${id} não encontrado.` };

      // status=DONE|FAILED marca o hábito no dia (upsert do log diário).
      const st = status?.toUpperCase();
      if (st === "DONE" || st === "FAILED") {
        const day = habitDayKey(due);
        await prisma.habitLog.upsert({
          where: { habitId_date: { habitId: habit.id, date: day } },
          update: { status: st },
          create: { habitId: habit.id, userId, date: day, status: st },
        });
        return { ok: true, id, summary: `Hábito "${habit.name}" marcado como ${st === "DONE" ? "FEITO" : "FALHOU"} em ${day.toISOString().slice(0, 10)}.` };
      }

      if (title) {
        await prisma.habit.updateMany({ where: { id, userId }, data: { name: title } });
        return { ok: true, id, summary: `Hábito renomeado para "${title}".` };
      }
      return { ok: false, summary: "Para hábitos, envie status=DONE|FAILED (marcar o dia) ou title (renomear)." };
    }
    default:
      return { ok: false, summary: `UPDATE não suportado para ${module}.` };
  }
}
