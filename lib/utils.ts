import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// FORMATAÇÃO DE DATA/HORA/NÚMERO (DETERMINÍSTICA — SEGURA P/ HIDRATAÇÃO)
// ----------------------------------------------------------------------------
// `toLocaleDateString()` / `toLocaleString()` sem locale fixo geram saídas
// diferentes no servidor (ex: en-US "1/29/2026") e no cliente (pt-BR
// "29/01/2026"), quebrando a hidratação do React. Estes helpers formatam de
// forma idêntica em qualquer ambiente. Use-os em vez de `toLocale*` na UI.
// ============================================================================

function toDate(value: Date | string | number): Date | null {
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// dd/MM/yyyy
export function formatDate(value: Date | string | number): string {
  const d = toDate(value);
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

// HH:mm
export function formatTime(value: Date | string | number): string {
  const d = toDate(value);
  if (!d) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${min}`;
}

// dd/MM/yyyy HH:mm
export function formatDateTime(value: Date | string | number): string {
  const d = toDate(value);
  if (!d) return "";
  return `${formatDate(d)} ${formatTime(d)}`;
}

// Dia LOCAL de hoje como "YYYY-MM-DD" para preencher <input type="date">. Usar isto
// em vez de `new Date().toISOString().slice(0,10)`, que devolve o dia em UTC e, à
// noite em fusos negativos (Brasil), já mostra "amanhã".
export function localTodayInput(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Número com separador de milhar pt-BR fixo (ex: 1.234) — locale explícito
// garante o mesmo resultado no SSR e no cliente.
export function formatNumber(value: number): string {
  return value.toLocaleString("pt-BR");
}

// Moedas suportadas pelo sistema (Configurações > Regional).
export const SUPPORTED_CURRENCIES = [
  { code: "BRL", label: "Real (R$)", locale: "pt-BR" },
  { code: "USD", label: "Dólar ($)", locale: "en-US" },
  { code: "EUR", label: "Euro (€)", locale: "de-DE" },
  { code: "GBP", label: "Libra (£)", locale: "en-GB" },
  { code: "JPY", label: "Iene (¥)", locale: "ja-JP" },
] as const;

const CURRENCY_LOCALE: Record<string, string> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c.locale])
);

// Moeda — fonte única para formatar dinheiro no sistema (ex: R$ 1.234,56).
// O locale é derivado da moeda (determinístico p/ hidratação: mesma moeda no
// servidor e cliente => mesma string). `currency` respeita a escolha do usuário.
export function formatCurrency(
  value: number,
  options?: { currency?: string; minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const { currency = "BRL", ...rest } = options ?? {};
  const locale = CURRENCY_LOCALE[currency] ?? "pt-BR";
  return value.toLocaleString(locale, { style: "currency", currency, ...rest });
}

// Símbolo isolado da moeda (ex: "R$", "$", "€") — para adornos de input.
export function currencySymbol(currency = "BRL"): string {
  const locale = CURRENCY_LOCALE[currency] ?? "pt-BR";
  const parts = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(0);
  return parts.find((p) => p.type === "currency")?.value ?? currency;
}
