import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addDays, format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getUserContext() {
  const today = new Date();
  const tomorrow = addDays(today, 1);

  // --- 1. FINANCEIRO (Fluxo de Caixa) ---
  const accounts = await prisma.account.findMany({ select: { name: true, balance: true } });
  const totalMoney = accounts.reduce((acc, item) => acc + Number(item.balance), 0);
  
  // Últimas 5 transações para entender o momento de gasto
  const recentTransactions = await prisma.transaction.findMany({
    take: 5,
    orderBy: { date: 'desc' },
    select: { description: true, amount: true, type: true, category: true }
  });

  // --- 2. PRODUTIVIDADE (O que queima hoje?) ---
  // Tarefas Atrasadas ou Para Hoje
  const urgentTasks = await prisma.task.findMany({
    where: {
      isDone: false,
      OR: [
        { priority: "HIGH" },
        { dueDate: { lte: endOfDay(today) } }
      ]
    },
    select: { title: true, priority: true, dueDate: true },
    take: 5
  });

  // Contagem geral
  const pendingCount = await prisma.task.count({ where: { isDone: false } });

  // --- 3. CARREIRA (Vagas & Processos) ---
  // Entrevistas ou testes agendados/em andamento
  const activeJobs = await prisma.jobApplication.findMany({
    where: { status: { in: ["INTERVIEW", "TEST", "OFFER"] } },
    select: { company: true, role: true, status: true }
  });

  // --- 4. SAÚDE & CORPO ---
  const lastWeight = await prisma.healthMetric.findFirst({
    where: { type: "WEIGHT" },
    orderBy: { date: 'desc' }
  });
  
  // Último treino registrado
  const lastWorkout = await prisma.workout.findFirst({
    orderBy: { date: 'desc' },
    select: { title: true, date: true }
  });

  // --- 5. SOCIAL (Aniversários próximos) ---
  const currentMonth = today.getMonth();
  const friends = await prisma.friend.findMany({
    where: { 
      birthday: { not: null } 
    },
    select: { name: true, birthday: true, proximity: true }
  });
  
  const upcomingBirthdays = friends.filter(f => {
    if (!f.birthday) return false;
    const bDay = f.birthday.getDate();
    const bMonth = f.birthday.getMonth();
    // Verifica se é este mês e se o dia é hoje ou futuro
    return bMonth === currentMonth && bDay >= today.getDate();
  }).map(f => `${f.name} (${format(f.birthday!, "dd/MM")})`);

  // --- 6. AGENDA (Hoje e Amanhã) ---
  const events = await prisma.event.findMany({
    where: {
      startTime: {
        gte: startOfDay(today),
        lte: endOfDay(tomorrow)
      }
    },
    orderBy: { startTime: 'asc' },
    select: { title: true, startTime: true, isAllDay: true }
  });

  // --- 7. CLOSET (Logística) ---
  // Roupas indisponíveis (lavando ou conserto)
  const unavailableItems = await prisma.wardrobeItem.count({
    where: { status: { in: ["LAUNDRY", "REPAIR"] } }
  });

  // --- MONTAGEM DO PROMPT DO SISTEMA ---
  return `
    DADOS ATUAIS DO SISTEMA "LIFE OS" (Data: ${format(today, "dd/MM/yyyy, HH:mm", { locale: ptBR })}):

    💰 FINANCEIRO:
    - Saldo Total: R$ ${totalMoney.toFixed(2)}
    - Últimos gastos: ${recentTransactions.map(t => `${t.description} (R$${Number(t.amount).toFixed(2)})`).join(", ")}

    🚀 PRODUTIVIDADE & CARREIRA:
    - Foco Urgente: ${urgentTasks.length > 0 ? urgentTasks.map(t => t.title).join(", ") : "Nada urgente."}
    - Pendências Totais: ${pendingCount} tarefas.
    - Processos Seletivos Ativos: ${activeJobs.length > 0 ? activeJobs.map(j => `${j.role} na ${j.company} (${j.status})`).join(", ") : "Nenhum ativo."}

    📅 AGENDA (Hoje/Amanhã):
    ${events.length > 0 ? events.map(e => `- ${format(e.startTime, "HH:mm")} ${e.title}`).join("\n") : "- Agenda livre."}

    💪 SAÚDE:
    - Peso Atual: ${lastWeight?.value || "N/A"} kg
    - Último Treino: ${lastWorkout ? `${lastWorkout.title} em ${format(lastWorkout.date, "dd/MM")}` : "Sem registros recentes."}

    🎉 SOCIAL & VIDA:
    - Aniversários Próximos: ${upcomingBirthdays.length > 0 ? upcomingBirthdays.join(", ") : "Nenhum."}
    - Logística: ${unavailableItems} peças de roupa na lavanderia/conserto.

    ---
    
    INSTRUÇÃO MESTRA (PERSONA):
    Você é o "Life OS AI", o assistente executivo pessoal de alta performance do Luiz.
    Sua missão é correlacionar esses dados para dar conselhos holísticos.
    
    Exemplos de raciocínio esperado:
    - Se tem entrevista (Carreira) e pouca roupa limpa (Closet), avise para verificar o traje.
    - Se o saldo é baixo (Financeiro) e tem aniversário (Social), sugira um presente criativo e barato.
    - Se tem muitas tarefas urgentes (Produtividade), sugira adiar o treino pesado (Saúde).
    
    Seja breve, direto e use emojis moderados. Responda em Português.
  `;
}