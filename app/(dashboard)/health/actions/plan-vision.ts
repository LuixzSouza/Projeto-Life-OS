"use server";

// Importar ficha de treino POR FOTO (IA de visão). O usuário fotografa a ficha
// impressa / print que o personal mandou e a IA extrai divisões, exercícios e
// metas tipadas — eliminando a digitação manual. Reusa o provedor/chave que o
// usuário já configurou (runOneShotAi) e SEMPRE sanitiza a saída pelo mesmo
// parser defensivo das fichas normais (parsePlanDivisions), então nada quebra
// se a IA devolver lixo. Sem IA configurada → mensagem clara, sem exceção.

import { requireUserId } from "@/lib/auth";
import { runOneShotAi, getAiCallConfig } from "@/app/(dashboard)/ai/actions/oneshot";
import { groupOfExercise, MUSCLE_META } from "@/components/health/gym/exercise-db";
import { guessEquipment, type Equipment } from "@/components/health/gym/session/session-types";
import {
  coerceGoal,
  parsePlanDivisions,
  stringifyPlanContent,
  type PlanDivision,
} from "@/components/health/gym/session/plan-types";
import type { ImportPlanResult } from "@/components/health/gym/session/plan-import-types";

const GROUP_KEYS = Object.keys(MUSCLE_META); // "Peito", "Costas"...

const SYSTEM_PROMPT = `Você é um leitor de fichas de treino de academia. Recebe FOTOS de uma ficha (impressa, manuscrita ou print de app) e extrai a estrutura em JSON ESTRITO.

Regras:
- Responda APENAS com JSON válido, sem texto antes/depois, sem crases de markdown.
- Estrutura exata:
{
  "name": "string (título curto da ficha, ex: 'Hipertrofia A/B/C'; invente um bom se não houver)",
  "goal": "hypertrophy | strength | endurance | general",
  "divisions": [
    {
      "label": "string (ex: 'A — Peito e Tríceps'; se a ficha não divide, use 'Treino A')",
      "muscleGroups": ["um ou mais de: ${GROUP_KEYS.join(", ")}"],
      "exercises": [
        {
          "name": "string em português (ex: 'Supino reto com barra')",
          "sets": number (séries; padrão 3 se ilegível),
          "minReps": number (menor da faixa; se '12' fixo, min=max=12),
          "maxReps": number (maior da faixa),
          "rir": number opcional (reps em reserva, 0-6) — só se a ficha indicar,
          "rpe": number opcional (esforço percebido, 5-10) — só se a ficha indicar,
          "note": "string opcional (técnica/observação: drop-set, unilateral, descanso...)"
        }
      ]
    }
  ]
}
- Preserve a ORDEM dos exercícios como na ficha.
- Se a foto tiver várias divisões (A, B, C...), gere uma entrada por divisão.
- NÃO invente exercícios que não estão na foto. Se algo estiver ilegível, use o melhor palpite razoável.
- Nomes de exercício SEMPRE em português do Brasil.`;

interface RawExercise {
  name?: unknown;
  sets?: unknown;
  minReps?: unknown;
  maxReps?: unknown;
  reps?: unknown;
  rir?: unknown;
  rpe?: unknown;
  note?: unknown;
  equipment?: unknown;
  group?: unknown;
}
interface RawDivision {
  label?: unknown;
  muscleGroups?: unknown;
  exercises?: unknown;
}
interface RawPlan {
  name?: unknown;
  goal?: unknown;
  divisions?: unknown;
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const int = (v: unknown, d: number): number => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : d;
};

// Extrai o primeiro objeto JSON de um texto que pode vir com crases/preâmbulo.
function extractJson(text: string): unknown | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

