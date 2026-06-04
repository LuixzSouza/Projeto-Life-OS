// Busca cotações ao vivo para uma lista de tickers da carteira.
// Ações/FIIs/ETFs (B3) via brapi.dev; criptomoedas via AwesomeAPI. Ambas grátis.
// brapi exige um token gratuito (cadastro) — sem ele, retorna vazio para a maioria
// dos papéis; o chamador deve lidar com a ausência de cotação graciosamente.

export interface Quote {
  ticker: string;
  name: string;
  price: number;
  changePercent: number; // variação do dia (%)
  logoUrl?: string;
}

const CRYPTO = new Set(["BTC", "ETH", "SOL", "ADA", "BNB", "XRP", "DOGE", "LTC", "USDT"]);

export const isCrypto = (ticker: string) => CRYPTO.has(ticker.trim().toUpperCase());

export async function getQuotes(tickers: string[], token?: string): Promise<Record<string, Quote>> {
  const BRAPI_TOKEN = token?.trim() || process.env.BRAPI_TOKEN?.trim() || "public";
  const unique = Array.from(new Set(tickers.map((t) => t.trim().toUpperCase()).filter(Boolean)));
  if (unique.length === 0) return {};

  const cryptos = unique.filter((t) => CRYPTO.has(t));
  const stocks = unique.filter((t) => !CRYPTO.has(t));
  const out: Record<string, Quote> = {};

  await Promise.all([
    (async () => {
      if (stocks.length === 0) return;
      try {
        const res = await fetch(
          `https://brapi.dev/api/quote/${stocks.join(",")}?token=${BRAPI_TOKEN}`,
          { next: { revalidate: 300 } },
        );
        if (!res.ok) return;
        const data = await res.json();
        for (const r of data.results ?? []) {
          if (!r?.symbol) continue;
          out[r.symbol] = {
            ticker: r.symbol,
            name: r.longName || r.shortName || r.symbol,
            price: r.regularMarketPrice ?? 0,
            changePercent: r.regularMarketChangePercent ?? 0,
            logoUrl: r.logourl || undefined,
          };
        }
      } catch { /* offline ou limite — sem cotação */ }
    })(),
    (async () => {
      if (cryptos.length === 0) return;
      try {
        const pairs = cryptos.map((c) => `${c}-BRL`).join(",");
        const res = await fetch(`https://economia.awesomeapi.com.br/last/${pairs}`, { next: { revalidate: 120 } });
        if (!res.ok) return;
        const data = await res.json();
        for (const c of cryptos) {
          const item = data[`${c}BRL`];
          if (!item) continue;
          out[c] = {
            ticker: c,
            name: (item.name as string)?.split("/")[0]?.trim() || c,
            price: parseFloat(item.bid),
            changePercent: parseFloat(item.pctChange),
          };
        }
      } catch { /* sem cotação de cripto */ }
    })(),
  ]);

  return out;
}
