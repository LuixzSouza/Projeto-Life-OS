"use server";

// Estimativa nutricional por IA (one-shot, sem chat): preenche kcal + macros
// de uma refeição a partir do texto, e recalcula em LOTE as refeições antigas
// registradas sem calorias (ex.: capturas de versões anteriores do sistema).
// Princípio do projeto: nada quebra sem IA — sempre devolve mensagem amigável.

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { getAiCallConfig, runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";

export interface MealNutritionEstimate {
  calories: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

interface EstimateResponse {
  success: boolean;
  message: string;
  estimate?: MealNutritionEstimate;
}

interface RecalcResponse {
  success: boolean;
  message: string;
  updated: number;
}

// A IA responde em texto livre às vezes com cerca de código — extrai o
// primeiro bloco JSON válido (objeto ou array) da resposta.
function parseJsonBlock<T>(raw: string): T | null {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.search(/[[{]/);
  if (start === -1) return null;
  const open = cleaned[start];
  const close = open === "[" ? "]" : "}";
  const end = cleaned.lastIndexOf(close);
  if (end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

// Sanitiza um número vindo da IA dentro de uma faixa plausível; fora dela → null.
function clampNumber(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? parseFloat(value) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n * 10) / 10;
}

const ESTIMATE_SYSTEM =
  "Você é um nutricionista que estima valores nutricionais de refeições descritas em texto livre (PT-BR). " +
  "Use porções típicas brasileiras quando a quantidade não for citada. " +
  "Responda APENAS com JSON válido, sem comentários nem texto extra.";

export async function estimateMealNutrition(input: { title: string; items: string }): Promise<EstimateResponse> {
  try {
    const userId = await requireUserId();
    const description = `${input.title}${input.items ? ` — ${input.items}` : ""}`.trim().slice(0, 600);
    if (!description) return { success: false, message: "Descreva a refeição antes de estimar." };

    const config = await getAiCallConfig(userId);
    if (!config.configured) {
      return { success: false, message: config.error ?? "Configure um provedor de IA em Configurações → Inteligência." };
    }

    const text = await runOneShotAi(
      userId,
      ESTIMATE_SYSTEM,
      `Estime a refeição: "${description}".\n` +
        `Responda só com: {"calories": <kcal inteiro>, "protein": <g>, "carbs": <g>, "fat": <g>}`,
    );
    if (!text) return { success: false, message: "A IA não respondeu — tente novamente." };

    const parsed = parseJsonBlock<Record<string, unknown>>(text);
    const calories = parsed ? clampNumber(parsed.calories, 1, 6000) : null;
    if (!parsed || calories === null) {
      return { success: false, message: "Não consegui interpretar a estimativa da IA." };
    }

    return {
      success: true,
      message: "Estimativa pronta — revise antes de salvar.",
      estimate: {
        calories: Math.round(calories),
        protein: clampNumber(parsed.protein, 0, 500),
        carbs: clampNumber(parsed.carbs, 0, 800),
        fat: clampNumber(parsed.fat, 0, 500),
      },
    };
  } catch (error) {
    console.error("Erro ao estimar nutrição com IA:", error);
    return { success: false, message: "Erro ao estimar com IA." };
  }
}

// Lote: 1 chamada de IA para até 25 refeições sem calorias. Atualiza só o que
// veio plausível; macros existentes nunca são sobrescritas.
const RECALC_BATCH = 25;

export async function recalculateMealsWithoutCalories(): Promise<RecalcResponse> {
  try {
    const userId = await requireUserId();

    const meals = await prisma.meal.findMany({
      where: { userId, OR: [{ calories: null }, { calories: { lte: 0 } }] },
      orderBy: { date: "desc" },
      take: RECALC_BATCH,
      select: { id: true, title: true, items: true, protein: true, carbs: true, fat: true },
    });
    if (meals.length === 0) {
      return { success: true, message: "Nenhuma refeição sem calorias — tudo em dia! 🎉", updated: 0 };
    }

    const config = await getAiCallConfig(userId);
    if (!config.configured) {
      return { success: false, message: config.error ?? "Configure um provedor de IA em Configurações → Inteligência.", updated: 0 };
    }

    const list = meals
      .map((m, i) => `${i + 1}. ${m.title}${m.items ? ` — ${m.items.slice(0, 200)}` : ""}`)
      .join("\n");
    const text = await runOneShotAi(
      userId,
      ESTIMATE_SYSTEM,
      `Estime cada refeição da lista numerada:\n${list}\n\n` +
        `Responda só com um array JSON, um item por refeição, na mesma ordem:\n` +
        `[{"i": 1, "calories": <kcal inteiro>, "protein": <g>, "carbs": <g>, "fat": <g>}, ...]`,
    );
    if (!text) return { success: false, message: "A IA não respondeu — tente novamente.", updated: 0 };

    const parsed = parseJsonBlock<Array<Record<string, unknown>>>(text);
    if (!parsed || !Array.isArray(parsed)) {
      return { success: false, message: "Não consegui interpretar a resposta da IA.", updated: 0 };
    }

    let updated = 0;
    for (const item of parsed) {
      const idx = clampNumber(item.i, 1, meals.length);
      const calories = clampNumber(item.calories, 1, 6000);
      if (idx === null || calories === null) continue;
      const meal = meals[Math.round(idx) - 1];

      const r = await prisma.meal.updateMany({
        where: { id: meal.id, userId },
        data: {
          calories: Math.round(calories),
          // Preenche macros só onde estavam vazias — registro manual prevalece.
          protein: meal.protein ?? clampNumber(item.protein, 0, 500),
          carbs: meal.carbs ?? clampNumber(item.carbs, 0, 800),
          fat: meal.fat ?? clampNumber(item.fat, 0, 500),
        },
      });
      updated += r.count;
    }

    revalidatePath("/health");
    revalidatePath("/health/nutrition");

    if (updated === 0) {
      return { success: false, message: "A IA respondeu, mas nenhuma estimativa veio utilizável.", updated: 0 };
    }
    const rest = meals.length === RECALC_BATCH ? " Pode haver mais — rode de novo para o próximo lote." : "";
    return { success: true, message: `${updated} de ${meals.length} refeições recalculadas com IA.${rest}`, updated };
  } catch (error) {
    console.error("Erro ao recalcular refeições com IA:", error);
    return { success: false, message: "Erro ao recalcular refeições.", updated: 0 };
  }
}
