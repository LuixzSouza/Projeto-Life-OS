// Combina as posições da carteira (custo) com as cotações ao vivo para gerar
// valor atual, lucro/prejuízo e variação do dia — tudo o que a UI mostra.
import type { Quote } from "./portfolio-quotes";

export const HOLDING_TYPES = ["STOCK", "FII", "ETF", "CRYPTO"] as const;
export type HoldingType = (typeof HOLDING_TYPES)[number];

export interface HoldingInput {
  id: string;
  ticker: string;
  type: string;
  quantity: number;
  avgPrice: number;
  note?: string | null;
}

export interface Position extends HoldingInput {
  name: string;
  currentPrice: number;
  changePercent: number; // variação do dia (%)
  logoUrl?: string;
  invested: number; // quantity * avgPrice (custo)
  currentValue: number; // quantity * currentPrice
  profit: number; // currentValue - invested
  profitPercent: number;
  allocation: number; // % do valor atual sobre o total da carteira
  hasQuote: boolean;
}

export interface PortfolioTotals {
  invested: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
  dayChange: number; // variação do dia em R$
  dayChangePercent: number;
  count: number;
  missingQuotes: number; // posições sem cotação ao vivo
}

export function buildPositions(holdings: HoldingInput[], quotes: Record<string, Quote>): Position[] {
  const raw = holdings.map((h) => {
    const q = quotes[h.ticker.toUpperCase()];
    const currentPrice = q?.price && q.price > 0 ? q.price : h.avgPrice; // sem cotação → usa o custo (P/L neutro)
    const invested = h.quantity * h.avgPrice;
    const currentValue = h.quantity * currentPrice;
    const profit = currentValue - invested;
    return {
      ...h,
      name: q?.name ?? h.ticker,
      currentPrice,
      changePercent: q?.changePercent ?? 0,
      logoUrl: q?.logoUrl,
      invested,
      currentValue,
      profit,
      profitPercent: invested > 0 ? (profit / invested) * 100 : 0,
      allocation: 0,
      hasQuote: !!(q && q.price > 0),
    };
  });

  const total = raw.reduce((acc, p) => acc + p.currentValue, 0);
  for (const p of raw) p.allocation = total > 0 ? (p.currentValue / total) * 100 : 0;

  // Maior posição primeiro.
  return raw.sort((a, b) => b.currentValue - a.currentValue);
}

export function computeTotals(positions: Position[]): PortfolioTotals {
  const invested = positions.reduce((a, p) => a + p.invested, 0);
  const currentValue = positions.reduce((a, p) => a + p.currentValue, 0);
  const profit = currentValue - invested;

  // Variação do dia em R$: preço atual menos o preço de ontem (derivado do %).
  const dayChange = positions.reduce((acc, p) => {
    if (!p.hasQuote || p.changePercent === 0) return acc;
    const prev = p.currentPrice / (1 + p.changePercent / 100);
    return acc + (p.currentPrice - prev) * p.quantity;
  }, 0);
  const prevTotal = currentValue - dayChange;

  return {
    invested,
    currentValue,
    profit,
    profitPercent: invested > 0 ? (profit / invested) * 100 : 0,
    dayChange,
    dayChangePercent: prevTotal > 0 ? (dayChange / prevTotal) * 100 : 0,
    count: positions.length,
    missingQuotes: positions.filter((p) => !p.hasQuote).length,
  };
}
