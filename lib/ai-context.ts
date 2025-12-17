import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Tipagem de dados para o prisma.user.findFirst
type UserContext = {
    id: string;
    name: string;
    bio: string | null;
    salary: number | null;
};

export async function getUserContext(): Promise<string> {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const endOfToday = new Date(today.setHours(23, 59, 59, 999));
    const nextSevenDays = new Date(new Date().setDate(new Date().getDate() + 7)); // Corrigido

    // 1. EXTRAÇÃO DO USUÁRIO (PRIMEIRA BUSCA NECESSÁRIA PARA O CONTEXTO)
    // Isso resolve o erro 'Block-scoped variable user used before its declaration'
    const user = await prisma.user.findFirst({ 
        select: { name: true, bio: true, salary: true, id: true } 
    }) as UserContext | null;

    // Se o usuário não existir (sistema não configurado), retorna um contexto vazio.
    if (!user) {
        return "--- DADOS DO SISTEMA LIFE OS ---\nUsuário não encontrado. O sistema não está configurado.";
    }

    // 2. Buscamos dados estratégicos em paralelo
    const [
        settings,
        tasks,
        events,
        finances,
        recurringExpenses,
        recentMetrics,
        studyStats,
        wishlist
    ] = await Promise.all([
        // Configurações (para moeda)
        prisma.settings.findFirst({
            select: { currency: true, workStart: true, workEnd: true }
        }),
        // Tarefas Pendentes (Alta prioridade ou Vencidas/Próx. 7 dias)
        prisma.task.findMany({
            where: {
                isDone: false,
                OR: [
                    { priority: 'HIGH' },
                    { dueDate: { lte: nextSevenDays, gte: startOfToday } }
                ]
            },
            take: 10,
            orderBy: { dueDate: 'asc' },
            select: { title: true, priority: true, dueDate: true, project: { select: { title: true } } }
        }),
        // Eventos Próximos (Hoje e Próx. 48h)
        prisma.event.findMany({
            where: {
                startTime: {
                    gte: new Date(),
                    lte: new Date(new Date().setDate(new Date().getDate() + 2))
                }
            },
            orderBy: { startTime: 'asc' },
            take: 5,
            select: { title: true, startTime: true, isAllDay: true, location: true }
        }),
        // Resumo Financeiro (Saldo das contas)
        prisma.account.findMany({
            where: { userId: user.id }, // Busca apenas contas do usuário logado
            select: { name: true, balance: true, isConnected: true }
        }),
        // Despesas Recorrentes (Próxima semana)
        prisma.recurringExpense.findMany({
            // Como RecurringExpense não tem userId, assumimos que é global ou usaremos um filtro futuro
            where: { active: true },
            take: 3,
            orderBy: { dayOfMonth: 'asc' }
        }),
        // Métricas de Saúde (Foco/Sono de hoje)
        prisma.healthMetric.findMany({
            // Assumindo que HealthMetric não tem userId, ou você deve adicioná-lo
            where: { date: { gte: startOfToday } },
            orderBy: { date: 'desc' },
            take: 2,
            select: { type: true, value: true }
        }),
        // Última sessão de estudo
        prisma.studySession.findFirst({
            // ...
            orderBy: { date: 'desc' },
            take: 1,
            select: { 
                durationMinutes: true, 
                focusLevel: true, 
                subjectId: true, 
                subject: { 
                    select: { 
                        title: true 
                    } 
                } 
            }
        }),
        // Próximo item de desejo a ser salvo
        prisma.wishlistItem.findFirst({
            // Assumindo que WishlistItem não tem userId
            where: { status: 'SAVING' },
            orderBy: { priority: 'asc' },
            select: { name: true, price: true, saved: true }
        })
    ]);

    // 3. Processamos e formatamos os dados
    const currency = settings?.currency || "R$";
    const saldoTotal = finances.reduce((acc, accItem) => acc + Number(accItem.balance), 0);
    const formattedDate = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
    const timeNow = format(new Date(), "HH:mm");
    const workHours = settings ? `${settings.workStart}-${settings.workEnd}` : '09:00-18:00';

    // 4. Construímos o "Prompt de Contexto" formatado

    let context = `--- CONTEXTO ATUAL DO LIFE OS ---\n`;
    context += `📅 Data/Hora do Servidor: ${formattedDate} às ${timeNow}.\n`;
    context += `👤 Usuário: ${user.name}. Foco: "${user.bio || "Não definido"}". Salário: ${currency} ${user.salary ? Number(user.salary).toFixed(2) : 'Não definido'}\n`;
    context += `⚙️ Configuração de Foco: ${workHours}\n`;
    context += `💰 Moeda Padrão: ${currency}\n\n`;
    
    // --- MÓDULO: PRIORIDADES E AGENDA ---
    
    context += `## 🚀 FOCO E TAREFAS CRÍTICAS (Próx. 7 dias)\n`;
    if (tasks.length > 0) {
        tasks.forEach(t => {
            const due = t.dueDate ? format(t.dueDate, "dd/MM 'às' HH:mm") : "Sem data";
            const projectTitle = t.project?.title ? ` [Projeto: ${t.project.title}]` : "";
            context += `- [TAREFA: ${t.priority}] ${t.title}${projectTitle} (Vence: ${due})\n`;
        });
    } else {
        context += `- Nenhuma tarefa crítica ou vencida encontrada.\n`;
    }

    context += `\n## 📅 AGENDA (Próximas 48h)\n`;
    if (events.length > 0) {
        events.forEach(e => {
            const time = e.isAllDay ? "Dia todo" : format(e.startTime, "HH:mm");
            const day = format(e.startTime, "dd/MM, EEE", { locale: ptBR });
            const location = e.location ? ` em ${e.location}` : "";
            context += `- [EVENTO] ${e.title} às ${time} (${day})${location}\n`;
        });
    } else {
        context += `- Agenda livre nas próximas 48 horas.\n`;
    }
    
    // --- MÓDULO: FINANCEIRO ---

    context += `\n## 💰 RESUMO FINANCEIRO\n`;
    context += `- SALDO GERAL: ${currency} ${saldoTotal.toFixed(2)}\n`;
    
    const contas = finances.map(f => `${f.name} (${f.isConnected ? 'Conectada' : 'Manual'}): ${currency}${Number(f.balance).toFixed(2)}`).join("; ");
    context += `- Contas Detalhe: ${contas}\n`;

    if (recurringExpenses.length > 0) {
        context += `- **Contas Recorrentes (Próx. 7 dias):**\n`;
        recurringExpenses.forEach(e => {
            context += `  - ${e.title} (${e.category}): ${currency}${Number(e.amount).toFixed(2)} (Dia ${e.dayOfMonth})\n`;
        });
    }

    if (wishlist) {
        const falta = Number(wishlist.price) - Number(wishlist.saved);
        context += `- **Item de Desejo (Próxima Meta):** ${wishlist.name} (Meta: ${currency}${Number(wishlist.price).toFixed(2)}, Falta: ${currency}${falta.toFixed(2)})\n`;
    }


    // --- MÓDULO: SAÚDE E APRENDIZADO ---

    context += `\n## 🧘 SAÚDE E FOCO\n`;
    if (recentMetrics.length > 0) {
        recentMetrics.forEach(m => {
             const typeTranslated = m.type === 'SLEEP_HOURS' ? 'Horas de Sono' : m.type;
             context += `- Métrica Recente: ${typeTranslated}: ${m.value.toFixed(1)}\n`;
        });
    }

    if (studyStats) {
        context += `- Último Foco de Estudo: ${studyStats.subject?.title || 'Tópico Desconhecido'} (Duração: ${studyStats.durationMinutes}min, Foco: ${studyStats.focusLevel}/5)\n`;
    } else {
        context += `- Nenhuma sessão de estudo recente encontrada.\n`;
    }
    
    context += `\n--- FIM DOS DADOS ---\n`;
    context += `Instrução para IA: Responda de forma concisa e útil, usando os dados fornecidos. Se o usuário fizer uma pergunta genérica como "o que eu devo fazer?", priorize as TAREFAS CRÍTICAS e os EVENTOS na AGENDA. Se o saldo geral for baixo, ofereça cautela em perguntas sobre gastos. Use a moeda ${currency} ao se referir a valores.`;


    return context;
}