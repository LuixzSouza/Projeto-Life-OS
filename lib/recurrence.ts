// lib/recurrence.ts
// Recorrência dinâmica compartilhada (Custos Fixos e Cobranças).
// Client-safe: sem imports de servidor — usado em dialogs e no agregador.

export type Frequency = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "SEMIANNUAL" | "ANNUAL";

export const FREQUENCIES: Frequency[] = ["WEEKLY", "MONTHLY", "QUARTERLY", "SEMIANNUAL", "ANNUAL"];

export const FREQUENCY_LABEL: Record<Frequency, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  QUARTERLY: "Trimestral",
  SEMIANNUAL: "Semestral",
  ANNUAL: "Anual",
};

/** Ocorrências por ano — base para o "equivalente mensal" dos totais. */
export const FREQUENCY_PER_YEAR: Record<Frequency, number> = {
  WEEKLY: 52,
  MONTHLY: 12,
  QUARTERLY: 4,
  SEMIANNUAL: 2,
  ANNUAL: 1,
};

/** Passo em meses (frequências baseadas em mês). WEEKLY é tratado à parte (dias). */
const FREQUENCY_MONTHS: Record<Exclude<Frequency, "WEEKLY">, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  SEMIANNUAL: 6,
  ANNUAL: 12,
};

const WEEK_MS = 7 * 864e5;

export function asFrequency(value: string | null | undefined): Frequency {
  return value && (FREQUENCIES as string[]).includes(value) ? (value as Frequency) : "MONTHLY";
}

