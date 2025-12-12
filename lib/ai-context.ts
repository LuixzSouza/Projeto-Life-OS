import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getUserContext(): Promise<string> {
  const today = new Date();
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  // 1. Buscamos dados estratégicos em paralelo
  const [
    user,
    tasks,
    events,
    finances,
    projects
  ] = await Promise.all([
    // Usuário
    prisma.user.findFirst({ select: { name: true, bio: true } }),

    // Tarefas Pendentes (Alta prioridade ou Vencidas/Hoje)
    prisma.task.findMany({
      where: {
        isDone: false,
        OR: [
          { priority: 'HIGH' },
          { dueDate: { lte: endOfDay } }
        ]
      },
      take: 10,
      orderBy: { dueDate: 'asc' },
      select: { title: true, priority: true, dueDate: true }
    }),

    // Eventos Próximos (Hoje e Amanhã)
    prisma.event.findMany({
      where: {
        startTime: {
          gte: new Date(), // A partir de agora
          lte: new Date(new Date().setDate(new Date().getDate() + 2)) // Até depois de amanhã
        }
      },
      orderBy: { startTime: 'asc' },
      take: 5,
      select: { title: true, startTime: true, isAllDay: true }
    }),

    // Resumo Financeiro (Saldo das contas)
    prisma.account.findMany({
      select: { name: true, balance: true }
    }),

    // Projetos em Andamento
    prisma.project.findMany({
      where: { status: 'ACTIVE' },
      take: 3,
      select: { title: true }
    })
  ]);

  // 2. Processamos os dados para texto
  const saldoTotal = finances.reduce((acc, accItem) => acc + Number(accItem.balance), 0);
  
  const formattedDate = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  const timeNow = format(new Date(), "HH:mm");

  // 3. Construímos o "Prompt de Contexto"
  let context = `--- DADOS DO SISTEMA LIFE OS ---\n`;
  context += `📅 Data/Hora Atual: ${formattedDate} às ${timeNow}.\n`;
  context += `👤 Usuário: ${user?.name || "Luiz"}. ${user?.bio ? `Bio: "${user.bio}"` : ""}\n\n`;

  // Contexto de Tarefas
  if (tasks.length > 0) {
    context += `📋 TAREFAS CRÍTICAS:\n`;
    tasks.forEach(t => {
      const due = t.dueDate ? format(t.dueDate, "dd/MM") : "Sem data";
      context += `- [${t.priority}] ${t.title} (Vence: ${due})\n`;
    });
  } else {
    context += `📋 TAREFAS: Tudo limpo por enquanto.\n`;
  }
  context += "\n";

  // Contexto de Agenda
  if (events.length > 0) {
    context += `📅 AGENDA (Próx. 48h):\n`;
    events.forEach(e => {
      const time = e.isAllDay ? "Dia todo" : format(e.startTime, "HH:mm");
      const day = format(e.startTime, "dd/MM");
      context += `- ${e.title} às ${time} (${day})\n`;
    });
  } else {
    context += `📅 AGENDA: Livre nos próximos dias.\n`;
  }
  context += "\n";

  // Contexto Financeiro
  context += `💰 FINANCEIRO:\n`;
  context += `- Saldo Total: R$ ${saldoTotal.toFixed(2)}\n`;
  context += `- Contas: ${finances.map(f => `${f.name}: R$${Number(f.balance).toFixed(0)}`).join(", ")}\n`;
  context += "\n";

  // Contexto de Projetos
  if (projects.length > 0) {
    context += `🚀 PROJETOS ATIVOS: ${projects.map(p => p.title).join(", ")}\n`;
  }

  context += `--- FIM DOS DADOS ---\n`;
  context += `Instrução: Use esses dados para responder. Se o usuário perguntar "o que tenho pra fazer?", olhe as tarefas e agenda. Se perguntar "posso gastar?", olhe o financeiro.`;

  return context;
}