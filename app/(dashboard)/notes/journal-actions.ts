"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// =========================================================
// DIÁRIO (#2, Fase 2 — Segundo Cérebro)
// =========================================================
// Uma nota por dia num caderno "Diário" dedicado (identificado pelo icon
// "journal", então renomear o caderno não quebra nada). A data vem do CLIENTE
// (dayKey "yyyy-mm-dd") para não sofrer o bug de fuso do "dia anterior".

const JOURNAL_ICON = "journal";

// Template leve: seções que guiam sem engessar.
const JOURNAL_TEMPLATE = `## 🌅 Como cheguei ao dia
_Energia, humor, sono…_

## 📌 O que aconteceu

## 💡 O que aprendi / ideias

## 🙏 Gratidão
`;

/** Garante o caderno do Diário; devolve o id. */
async function ensureJournalNotebook(userId: string): Promise<string> {
  const existing = await prisma.notebook.findFirst({
    where: { userId, icon: JOURNAL_ICON },
    select: { id: true },
  });
  if (existing) return existing.id;
  const max = await prisma.notebook.aggregate({ where: { userId }, _max: { position: true } });
  const created = await prisma.notebook.create({
    data: { userId, name: "Diário", icon: JOURNAL_ICON, color: "#f59e0b", position: (max._max.position ?? 0) + 1 },
  });
  return created.id;
}

function titleFor(dayKey: string): string {
  const [y, m, d] = dayKey.split("-");
  return `Diário — ${d}/${m}/${y}`;
}

/**
 * Abre (criando se preciso) a entrada de hoje do diário e devolve o id da nota.
 * `dayKey` = "yyyy-mm-dd" resolvido no cliente.
 */
export async function openTodayJournal(dayKey: string): Promise<{ success: boolean; id?: string; message: string }> {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return { success: false, message: "Data inválida." };
    const userId = await requireUserId();
    const notebookId = await ensureJournalNotebook(userId);
    const title = titleFor(dayKey);

    const existing = await prisma.studyNote.findFirst({
      where: { userId, notebookId, title, deletedAt: null },
      select: { id: true },
    });
    if (existing) return { success: true, id: existing.id, message: "Diário de hoje aberto." };

    const created = await prisma.studyNote.create({
      data: { userId, notebookId, title, content: JOURNAL_TEMPLATE, tags: "diário" },
      select: { id: true },
    });
    revalidatePath("/notes");
    return { success: true, id: created.id, message: "Diário de hoje criado. Escreva sem filtro." };
  } catch (error) {
    console.error("Erro ao abrir o diário:", error);
    return { success: false, message: "Falha ao abrir o diário." };
  }
}

/** Sequência de dias seguidos com entrada no diário (terminando hoje ou ontem). */
export async function getJournalStreak(todayKey: string): Promise<number> {
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(todayKey)) return 0;
    const userId = await requireUserId();
    const notebook = await prisma.notebook.findFirst({
      where: { userId, icon: JOURNAL_ICON },
      select: { id: true },
    });
    if (!notebook) return 0;

    const titles = await prisma.studyNote.findMany({
      where: { userId, notebookId: notebook.id, deletedAt: null, title: { startsWith: "Diário — " } },
      select: { title: true },
    });
    // Reconstrói os dayKeys a partir do título (dd/mm/yyyy → yyyy-mm-dd).
    const days = new Set<string>();
    for (const t of titles) {
      const m = /^Diário — (\d{2})\/(\d{2})\/(\d{4})$/.exec(t.title);
      if (m) days.add(`${m[3]}-${m[2]}-${m[1]}`);
    }
    if (days.size === 0) return 0;

    // Caminha de hoje para trás; se hoje ainda não tem entrada, começa de ontem.
    const cursor = new Date(`${todayKey}T12:00:00Z`);
    if (!days.has(todayKey)) cursor.setUTCDate(cursor.getUTCDate() - 1);
    let streak = 0;
    for (;;) {
      const key = cursor.toISOString().slice(0, 10);
      if (!days.has(key)) break;
      streak++;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
    }
    return streak;
  } catch (error) {
    console.error("Erro ao calcular streak do diário:", error);
    return 0;
  }
}
