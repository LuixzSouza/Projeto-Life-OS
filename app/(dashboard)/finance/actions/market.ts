"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { getBrapiToken } from "@/lib/brapi-token";
import { getMarketOverview, type MarketItem, type HistoryPoint } from "@/lib/market-service";

// Lista de ativos favoritados no Terminal — sincronizada no perfil do usuário.
export async function getWatchlist(): Promise<string[]> {
  try {
    const userId = await requireUserId();
    const s = await prisma.settings.findUnique({ where: { userId }, select: { marketWatchlist: true } });
    if (!s?.marketWatchlist) return [];
    const arr = JSON.parse(s.marketWatchlist);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function setWatchlist(tickers: string[]): Promise<{ success: boolean }> {
  try {
    const userId = await requireUserId();
    const clean = Array.from(new Set((tickers || []).map((t) => t.trim().toUpperCase()).filter(Boolean))).slice(0, 50);
    await prisma.settings.upsert({
      where: { userId },
      update: { marketWatchlist: JSON.stringify(clean) },
      create: { userId, marketWatchlist: JSON.stringify(clean), theme: "system", accentColor: "zinc" },
    });
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar watchlist:", error);
    return { success: false };
  }
}

// Snapshot ao vivo do mercado (para atualização automática no cliente).
export async function getMarketSnapshot(tickers: string[]): Promise<MarketItem[]> {
  const userId = await requireUserId();
  const token = await getBrapiToken(userId);
  return getMarketOverview(tickers.length ? tickers : undefined, token);
}

// Série histórica (~3 meses) de um ativo para o gráfico do detalhe.
// B3 (ação/FII/ETF) via brapi; câmbio/cripto via AwesomeAPI; índices não têm série.
export async function getMarketHistory(ticker: string, type: string): Promise<HistoryPoint[]> {
  try {
    if (type === "INDEX") return [];

    if (type === "CURRENCY" || type === "CRYPTO") {
      const res = await fetch(`https://economia.awesomeapi.com.br/json/daily/${ticker}-BRL/90`, { next: { revalidate: 600 } });
      if (!res.ok) return [];
      const data = await res.json();
      const points: HistoryPoint[] = (Array.isArray(data) ? data : [])
        .map((d: { timestamp?: string; bid?: string }) => ({
          date: new Date(Number(d.timestamp) * 1000).toISOString().slice(0, 10),
          close: parseFloat(d.bid ?? ""),
        }))
        .filter((p: HistoryPoint) => !isNaN(p.close));
      return points.reverse(); // AwesomeAPI vem do mais recente → invertemos p/ cronológico
    }

    const userId = await requireUserId();
    const token = await getBrapiToken(userId);
    const res = await fetch(`https://brapi.dev/api/quote/${ticker}?range=3mo&interval=1d&token=${token}`, { next: { revalidate: 1800 } });
    if (!res.ok) return [];
    const data = await res.json();
    const hist: { date: number; close: number }[] = data?.results?.[0]?.historicalDataPrice ?? [];
    return hist
      .map((p) => ({ date: new Date(p.date * 1000).toISOString().slice(0, 10), close: p.close }))
      .filter((p) => p.close > 0);
  } catch {
    return [];
  }
}
