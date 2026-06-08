"use client";

// Import/Export de FICHAS de treino (Plano → Divisões A/B/C → Exercícios + Metas).
// Mesma filosofia do routine-share (cada usuário com seu banco, sem tabela central),
// MAS uma ficha inteira gera um JSON bem maior que uma rotina avulsa: se fosse só
// Base64, o link passaria de 2.000 chars e o WhatsApp/navegador truncaria o URL.
// Por isso comprimimos com lz-string (compressToEncodedURIComponent) — ~50-70% menor
// e já URL-safe. Ainda enxugamos o payload removendo os ids (regenerados na importação).

import LZString from "lz-string";
import {
  coerceGoal,
  parsePlanDivisions,
  type PlanDivision,
  type PlanGoal,
} from "./plan-types";

/** Ficha "no fio": só o essencial (sem ids, sem datas). */
export interface SharedPlan {
  name: string;
  goal: PlanGoal;
  divisions: PlanDivision[];
}

interface PlanBundle {
  v: 1;
  plans: SharedPlanWire[];
}

// Formato compacto: divisões/exercícios SEM id (o destino gera ids novos, evitando
// colisão) e omitindo campos vazios. lz-string deduplica as chaves repetidas, então
// não vale a pena encurtá-las à mão — mantemos legível.
interface ExerciseWire {
  name: string;
  group?: string;
  equipment?: string;
  target: PlanDivision["exercises"][number]["target"];
  note?: string;
}
interface DivisionWire {
  label: string;
  muscleGroups: string[];
  defaultRestSeconds: number;
  exercises: ExerciseWire[];
}
interface SharedPlanWire {
  name: string;
  goal: PlanGoal;
  divisions: DivisionWire[];
}

function toWire(plan: SharedPlan): SharedPlanWire {
  return {
    name: plan.name,
    goal: plan.goal,
    divisions: plan.divisions.map((d) => ({
      label: d.label,
      muscleGroups: d.muscleGroups,
      defaultRestSeconds: d.defaultRestSeconds,
      exercises: d.exercises.map((e) => ({
        name: e.name,
        group: e.group,
        equipment: e.equipment,
        target: e.target,
        note: e.note,
      })),
    })),
  };
}

/** Codifica uma ou mais fichas num token comprimido + URL-safe. */
export function encodePlans(plans: SharedPlan[]): string {
  const bundle: PlanBundle = { v: 1, plans: plans.map(toWire) };
  return LZString.compressToEncodedURIComponent(JSON.stringify(bundle));
}

/** Decodifica e SANITIZA um token (ou link com ?planimport=...). Null se inválido. */
export function decodePlans(input: string): SharedPlan[] | null {
  try {
    let code = input.trim();
    // Aceita colar o link inteiro: extrai ?planimport= / &planimport=.
    const m = code.match(/[?&]planimport=([^&\s]+)/);
    if (m) code = m[1];
    code = code.replace(/\s+/g, "");
    if (!code) return null;
    // O link pode chegar com o token escapado (encodeURIComponent no buildPlanShareLink);
    // desfaz isso sem quebrar tokens crus colados (que não têm %).
    try {
      code = decodeURIComponent(code);
    } catch {
      /* token cru sem escapes — segue como está */
    }
    const json = LZString.decompressFromEncodedURIComponent(code);
    if (!json) return null;
    const parsed = JSON.parse(json) as unknown;
    const rec = parsed as Record<string, unknown>;
    const list = Array.isArray(rec?.plans) ? rec.plans : Array.isArray(parsed) ? (parsed as unknown[]) : null;
    if (!list) return null;
    const out: SharedPlan[] = [];
    for (const raw of list) {
      const r = (typeof raw === "object" && raw ? raw : {}) as Record<string, unknown>;
      const name = typeof r.name === "string" ? r.name.trim() : "";
      if (!name) continue;
      const goal = coerceGoal(r.goal);
      // Reaproveita o sanitizador da coluna `content` (gera ids, corrige metas fora do range).
      const divisions: PlanDivision[] = parsePlanDivisions(JSON.stringify({ divisions: r.divisions }));
      if (divisions.length === 0) continue;
      out.push({ name, goal, divisions });
    }
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/** Monta o link compartilhável que abre o app e importa a(s) ficha(s). */
export function buildPlanShareLink(plans: SharedPlan[]): string {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  // encodeURIComponent garante que o eventual "+" do alfabeto do lz-string não vire
  // espaço em clients que form-decodam a query; o decode acima desfaz na importação.
  return `${origin}/health/gym?planimport=${encodeURIComponent(encodePlans(plans))}`;
}
