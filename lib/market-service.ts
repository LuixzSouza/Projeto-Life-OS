// lib/market-service.ts

export type MarketType = "INDEX" | "CURRENCY" | "STOCK" | "FII" | "CRYPTO" | "ETF";

export interface HistoryPoint {
  date: string; // ISO (YYYY-MM-DD)
  close: number;
}

export interface MarketItem {
  ticker: string;
  name: string;
  value: number;
  variation: number;
  type: MarketType;
  displayValue: string;
  dayHigh?: number;
  dayLow?: number;
  volume?: string; 
  marketCap?: string; 
  logoUrl?: string; 
}

interface BrapiResult {
  symbol: string;
  longName?: string;
  shortName?: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh?: number;
  regularMarketDayLow?: number;
  regularMarketVolume?: number;
  marketCap?: number;
  logourl?: string; 
}

const DEFAULT_STOCKS = ["PETR4", "VALE3", "ITUB4", "WEGE3", "MXRF11", "HGLG11", "IVVB11", "BOVA11", "BBAS3", "RENT3"];

// --- HELPERS ---

const formatBRL = (val: number) => 
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatCompact = (num?: number) => {
  if (!num) return "-";
  return new Intl.NumberFormat('pt-BR', { notation: "compact", maximumFractionDigits: 1 }).format(num);
};

const cleanName = (name: string, ticker: string): string => {
  if (ticker === 'USD') return 'Dólar Comercial';
  if (ticker === 'BTC') return 'Bitcoin';
  if (!name) return ticker;
  return name.replace(/( S\.A\.| S\/A| LTDA| ON| PN| UNT| N[12]| NM| DR[N]?)/gi, "").split(" - ")[0].trim();
};

// --- 1. BANCO CENTRAL ---
async function getIndicadoresMacro(): Promise<MarketItem[]> {
  try {
    // Adicionei timeout para não travar o build se a API demorar
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos timeout

    const [selicRes, ipcaRes] = await Promise.all([
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json", { next: { revalidate: 3600 * 24 }, signal: controller.signal }).catch(() => null),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json", { next: { revalidate: 3600 * 24 }, signal: controller.signal }).catch(() => null)
    ]);
    
    clearTimeout(timeoutId);

    let selicVal = 11.25; // Fallback hardcoded
    let ipcaVal = 4.50; // Fallback hardcoded

    if (selicRes?.ok) {
        const data = await selicRes.json();
        selicVal = parseFloat(data[0].valor);
    }
    
    if (ipcaRes?.ok) {
        const data = await ipcaRes.json();
        ipcaVal = parseFloat(data[0].valor);
    }

    const cdiVal = selicVal - 0.10;

    return [
      { ticker: "CDI", name: "Renda Fixa (a.a.)", value: cdiVal, variation: 0, type: "INDEX", displayValue: `${cdiVal.toFixed(2)}%` },
      { ticker: "IPCA", name: "Inflação 12m", value: ipcaVal, variation: 0, type: "INDEX", displayValue: `${ipcaVal.toFixed(2)}%` },
    ];
  } catch (e) {
    // Retorna dados estáticos em caso de erro total (ex: sem internet no build)
    return [{ ticker: "CDI", name: "Renda Fixa", value: 11.15, variation: 0, type: "INDEX", displayValue: "11,15%" }];
  }
}

// --- 2. AWESOME API (Câmbio) ---
async function getMoedas(): Promise<MarketItem[]> {
  try {
    const res = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL", { next: { revalidate: 60 } });
    if (!res.ok) return []; // Retorna vazio silenciosamente em caso de erro
    const data = await res.json();

    const mapItem = (key: string, ticker: string, type: MarketType): MarketItem => {
        const item = data[key];
        if (!item) return { ticker, name: ticker, value: 0, variation: 0, type, displayValue: "R$ 0,00" }; // Fallback para item faltante
        
        const val = parseFloat(item.bid);
        return {
            ticker,
            name: cleanName(item.name, ticker),
            value: val,
            variation: parseFloat(item.pctChange),
            type,
            displayValue: formatBRL(val),
            dayHigh: parseFloat(item.high), 
            dayLow: parseFloat(item.low),   
        };
    };

    return [
        mapItem('USDBRL', 'USD', 'CURRENCY'), 
        mapItem('EURBRL', 'EUR', 'CURRENCY'), 
        mapItem('BTCBRL', 'BTC', 'CRYPTO')
    ].filter(i => i.value > 0);
  } catch (e) {
    return [];
  }
}

