import { PluggyClient } from 'pluggy-sdk';
import { prisma } from './prisma';
import { getCurrentUserId } from './auth';
import { decryptKey } from './settings-crypto';

// Função auxiliar para pegar o cliente ou lançar erro se não configurado
async function getPluggyClient() {
  // 1. Busca as configurações do usuário logado
  const userId = await getCurrentUserId();
  const settings = userId ? await prisma.settings.findUnique({ where: { userId } }) : null;

  // Credenciais cifradas at-rest; decifra antes de instanciar o cliente.
  const clientId = decryptKey(settings?.pluggyClientId);
  const clientSecret = decryptKey(settings?.pluggySecret);

  if (!clientId || !clientSecret) {
    console.warn("⚠️ AVISO: Credenciais da Pluggy não configuradas no sistema.");
    return null;
  }

  // 2. Retorna uma nova instância com as chaves reais do banco
  return new PluggyClient({
    clientId,
    clientSecret,
  });
}

// 1. Criar um "Connect Token" (Sessão para o Widget de Login)
export async function createConnectToken() {
  const client = await getPluggyClient();
  
  if (!client) {
    throw new Error("Pluggy não configurada. Vá em Configurações > APIs.");
  }

  try {
    const data = await client.createConnectToken();
    return data.accessToken;
  } catch (error) {
    console.error("Erro ao criar token Pluggy:", error);
    throw new Error("Falha ao comunicar com a Pluggy. Verifique suas chaves.");
  }
}

// 2. Buscar Contas conectadas após o login
export async function fetchPluggyAccounts(itemId: string) {
  const client = await getPluggyClient();
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
  const client = await getPluggyClient();
  if (!client) return [];

  // Pega transações dos últimos 30 dias por padrão
  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - 30);
  
  try {
    const transactions = await client.fetchTransactions(accountId, {
      from: fromDate.toISOString().split('T')[0] // Formato YYYY-MM-DD
    });
    return transactions.results;
  } catch (error) {
    console.error("Erro ao buscar transações:", error);
    return [];
  }
}