// Universo de ativos populares da B3 usado para a "descoberta" aleatória do
// Terminal de Mercado — pra quem ainda não conhece tickers ver coisas variadas.

export const MARKET_POOL: string[] = [
  // Ações líquidas
  "PETR4", "PETR3", "VALE3", "ITUB4", "ITSA4", "BBAS3", "BBDC4", "B3SA3",
  "ABEV3", "WEGE3", "PRIO3", "RENT3", "SUZB3", "GGBR4", "ELET3", "RADL3",
  "JBSS3", "LREN3", "RAIL3", "EQTL3", "VIVT3", "CSAN3", "CMIG4", "UGPA3",
  "HAPV3", "RDOR3", "TOTS3", "EMBR3", "MGLU3", "LWSA3", "NTCO3", "SBSP3",
  "CCRO3", "ENEV3", "BRFS3", "CPLE6",
  // Fundos imobiliários
  "MXRF11", "HGLG11", "KNRI11", "VISC11", "XPML11", "HGRU11", "KNCR11",
  "BTLG11", "RECR11", "HGRE11", "VGHF11",
  // ETFs
  "IVVB11", "BOVA11", "SMAL11", "DIVO11", "HASH11",
];

// Sorteio sem repetição (Fisher–Yates parcial).
export function pickRandom<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const count = Math.min(n, copy.length);
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, count);
}
