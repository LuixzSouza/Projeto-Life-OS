"use server";

// Briefing diário proativo (#5 do roadmap de IA): a IA "fala primeiro".
// Gera um resumo matinal com agenda do dia, tarefas críticas, saldo e hábitos,
// usando runOneShotAi (com fallback local — nada quebra sem IA) e cache de 1
// dia em Settings.aiBriefing (JSON {date, text, source}).

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DailyBriefing {
  date: string;          // YYYY-MM-DD do dia gerado
  text: string;          // o briefing em si (markdown leve)
  source: "ai" | "local"; // IA configurada ou fallback determinístico
}

interface BriefingCache {
  date?: string;
  text?: string;
  source?: string;
}

function todayKey(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

/** Coleta os dados do dia (tudo bounded — contagens e top-N pequenos). */
async function collectDayData(userId: string) {
  const now = new Date();
  const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now); dayEnd.setHours(23, 59, 59, 999);

  const [settings, accounts, events, criticalTasks, overdueCount, habits, doneToday, lastSleep] = await Promise.all([
    prisma.settings.findUnique({ where: { userId }, select: { currency: true } }),
    prisma.account.findMany({ where: { userId }, select: { balance: true } }),
    prisma.event.findMany({
      where: { userId, deletedAt: null, startTime: { gte: dayStart, lte: dayEnd } },
      orderBy: { startTime: "asc" }, take: 5,
      select: { title: true, startTime: true, location: true },
    }),
    prisma.task.findMany({
      where: { userId, deletedAt: null, isDone: false, OR: [{ priority: "HIGH" }, { dueDate: { lte: dayEnd } }] },
      orderBy: [{ dueDate: "asc" }], take: 5,
      select: { title: true, priority: true, dueDate: true },
    }),
    prisma.task.count({ where: { userId, deletedAt: null, isDone: false, dueDate: { lt: dayStart } } }),
    prisma.habit.count({ where: { userId, archived: false } }),
    prisma.habitLog.count({ where: { userId, status: "DONE", date: { gte: dayStart, lte: dayEnd } } }),
    prisma.healthMetric.findFirst({ where: { userId, type: "SLEEP" }, orderBy: { date: "desc" }, select: { value: true, date: true } }),
  ]);

  const currency = settings?.currency || "R$";
  const saldo = accounts.reduce((acc, a) => acc + Number(a.balance), 0);

  return { currency, saldo, events, criticalTasks, overdueCount, habits, doneToday, lastSleep };
}

type DayData = Awaited<ReturnType<typeof collectDayData>>;

/** Fallback local: briefing determinístico montado só com os dados (sem IA). */
function localBriefing(d: DayData): string {
  const lines: string[] = [];
  const hoje = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });
  lines.push(`**${hoje.charAt(0).toUpperCase()}${hoje.slice(1)}.**`);

  if (d.events.length > 0) {
    const ev = d.events.map((e) => `${e.title} às ${format(e.startTime, "HH:mm")}`).join(" · ");
    lines.push(`📅 Hoje: ${ev}.`);
  } else {
    lines.push("📅 Agenda livre hoje — bom dia para avançar no que importa.");
  }

  if (d.criticalTasks.length > 0) {
    const ts = d.criticalTasks.map((t) => t.title).slice(0, 3).join("; ");
    const extra = d.overdueCount > 0 ? ` (${d.overdueCount} atrasada${d.overdueCount > 1 ? "s" : ""})` : "";
    lines.push(`✅ Prioridades: ${ts}${extra}.`);
  }

  lines.push(`💰 Saldo total: ${d.currency} ${d.saldo.toFixed(2)}.`);

  if (d.habits > 0) {
    lines.push(`🔥 Hábitos: ${d.doneToday}/${d.habits} feitos hoje.`);
  }
  if (d.lastSleep) {
    lines.push(`😴 Última noite registrada: ${d.lastSleep.value}h de sono.`);
  }
  return lines.join("\n\n");
}

/** Prompt compacto para a IA narrar o briefing com os dados REAIS. */
function aiPrompt(d: DayData): { system: string; user: string } {
  const system =
    "Você é o briefing matinal do Life OS. Escreva um resumo do dia em PT-BR, " +
    "tom direto e encorajador, no MÁXIMO 5 frases curtas (pode usar **negrito** e emojis com moderação). " +
    "Use SOMENTE os dados fornecidos — nunca invente números, eventos ou tarefas. " +
    "Estruture: visão do dia → prioridade nº 1 → um lembrete útil. Sem saudação genérica, sem se apresentar.";

  const parts: string[] = [];
  parts.push(`Data: ${format(new Date(), "EEEE, dd/MM/yyyy", { locale: ptBR })}`);
  parts.push(`Saldo total: ${d.currency} ${d.saldo.toFixed(2)}`);
  parts.push(d.events.length
    ? `Eventos de hoje: ${d.events.map((e) => `${e.title} ${format(e.startTime, "HH:mm")}${e.location ? ` (${e.location})` : ""}`).join("; ")}`
    : "Eventos de hoje: nenhum");
  parts.push(d.criticalTasks.length
    ? `Tarefas críticas: ${d.criticalTasks.map((t) => `${t.title}${t.dueDate ? ` (vence ${format(t.dueDate, "dd/MM")})` : ""}`).join("; ")}`
    : "Tarefas críticas: nenhuma");
  if (d.overdueCount > 0) parts.push(`Tarefas atrasadas: ${d.overdueCount}`);
  if (d.habits > 0) parts.push(`Hábitos: ${d.doneToday}/${d.habits} concluídos hoje`);
  if (d.lastSleep) parts.push(`Sono da última noite registrada: ${d.lastSleep.value}h`);

  return { system, user: parts.join("\n") };
}

/**
 * Devolve o briefing do dia. Cache de 1 dia em Settings.aiBriefing;
 * `force` ignora o cache e regenera (botão de refresh na UI).
 */
export async function getDailyBriefing(force = false): Promise<DailyBriefing> {
  const userId = await requireUserId();
  const today = todayKey();

  const settings = await prisma.settings.findUnique({ where: { userId }, select: { aiBriefing: true } });

  if (!force && settings?.aiBriefing) {
    try {
      const cached = JSON.parse(settings.aiBriefing) as BriefingCache;
      if (cached.date === today && cached.text) {
        return { date: today, text: cached.text, source: cached.source === "ai" ? "ai" : "local" };
      }
    } catch { /* cache corrompido → regenera */ }
  }

  const data = await collectDayData(userId);
  const { system, user } = aiPrompt(data);

  const aiText = await runOneShotAi(userId, system, user);
  const briefing: DailyBriefing = aiText
    ? { date: today, text: aiText, source: "ai" }
    : { date: today, text: localBriefing(data), source: "local" };

  // Cache best-effort — falha de escrita nunca quebra o Dashboard.
  try {
    await prisma.settings.updateMany({ where: { userId }, data: { aiBriefing: JSON.stringify(briefing) } });
  } catch { /* noop */ }

  return briefing;
}
