import { prisma } from "@/lib/prisma";

export async function getUserContext() {
  // ... (buscas de dados existentes: saldo, tarefas, peso) ...
  const accounts = await prisma.account.findMany();
  const totalMoney = accounts.reduce((acc, item) => acc + Number(item.balance), 0);
  const pendingTasks = await prisma.task.count({ where: { isDone: false } });
  const lastWeight = await prisma.healthMetric.findFirst({ where: { type: "WEIGHT" }, orderBy: { date: 'desc' } });

  // NOVO: Buscar a personalidade definida nas configurações
  const settings = await prisma.settings.findFirst();
  const customPersona = settings?.aiPersona || "Você é um assistente pessoal focado em produtividade.";

  return `
    CONTEXTO DO USUÁRIO (LUIZ):
    - Financeiro: R$ ${totalMoney.toFixed(2)}.
    - Pendências: ${pendingTasks} tarefas.
    - Peso: ${lastWeight?.value || "N/A"} kg.
    
    SUA PERSONALIDADE (System Prompt):
    ${customPersona}
    
    INSTRUÇÃO: Responda sempre em Português do Brasil. Use os dados acima.
  `;
}