// JSON "achatado" da IA → forma de divisão que o parser oficial entende.
// O grupo/equipamento faltantes são inferidos localmente para casar imagens/capas.
function toDivisions(raw: RawPlan): PlanDivision[] {
  const list = Array.isArray(raw.divisions) ? (raw.divisions as RawDivision[]) : [];
  const divisions = list.map((d) => {
    const exList = Array.isArray(d.exercises) ? (d.exercises as RawExercise[]) : [];
    const exercises = exList
      .map((e) => {
        const name = str(e.name);
        if (!name) return null;
        const sets = int(e.sets, 3);
        // Faixa de reps: aceita minReps/maxReps OU um "reps" único ("8-12" / "12").
        let minReps = int(e.minReps, 0);
        let maxReps = int(e.maxReps, 0);
        if (!minReps || !maxReps) {
          const repsStr = str(e.reps);
          const m = repsStr.match(/(\d+)\s*[-–a]\s*(\d+)/);
          if (m) { minReps = parseInt(m[1], 10); maxReps = parseInt(m[2], 10); }
          else { const single = int(e.reps ?? e.maxReps ?? e.minReps, 10); minReps = minReps || single; maxReps = maxReps || single; }
        }
        const equipment = (str(e.equipment) as Equipment) || guessEquipment(name);
        const group = str(e.group) || groupOfExercise(name);
        const rir = typeof e.rir === "number" ? e.rir : undefined;
        const rpe = typeof e.rpe === "number" ? e.rpe : undefined;
        const intensity = rpe != null ? { type: "RPE", value: rpe } : rir != null ? { type: "RIR", value: rir } : undefined;
        return {
          name,
          group,
          equipment,
          note: str(e.note) || undefined,
          target: { sets, minReps: minReps || 8, maxReps: maxReps || minReps || 12, intensity },
        };
      })
      .filter((x) => x !== null);
    const groups = Array.isArray(d.muscleGroups)
      ? (d.muscleGroups as unknown[]).map(str).filter((g) => GROUP_KEYS.includes(g))
      : [];
    return { label: str(d.label) || "Treino A", muscleGroups: groups, exercises };
  });
  // Sanitiza pelo MESMO caminho das fichas normais (ranges, ids, defaults).
  return parsePlanDivisions(stringifyPlanContent(divisions as unknown as PlanDivision[]));
}

/**
 * Lê uma ou mais fotos (data URLs) de uma ficha e devolve o plano estruturado.
 * NÃO salva — a UI mostra uma prévia editável e o usuário confirma.
 */
export async function importPlanFromPhoto(images: string[]): Promise<ImportPlanResult> {
  try {
    const userId = await requireUserId();

    const valid = (images || []).filter((u) => typeof u === "string" && u.startsWith("data:image/")).slice(0, 4);
    if (valid.length === 0) return { success: false, message: "Nenhuma foto válida recebida." };

    const config = await getAiCallConfig(userId);
    if (!config.configured) {
      return { success: false, message: config.error || "Configure uma IA com visão nas Configurações para importar por foto." };
    }

    const text = await runOneShotAi(
      userId,
      SYSTEM_PROMPT,
      "Extraia a ficha de treino desta(s) foto(s) no formato JSON pedido.",
      valid,
    );
    if (!text) return { success: false, message: "A IA não conseguiu ler a foto. Tente uma imagem mais nítida e bem enquadrada." };

    const parsed = extractJson(text) as RawPlan | null;
    if (!parsed) return { success: false, message: "Não consegui interpretar a ficha da foto. Tente outra imagem." };

    const divisions = toDivisions(parsed);
    const totalEx = divisions.reduce((acc, d) => acc + d.exercises.length, 0);
    if (totalEx === 0) return { success: false, message: "Não encontrei exercícios legíveis na foto. Tente uma imagem mais nítida." };

    const name = str(parsed.name) || "Ficha importada";
    const goal = coerceGoal(parsed.goal);
    return {
      success: true,
      message: `Li ${totalEx} exercício${totalEx > 1 ? "s" : ""} em ${divisions.length} divisã${divisions.length > 1 ? "es" : "o"}. Revise e salve!`,
      plan: { name, goal, divisions },
    };
  } catch (error) {
    console.error("Erro ao importar ficha por foto:", error);
    return { success: false, message: "Falha ao ler a ficha. Tente novamente." };
  }
}
