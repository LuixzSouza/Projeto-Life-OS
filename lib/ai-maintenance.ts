// Manutenção inteligente (Tier 4D/E do roadmap de IA):
// - auditSubscriptions (#25): caça cobranças recorrentes não cadastradas e
//   aumentos de preço, a partir do histórico REAL de transações.
// - cleanupScan (#29): o "faxineiro" — varre e PROPÕE (nunca executa sozinho):
//   tarefas mortas, projetos zumbis, duplicatas prováveis, mídia esquecida.
//   A exclusão usa o fluxo de confirmação em 2 passos que já existe.

import { prisma } from "@/lib/prisma";

const DAY_MS = 24 * 60 * 60 * 1000;

/* ============================================================================
   #25 — CAÇADOR DE ASSINATURAS
   ============================================================================ */

function normalizeDesc(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\d{2,}/g, "")           // remove números longos (parcelas, ids)
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40);
}

export async function auditSubscriptions(userId: string): Promise<Record<string, unknown>> {
  const since = new Date(Date.now() - 180 * DAY_MS);
  const [txs, knownCharges, knownExpenses] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: since } },
      orderBy: { date: "asc" },
      select: { description: true, amount: true, date: true },
    }),
    prisma.recurringCharge.findMany({ where: { userId }, select: { title: true } }),
    prisma.recurringExpense.findMany({ where: { userId }, select: { title: true } }),
  ]);

  // Agrupa por descrição normalizada e analisa recorrência mensal.
  const groups = new Map<string, { label: string; months: Set<string>; amounts: { month: string; value: number }[] }>();
  for (const t of txs) {
    const key = normalizeDesc(t.description);
    if (key.length < 3) continue;
    const month = t.date.toISOString().slice(0, 7);
    const g = groups.get(key) ?? { label: t.description, months: new Set<string>(), amounts: [] };
    g.months.add(month);
    g.amounts.push({ month, value: Number(t.amount) });
    groups.set(key, g);
  }

  const known = new Set([...knownCharges, ...knownExpenses].map((k) => normalizeDesc(k.title)));

  const possiveisAssinaturas: { descricao: string; meses_cobrados: number; valor_tipico: number }[] = [];
  const aumentosDePreco: { descricao: string; de: number; para: number; aumento_pct: number }[] = [];

  for (const [key, g] of groups) {
    if (g.months.size < 3) continue; // precisa aparecer em 3+ meses distintos

    const sorted = [...g.amounts].sort((a, b) => a.month.localeCompare(b.month));
    const last = sorted[sorted.length - 1];
    const prevValues = sorted.slice(0, -1).map((a) => a.value);
    const typical = prevValues.sort((a, b) => a - b)[Math.floor(prevValues.length / 2)] ?? last.value;

    // Valores aproximadamente estáveis = cara de assinatura.
    const stable = prevValues.length > 0 && prevValues.every((v) => Math.abs(v - typical) / typical <= 0.25);
    if (!stable) continue;

    if (!known.has(key)) {
      possiveisAssinaturas.push({ descricao: g.label, meses_cobrados: g.months.size, valor_tipico: Number(typical.toFixed(2)) });
    }
    // Aumento de preço: última cobrança ≥10% acima do típico anterior.
    if (last.value > typical * 1.1) {
      aumentosDePreco.push({
        descricao: g.label,
        de: Number(typical.toFixed(2)),
        para: Number(last.value.toFixed(2)),
        aumento_pct: Number((((last.value - typical) / typical) * 100).toFixed(1)),
      });
    }
  }

  return {
    janela: "últimos 6 meses",
    possiveis_assinaturas_nao_cadastradas: possiveisAssinaturas.slice(0, 10),
    aumentos_de_preco: aumentosDePreco.slice(0, 10),
    dica: "Sugira cadastrar as recorrências em /finance (Cobranças/Custos fixos) e questionar assinaturas sem uso.",
  };
}

/* ============================================================================
   #29 — FAXINEIRO DO SISTEMA (varre e propõe; nunca apaga sozinho)
   ============================================================================ */

export async function cleanupScan(userId: string): Promise<Record<string, unknown>> {
  const now = Date.now();
  const d90 = new Date(now - 90 * DAY_MS);
  const d365 = new Date(now - 365 * DAY_MS);

  const [staleTasks, zombieProjects, staleWatching, inboxNotes, allTasks] = await Promise.all([
    prisma.task.findMany({
      where: { userId, deletedAt: null, isDone: false, updatedAt: { lt: d90 } },
      orderBy: { updatedAt: "asc" }, take: 10,
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.project.findMany({
      where: { userId, deletedAt: null, status: "ACTIVE", updatedAt: { lt: d90 } },
      orderBy: { updatedAt: "asc" }, take: 5,
      select: { id: true, title: true, updatedAt: true, _count: { select: { tasks: true } } },
    }),
    prisma.mediaItem.findMany({
      where: { userId, deletedAt: null, status: "WATCHING", updatedAt: { lt: d365 } },
      take: 5,
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.studyNote.findMany({
      where: { userId, notebook: { isInbox: true }, updatedAt: { lt: d90 } },
      take: 10,
      select: { id: true, title: true, updatedAt: true },
    }),
    prisma.task.findMany({
      where: { userId, deletedAt: null, isDone: false },
      select: { id: true, title: true },
    }),
  ]);

  // Duplicatas prováveis: tarefas abertas com o MESMO título normalizado.
  const byTitle = new Map<string, { id: string; title: string }[]>();
  for (const t of allTasks) {
    const key = t.title.toLowerCase().trim();
    const arr = byTitle.get(key) ?? [];
    arr.push(t);
    byTitle.set(key, arr);
  }
  const duplicatas = [...byTitle.values()].filter((arr) => arr.length > 1).slice(0, 5)
    .map((arr) => ({ titulo: arr[0].title, ids: arr.map((t) => t.id) }));

  const days = (d: Date) => Math.floor((now - d.getTime()) / DAY_MS);

  return {
    tarefas_paradas_90_dias: staleTasks.map((t) => ({ id: t.id, titulo: t.title, parada_ha_dias: days(t.updatedAt) })),
    projetos_zumbis: zombieProjects.map((p) => ({ id: p.id, titulo: p.title, sem_toque_ha_dias: days(p.updatedAt), tarefas: p._count.tasks })),
    midia_assistindo_ha_1_ano: staleWatching.map((m) => ({ id: m.id, titulo: m.title, parada_ha_dias: days(m.updatedAt) })),
    notas_na_entrada_ha_90_dias: inboxNotes.map((n) => ({ id: n.id, titulo: n.title, parada_ha_dias: days(n.updatedAt) })),
    duplicatas_provaveis_tarefas: duplicatas,
    instrucao: "PROPONHA a faxina item a item (arquivar/concluir/apagar) e SÓ apague com o fluxo de confirmação (DELETE sem confirm → usuário aprova → confirm=true). Nunca apague em lote sem listar antes.",
  };
}
