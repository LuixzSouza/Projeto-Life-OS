"use server";

// Correção de REDAÇÃO estilo ENEM por IA — as 5 competências (0–200 cada,
// total 0–1000). Segue o princípio do projeto: nada quebra sem IA. Sem provedor
// configurado (ou se a IA falhar), devolve uma análise ESTRUTURAL local (contagem
// de linhas/palavras, conectivos, proposta de intervenção) para o aluno não ficar
// na mão. Não exige schema novo — a redação é salva como StudyNote pelo cliente.

import { requireUserId } from "@/lib/auth";
import { getAiCallConfig, runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";

export interface CompetencyScore {
  score: number;     // 0..200
  feedback: string;
}

export interface EssayGrade {
  total: number;               // 0..1000
  competencies: CompetencyScore[]; // 5 itens (C1..C5)
  strengths: string[];
  improvements: string[];
  summary: string;
  aiGraded: boolean;           // false = análise local (sem IA)
}

export interface GradeResponse {
  success: boolean;
  message: string;
  grade?: EssayGrade;
}

export const ENEM_COMPETENCIES = [
  "C1 — Domínio da norma culta (gramática, ortografia, concordância)",
  "C2 — Compreender o tema e aplicar repertório sociocultural (não fugir do tema)",
  "C3 — Selecionar e organizar argumentos em defesa de um ponto de vista",
  "C4 — Coesão: conectivos e articulação entre ideias e parágrafos",
  "C5 — Proposta de intervenção detalhada (agente, ação, meio, finalidade) e que respeite os direitos humanos",
];

function clampScore(v: unknown): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(200, Math.round(n / 20) * 20)); // ENEM pontua de 40 em 40; arredonda p/ 20
}

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

// Conectivos comuns — sinal grosseiro de coesão (competência 4) na análise local.
const CONNECTIVES = [
  "portanto", "contudo", "todavia", "entretanto", "porém", "além disso", "ademais",
  "dessa forma", "desse modo", "por conseguinte", "logo", "assim", "visto que",
  "uma vez que", "em suma", "por fim", "outrossim", "conquanto", "à vista disso",
];

// Análise local (sem IA): não pontua as competências (seria chute), mas dá um
// diagnóstico estrutural útil e honesto.
function localAnalysis(text: string): EssayGrade {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const lines = text.split("\n").filter((l) => l.trim().length > 0).length;
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).length;
  const low = text.toLowerCase();
  const usedConnectives = CONNECTIVES.filter((c) => low.includes(c));
  const hasIntervention = /(propon|proposta|intervenção|medida|solução|goverl?no|estado|ministério|escola|mídia|campanha)/i.test(low);

  const improvements: string[] = [];
  if (words < 150) improvements.push("A redação está curta — o ENEM espera ~25–30 linhas (150–400 palavras).");
  if (paragraphs < 4) improvements.push("Estruture em 4 parágrafos: introdução, 2 de desenvolvimento e conclusão.");
  if (usedConnectives.length < 3) improvements.push("Use mais conectivos (portanto, além disso, dessa forma…) para amarrar as ideias — melhora a coesão (C4).");
  if (!hasIntervention) improvements.push("A conclusão precisa de uma PROPOSTA DE INTERVENÇÃO clara (agente + ação + meio + finalidade) — é a competência 5.");

  const strengths: string[] = [];
  if (paragraphs >= 4) strengths.push("Boa divisão em parágrafos.");
  if (usedConnectives.length >= 3) strengths.push(`Uso de conectivos (${usedConnectives.slice(0, 4).join(", ")}…).`);
  if (hasIntervention) strengths.push("Há indícios de proposta de intervenção na conclusão.");

  return {
    total: 0,
    competencies: ENEM_COMPETENCIES.map((c) => ({ score: 0, feedback: c.split(" — ")[1] })),
    strengths: strengths.length ? strengths : ["Texto registrado para revisão."],
    improvements: improvements.length ? improvements : ["Estrutura básica ok — configure a IA para receber a nota por competência."],
    summary: `Análise estrutural (sem IA): ${words} palavras, ~${lines} linhas, ${paragraphs} parágrafos, ${usedConnectives.length} conectivos. Configure um provedor de IA em Configurações → Inteligência para receber a nota nas 5 competências.`,
    aiGraded: false,
  };
}

