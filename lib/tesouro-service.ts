// Tesouro Direto — taxas REAIS e ao vivo via API pública/gratuita da B3.
// Sem chave. Retorna [] em caso de falha (a UI lida graciosamente).

export type TesouroIndexer = "SELIC" | "IPCA" | "PREFIXADO" | "OUTRO";

export interface TesouroBond {
  name: string;
  indexer: TesouroIndexer;
  annualRate: number; // rentabilidade anual de compra (% a.a.)
  minInvestment: number; // aporte mínimo (R$)
  unitPrice: number; // preço unitário (R$)
  maturity: string; // ISO (YYYY-MM-DD)
}

const ENDPOINT = "https://www.tesourodireto.com.br/json/br/com/b3/tesourodireto/service/api/treasurybondinfo.json";

interface RawBond {
  nm?: string;
  anulInvstmtRate?: number;
  minInvstmtAmt?: number;
  untrInvstmtVal?: number;
  mtrtyDt?: string;
  FinIndxs?: { nm?: string };
}

function detectIndexer(name: string, indexerName?: string): TesouroIndexer {
  const s = `${name} ${indexerName ?? ""}`.toUpperCase();
  if (s.includes("SELIC")) return "SELIC";
  if (s.includes("IPCA")) return "IPCA";
  if (s.includes("PREFIXAD")) return "PREFIXADO";
  return "OUTRO";
}

export async function getTesouroBonds(): Promise<TesouroBond[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(ENDPOINT, { next: { revalidate: 3600 }, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return [];

    const data = await res.json();
    const list: { TrsrBd?: RawBond }[] = data?.response?.TrsrBdTradgList ?? [];

    const bonds: TesouroBond[] = [];
    const now = Date.now();
    for (const entry of list) {
      const b = entry?.TrsrBd;
      if (!b?.nm || !b.anulInvstmtRate) continue;
      const maturity = b.mtrtyDt ? b.mtrtyDt.slice(0, 10) : "";
      // Só títulos disponíveis (vencimento no futuro).
      if (maturity && new Date(maturity).getTime() < now) continue;
      bonds.push({
        name: b.nm,
        indexer: detectIndexer(b.nm, b.FinIndxs?.nm),
        annualRate: Number(b.anulInvstmtRate),
        minInvestment: Number(b.minInvstmtAmt ?? 0),
        unitPrice: Number(b.untrInvstmtVal ?? 0),
        maturity,
      });
    }

    // Ordena por indexador e vencimento.
    return bonds.sort((a, b) => a.indexer.localeCompare(b.indexer) || a.maturity.localeCompare(b.maturity));
  } catch {
    return [];
  }
}
