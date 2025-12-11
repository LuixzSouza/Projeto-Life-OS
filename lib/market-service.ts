// lib/market-service.ts

export interface MarketItem {
  ticker: string;
  name: string;
  value: number;
  variation: number;
  type: "INDEX" | "CURRENCY" | "STOCK" | "FII" | "CRYPTO";
}

// Interface para tipar o retorno da API Brapi
interface BrapiStock {
  symbol: string;
  longName?: string;
  regularMarketPrice: number;
  regularMarketChangePercent: number;
}

// --- 1. BANCO CENTRAL (Selic, CDI, IPCA) ---
// Docs: https://dadosabertos.bcb.gov.br/dataset/
async function getTaxasBCB() {
  try {
    // Códigos SGS: 432 (Selic Meta), 13522 (IPCA 12m)
    // CDI geralmente é Selic - 0.10, mas vamos pegar a Selic Meta como referência base
    const [selicRes, ipcaRes] = await Promise.all([
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json", { next: { revalidate: 3600 } }),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json", { next: { revalidate: 3600 } })
    ]);

    const selicData = await selicRes.json();
    const ipcaData = await ipcaRes.json();

    const selicVal = parseFloat(selicData[0].valor);
    const ipcaVal = parseFloat(ipcaData[0].valor);
    const cdiVal = selicVal - 0.10; // Convenção de mercado

    return [
      { ticker: "CDI", name: "Renda Fixa", value: cdiVal, variation: 0, type: "INDEX" as const },
      { ticker: "Selic", name: "Taxa Básica", value: selicVal, variation: 0, type: "INDEX" as const },
      { ticker: "IPCA", name: "Inflação (12m)", value: ipcaVal, variation: 0, type: "INDEX" as const },
    ];
  } catch (e) {
    console.error("Erro BCB:", e);
    // Fallback caso a API do governo caia
    return [
      { ticker: "CDI", name: "Renda Fixa", value: 11.15, variation: 0, type: "INDEX" as const },
      { ticker: "Selic", name: "Taxa Básica", value: 11.25, variation: 0, type: "INDEX" as const },
    ];
  }
}

// --- 2. AWESOME API (Moedas) ---
async function getMoedas() {
  try {
    const res = await fetch("https://economia.awesomeapi.com.br/last/USD-BRL,BTC-BRL", { next: { revalidate: 60 } });
    const data = await res.json();

    return [
      {
        ticker: "Dólar",
        name: "USD/BRL",
        value: parseFloat(data.USDBRL.bid),
        variation: parseFloat(data.USDBRL.pctChange),
        type: "CURRENCY" as const
      },
      {
        ticker: "Bitcoin",
        name: "BTC/BRL",
        value: parseFloat(data.BTCBRL.bid),
        variation: parseFloat(data.BTCBRL.pctChange),
        type: "CRYPTO" as const
      }
    ];
  } catch (e) {
    return [];
  }
}

// --- 3. BRAPI (Ações e FIIs) ---
// Use o token 'public' ou crie uma conta grátis na Brapi para aumentar o limite
const STOCKS_LIST = "PETR4,VALE3,MXRF11,IVVB11"; 

async function getAcoes() {
  try {
    const res = await fetch(`https://brapi.dev/api/quote/${STOCKS_LIST}?range=1d&interval=1d&token=public`, { 
      next: { revalidate: 300 } 
    });
    const data = await res.json();

    if (!data.results) return [];

    // ✅ CORREÇÃO: Tipagem explícita 'item: BrapiStock' em vez de 'any'
    return data.results.map((item: BrapiStock) => ({
      ticker: item.symbol,
      name: item.longName || item.symbol,
      value: item.regularMarketPrice,
      variation: item.regularMarketChangePercent,
      type: item.symbol.includes("11") ? "FII" : "STOCK"
    }));
  } catch (e) {
    console.error("Erro Brapi:", e);
    return [];
  }
}

// Função Principal Unificada
export async function getMarketOverview(): Promise<MarketItem[]> {
  const [taxas, moedas, acoes] = await Promise.all([
    getTaxasBCB(),
    getMoedas(),
    getAcoes()
  ]);

  return [...taxas, ...moedas, ...acoes] as MarketItem[];
}