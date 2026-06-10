// Automações agendadas da IA (#10 do roadmap): "toda sexta me mande o resumo
// financeiro". O runner pega carona no fluxo de lembretes (generateReminders,
// disparado pelo sino de notificações) — no desktop o processo está sempre de
// pé; na nuvem roda quando o app abre. Idempotente: 1 execução por dia/agenda.
//
// Resultado vira Notification com link /ai?q=... para aprofundar na conversa.

import { prisma } from "@/lib/prisma";
import { runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";
import { getUserContext } from "@/lib/ai-context";

export type AutomationSchedule = "DAILY" | `WEEKLY:${number}` | `MONTHLY:${number}`;

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** A automação deve rodar agora? (hora atingida, dia certo, ainda não rodou hoje) */
export function isAutomationDue(schedule: string, hour: number, lastRunAt: Date | null, now: Date): boolean {
  if (now.getHours() < hour) return false;
  if (lastRunAt && sameLocalDay(lastRunAt, now)) return false;

  const [kind, rawArg] = schedule.split(":");
  const arg = Number(rawArg);
  switch (kind) {
    case "DAILY": return true;
    case "WEEKLY": return now.getDay() === (Number.isFinite(arg) ? arg : 1);
    case "MONTHLY": return now.getDate() === (Number.isFinite(arg) ? arg : 1);
    default: return false;
  }
}

/**
 * Executa as automações vencidas do usuário. Marca lastRunAt ANTES de chamar a
 * IA (evita duplicar em chamadas concorrentes); com IA indisponível, a
 * notificação ainda sai com link para rodar o prompt manualmente no chat.
 */
export async function runDueAutomations(userId: string): Promise<number> {
  const autos = await prisma.aiAutomation.findMany({ where: { userId, enabled: true } });
  if (autos.length === 0) return 0;

  const now = new Date();
  const dayKey = now.toISOString().slice(0, 10);
  let ran = 0;

  for (const auto of autos) {
    if (!isAutomationDue(auto.schedule, auto.hour, auto.lastRunAt, now)) continue;

    const claimed = await prisma.aiAutomation.updateMany({
      where: { id: auto.id, userId, lastRunAt: auto.lastRunAt },
      data: { lastRunAt: now },
    });
    if (claimed.count === 0) continue; // outra aba/processo já pegou

    // Snapshot compacto dá contexto real ao one-shot (sem tools).
    let snapshot = "";
    try { snapshot = await getUserContext(); } catch { snapshot = ""; }

    const system =
      "Você executa uma AUTOMAÇÃO AGENDADA do Life OS. Responda o pedido do usuário em no máximo 4 frases, " +
      "objetivas e em PT-BR, usando os dados do snapshot abaixo. Não invente números.\n\n" +
      `[SNAPSHOT]\n${snapshot}`;

    const text = await runOneShotAi(userId, system, auto.prompt);

    // Notificação idempotente por automação+dia.
    const entityId = `${auto.id}:${dayKey}`;
    const exists = await prisma.notification.findFirst({
      where: { userId, type: "AI_AUTOMATION", entityType: "aiAutomation", entityId },
      select: { id: true },
    });
    if (!exists) {
      await prisma.notification.create({
        data: {
          userId,
          type: "AI_AUTOMATION",
          title: `🤖 ${auto.title}`,
          body: (text ?? "A IA não está conectada — toque para rodar no chat.").slice(0, 280),
          entityType: "aiAutomation",
          entityId,
          actionUrl: `/ai?q=${encodeURIComponent(auto.prompt.slice(0, 500))}`,
          priority: "NORMAL",
        },
      });
    }
    ran++;
  }
  return ran;
}
