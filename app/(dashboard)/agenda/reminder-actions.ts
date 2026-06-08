"use server";

// Lembretes de blocos (Fase 1): avisa quando um bloco (Event) está prestes a começar.
// Só blocos com `emailAlert` ligado ("Alerta -30 min" no formulário) entram. Persiste
// na caixa de entrada de forma idempotente (notifyOnce) e devolve os blocos iminentes
// para o poller in-app disparar toast/notificação do navegador.

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { notifyOnce } from "@/lib/notifications";

const DEFAULT_LEAD_MINUTES = 30; // antecedência padrão (configurável em Settings)

const hhmm = (d: Date) =>
  `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

export interface UpcomingBlock {
  id: string;
  title: string;
  startTime: string; // ISO
  location: string | null;
  minutesUntil: number;
}

export async function pollBlockReminders(): Promise<UpcomingBlock[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  // Antecedência configurável pelo usuário (Settings → Rotina).
  const settings = await prisma.settings.findUnique({ where: { userId }, select: { reminderLeadMinutes: true } });
  const leadMinutes = settings?.reminderLeadMinutes ?? DEFAULT_LEAD_MINUTES;

  const now = new Date();
  const leadEnd = new Date(now.getTime() + leadMinutes * 60_000);

  // Blocos que AINDA não começaram e iniciam dentro da janela de antecedência.
  const events = await prisma.event.findMany({
    where: { userId, deletedAt: null, emailAlert: true, startTime: { gt: now, lte: leadEnd } },
    select: { id: true, title: true, startTime: true, location: true },
    orderBy: { startTime: "asc" },
    take: 20,
  });

  const out: UpcomingBlock[] = [];
  for (const e of events) {
    const minutesUntil = Math.max(0, Math.round((e.startTime.getTime() - now.getTime()) / 60_000));
    // Idempotente: a mesma chave (EVENT/event/id) usada pelo generateReminders, então
    // não duplica com o lembrete de 24h da caixa.
    await notifyOnce(userId, {
      type: "EVENT",
      title: `Em breve: ${e.title}`,
      body: [`às ${hhmm(e.startTime)}`, e.location].filter(Boolean).join(" · ") || undefined,
      entityType: "event",
      entityId: e.id,
      actionUrl: "/agenda",
      dueAt: e.startTime,
    });
    out.push({
      id: e.id,
      title: e.title,
      startTime: e.startTime.toISOString(),
      location: e.location,
      minutesUntil,
    });
  }
  return out;
}
