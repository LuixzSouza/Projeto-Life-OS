"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { parseAmount } from "./helpers";
import { HOLDING_TYPES, type HoldingInput } from "@/lib/portfolio-compute";
import { getBrapiToken } from "@/lib/brapi-token";
import { inferHoldingType, type TickerSuggestion } from "@/lib/ticker-utils";

// =========================================================
// CARTEIRA DE INVESTIMENTOS (Holdings)
// =========================================================

function resolveType(raw: FormDataEntryValue | null): string {
  const v = (raw?.toString() || "").toUpperCase();
  return (HOLDING_TYPES as readonly string[]).includes(v) ? v : "STOCK";
}

// Busca tickers na brapi (autocomplete) — nome, logo e preço atual.
export async function searchTickers(query: string): Promise<TickerSuggestion[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  try {
    const userId = await requireUserId();
    const token = await getBrapiToken(userId);
    const res = await fetch(
      `https://brapi.dev/api/quote/list?search=${encodeURIComponent(q)}&limit=12&token=${token}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    const stocks: { stock: string; name?: string; logo?: string; close?: number; type?: string }[] = data?.stocks ?? [];
    return stocks.slice(0, 12).map((s) => ({
      ticker: s.stock,
      name: s.name || s.stock,
      logo: s.logo,
      price: typeof s.close === "number" ? s.close : undefined,
      type: inferHoldingType(s.stock, s.type),
    }));
  } catch {
    return [];
  }
}

export async function getHoldings(): Promise<HoldingInput[]> {
  const userId = await requireUserId();
  const rows = await prisma.investmentHolding.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    id: r.id,
    ticker: r.ticker,
    type: r.type,
    quantity: Number(r.quantity),
    avgPrice: Number(r.avgPrice),
    note: r.note,
  }));
}

// Adiciona um aporte. Se já existir o mesmo ticker, faz o preço médio ponderado
// (comportamento natural de "comprei mais desse ativo").
export async function addHolding(formData: FormData) {
  try {
    const userId = await requireUserId();
    const ticker = (formData.get("ticker") as string | null)?.trim().toUpperCase() || "";
    const type = resolveType(formData.get("type"));
    const quantity = parseAmount(formData.get("quantity"));
    const avgPrice = parseAmount(formData.get("avgPrice"));
    const note = (formData.get("note") as string | null)?.trim() || null;

    if (!ticker) return { success: false, message: "Informe o ticker (ex.: PETR4)." };
    if (quantity <= 0) return { success: false, message: "Quantidade deve ser maior que zero." };
    if (avgPrice <= 0) return { success: false, message: "Preço de compra deve ser maior que zero." };

    const existing = await prisma.investmentHolding.findFirst({ where: { userId, ticker } });

    if (existing) {
      const oldQty = Number(existing.quantity);
      const oldAvg = Number(existing.avgPrice);
      const newQty = oldQty + quantity;
      const newAvg = newQty > 0 ? (oldQty * oldAvg + quantity * avgPrice) / newQty : avgPrice;
      await prisma.investmentHolding.update({
        where: { id: existing.id },
        data: { quantity: newQty, avgPrice: newAvg, type, ...(note ? { note } : {}) },
      });
    } else {
      await prisma.investmentHolding.create({
        data: { userId, ticker, type, quantity, avgPrice, note },
      });
    }

    revalidatePath("/finance/investments");
    return { success: true, message: `${ticker} adicionado à carteira!` };
  } catch (error) {
    console.error("Erro ao adicionar ativo:", error);
    return { success: false, message: "Falha ao adicionar ativo." };
  }
}

// Edição direta (corrige quantidade/preço médio com valores absolutos).
export async function updateHolding(formData: FormData) {
  try {
    const userId = await requireUserId();
    const id = (formData.get("id") as string | null) || "";
    const ticker = (formData.get("ticker") as string | null)?.trim().toUpperCase() || "";
    const type = resolveType(formData.get("type"));
    const quantity = parseAmount(formData.get("quantity"));
    const avgPrice = parseAmount(formData.get("avgPrice"));
    const note = (formData.get("note") as string | null)?.trim() || null;

    if (!id) return { success: false, message: "ID inválido." };
    if (!ticker) return { success: false, message: "Informe o ticker." };
    if (quantity <= 0) return { success: false, message: "Quantidade deve ser maior que zero." };
    if (avgPrice <= 0) return { success: false, message: "Preço de compra deve ser maior que zero." };

    await prisma.investmentHolding.updateMany({
      where: { id, userId },
      data: { ticker, type, quantity, avgPrice, note },
    });

    revalidatePath("/finance/investments");
    return { success: true, message: "Ativo atualizado." };
  } catch (error) {
    console.error("Erro ao atualizar ativo:", error);
    return { success: false, message: "Falha ao atualizar ativo." };
  }
}

export async function removeHolding(id: string) {
  try {
    const userId = await requireUserId();
    await prisma.investmentHolding.deleteMany({ where: { id, userId } });
    revalidatePath("/finance/investments");
    return { success: true, message: "Ativo removido da carteira." };
  } catch (error) {
    console.error("Erro ao remover ativo:", error);
    return { success: false, message: "Falha ao remover ativo." };
  }
}
