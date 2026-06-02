// Camada de acesso a dados da IA — "enxuta por design".
//
// Objetivo: a IA NUNCA lê o banco inteiro. Tudo aqui devolve projeções
// compactas (poucos campos), agregações feitas em SQL e paginação. Assim o
// custo de token não cresce com o volume de dados ("pronto pra vida").
//
// Módulo server-only: importado só por actions/tools.ts (nunca por client).
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { encrypt } from "@/lib/crypto";
import type { AIModule, ToolArgs, MutationResult } from "@/app/(dashboard)/ai/actions/types";

/* ----------------------------------------------------------------------------
   HELPERS
   ---------------------------------------------------------------------------- */

const LIST_DEFAULT = 5;
const LIST_MAX = 25;

function clampLimit(n?: number): number {
  if (!n || n < 1) return LIST_DEFAULT;
  return Math.min(Math.floor(n), LIST_MAX);
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
};

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
      const where = { userId, ...(search ? { description: { contains: search } } : {}), ...(args.category ? { category: args.category } : {}) };
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
      const where = { userId, ...(search ? { title: { contains: search } } : {}), ...(args.status ? { status: args.status } : {}) };
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
      const where = { userId, ...(search ? { title: { contains: search } } : {}), ...(args.status ? { status: args.status } : {}) };
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
      const where = { userId, ...(search ? { title: { contains: search } } : {}) };
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
      const where = { userId, ...(search ? { subject: { title: { contains: search } } } : {}) };
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
      const where = { userId, ...(search ? { title: { contains: search } } : {}), ...(args.status ? { status: args.status } : {}) };
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
      const where = { userId, ...(search ? { name: { contains: search } } : {}), ...(args.status ? { status: args.status } : {}) };
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
      const where = { userId, ...(search ? { name: { contains: search } } : {}) };
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
      const where = { userId, ...(search ? { title: { contains: search } } : {}) };
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
      const where = { userId, ...(search ? { name: { contains: search } } : {}), ...(args.category ? { category: args.category } : {}) };
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
      const where = { userId, startTime: { gte: new Date() }, ...(search ? { title: { contains: search } } : {}) };
      const [rows, total] = await Promise.all([
        prisma.event.findMany({ where, orderBy: { startTime: "asc" }, take, skip, select: { id: true, title: true, startTime: true, location: true } }),
        prisma.event.count({ where }),
      ]);
      return {
        total, hasMore: skip + rows.length < total,
        eventos: rows.map((e) => ({ id: e.id, titulo: e.title, quando: e.startTime.toISOString().slice(0, 16).replace("T", " "), local: e.location })),
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
        prisma.transaction.groupBy({ by: ["type"], where: { userId, date: { gte: monthStart } }, _sum: { amount: true } }),
        prisma.transaction.groupBy({ by: ["category"], where: { userId, type: "EXPENSE", date: { gte: monthStart } }, _sum: { amount: true }, orderBy: { _sum: { amount: "desc" } }, take: 5 }),
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
        prisma.task.count({ where: { userId, isDone: false } }),
        prisma.task.count({ where: { userId, isDone: false, dueDate: { lt: now } } }),
        prisma.task.count({ where: { userId, isDone: true } }),
        prisma.task.groupBy({ by: ["status"], where: { userId, isDone: false }, _count: { _all: true } }),
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
      const byStatus = await prisma.mediaItem.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } });
      return { por_status: byStatus.map((s) => ({ status: s.status, total: s._count._all })) };
    }
    case "PROJECTS": {
      const byStatus = await prisma.project.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } });
      return { por_status: byStatus.map((s) => ({ status: s.status, total: s._count._all })) };
    }
    case "CRM": {
      const [clientes, byStatus] = await Promise.all([
        prisma.client.count({ where: { userId } }),
        prisma.client.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
      ]);
      return { clientes, por_status: byStatus.map((s) => ({ status: s.status, total: s._count._all })) };
    }
    case "FRIENDS": {
      const total = await prisma.friend.count({ where: { userId } });
      return { contatos: total };
    }
    case "VAULT": {
      const total = await prisma.accessItem.count({ where: { userId } });
      return { acessos_guardados: total };
    }
    case "WARDROBE": {
      const [total, byCat] = await Promise.all([
        prisma.wardrobeItem.count({ where: { userId } }),
        prisma.wardrobeItem.groupBy({ by: ["category"], where: { userId }, _count: { _all: true }, orderBy: { _count: { category: "desc" } }, take: 5 }),
      ]);
      return { pecas: total, por_categoria: byCat.map((c) => ({ categoria: c.category, total: c._count._all })) };
    }
    case "AGENDA": {
      const now = new Date();
      const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const proximos = await prisma.event.count({ where: { userId, startTime: { gte: now, lte: in7 } } });
      return { eventos_proximos_7_dias: proximos };
    }
    default:
      return { erro: `Resumo não disponível para ${module}.` };
  }
}

