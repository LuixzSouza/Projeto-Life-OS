import { PluggyClient } from 'pluggy-sdk';

// Variável singleton para armazenar a instância
let pluggyClientInstance: PluggyClient | null = null;

// Função auxiliar para pegar o cliente ou lançar erro se não configurado
function getPluggyClient() {
  if (pluggyClientInstance) return pluggyClientInstance;

  const clientId = process.env.PLUGGY_CLIENT_ID;
  const clientSecret = process.env.PLUGGY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    // Retorna null para podermos tratar o erro de forma amigável nas funções
    console.warn("⚠️ AVISO: Credenciais da Pluggy não encontradas no .env. A integração bancária não funcionará.");
    return null;
  }

  pluggyClientInstance = new PluggyClient({
    clientId,
    clientSecret,
  });

  return pluggyClientInstance;
}

// 1. Criar um "Connect Token" (Sessão para o Widget de Login)
export async function createConnectToken() {
  const client = getPluggyClient();
  
  if (!client) {
    throw new Error("Integração bancária não configurada (Faltam chaves no .env).");
  }

  try {
    const data = await client.createConnectToken();
    return data.accessToken;
  } catch (error) {
    console.error("Erro ao criar token Pluggy:", error);
    throw new Error("Falha ao comunicar com a Pluggy.");
  }
}

// 2. Buscar Contas conectadas após o login
export async function fetchPluggyAccounts(itemId: string) {
  const client = getPluggyClient();
  if (!client) return [];

  try {
    const accounts = await client.fetchAccounts(itemId);
    return accounts.results;
  } catch (error) {
    console.error("Erro ao buscar contas:", error);
    return [];
  }
}

// 3. Buscar Transações (Sincronização)
export async function fetchPluggyTransactions(accountId: string) {
  const client = getPluggyClient();
  if (!client) return [];

  // Pega transações dos últimos 30 dias
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  
  try {
    const transactions = await client.fetchTransactions(accountId, {
      from: fromDate.toISOString().split('T')[0] // YYYY-MM-DD
    });
    return transactions.results;
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return [];
  }
}