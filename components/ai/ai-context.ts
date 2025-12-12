import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function getUserContext() {
  const today = new Date();
  const tomorrow = addDays(today, 1);

  // --- 1. CONFIGURAÇÕES & PERSONA (O Cérebro) ---
  const settings = await prisma.settings.findFirst();
  const customPersona = settings?.aiPersona || "Você é um assistente pessoal de alta performance focado em produtividade e bem-estar.";
  const userName = "Luiz"; // Pode vir do banco se tiver autenticação completa

  // --- 2. FINANÇAS (O Bolso) ---
  const accounts = await prisma.account.findMany({ select: { name: true, balance: true } });
  const totalMoney = accounts.reduce((acc, item) => acc + Number(item.balance), 0);
  
  const recentTransactions = await prisma.transaction.findMany({
    take: 3,
    orderBy: { date: 'desc' },
    where: { type: 'EXPENSE' }, // Focando em gastos recentes
    select: { description: true, amount: true, category: true }
  });

  // --- 3. PRODUTIVIDADE & CARREIRA (O Trabalho) ---
  const urgentTasks = await prisma.task.findMany({
    where: {
      isDone: false,
      OR: [{ priority: "HIGH" }, { dueDate: { lte: endOfDay(today) } }]
    },
    select: { title: true, priority: true },
    take: 5
  });
  
  const pendingCount = await prisma.task.count({ where: { isDone: false } });

  const activeJobs = await prisma.jobApplication.findMany({
    where: { status: { in: ["INTERVIEW", "TEST", "OFFER"] } },
    select: { company: true, role: true, status: true }
  });

  // --- 4. SOCIAL (As Pessoas) ---
  const currentMonth = today.getMonth();
  const nextBirthdays = await prisma.friend.findMany({
    where: { birthday: { not: null } },
    select: { name: true, birthday: true, proximity: true }
  });
  
  // Filtra aniversários próximos (deste mês e que ainda não passaram ou são hoje)
  const upcomingBirthdays = nextBirthdays.filter(f => {
    if (!f.birthday) return false;
    const bDay = f.birthday.getDate();
    const bMonth = f.birthday.getMonth();
    return bMonth === currentMonth && bDay >= today.getDate();
  }).map(f => `${f.name} dia ${format(f.birthday!, "dd")}`);

  // --- 5. CLOSET & LOGÍSTICA (O Dia a Dia) ---
  const laundryCount = await prisma.wardrobeItem.count({ where: { status: "LAUNDRY" } });
  const repairCount = await prisma.wardrobeItem.count({ where: { status: "REPAIR" } });

  // --- 6. SAÚDE (O Corpo) ---
  const lastWeight = await prisma.healthMetric.findFirst({
    where: { type: "WEIGHT" },
    orderBy: { date: 'desc' }
  });
  
  const lastWorkout = await prisma.workout.findFirst({
    orderBy: { date: 'desc' },
    select: { title: true, date: true }
  });

  // --- 7. AGENDA (O Tempo) ---
  const events = await prisma.event.findMany({
    where: { startTime: { gte: startOfDay(today), lte: endOfDay(tomorrow) } },
    orderBy: { startTime: 'asc' },
    select: { title: true, startTime: true }
  });

  // --- MONTAGEM DO PROMPT FINAL ---
  return `
    DADOS EM TEMPO REAL DO SISTEMA "LIFE OS" (Data: ${format(today, "dd/MM - EEEE", { locale: ptBR })}):

    👤 USUÁRIO: ${userName}
    
    💰 FINANÇAS:
    - Saldo Total: R$ ${totalMoney.toFixed(2)}
    - Últimos gastos: ${recentTransactions.map(t => `${t.description} (-R$${Number(t.amount).toFixed(0)})`).join(", ")}

    🚀 TRABALHO & METAS:
    - Pendências Totais: ${pendingCount}
    - Foco Urgente: ${urgentTasks.length > 0 ? urgentTasks.map(t => t.title).join(", ") : "Nada urgente agora."}
    - Carreira (Ativo): ${activeJobs.length > 0 ? activeJobs.map(j => `${j.role} @ ${j.company} (${j.status})`).join(", ") : "Sem processos ativos."}

    📅 AGENDA (Hoje/Amanhã):
    ${events.length > 0 ? events.map(e => `- ${format(e.startTime, "HH:mm")} ${e.title}`).join("\n") : "- Livre."}

    🎉 SOCIAL:
    - Aniversários (Este mês): ${upcomingBirthdays.length > 0 ? upcomingBirthdays.join(", ") : "Nenhum próximo."}

    👕 LOGÍSTICA (CLOSET):
    - ${laundryCount} peças lavando, ${repairCount} no conserto.

    💪 SAÚDE:
    - Peso: ${lastWeight?.value || "?"} kg
    - Último Treino: ${lastWorkout ? `${lastWorkout.title} (${format(lastWorkout.date, "dd/MM")})` : "Sem registro recente."}

    ---------------------------------------------------
    
    SUA PERSONALIDADE E MISSÃO (SYSTEM PROMPT):
    ${customPersona}

    INSTRUÇÕES DE RESPOSTA:
    1. Use os dados acima para dar conselhos CONTEXTUAIS e HIPER-PERSONALIZADOS.
    2. Cruze informações (Ex: Se tem entrevista amanhã e roupa lavando, avise. Se gastou muito e tem aniversário, sugira presente barato).
    3. Seja direto. Não invente dados que não estão aqui.
    4. Responda em Português do Brasil.
  `;
}