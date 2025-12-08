import { prisma } from "@/lib/prisma";

export async function getUserContext() {
  // 1. Finanças
  const accounts = await prisma.account.findMany();
  const totalMoney = accounts.reduce((acc, item) => acc + Number(item.balance), 0);
  
  // 2. Projetos Pendentes
  const pendingTasks = await prisma.task.count({ where: { isDone: false } });
  
  // 3. Saúde (Último peso)
  const lastWeight = await prisma.healthMetric.findFirst({
    where: { type: "WEIGHT" },
    orderBy: { date: 'desc' }
  });

  // Monta o texto resumo
  return `
    CONTEXTO DO USUÁRIO (LUIZ):
    - Financeiro: Saldo total atual de R$ ${totalMoney.toFixed(2)}.
    - Produtividade: Tem ${pendingTasks} tarefas pendentes.
    - Saúde: Último peso registrado: ${lastWeight?.value || "N/A"} kg.
    
    INSTRUÇÃO: Você é um assistente pessoal focado em produtividade e bem-estar. 
    Use os dados acima para dar conselhos personalizados, mas seja breve e direto.
    Responda sempre em Português do Brasil.
  `;
}