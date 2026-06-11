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

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Tudo em paralelo, sempre contagens/limites pequenos (bounded).
    const [
        settings, accounts, pendingCount, criticalTasks, nextEvent, eventsTodayCount,
        budgetRows, monthSpendByCat,
    ] = await Promise.all([
        prisma.settings.findUnique({ where: { userId }, select: { currency: true } }),
        prisma.account.findMany({ where: { userId }, select: { balance: true } }),
        prisma.task.count({ where: { userId, deletedAt: null, isDone: false } }),
        prisma.task.findMany({
            where: { userId, deletedAt: null, isDone: false, OR: [{ priority: "HIGH" }, { dueDate: { lte: in7, gte: startOfToday } }] },
            // nulls last: HIGH sem prazo entra, mas depois das datadas — mesma
            // ordem em SQLite e Postgres (pegadinha de dialeto).
            orderBy: { dueDate: { sort: "asc", nulls: "last" } },
            take: 3,
            select: { title: true, priority: true, dueDate: true },
        }),
        prisma.event.findFirst({ where: { userId, deletedAt: null, startTime: { gte: now } }, orderBy: { startTime: "asc" }, select: { title: true, startTime: true } }),
        prisma.event.count({ where: { userId, deletedAt: null, startTime: { gte: startOfToday, lte: endOfToday } } }),
        // Tetos de gasto por categoria (bounded: só nomes+limites; gasto vem agregado).
        prisma.category.findMany({ where: { userId, type: "EXPENSE", monthlyBudget: { not: null } }, select: { name: true, monthlyBudget: true } }),
        prisma.transaction.groupBy({ by: ["category"], where: { userId, deletedAt: null, type: "EXPENSE", date: { gte: monthStart } }, _sum: { amount: true } }),
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

    // Tetos de gasto: 1 linha compacta, e só os que merecem atenção (bounded).
    if (budgetRows.length > 0) {
        const spentByCat = new Map(
            monthSpendByCat.map((c) => [(c.category ?? "").trim(), Number(c._sum.amount ?? 0)]),
        );
        const flagged = budgetRows
            .map((r) => {
                const teto = Number(r.monthlyBudget);
                const gasto = spentByCat.get(r.name) ?? 0;
                const pct = teto > 0 ? Math.round((gasto / teto) * 100) : 0;
                return { name: r.name, teto, gasto, pct };
            })
            .filter((b) => b.pct >= 80)
            .sort((a, b) => b.pct - a.pct)
            .slice(0, 4);
        if (flagged.length > 0) {
            const parts = flagged.map((b) =>
                b.gasto > b.teto
                    ? `${b.name} ESTOUROU (${b.pct}% do teto)`
                    : `${b.name} em ${b.pct}% do teto`,
            );
            lines.push(`Tetos de gasto do mês: ${parts.join("; ")} (detalhes via query_system_data FINANCE summary).`);
        } else {
            lines.push(`Tetos de gasto do mês: ${budgetRows.length} definidos, todos abaixo de 80%.`);
        }
    }

    lines.push(`(Para qualquer detalhe além disto, use as ferramentas: query_system_data para ler, mutate_system_data para criar/editar/apagar.)`);

    return lines.join("\n");
}