/** Valor normalizado para "por mês" (ex.: plano anual de 1200 → 100/mês). */
export function monthlyEquivalent(amount: number, frequency: Frequency): number {
  return amount * (FREQUENCY_PER_YEAR[frequency] / 12);
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Ocorrência mensal âncora: dia limitado ao último dia do mês, ao meio-dia local. */
function monthOccurrence(anchorDay: number, year: number, monthIndex: number): Date {
  const day = Math.min(anchorDay, lastDayOfMonth(year, monthIndex));
  return new Date(year, monthIndex, day, 12, 0, 0);
}

export interface RecurringLike {
  dayOfMonth: number;
  frequency?: string;
  startDate?: Date | string | null;
  createdAt?: Date | string | null;
}

/** Data da 1ª ocorrência. Usa startDate se houver; senão deriva de dayOfMonth no mês de createdAt. */
export function deriveAnchor(item: RecurringLike): Date {
  if (item.startDate) {
    const d = new Date(item.startDate);
    d.setHours(12, 0, 0, 0);
    return d;
  }
  const base = item.createdAt ? new Date(item.createdAt) : new Date();
  return monthOccurrence(item.dayOfMonth, base.getFullYear(), base.getMonth());
}

/**
 * Todas as ocorrências dentro de [rangeStart, rangeEnd] (inclusive), a partir da âncora,
 * sem ultrapassar endDate. Frequência baseada em mês ou semana.
 */
export function occurrencesInRange(opts: {
  anchor: Date;
  frequency: Frequency;
  endDate?: Date | null;
  rangeStart: Date;
  rangeEnd: Date;
}): Date[] {
  const { anchor, frequency, endDate, rangeStart, rangeEnd } = opts;
  const out: Date[] = [];
  const endMs = endDate ? new Date(endDate).getTime() : Infinity;
  const startMs = rangeStart.getTime();
  const endRangeMs = rangeEnd.getTime();

  if (frequency === "WEEKLY") {
    let t = anchor.getTime();
    if (t < startMs) {
      const steps = Math.ceil((startMs - t) / WEEK_MS);
      t += steps * WEEK_MS;
    }
    while (t <= endRangeMs && t <= endMs) {
      out.push(new Date(t));
      t += WEEK_MS;
    }
    return out;
  }

  const stepMonths = FREQUENCY_MONTHS[frequency];
  const anchorDay = anchor.getDate();
  const anchorIdx = anchor.getFullYear() * 12 + anchor.getMonth();
  const rangeStartIdx = rangeStart.getFullYear() * 12 + rangeStart.getMonth();

  // Primeiro k (>= 0) cuja ocorrência cai no mês de rangeStart ou depois.
  let k = Math.max(0, Math.ceil((rangeStartIdx - anchorIdx) / stepMonths));
  for (;;) {
    const idx = anchorIdx + k * stepMonths;
    const occ = monthOccurrence(anchorDay, Math.floor(idx / 12), idx % 12);
    const occMs = occ.getTime();
    if (occMs > endRangeMs || occMs > endMs) break;
    if (occMs >= startMs) out.push(occ);
    k++;
    // Guarda de segurança contra laços longos em ranges muito amplos.
    if (k > 5000) break;
  }
  return out;
}

/**
 * Ocorrência "do ciclo atual" para ações de pagamento: a mais recente com data <= ref
 * (até ~13 meses atrás); se nenhuma passada existir, a próxima futura. null se nada se aplica.
 */
export function currentDueOccurrence(
  item: RecurringLike & { endDate?: Date | string | null },
  ref: Date = new Date(),
): Date | null {
  const anchor = deriveAnchor(item);
  const frequency = asFrequency(item.frequency);
  const endDate = item.endDate ? new Date(item.endDate) : null;
  const refEnd = new Date(ref);
  refEnd.setHours(23, 59, 59, 999);
  const lookbackStart = new Date(ref);
  lookbackStart.setMonth(lookbackStart.getMonth() - 13);
  const past = occurrencesInRange({ anchor, frequency, endDate, rangeStart: lookbackStart, rangeEnd: refEnd });
  if (past.length > 0) return past[past.length - 1];
  return nextOccurrence(item, ref);
}

/** Próxima ocorrência a partir de `from` (inclusive), ou null se já encerrou. */
export function nextOccurrence(item: RecurringLike & { endDate?: Date | string | null }, from: Date = new Date()): Date | null {
  const anchor = deriveAnchor(item);
  const frequency = asFrequency(item.frequency);
  const endDate = item.endDate ? new Date(item.endDate) : null;
  // Janela ampla o suficiente para qualquer frequência (até ~1 ano e meio à frente).
  const rangeStart = new Date(from);
  rangeStart.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setMonth(rangeEnd.getMonth() + 18);
  const occ = occurrencesInRange({ anchor, frequency, endDate, rangeStart, rangeEnd });
  return occ.length > 0 ? occ[0] : null;
}

/** True se a recorrência já encerrou (endDate no passado). */
export function hasEnded(endDate: Date | string | null | undefined, ref: Date = new Date()): boolean {
  if (!endDate) return false;
  return new Date(endDate).getTime() < ref.getTime();
}

/** Data resultante de avançar `count` períodos a partir de `anchor` (count pode ser 0). */
export function addPeriods(anchor: Date, frequency: Frequency, count: number): Date {
  const d = new Date(anchor);
  d.setHours(12, 0, 0, 0);
  if (frequency === "WEEKLY") {
    d.setDate(d.getDate() + 7 * count);
    return d;
  }
  const stepMonths = FREQUENCY_MONTHS[frequency];
  const anchorDay = anchor.getDate();
  const totalIdx = d.getFullYear() * 12 + d.getMonth() + stepMonths * count;
  const year = Math.floor(totalIdx / 12);
  const month = totalIdx % 12;
  return monthOccurrence(anchorDay, year, month);
}

/** Quantos períodos inteiros separam `to` de `from` (>= 0). Usado p/ numerar parcelas. */
export function periodsBetween(from: Date, to: Date, frequency: Frequency): number {
  if (frequency === "WEEKLY") {
    return Math.max(0, Math.round((to.getTime() - from.getTime()) / WEEK_MS));
  }
  const stepMonths = FREQUENCY_MONTHS[frequency];
  const months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return Math.max(0, Math.round(months / stepMonths));
}

/**
 * Para um plano parcelado: calcula o endDate (data da última parcela a acompanhar).
 * startDate = data da PRÓXIMA parcela; remaining = installments - paidInstallments.
 * Retorna null se não há parcelas restantes.
 */
export function installmentEndDate(
  startDate: Date,
  frequency: Frequency,
  installments: number,
  paidInstallments: number,
): Date | null {
  const remaining = installments - paidInstallments;
  if (remaining <= 0) return null;
  return addPeriods(startDate, frequency, remaining - 1);
}
