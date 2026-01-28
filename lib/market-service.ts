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

// --- 3. BRAPI (Ações) ---
async function getAcoes(customTickers?: string[]): Promise<MarketItem[]> {
  try {
    const tickersToFetch = customTickers?.length ? customTickers : DEFAULT_STOCKS;
    
    // Proteção contra chamadas vazias
    if (tickersToFetch.length === 0) return [];

    const res = await fetch(`https://brapi.dev/api/quote/${tickersToFetch.join(",")}?range=1d&interval=1d&token=${BRAPI_TOKEN}`, { next: { revalidate: 300 } });

    // Tratamento de erro específico para não poluir o log do build
    if (!res.ok) { 
        // Se for erro de autenticação ou limite, apenas retorna array vazio
        if (res.status === 401 || res.status === 429) return [];
        return []; 
    }

    const data = await res.json();
    if (!data.results) return [];

    return data.results.map((item: BrapiResult) => {
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
            logoUrl: item.logourl || `https://ui-avatars.com/api/?name=${item.symbol}&background=random` 
        };
    });
  } catch (e) {
    // Silencia o erro no console durante o build, a menos que estejamos em DEV
    if (process.env.NODE_ENV === 'development') console.warn("Brapi fetch warning");
    return [];
  }
}

// --- MAIN FUNCTION ---
export async function getMarketOverview(customTickers?: string[]): Promise<MarketItem[]> {
  // Promise.allSettled garante que se uma API falhar, as outras continuam e a página renderiza
  const [macro, moedas, bolsa] = await Promise.allSettled([
      getIndicadoresMacro(), 
      getMoedas(), 
      getAcoes(customTickers)
  ]);

  return [
    ...(macro.status === 'fulfilled' ? macro.value : []),
    ...(moedas.status === 'fulfilled' ? moedas.value : []),
    ...(bolsa.status === 'fulfilled' ? bolsa.value : [])
  ];
}