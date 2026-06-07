// Helper compartilhado pelas server actions de finance.
import { asFrequency } from "@/lib/recurrence";

// Garante que números venham corretos do formulário
export const parseAmount = (value: FormDataEntryValue | null) => {
  if (!value) return 0;
  const stringValue = value.toString().replace(/[^\d.,-]/g, '').replace(',', '.');
  const float = parseFloat(stringValue);
  return isNaN(float) ? 0 : float;
};

// Dia do mês válido (1-31).
export const clampDay = (value: FormDataEntryValue | null, fallback = 1): number => {
  const n = parseInt((value as string) ?? "", 10);
  if (Number.isNaN(n)) return fallback;
  return Math.min(Math.max(n, 1), 31);
};

// Converte um <input type="date"> em Date ao meio-dia UTC (evita o bug do "dia anterior").
export const parseDateField = (value: FormDataEntryValue | null): Date | null => {
  const s = (value as string)?.trim();
  if (!s) return null;
  const datePart = s.split("T")[0];
  const d = new Date(`${datePart}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
};

// Lê os campos de recorrência (frequência + datas). Para frequências não-mensais o
// âncora vem do startDate, e o dayOfMonth segue o dia dele.
export const parseRecurrence = (formData: FormData): {
  frequency: string;
  startDate: Date | null;
  endDate: Date | null;
  dayOfMonth: number;
} => {
  const frequency = asFrequency(formData.get("frequency") as string);
  const startDate = parseDateField(formData.get("startDate"));
  const endDate = parseDateField(formData.get("endDate"));
  const dayOfMonth = startDate ? startDate.getUTCDate() : clampDay(formData.get("dayOfMonth"));
  return { frequency, startDate, endDate, dayOfMonth };
};

// Lê os campos de parcelamento. installments >= 2 ativa o modo parcelado (senão null).
// paidInstallments é limitado a [0, installments-1] (sempre há ≥ 1 parcela restante).
export const parseInstallments = (formData: FormData): { installments: number | null; paidInstallments: number } => {
  const totalRaw = parseInt((formData.get("installments") as string) ?? "", 10);
  const installments = Number.isNaN(totalRaw) || totalRaw < 2 ? null : totalRaw;
  if (!installments) return { installments: null, paidInstallments: 0 };
  const paidRaw = parseInt((formData.get("paidInstallments") as string) ?? "", 10);
  const paid = Number.isNaN(paidRaw) || paidRaw < 0 ? 0 : Math.min(paidRaw, installments - 1);
  return { installments, paidInstallments: paid };
};
