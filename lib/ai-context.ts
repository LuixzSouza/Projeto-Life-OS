// Snapshot COMPACTO do Life OS injetado no system prompt da IA.
//
// Princípio: o contexto é *bounded* — contagens + no máximo 3 tarefas críticas
// e 1 próximo evento. Não cresce com o volume de dados. Tudo além disso a IA
// busca sob demanda via tools (query_system_data), economizando tokens.
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCurrentUserId } from "@/lib/auth";

export async function getUserContext(): Promise<string> {
    const userId = await getCurrentUserId();
    if (!userId) return "Usuário não autenticado.";

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    if (!user) return "Sistema não configurado (usuário não encontrado).";

    // Tudo em paralelo, sempre contagens/limites pequenos (bounded).
    const [
        settings, accounts, pendingCount, criticalTasks, nextEvent, eventsTodayCount,
    ] = await Promise.all([
        prisma.settings.findUnique({ where: { userId }, select: { currency: true } }),
        prisma.account.findMany({ where: { userId }, select: { balance: true } }),
        prisma.task.count({ where: { userId, deletedAt: null, isDone: false } }),
        prisma.task.findMany({
            where: { userId, deletedAt: null, isDone: false, OR: [{ priority: "HIGH" }, { dueDate: { lte: in7, gte: startOfToday } }] },
            orderBy: { dueDate: "asc" },
            take: 3,
            select: { title: true, priority: true, dueDate: true },
        }),
        prisma.event.findFirst({ where: { userId, deletedAt: null, startTime: { gte: now } }, orderBy: { startTime: "asc" }, select: { title: true, startTime: true } }),
        prisma.event.count({ where: { userId, deletedAt: null, startTime: { gte: startOfToday, lte: endOfToday } } }),
    ]);

    const currency = settings?.currency || "R$";
    const saldo = accounts.reduce((acc, a) => acc + Number(a.balance), 0);
    const dataHora = format(now, "EEEE, dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR });
    const hojeISO = format(now, "yyyy-MM-dd");

    const lines: string[] = [];
    lines.push(`Usuário: ${user.name} · Moeda: ${currency}`);
    lines.push(`Agora: ${dataHora} (hoje = ${hojeISO}). Use ${hojeISO} como âncora para datas relativas ("hoje", "amanhã", "sexta", "mês que vem") ao preencher o campo date no formato YYYY-MM-DD.`);
    lines.push(`Saldo total: ${currency} ${saldo.toFixed(2)} (${accounts.length} conta(s)) · Tarefas pendentes: ${pendingCount} · Eventos hoje: ${eventsTodayCount}`);

    if (criticalTasks.length > 0) {
        const crit = criticalTasks.map((t) => {
            const due = t.dueDate ? ` (vence ${format(t.dueDate, "dd/MM")})` : "";
            return `${t.title}${due}`;
        }).join("; ");
        lines.push(`Tarefas críticas: ${crit}`);
    }
    if (nextEvent) {
        lines.push(`Próximo evento: ${nextEvent.title} em ${format(nextEvent.startTime, "dd/MM HH:mm")}`);
    }

    lines.push(`(Para qualquer detalhe além disto, use as ferramentas: query_system_data para ler, mutate_system_data para criar/editar/apagar.)`);

    return lines.join("\n");
}
