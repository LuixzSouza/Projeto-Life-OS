// Feed iCal (ICS) da Agenda unificada — assine no calendário do celular
// (iPhone/Android na mesma rede ou via Tailscale) ou no Google Calendar
// (instância na nuvem). Autenticação por token assinado na URL (lib/ical.ts):
// Google/iPhone buscam o feed server-to-server, sem cookie de sessão.

import { prisma } from "@/lib/prisma";
import { getAgendaItems } from "@/lib/agenda-aggregator";
import { PLAN_SOURCES } from "@/components/agenda/agenda-shared";
import { parseCalendarToken, verifyCalendarSignature, buildIcs } from "@/lib/ical";

export const dynamic = "force-dynamic";

// Janela do feed: 2 semanas para trás (contexto recente) + 4 meses à frente.
const PAST_DAYS = 14;
const FUTURE_DAYS = 120;

const notFound = () => new Response("Not found", { status: 404 });

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const parsed = parseCalendarToken(decodeURIComponent(token));
  if (!parsed) return notFound();

  // Token inválido responde igual a usuário inexistente — nada a enumerar.
  const user = await prisma.user.findUnique({
    where: { id: parsed.userId },
    select: { tokenVersion: true },
  });
  if (!user || !verifyCalendarSignature(parsed.userId, user.tokenVersion, parsed.sig)) {
    return notFound();
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - PAST_DAYS);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + FUTURE_DAYS, 23, 59, 59);

  // Só itens de PLANO (compromissos/prazos) — o diário do passado (refeições,
  // treinos feitos...) não pertence ao calendário nativo.
  const items = (await getAgendaItems(start, end, parsed.userId)).filter((i) =>
    PLAN_SOURCES.has(i.source),
  );

  return new Response(buildIcs(items, "Life OS — Agenda"), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="lifeos-agenda.ics"',
      // Clientes de calendário re-buscam sozinhos; cache curto evita marteladas.
      "Cache-Control": "private, max-age=300",
    },
  });
}
