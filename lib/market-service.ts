// lib/market-service.ts

export type MarketType = "INDEX" | "CURRENCY" | "STOCK" | "FII" | "CRYPTO" | "ETF";

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

// Interface tipada da Brapi (expandida)
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

const BRAPI_TOKEN = process.env.BRAPI_TOKEN || "public"; 
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
    const [selicRes, ipcaRes] = await Promise.all([
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json", { next: { revalidate: 3600 * 24 } }),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json", { next: { revalidate: 3600 * 24 } })
    ]);

    if (!selicRes.ok || !ipcaRes.ok) throw new Error("BCB API Error");

    const selicData = await selicRes.json();
    const ipcaData = await ipcaRes.json();
    const cdiVal = parseFloat(selicData[0].valor) - 0.10; 

    return [
      { ticker: "CDI", name: "Renda Fixa (a.a.)", value: cdiVal, variation: 0, type: "INDEX", displayValue: `${cdiVal.toFixed(2)}%` },
      { ticker: "IPCA", name: "Inflação 12m", value: parseFloat(ipcaData[0].valor), variation: 0, type: "INDEX", displayValue: `${parseFloat(ipcaData[0].valor).toFixed(2)}%` },
    ];
  } catch (e) {
    return [{ ticker: "CDI", name: "Renda Fixa", value: 11.15, variation: 0, type: "INDEX", displayValue: "11,15%" }];
  }
}

// --- 2. AWESOME API (Câmbio) ---
async function getMoedas(): Promise<MarketItem[]> {
  try {
    const res = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL", { next: { revalidate: 60 } });
    if (!res.ok) throw new Error("AwesomeAPI Error");
    const data = await res.json();

    const mapItem = (key: string, ticker: string, type: MarketType): MarketItem => {
        const item = data[key];
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

    return [mapItem('USDBRL', 'USD', 'CURRENCY'), mapItem('EURBRL', 'EUR', 'CURRENCY'), mapItem('BTCBRL', 'BTC', 'CRYPTO')];
  } catch (e) {
    return [];
  }
}

// --- 3. BRAPI (Ações) ---
async function getAcoes(customTickers?: string[]): Promise<MarketItem[]> {
  try {
    const tickersToFetch = customTickers?.length ? customTickers : DEFAULT_STOCKS;
    const res = await fetch(`https://brapi.dev/api/quote/${tickersToFetch.join(",")}?range=1d&interval=1d&token=${BRAPI_TOKEN}`, { next: { revalidate: 300 } });

    if (!res.ok) { console.warn("Brapi Error"); return []; }

    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((item: BrapiResult) => {
        const isFII = item.symbol.endsWith("11") && !["IVVB11", "BOVA11", "XINA11", "SMAL11"].includes(item.symbol);
        const isETF = ["IVVB11", "BOVA11", "SMAL11"].includes(item.symbol);
        
        // CORREÇÃO AQUI: Usei 'const' em vez de 'let' e lógica ternária direta
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
            logoUrl: item.logourl || `https://ui-avatars.com/api/?name=${item.symbol}&background=random` 
        };
    });
  } catch (e) {
    console.error("Erro Brapi:", e);
    return [];
  }
}

// --- MAIN FUNCTION ---
export async function getMarketOverview(customTickers?: string[]): Promise<MarketItem[]> {
  const [macro, moedas, bolsa] = await Promise.allSettled([getIndicadoresMacro(), getMoedas(), getAcoes(customTickers)]);
  return [
    ...(macro.status === 'fulfilled' ? macro.value : []),
    ...(moedas.status === 'fulfilled' ? moedas.value : []),
    ...(bolsa.status === 'fulfilled' ? bolsa.value : [])
  ];
}