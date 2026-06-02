"use server";

import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { FoodItem } from "@/lib/food-db";

// =========================================================
// BUSCA DE ALIMENTOS — Open Food Facts (gratuita, sem chave)
// Respeita o toggle settings.foodApiEnabled (privacy-first).
// =========================================================

interface OFFNutriments {
  ["energy-kcal_100g"]?: number;
  ["energy-kcal_serving"]?: number;
}

interface OFFProduct {
  code?: string;
  product_name?: string;
  product_name_pt?: string;
  brands?: string;
  image_front_small_url?: string;
  image_small_url?: string;
  image_url?: string;
  nutriments?: OFFNutriments;
}

// Heurística simples: nome parece português? (acentos ou palavras comuns PT).
function looksPortuguese(name: string): boolean {
  const lower = name.toLowerCase();
  if (/[áàâãéêíóôõúç]/.test(lower)) return true;
  return /\b(de|com|sem|leite|frango|arroz|feij|carne|queijo|p[ãa]o|integral|natural|sabor|iogurte|biscoito|presunto|peito)\b/.test(lower);
}

// Usa a busca clássica (boa relevância) com idioma PT. `brazilOnly` adiciona o
// filtro de país = Brasil, que faz os produtos virem com nomes em português.
async function fetchFromOFF(term: string, brazilOnly: boolean): Promise<OFFProduct[]> {
  let url =
    `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}` +
    `&search_simple=1&action=process&json=1&page_size=24&lc=pt` +
    `&fields=code,product_name,product_name_pt,brands,image_front_small_url,image_small_url,image_url,nutriments`;

  if (brazilOnly) {
    url += `&tagtype_0=countries&tag_contains_0=contains&tag_0=brasil`;
  }

  const res = await fetch(url, {
    headers: { "User-Agent": "LifeOS/1.0 (self-hosted personal app)" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return [];
  // A API pode devolver HTML em rate-limit; só parseia se for JSON.
  if (!(res.headers.get("content-type") || "").includes("json")) return [];
  const data = (await res.json()) as { products?: OFFProduct[] };
  return data.products || [];
}

export async function searchFoodProducts(query: string): Promise<FoodItem[]> {
  const term = query.trim();
  if (term.length < 2) return [];

  try {
    const userId = await requireUserId();
    const settings = await prisma.settings.findUnique({
      where: { userId },
      select: { foodApiEnabled: true },
    });
    // Desligado pelo usuário → não consulta a rede.
    if (settings && settings.foodApiEnabled === false) return [];

    // Prioriza produtos do Brasil (nomes em PT). Se vier vazio, busca global.
    let products = await fetchFromOFF(term, true);
    if (products.length === 0) {
      products = await fetchFromOFF(term, false);
    }

    const items: FoodItem[] = [];
    for (const p of products) {
      // Sempre prefere o nome em português quando existir.
      const name = (p.product_name_pt || p.product_name || "").trim();
      const kcal = p.nutriments?.["energy-kcal_100g"] ?? p.nutriments?.["energy-kcal_serving"];
      const image = p.image_front_small_url || p.image_small_url || p.image_url;
      if (!name || !kcal || kcal <= 0) continue;

      items.push({
        id: `off-${p.code || name}`,
        name: name.length > 60 ? `${name.slice(0, 57)}...` : name,
        emoji: "🍽️",
        calories: Math.round(kcal),
        unit: "100g",
        image,
        brand: p.brands?.split(",")[0]?.trim(),
        source: "OFF",
      });
    }

    // Remove duplicados por nome.
    const seen = new Set<string>();
    const unique = items.filter((i) => {
      const key = i.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Ordena nomes que parecem PT primeiro (empurra rótulos em inglês para o fim).
    unique.sort((a, b) => Number(looksPortuguese(b.name)) - Number(looksPortuguese(a.name)));

    return unique;
  } catch (error) {
    console.error("Erro na busca Open Food Facts:", error);
    return [];
  }
}
