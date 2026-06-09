// Orçamento 75/10/15 (Roadmap Fase 2 — #9 finanças).
// Divide a renda do mês em 3 baldes percentuais e classifica os gastos reais
// neles SEM exigir cadastro novo: a classificação é por heurística de categoria
// (texto livre legado) + origem do lançamento (pagamento de custo fixo = Essencial).
// Tudo puro/sem IO — a página de Finanças alimenta e o card só apresenta.

export type BudgetBucketKey = "essential" | "pleasure" | "future";

export interface BudgetBucket {
  key: BudgetBucketKey;
  /** Percentual do balde sobre a renda do mês (75/10/15). */
  percent: number;
  /** Teto em valor (renda × percent). */
  limit: number;
  /** Quanto já foi gasto/destinado neste mês. */
  spent: number;
}

export interface BudgetSnapshot {
  /** Renda-base usada no cálculo (receitas do mês; fallback: salário líquido). */
  income: number;
  /** true quando a renda veio do salário cadastrado (mês ainda sem receitas). */
  incomeFromSalary: boolean;
  buckets: BudgetBucket[];
  /** Gastos do mês que não puderam ser classificados (entram em "pleasure"). */
  unclassified: number;
}

/** Percentuais canônicos do método (fixas / prazeres / investimentos+reserva). */
export const BUDGET_SPLIT: Record<BudgetBucketKey, number> = {
  essential: 75,
  pleasure: 10,
  future: 15,
};

// Heurística de categoria (case/acento-insensível). Cobre os rótulos comuns do
// app (texto livre): o que não casar com Essencial nem Futuro cai em Prazeres.
const ESSENTIAL_RX =
  /(morad|alug|condom|mercado|supermerc|feira|aliment|luz|energia|agua|gas|internet|telefon|celular|saude|farmac|medic|plano|transport|combust|gasolin|onibus|metro|uber|educa|faculdade|escola|curso|imposto|taxa|seguro|fixo|conta)/;
const FUTURE_RX =
  /(invest|aporte|poupan|reserva|previd|tesouro|cdb|acao|acoes|fii|cripto|bitcoin|aposentad)/;

function normalize(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

export interface ClassifiableExpense {
  amount: number;
  category: string;
  /** true quando o lançamento nasceu de um custo fixo (RecurringExpensePayment). */
  fromRecurring: boolean;
}

export function classifyExpense(tx: ClassifiableExpense): BudgetBucketKey {
  if (tx.fromRecurring) return "essential";
  const cat = normalize(tx.category || "");
  if (FUTURE_RX.test(cat)) return "future";
  if (ESSENTIAL_RX.test(cat)) return "essential";
  return "pleasure";
}

/**
 * Monta o snapshot 75/10/15 do mês: renda-base (receitas do mês ou, se ainda
 * zeradas, o salário líquido cadastrado) e os gastos classificados nos baldes.
 */
export function buildBudgetSnapshot(params: {
  monthIncome: number;
  netSalary: number;
  expenses: ClassifiableExpense[];
}): BudgetSnapshot {
  const incomeFromSalary = params.monthIncome <= 0 && params.netSalary > 0;
  const income = incomeFromSalary ? params.netSalary : params.monthIncome;

  const spent: Record<BudgetBucketKey, number> = { essential: 0, pleasure: 0, future: 0 };
  let unclassified = 0;
  for (const tx of params.expenses) {
    const key = classifyExpense(tx);
    spent[key] += tx.amount;
    // Sem categoria nenhuma = caiu em Prazeres por falta de pista, não por escolha.
    if (key === "pleasure" && !tx.category.trim()) unclassified += tx.amount;
  }

  const buckets: BudgetBucket[] = (Object.keys(BUDGET_SPLIT) as BudgetBucketKey[]).map((key) => ({
    key,
    percent: BUDGET_SPLIT[key],
    limit: (income * BUDGET_SPLIT[key]) / 100,
    spent: spent[key],
  }));

  return { income, incomeFromSalary, buckets, unclassified };
}

// =========================================================
// FINANÇAS PREDITIVAS (#16) — projeção pela taxa de poupança
// =========================================================

export interface SavingsProjection {
  /** Poupança média mensal (receitas − despesas) dos meses com movimento. */
  avgMonthlySavings: number;
  /** Taxa de poupança média (0–1) sobre a renda média. */
  savingsRate: number;
  /** Quantos meses entraram na média (janela com movimento). */
  sampleMonths: number;
  /** Projeção de acúmulo em 12 meses no ritmo atual. */
  in12Months: number;
}

/**
 * Tendência da taxa de poupança a partir do fluxo mensal (mais antigo → atual).
 * Ignora meses sem nenhum movimento (antes do uso do app) para não diluir a média.
 */
export function buildSavingsProjection(
  monthlyFlow: { income: number; expense: number }[],
): SavingsProjection | null {
  const active = monthlyFlow.filter((m) => m.income > 0 || m.expense > 0);
  if (active.length === 0) return null;

  const totalIncome = active.reduce((acc, m) => acc + m.income, 0);
  const totalNet = active.reduce((acc, m) => acc + (m.income - m.expense), 0);
  const avgMonthlySavings = totalNet / active.length;
  const savingsRate = totalIncome > 0 ? totalNet / totalIncome : 0;

  return {
    avgMonthlySavings,
    savingsRate,
    sampleMonths: active.length,
    in12Months: avgMonthlySavings * 12,
  };
}

/**
 * Em quantos meses uma meta (faltam `remaining` R$) é atingida no ritmo atual.
 * null = nunca (poupança ≤ 0). 0 = já dá para realizar.
 */
export function monthsToGoal(remaining: number, avgMonthlySavings: number): number | null {
  if (remaining <= 0) return 0;
  if (avgMonthlySavings <= 0) return null;
  return Math.ceil(remaining / avgMonthlySavings);
}