/* ----------------------------------------------------------------------------
   ESCRITA — mutateModule (CREATE / UPDATE / DELETE em todos os módulos)
   ---------------------------------------------------------------------------- */

export async function mutateModule(userId: string, args: ToolArgs): Promise<MutationResult> {
  const { module, action } = args;
  if (!module) return { ok: false, summary: "Informe o módulo." };
  if (!action) return { ok: false, summary: "Informe a ação (CREATE, UPDATE ou DELETE)." };

  if (action === "DELETE") return handleDelete(userId, args);

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
    default: return null;
  }
}

async function deleteRecord(userId: string, module: AIModule, id: string): Promise<void> {
  switch (module) {
    case "FINANCE": {
      // Reverte o saldo da conta antes de excluir o lançamento.
      const tx = await prisma.transaction.findFirst({ where: { id, userId }, select: { amount: true, type: true, accountId: true } });
      await prisma.transaction.deleteMany({ where: { id, userId } });
      if (tx) {
        const account = await prisma.account.findFirst({ where: { id: tx.accountId, userId }, select: { id: true, balance: true } });
        if (account) {
          const delta = tx.type === "INCOME" ? -Number(tx.amount) : Number(tx.amount);
          await prisma.account.updateMany({ where: { id: account.id, userId }, data: { balance: Number(account.balance) + delta } });
        }
      }
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
  }
}

/* --- CREATE --- */
async function handleCreate(userId: string, args: ToolArgs): Promise<MutationResult> {
  const { module, title, description, value, category, status, date } = args;
  const due = parseAIDate(date);

  switch (module) {
    case "TASKS": {
      if (!title) return { ok: false, summary: "Tarefa exige título." };
      const t = await prisma.task.create({ data: { title, description: description ?? null, priority: category ?? "MEDIUM", status: status ?? "TODO", dueDate: due ?? null, userId } });
      return { ok: true, id: t.id, summary: `Tarefa criada: "${t.title}" (id ${t.id}).` };
    }
    case "FINANCE": {
      if (!title || value == null) return { ok: false, summary: "Lançamento exige descrição (title) e valor (value)." };
      const account = await prisma.account.findFirst({ where: { userId }, select: { id: true, balance: true } });
      if (!account) return { ok: false, summary: "Nenhuma conta cadastrada. Crie uma conta antes de lançar." };
      const type = category === "INCOME" ? "INCOME" : "EXPENSE";
      const tx = await prisma.transaction.create({ data: { description: title, amount: value, type, category: description ?? "Geral", date: due ?? new Date(), accountId: account.id, userId } });
      const delta = type === "INCOME" ? value : -value;
      await prisma.account.updateMany({ where: { id: account.id, userId }, data: { balance: Number(account.balance) + delta } });
      return { ok: true, id: tx.id, summary: `Lançado ${type} de ${value} (id ${tx.id}).` };
    }
    case "HEALTH": {
      if (category === "WEIGHT" && value != null) {
        const b = await prisma.bodyMeasurement.create({ data: { weight: value, height: 0, gender: "N/A", userId } });
        return { ok: true, id: b.id, summary: `Peso de ${value}kg registrado.` };
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
      const n = await prisma.studyNote.create({ data: { title, content: description ?? "", userId } });
      return { ok: true, id: n.id, summary: `Anotação "${n.title}" salva.` };
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
      const c = await prisma.client.create({ data: { name: title, company: category ?? null, notes: description ?? null, status: status ?? "ACTIVE", userId } });
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
      if (category) data.priority = category;
      if (status) { data.status = status; data.isDone = status === "DONE"; }
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
      if (status) data.status = status;
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
    default:
      return { ok: false, summary: `UPDATE não suportado para ${module}.` };
  }
}
