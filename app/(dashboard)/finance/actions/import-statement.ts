"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";
import type { ParsedTransaction } from "@/lib/statement-parser";

// Importa transações de um extrato (OFX/CSV já parseado no cliente) para uma conta.
// Deduplica por (conta + dia + valor + descrição) para não duplicar reimportações,
// e atualiza o saldo de uma vez só (em contas não automáticas).
export async function importTransactions(accountId: string, items: ParsedTransaction[]) {
  try {
    if (!accountId) return { success: false, message: "Selecione uma conta." };
    if (!Array.isArray(items) || items.length === 0) return { success: false, message: "Nenhum lançamento para importar." };

    const userId = await requireUserId();

    // ⚠️ Modo réplica: leituras/dedupe FORA da $transaction interativa (na transação
    // iriam ao primário, onde datas INTEGER estouram a conversão do Prisma) e
    // escritas em lote atômico com select: { id: true }.
    const account = await prisma.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, isConnected: true, balance: true },
    });
    if (!account) throw new Error("Conta não encontrada.");

    let imported = 0;
    let skipped = 0;
    let balanceDelta = 0;
    const ops = [];
    const seenInFile = new Set<string>(); // dedupe entre linhas do PRÓPRIO arquivo

    for (const item of items) {
      const amount = Math.abs(Number(item.amount));
      if (!amount || isNaN(amount)) { skipped++; continue; }
      const type = item.type === "INCOME" ? "INCOME" : "EXPENSE";

      const date = new Date(`${item.date}T12:00:00`);
      if (isNaN(date.getTime())) { skipped++; continue; }

      // Dedupe: mesmo dia + valor + descrição na mesma conta.
      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);
      const fileKey = `${item.date}|${type}|${amount}|${item.description}`;
      const exists = seenInFile.has(fileKey) || await prisma.transaction.findFirst({
        where: {
          accountId, userId, amount, type,
          description: item.description,
          date: { gte: dayStart, lte: dayEnd },
        },
        select: { id: true },
      });
      if (exists) { skipped++; continue; }
      seenInFile.add(fileKey);

      ops.push(prisma.transaction.create({
        data: {
          accountId, userId, amount, type, date,
          description: item.description || "Lançamento importado",
          category: "Importado",
        },
        select: { id: true },
      }));
      balanceDelta += type === "INCOME" ? amount : -amount;
      imported++;
    }

    // Atualiza saldo só em contas manuais (Pluggy sincroniza sozinho).
    if (imported > 0 && !account.isConnected) {
      ops.push(prisma.account.update({
        where: { id: accountId },
        data: { balance: { increment: balanceDelta } },
        select: { id: true },
      }));
    }
    if (ops.length > 0) await prisma.$transaction(ops);

    const result = { imported, skipped };

    if (result.imported > 0) {
      await logActivity({
        action: "CREATE",
        module: "finance",
        entityType: "transaction",
        entityId: accountId,
        summary: `Importou ${result.imported} lançamento(s) de extrato`,
        meta: { imported: result.imported, skipped: result.skipped },
      });
    }

    revalidatePath("/finance");
    const msg = result.imported > 0
      ? `${result.imported} lançamento(s) importado(s)${result.skipped ? ` · ${result.skipped} já existiam` : ""}.`
      : "Tudo já estava importado (nenhum lançamento novo).";
    return { success: true, message: msg, ...result };
  } catch (error) {
    console.error("Erro ao importar extrato:", error);
    return { success: false, message: error instanceof Error ? error.message : "Falha ao importar extrato." };
  }
}

/* -------------------------------------------------------------------------- */
/* IMPORT VIA IA — cola o texto de QUALQUER banco (app, e-mail, PDF, fatura)  */
/* e a IA configurada estrutura os lançamentos. Alternativa gratuita ao       */
/* agregador pago: com Ollama local, o texto nem sai do computador.           */
/* -------------------------------------------------------------------------- */

interface AiParseResult {
  success: boolean;
  message: string;
  transactions: ParsedTransaction[];
}

// Valida e normaliza o que a IA devolveu (nunca confiar cegamente no JSON).
function sanitizeAiTransactions(raw: unknown): ParsedTransaction[] {
  if (!Array.isArray(raw)) return [];
  const out: ParsedTransaction[] = [];
  for (const item of raw.slice(0, 500)) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    const date = typeof r.date === "string" ? r.date.trim().slice(0, 10) : "";
    const amount = Math.abs(Number(r.amount));
    const description = typeof r.description === "string" ? r.description.trim().slice(0, 200) : "";
    const type = r.type === "INCOME" ? "INCOME" : r.type === "EXPENSE" ? "EXPENSE" : null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!amount || isNaN(amount) || !type) continue;
    out.push({ date, description: description || "Lançamento", amount, type });
  }
  return out;
}

export async function parseStatementWithAi(rawText: string): Promise<AiParseResult> {
  try {
    const userId = await requireUserId();
    const text = (rawText ?? "").trim().slice(0, 20_000);
    if (text.length < 10) {
      return { success: false, message: "Cole o texto do extrato primeiro.", transactions: [] };
    }

    const currentYear = new Date().getFullYear();
    const system = [
      "Você extrai lançamentos financeiros de extratos bancários em texto livre (copiados de apps de banco, e-mails, PDFs ou faturas de cartão, em português).",
      'Responda SOMENTE com um array JSON válido, sem markdown e sem explicações, no formato:',
      '[{"date":"YYYY-MM-DD","description":"texto curto","amount":123.45,"type":"INCOME"}]',
      "Regras:",
      '- "amount" é SEMPRE positivo; o sentido vai em "type": entradas (salário, pix recebido, depósito, estorno) = INCOME; saídas (compras, pix enviado, boletos, tarifas) = EXPENSE.',
      "- Em fatura de cartão de crédito, compras são EXPENSE.",
      `- Datas sem ano usam ${currentYear}; converta dd/mm para ISO (YYYY-MM-DD).`,
      "- Valores brasileiros: \"1.234,56\" significa 1234.56.",
      "- Ignore saldos, totais, limites, cabeçalhos, propaganda e linhas que não sejam lançamentos.",
      "- Se não houver lançamentos, responda [].",
    ].join("\n");

    const res = await runOneShotAi(userId, system, text);
    if (!res) {
      return {
        success: false,
        message: "IA não configurada ou indisponível. Configure um provedor em Configurações → Integrações (o Ollama local funciona sem custo).",
        transactions: [],
      };
    }

    // Extrai o array JSON mesmo se o modelo embrulhar em texto/markdown.
    const start = res.indexOf("[");
    const end = res.lastIndexOf("]");
    if (start === -1 || end <= start) {
      return { success: false, message: "A IA não retornou lançamentos válidos. Tente um trecho menor do extrato.", transactions: [] };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(res.slice(start, end + 1));
    } catch {
      return { success: false, message: "A resposta da IA veio malformada. Tente novamente.", transactions: [] };
    }

    const transactions = sanitizeAiTransactions(parsed);
    if (transactions.length === 0) {
      return { success: false, message: "Nenhum lançamento identificado nesse texto.", transactions: [] };
    }
    return { success: true, message: `${transactions.length} lançamento(s) identificado(s).`, transactions };
  } catch (error) {
    console.error("Erro no import via IA:", error);
    return { success: false, message: "Falha ao processar com a IA.", transactions: [] };
  }
}