// Mapeia um resultado bruto da brapi para o nosso MarketItem.
function mapAcao(item: BrapiResult): MarketItem {
  const isFII = item.symbol.endsWith("11") && !["IVVB11", "BOVA11", "XINA11", "SMAL11"].includes(item.symbol);
  const isETF = ["IVVB11", "BOVA11", "SMAL11"].includes(item.symbol);
  const type: MarketType = isFII ? "FII" : isETF ? "ETF" : "STOCK";
  return {
    ticker: item.symbol,
    name: cleanName(item.longName || item.shortName || item.symbol, item.symbol),
    value: item.regularMarketPrice,
    variation: item.regularMarketChangePercent,
    type,
    displayValue: formatBRL(item.regularMarketPrice),
    dayHigh: item.regularMarketDayHigh,
    dayLow: item.regularMarketDayLow,
    volume: formatCompact(item.regularMarketVolume),
    marketCap: formatCompact(item.marketCap),
    logoUrl: item.logourl || `https://ui-avatars.com/api/?name=${item.symbol}&background=random`,
  };
}

// Busca um único ticker (funciona até com o token "public").
async function fetchOneAcao(ticker: string, token: string): Promise<MarketItem | null> {
  try {
    const res = await fetch(`https://brapi.dev/api/quote/${ticker}?token=${token}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    const item: BrapiResult | undefined = data?.results?.[0];
    if (!item || typeof item.regularMarketPrice !== "number") return null;
    return mapAcao(item);
  } catch {
    return null;
  }
}

// --- 3. BRAPI (Ações) ---
// Estratégia: tenta o lote (1 requisição, eficiente com token válido). Se falhar
// (ex.: token "public" não aceita multi-ticker), faz fallback ticker-a-ticker —
// que funciona em qualquer plano. Cada chamada tem cache de 5min (revalidate),
// então o auto-refresh não estoura a cota.
async function getAcoes(customTickers?: string[], token?: string): Promise<MarketItem[]> {
  const tickersToFetch = customTickers?.length ? customTickers : DEFAULT_STOCKS;
  if (tickersToFetch.length === 0) return [];

  const BRAPI_TOKEN = token?.trim() || process.env.BRAPI_TOKEN?.trim() || "public";

  // 1) Tenta o lote.
  try {
    const res = await fetch(`https://brapi.dev/api/quote/${tickersToFetch.join(",")}?token=${BRAPI_TOKEN}`, { next: { revalidate: 300 } });
    if (res.ok) {
      const data = await res.json();
      if (!data?.error && Array.isArray(data?.results) && data.results.length > 0) {
        return data.results.map(mapAcao);
      }
    }
  } catch {
    /* cai no fallback */
  }

  // 2) Fallback: busca individual (robusto em qualquer plano).
  const results = await Promise.all(tickersToFetch.map((t) => fetchOneAcao(t, BRAPI_TOKEN)));
  return results.filter((x): x is MarketItem => x !== null);
}

// --- MAIN FUNCTION ---
export async function getMarketOverview(customTickers?: string[], token?: string): Promise<MarketItem[]> {
  // Promise.allSettled garante que se uma API falhar, as outras continuam e a página renderiza
  const [macro, moedas, bolsa] = await Promise.allSettled([
      getIndicadoresMacro(),
      getMoedas(),
      getAcoes(customTickers, token)
  ]);

  return [
    ...(macro.status === 'fulfilled' ? macro.value : []),
    ...(moedas.status === 'fulfilled' ? moedas.value : []),
    ...(bolsa.status === 'fulfilled' ? bolsa.value : [])
  ];
}