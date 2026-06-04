// Utilidades de ticker (puras) — fora das server actions, pois um arquivo
// "use server" só pode exportar funções async.

export interface TickerSuggestion {
  ticker: string;
  name: string;
  logo?: string;
  price?: number;
  type: string;
}

const ETF_TICKERS = new Set(["BOVA11", "IVVB11", "SMAL11", "XINA11", "HASH11", "DIVO11", "SPXI11", "NASD11"]);
const CRYPTO_TICKERS = new Set(["BTC", "ETH", "SOL", "ADA", "BNB", "XRP", "DOGE", "LTC", "USDT"]);

// Deduz o tipo a partir do ticker e do tipo retornado pela brapi.
export function inferHoldingType(ticker: string, brapiType?: string): string {
  const t = ticker.toUpperCase();
  if (CRYPTO_TICKERS.has(t)) return "CRYPTO";
  if (ETF_TICKERS.has(t)) return "ETF";
  if (brapiType === "fund") return "FII";
  if (/11$/.test(t)) return "FII";
  return "STOCK";
}