const SYSTEM = `Você é um corretor experiente de redação do ENEM. Avalie a redação dissertativo-argumentativa nas 5 competências oficiais, cada uma de 0 a 200 pontos (a soma é de 0 a 1000). Seja rigoroso e justo como a banca do ENEM. Competências:
${ENEM_COMPETENCIES.join("\n")}
Responda APENAS com JSON válido, em PT-BR, sem texto fora do JSON.`;

export async function gradeEnemEssay(input: { theme: string; text: string }): Promise<GradeResponse> {
  try {
    const userId = await requireUserId();
    const text = (input.text ?? "").trim();
    const theme = (input.theme ?? "").trim().slice(0, 300);
    if (text.length < 200) {
      return { success: false, message: "Escreva a redação completa (mínimo ~200 caracteres) antes de corrigir." };
    }

    const config = await getAiCallConfig(userId);
    if (!config.configured) {
      // Sem IA: devolve a análise local (não quebra) com aviso.
      return { success: true, message: "Sem IA configurada — segue uma análise estrutural.", grade: localAnalysis(text) };
    }

    const raw = await runOneShotAi(
      userId,
      SYSTEM,
      `TEMA: "${theme || "(não informado — avalie a aderência ao tema com cautela)"}"\n\n` +
        `REDAÇÃO:\n"""${text.slice(0, 6000)}"""\n\n` +
        `Responda só com este JSON:\n` +
        `{"competencias":[{"nome":"C1","nota":<0-200>,"feedback":"<curto>"},{"nome":"C2","nota":<0-200>,"feedback":"<curto>"},{"nome":"C3","nota":<0-200>,"feedback":"<curto>"},{"nome":"C4","nota":<0-200>,"feedback":"<curto>"},{"nome":"C5","nota":<0-200>,"feedback":"<curto>"}],` +
        `"pontos_fortes":["..."],"pontos_a_melhorar":["..."],"resumo":"<parágrafo de avaliação geral>"}`,
    );

    const parsed = raw ? parseJsonBlock<{
      competencias?: { nome?: string; nota?: unknown; feedback?: unknown }[];
      pontos_fortes?: unknown[];
      pontos_a_melhorar?: unknown[];
      resumo?: unknown;
    }>(raw) : null;

    if (!parsed || !Array.isArray(parsed.competencias) || parsed.competencias.length === 0) {
      // IA respondeu algo inesperado: cai na análise local para não perder a captura.
      return { success: true, message: "A IA não retornou uma nota utilizável — segue a análise estrutural.", grade: localAnalysis(text) };
    }

    const competencies: CompetencyScore[] = ENEM_COMPETENCIES.map((label, i) => {
      const c = parsed.competencias![i];
      return {
        score: clampScore(c?.nota),
        feedback: typeof c?.feedback === "string" && c.feedback.trim() ? c.feedback.trim() : label.split(" — ")[1],
      };
    });
    const total = competencies.reduce((s, c) => s + c.score, 0);

    const asStrings = (arr: unknown[] | undefined): string[] =>
      Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 6) : [];

    return {
      success: true,
      message: `Redação corrigida: ${total}/1000.`,
      grade: {
        total,
        competencies,
        strengths: asStrings(parsed.pontos_fortes),
        improvements: asStrings(parsed.pontos_a_melhorar),
        summary: typeof parsed.resumo === "string" ? parsed.resumo.trim() : "",
        aiGraded: true,
      },
    };
  } catch (error) {
    console.error("Erro ao corrigir redação:", error);
    return { success: false, message: "Erro ao corrigir a redação." };
  }
}
