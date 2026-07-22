"use server";

// Estimativa nutricional por IA (one-shot, sem chat): preenche kcal + macros
// de uma refeição a partir do texto, e recalcula em LOTE as refeições antigas
// registradas sem calorias (ex.: capturas de versões anteriores do sistema).
// Princípio do projeto: nada quebra sem IA — sempre devolve mensagem amigável.

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { getAiCallConfig, runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";
import { withDbRetry, friendlyDbError } from "@/lib/db-errors";

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

// Nome padrão da refeição pelo horário local — mata a fricção de escolher "Almoço"
// etc. no registro rápido. A IA pode devolver um título melhor; este é o fallback.
function mealTitleByHour(hour: number): string {
  if (hour >= 5 && hour < 11) return "Café da Manhã";
  if (hour >= 11 && hour < 15) return "Almoço";
  if (hour >= 15 && hour < 18) return "Lanche";
  if (hour >= 18 && hour < 22) return "Jantar";
  return "Ceia";
}

// Detecta a refeição citada no texto ("no almoço", "de janta", "café da manhã")
// para o registro rápido não depender só do horário. null = não citada.
function detectMealFromText(text: string): string | null {
  const t = text.toLowerCase();
  if (/caf[eé]\s*da\s*manh|desjejum/.test(t)) return "Café da Manhã";
  if (/p[oó]s[-\s]?treino/.test(t)) return "Pós-Treino";
  if (/almo[cç]|almocei/.test(t)) return "Almoço";
  if (/jant(a|ar|ei)/.test(t)) return "Jantar";
  if (/\bceia\b|ceei/.test(t)) return "Ceia";
  if (/lanch|merenda/.test(t)) return "Lanche";
  return null;
}

// Data relativa citada no texto: registra no dia certo em vez de sempre "hoje".
function detectDayOffset(text: string): number {
  const t = text.toLowerCase();
  if (/anteontem|antes de ontem|retrasad/.test(t)) return 2;
  if (/\bontem\b|ontem à noite|ontem de/.test(t)) return 1;
  return 0;
}

const VALID_MEAL_TYPES = new Set(["HEALTHY", "NEUTRAL", "TRASH"]);

// Prompt dedicado ao registro rápido: interpreta fala informal do dia a dia.
const QUICKLOG_SYSTEM =
  "Você é um assistente de nutrição (PT-BR) que registra refeições a partir de mensagens " +
  "informais, como a pessoa fala no dia a dia ('acabei de comer...', 'mandei um...', " +
  "'tomei um...', 'comi agora no almoço...'). Siga estas regras:\n" +
  "1. Ignore palavras de enchimento (acabei de comer, eu comi, agora, tipo, então, aí, meio que).\n" +
  "2. Extraia os alimentos e as quantidades ditas; quando a quantidade não for citada, ASSUMA uma porção típica brasileira.\n" +
  "3. No campo 'items', SEMPRE explicite a quantidade e a medida que você assumiu para CADA alimento — nunca escreva um alimento sem quantidade. " +
  "Separe os alimentos por vírgula, um por item, como um prato montado (ex.: '2 ovos mexidos, 1 colher de sopa de requeijão, 2 fatias de pão de forma').\n" +
  "4. Quando a quantidade veio em medida caseira (colher, concha, fatia, prato, copo, xícara), MANTENHA essa medida no texto e acrescente a estimativa em gramas/ml entre parênteses quando ajudar a entender a porção " +
  "(ex.: '1 colher de sopa de requeijão (~15g)', '1 concha de feijão (~120g)'). Se a pessoa NÃO disse a quantidade, deixe visível a porção que você assumiu (ex.: '1 prato de arroz (~4 colheres)').\n" +
  "5. Quantidades informais são porções realistas (ex.: '2 pizzas' = 2 fatias, a menos que diga 'inteira').\n" +
  "6. Se a mensagem citar a refeição (café da manhã, almoço, lanche, janta/jantar, ceia, pós-treino), use-a no título; senão infira pelo horário informado.\n" +
  "7. Classifique 'type': HEALTHY (comida de verdade/saudável), NEUTRAL (mista/equilibrada), TRASH (junk, fast-food, fritura, doce, ultraprocessado).\n" +
  "8. Nunca invente alimentos que não foram citados.\n" +
  "9. Se a mensagem indicar que a pessoa NÃO comeu (jejum, pulou refeição, 'não comi nada'), OU não descrever comida alguma, devolva items \"\" e calories 0.\n" +
  "10. Bebidas sem caloria (água, chá/café sem açúcar) têm calories 0 mas items preenchido — não são 'sem comida'.\n" +
  "11. Interprete números por extenso (duas, meia dúzia), medidas (200g, 1 prato, 1 colher) e comidas brasileiras/marcas (açaí, pão de queijo, coxinha, Big Mac).\n" +
  "Responda APENAS com JSON válido, sem comentários nem texto fora do JSON.";

export interface QuickLogResult {
  success: boolean;
  message: string;
  /** true quando foi registrado sem estimativa de IA (kcal 0, para completar depois). */
  needsCalories?: boolean;
}

/**
 * Registro RÁPIDO por linguagem natural: o usuário digita o que comeu ("2 ovos,
 * pão e café") e uma única chamada de IA estima título, alimentos, kcal, macros e
 * classificação — a refeição é gravada na hora, sem abrir o compositor de prato.
 *
 * Sem IA configurada ou se ela falhar, ainda GRAVA o texto cru (kcal 0) para não
 * perder a captura — o aviso "recalcular com IA" completa as calorias depois.
 * Princípio do projeto: nada quebra sem IA.
 */
export async function quickLogMeal(rawText: string): Promise<QuickLogResult> {
  try {
    const userId = await requireUserId();
    const text = rawText.trim().slice(0, 400);
    if (!text) return { success: false, message: "Escreva o que você comeu." };

    const now = new Date();
    // Título: a refeição citada no texto vence o horário (funciona até sem IA).
    const fallbackTitle = detectMealFromText(text) ?? mealTitleByHour(now.getHours());

    // Data: "ontem"/"anteontem" registram no dia certo (mantém a hora atual).
    const dayOffset = detectDayOffset(text);
    const mealDate = new Date(now);
    if (dayOffset > 0) mealDate.setDate(mealDate.getDate() - dayOffset);
    const dayPrefix = dayOffset === 1 ? "Ontem · " : dayOffset === 2 ? "Anteontem · " : "";

    const config = await getAiCallConfig(userId);

    // Sem IA: grava o texto cru para não perder a captura (completar kcal depois).
    if (!config.configured) {
      await withDbRetry(() => prisma.meal.create({
        data: { title: fallbackTitle, items: text, calories: 0, type: "NEUTRAL", date: mealDate, userId },
      }));
      revalidatePath("/health");
      revalidatePath("/health/nutrition");
      return {
        success: true,
        needsCalories: true,
        message: `${dayPrefix}Anotado em "${fallbackTitle}". Configure a IA (ou use Recalcular) para estimar as calorias.`,
      };
    }

    const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const text_ai = await runOneShotAi(
      userId,
      QUICKLOG_SYSTEM,
      `Formato da resposta (um único objeto JSON):\n` +
        `{"title":"<nome da refeição>","items":"<alimentos limpos com quantidade>",` +
        `"calories":<kcal inteiro>,"protein":<g>,"carbs":<g>,"fat":<g>,"type":"HEALTHY|NEUTRAL|TRASH"}\n\n` +
        `Exemplos:\n` +
        `"acabei de comer uma banana" (10:20) -> {"title":"Lanche","items":"1 banana","calories":90,"protein":1,"carbs":23,"fat":0,"type":"HEALTHY"}\n` +
        `"eu comi agora 2 pizza no almoço" (12:40) -> {"title":"Almoço","items":"2 fatias de pizza","calories":570,"protein":24,"carbs":66,"fat":22,"type":"TRASH"}\n` +
        `"tomei um café com leite e dois pães na chapa" (7:30) -> {"title":"Café da Manhã","items":"1 xícara de café com leite (~200ml), 2 pães na chapa","calories":430,"protein":12,"carbs":52,"fat":18,"type":"NEUTRAL"}\n` +
        `"2 ovos mexidos com requeijão e pão" (8:00) -> {"title":"Café da Manhã","items":"2 ovos mexidos, 1 colher de sopa de requeijão (~15g), 2 fatias de pão de forma","calories":420,"protein":20,"carbs":30,"fat":24,"type":"NEUTRAL"}\n` +
        `"mandei um big mac com fritas e uma coca" (13:10) -> {"title":"Almoço","items":"1 Big Mac, 1 batata frita média, 1 Coca-Cola 350ml","calories":1080,"protein":30,"carbs":130,"fat":48,"type":"TRASH"}\n` +
        `"jantei arroz, feijão, bife e salada" (20:00) -> {"title":"Jantar","items":"1 prato de arroz (~4 colheres), 1 concha de feijão (~120g), 1 bife (~120g), 1 pires de salada","calories":650,"protein":38,"carbs":70,"fat":22,"type":"HEALTHY"}\n` +
        `"dois pães de queijo e um açaí de 300ml" (16:00) -> {"title":"Lanche","items":"2 pães de queijo, 1 açaí 300ml","calories":520,"protein":10,"carbs":78,"fat":18,"type":"TRASH"}\n` +
        `"bebi só um copo d'água" (15:00) -> {"title":"Lanche","items":"1 copo de água","calories":0,"protein":0,"carbs":0,"fat":0,"type":"HEALTHY"}\n` +
        `"não comi nada ainda hoje" (11:00) -> {"title":"","items":"","calories":0,"protein":0,"carbs":0,"fat":0,"type":"NEUTRAL"}\n\n` +
        `Agora registre esta mensagem (horário atual ${hhmm}): "${text}"\n` +
        `Responda só com o JSON.`,
    );

    const parsed = text_ai ? parseJsonBlock<Record<string, unknown>>(text_ai) : null;

    // IA devolveu algo não-JSON → preserva o texto cru (não perde a captura).
    if (!parsed) {
      await withDbRetry(() => prisma.meal.create({
        data: { title: fallbackTitle, items: text, calories: 0, type: "NEUTRAL", date: mealDate, userId },
      }));
      revalidatePath("/health");
      revalidatePath("/health/nutrition");
      return {
        success: true,
        needsCalories: true,
        message: `${dayPrefix}Anotado em "${fallbackTitle}", mas a IA não estimou as calorias — use Recalcular.`,
      };
    }

    const aiItems = typeof parsed.items === "string" ? parsed.items.trim().slice(0, 300) : "";
    const cals = clampNumber(parsed.calories, 0, 6000); // 0..6000 (0 = água/sem caloria); null se inválido

    // Sem comida (jejum, "não comi", ou mensagem sem alimento): não registra nada.
    if (!aiItems && (cals === null || cals === 0)) {
      return {
        success: false,
        message: "Não identifiquei comida nessa mensagem. Tente algo como \"comi 2 ovos e um pão\".",
      };
    }

    const aiTitle = typeof parsed.title === "string" && parsed.title.trim()
      ? parsed.title.trim().slice(0, 60)
      : fallbackTitle;
    const aiType = typeof parsed.type === "string" && VALID_MEAL_TYPES.has(parsed.type.toUpperCase())
      ? parsed.type.toUpperCase()
      : "NEUTRAL";
    const kcal = cals ?? 0;               // itens sem número → grava 0 e sinaliza recalcular
    const needsKcal = cals === null;      // 0 explícito (água) é válido; null é que faltou

    await withDbRetry(() => prisma.meal.create({
      data: {
        title: aiTitle,
        items: aiItems || text,
        calories: kcal,
        protein: clampNumber(parsed.protein, 0, 500),
        carbs: clampNumber(parsed.carbs, 0, 800),
        fat: clampNumber(parsed.fat, 0, 500),
        type: aiType,
        date: mealDate,
        userId,
      },
    }));

    revalidatePath("/health");
    revalidatePath("/health/nutrition");

    if (needsKcal) {
      return {
        success: true,
        needsCalories: true,
        message: `${dayPrefix}Anotado (${aiTitle}), mas sem calorias — use Recalcular com IA.`,
      };
    }
    // Mostra o que a IA entendeu (itens) — confirmação instantânea, sem passo de revisão.
    const shownItems = aiItems || text;
    const shortItems = shownItems.length > 48 ? `${shownItems.slice(0, 48)}…` : shownItems;
    return { success: true, message: `${dayPrefix}${aiTitle}: ${shortItems} · ${kcal} kcal 🥗` };
  } catch (error) {
    console.error("Erro no registro rápido de refeição:", error);
    // Mostra a causa acionável (ex.: banco sem memória / offline) em vez de um
    // "Erro" genérico — o usuário sabe se vale tentar de novo já ou esperar.
    return { success: false, message: friendlyDbError(error) };
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
