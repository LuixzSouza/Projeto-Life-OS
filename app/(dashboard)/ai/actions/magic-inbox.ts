"use server";

// Inbox Mágica (#19/#20 do roadmap): UMA caixa global ("despeje aqui") —
// "50 mercado, dentista sexta 15h, ideia: app de receitas" vira gasto + evento
// + nota com preview confirmável. IA classifica; sem IA, heurística local
// resolve os casos comuns (nada quebra sem IA).

import { requireUserId } from "@/lib/auth";
import { runOneShotAi } from "./oneshot";
import { mutateModule } from "@/lib/ai-data";
import { moduleInfo } from "@/lib/ai-help";
import type { AIModule } from "./types";

// Módulos que a Inbox pode criar (subset seguro de criação direta).
const INBOX_MODULES = ["FINANCE", "TASKS", "AGENDA", "STUDIES", "NUTRITION", "HEALTH"] as const;
type InboxModule = (typeof INBOX_MODULES)[number];

export interface MagicItem {
  module: InboxModule;
  title: string;
  value?: number;
  category?: string;
  description?: string;
  date?: string; // YYYY-MM-DD
}

export interface MagicParseResult {
  success: boolean;
  source: "ai" | "local";
  items: MagicItem[];
  error?: string;
}

export interface MagicConfirmResult {
  success: boolean;
  created: { module: string; label: string; href: string }[];
  errors: string[];
}

function isInboxModule(m: unknown): m is InboxModule {
  return typeof m === "string" && (INBOX_MODULES as readonly string[]).includes(m);
}

function sanitizeItems(raw: unknown): MagicItem[] {
  if (!Array.isArray(raw)) return [];
  const out: MagicItem[] = [];
  for (const it of raw.slice(0, 10)) {
    if (!it || typeof it !== "object") continue;
    const o = it as Record<string, unknown>;
    if (!isInboxModule(o.module) || typeof o.title !== "string" || !o.title.trim()) continue;
    out.push({
      module: o.module,
      title: o.title.trim().slice(0, 120),
      value: typeof o.value === "number" && Number.isFinite(o.value) ? o.value : undefined,
      category: typeof o.category === "string" ? o.category.slice(0, 40) : undefined,
      description: typeof o.description === "string" ? o.description.slice(0, 300) : undefined,
      date: typeof o.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : undefined,
    });
  }
  return out;
}

/** Heurística local: cobre os padrões mais comuns sem IA. */
function localParse(text: string): MagicItem[] {
  const segments = text
    .split(/[\n;]+|,(?![0-9])/) // vírgula não quebra decimais ("50,90")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);

  return segments.map((seg): MagicItem => {
    // "50 mercado" / "R$ 49,90 farmácia" → gasto
    const money = seg.match(/^r?\$?\s*(\d+(?:[.,]\d{1,2})?)\s+(.{2,})$/i);
    if (money) {
      return { module: "FINANCE", title: money[2].trim(), value: Number(money[1].replace(",", ".")), category: "EXPENSE" };
    }
    // "ideia: ..." / "nota: ..." → anotação (Entrada dos Estudos)
    const note = seg.match(/^(?:ideia|nota|anota(?:ção|cao))\s*:\s*(.+)$/i);
    if (note) {
      return { module: "STUDIES", title: note[1].trim().slice(0, 80), description: note[1].trim() };
    }
    // horário explícito ("15h", "15:30") → evento
    if (/\b\d{1,2}(:\d{2})?h?\b/.test(seg) && /\b(amanh[ãa]|hoje|segunda|ter[çc]a|quarta|quinta|sexta|s[áa]bado|domingo|\d{1,2}\/\d{1,2})\b/i.test(seg)) {
      return { module: "AGENDA", title: seg };
    }
    // padrão: vira tarefa
    return { module: "TASKS", title: seg };
  });
}

const PARSE_SYSTEM = `Você é o classificador da Inbox Mágica do Life OS. O usuário despeja texto livre; você devolve APENAS um array JSON (sem cercas, sem comentário) de registros a criar. Cada item: {"module":"FINANCE|TASKS|AGENDA|STUDIES|NUTRITION|HEALTH","title":"...","value":num?,"category":"...?","description":"...?","date":"YYYY-MM-DD?"}.
Regras de mapeamento: FINANCE=gasto/receita (title=descrição, value=valor, category=EXPENSE|INCOME) · TASKS=tarefa (date=vencimento) · AGENDA=evento com dia/hora (date) · STUDIES=ideia/nota (title+description) · NUTRITION=comida (title, value=kcal se citado, category=BREAKFAST|LUNCH|SNACK|DINNER) · HEALTH=treino (title, value=minutos). Datas relativas: resolva usando a data de hoje informada. Máximo 10 itens. Se nada fizer sentido, devolva [].`;

export async function parseMagicCapture(text: string): Promise<MagicParseResult> {
  const userId = await requireUserId();
  // Teto de segurança (token/custo) — manter em sincronia com INBOX_CHAR_LIMIT do client.
  const clean = text.trim().slice(0, 2000);
  if (!clean) return { success: false, source: "local", items: [], error: "Escreva (ou fale) alguma coisa primeiro." };

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const aiRaw = await runOneShotAi(userId, PARSE_SYSTEM, `Hoje é ${todayIso} (${today.toLocaleDateString("pt-BR", { weekday: "long" })}).\n\nDespejo do usuário:\n${clean}`);
  if (aiRaw) {
    try {
      const fenced = aiRaw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      const match = fenced.match(/\[[\s\S]*\]/);
      const items = sanitizeItems(JSON.parse(match ? match[0] : fenced));
      if (items.length > 0) return { success: true, source: "ai", items };
    } catch { /* cai para heurística local */ }
  }

  const items = localParse(clean);
  return items.length > 0
    ? { success: true, source: "local", items }
    : { success: false, source: "local", items: [], error: "Não consegui identificar registros nesse texto." };
}

export async function confirmMagicCapture(items: MagicItem[]): Promise<MagicConfirmResult> {
  const userId = await requireUserId();
  const safe = sanitizeItems(items);
  const created: MagicConfirmResult["created"] = [];
  const errors: string[] = [];

  for (const item of safe) {
    const result = await mutateModule(userId, {
      module: item.module as AIModule,
      action: "CREATE",
      title: item.title,
      value: item.value,
      category: item.category,
      description: item.description,
      date: item.date,
    });
    if (result.ok) {
      const info = moduleInfo(item.module);
      created.push({ module: info.name, label: item.title, href: info.href });
    } else {
      errors.push(`${item.title}: ${result.summary}`);
    }
  }
  return { success: created.length > 0, created, errors };
}
