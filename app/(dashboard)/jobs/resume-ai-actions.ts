"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { runOneShotAi } from "@/app/(dashboard)/ai/actions/oneshot";
import { PortfolioData, INITIAL_PORTFOLIO } from "@/types/portfolio";
import type { ResumeActionResult } from "./resume-actions";

// ============================================================================
// ASSISTENTE DE CURRÍCULO (IA) — polir textos, estruturar "brain dump" e revisar
// o CV inteiro. Reusa runOneShotAi (provedor/chaves do usuário) e SEMPRE devolve
// erro amigável em vez de quebrar: a IA aqui é assistiva, o preenchimento manual
// continua funcionando sem ela.
// ============================================================================

export type AiTextResult =
  | { success: true; content: string }
  | { success: false; error: string };

// Tipo de campo que estamos polindo — muda o tom/estrutura da reescrita.
export type PolishKind =
  | "about-short"
  | "about-long"
  | "experience-summary"
  | "experience-achievements"
  | "project-problem"
  | "project-solution"
  | "project-impact"
  | "generic";

const POLISH_INSTRUCTIONS: Record<PolishKind, string> = {
  "about-short":
    "Reescreva como um resumo profissional de 2 a 3 frases (headline pessoal). Direto, em primeira pessoa implícita (sem 'eu sou'), destacando senioridade, especialidade e maior diferencial.",
  "about-long":
    "Reescreva como uma bio profissional de 1 parágrafo denso (4 a 6 frases), fluida e envolvente, cobrindo trajetória, foco técnico e o valor que a pessoa entrega.",
  "experience-summary":
    "Reescreva como um resumo de responsabilidade de 1 a 2 frases, com verbos de ação no passado e foco no escopo e no impacto do trabalho (não em tarefas genéricas).",
  "experience-achievements":
    "Reescreva como uma LISTA de conquistas, UMA POR LINHA (sem marcadores, sem numeração). Cada linha começa com verbo de ação forte e, quando possível, carrega uma MÉTRICA concreta (%, tempo, R$, volume). Máximo 5 linhas. Não invente números que não estejam no texto original.",
  "project-problem":
    "Reescreva como a descrição do PROBLEMA que o projeto resolve, em 1 a 2 frases claras e específicas.",
  "project-solution":
    "Reescreva como a descrição da SOLUÇÃO técnica, em 1 a 2 frases, citando a abordagem/arquitetura.",
  "project-impact":
    "Reescreva como o IMPACTO/resultado do projeto, em 1 frase com métrica ou resultado tangível quando houver.",
  generic:
    "Reescreva de forma mais profissional, clara e concisa, mantendo o sentido original.",
};

/**
 * Polir/reescrever um único campo de texto do currículo. `context` traz pistas
 * (cargo, empresa, stack) para a IA calibrar o tom sem inventar fatos.
 */
export async function polishResumeText(input: {
  kind: PolishKind;
  text: string;
  context?: string;
}): Promise<AiTextResult> {
  const userId = await requireUserId();

  const text = input.text?.trim();
  if (!text) return { success: false, error: "Escreva algo antes de pedir para a IA polir." };

  const instruction = POLISH_INSTRUCTIONS[input.kind] ?? POLISH_INSTRUCTIONS.generic;

  const system =
    "Você é um redator sênior de currículos técnicos no Brasil (português do Brasil). " +
    "Melhora o texto do candidato sem inventar experiências, números ou tecnologias que não estejam no original. " +
    "Responda APENAS com o texto reescrito — sem introdução, sem aspas, sem comentários. " +
    instruction;

  const user =
    (input.context ? `Contexto: ${input.context}\n\n` : "") +
    `Texto original:\n${text}`;

  const out = await runOneShotAi(userId, system, user);
  if (!out) return { success: false, error: "IA indisponível. Verifique a configuração em Configurações → Inteligência." };

  return { success: true, content: out.trim() };
}

// Forma estruturada de uma experiência vinda do "brain dump" (sem id — o client gera).
export interface ParsedExperience {
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  location: string;
  summary: string;
  achievements: string[];
  stack: string[];
}

export type ParseExperienceResult =
  | { success: true; items: ParsedExperience[] }
  | { success: false; error: string };

// Extrai o primeiro bloco JSON (array/objeto) de uma resposta de IA, tolerando
// cercas ```json e texto ao redor.
function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/(\[[\s\S]*\]|\{[\s\S]*\})/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(asString).filter(Boolean);
  if (typeof v === "string") {
    return v.split(/\n|,|;/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function coerceExperience(raw: unknown): ParsedExperience | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const exp: ParsedExperience = {
    company: asString(o.company),
    role: asString(o.role),
    startDate: asString(o.startDate),
    endDate: asString(o.endDate),
    location: asString(o.location),
    summary: asString(o.summary),
    achievements: asStringArray(o.achievements),
    stack: asStringArray(o.stack),
  };
  // Só vale se pelo menos empresa OU cargo veio — senão é ruído.
  if (!exp.company && !exp.role) return null;
  return exp;
}

/**
 * "Brain dump": recebe um texto livre/bagunçado e devolve uma ou mais
 * experiências estruturadas para preencher a seção. Não persiste — o client
 * revisa e adiciona ao formulário.
 */
export async function parseExperienceFromText(text: string): Promise<ParseExperienceResult> {
  const userId = await requireUserId();

  const clean = text?.trim();
  if (!clean) return { success: false, error: "Cole ou escreva algo para a IA estruturar." };

  const system =
    "Você é um assistente que estrutura experiências profissionais para um currículo, em português do Brasil. " +
    "A partir do texto livre do usuário, extraia UMA OU MAIS experiências e responda APENAS com um ARRAY JSON válido, sem comentários nem cercas de código. " +
    "Cada item tem exatamente estes campos: " +
    '{"company": string, "role": string, "startDate": string, "endDate": string, "location": string, "summary": string, "achievements": string[], "stack": string[]}. ' +
    "Regras: use SÓ informações presentes no texto (não invente empresas, datas ou tecnologias); " +
    "campos ausentes = string vazia \"\" ou array vazio []; " +
    "'endDate' deve ser \"Atual\" se o texto indicar emprego vigente; " +
    "'summary' = 1 a 2 frases com verbos de ação; " +
    "'achievements' = frases curtas de impacto (com métrica quando houver); " +
    "'stack' = tecnologias citadas.";

  const out = await runOneShotAi(userId, system, `Texto do usuário:\n${clean}`);
  if (!out) return { success: false, error: "IA indisponível. Verifique a configuração em Configurações → Inteligência." };

  const parsed = extractJson(out);
  const rawItems = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  const items = rawItems.map(coerceExperience).filter((x): x is ParsedExperience => x !== null);

  if (items.length === 0) {
    return { success: false, error: "Não consegui estruturar esse texto. Tente descrever cargo, empresa e período." };
  }
  return { success: true, items };
}

// Forma estruturada de um projeto vindo do "brain dump" (sem id — o client gera).
export interface ParsedProject {
  title: string;
  role: string;
  duration: string;
  problem: string;
  solution: string;
  impact: string;
  stack: string[];
  liveLink: string;
  repoLink: string;
}

export type ParseProjectResult =
  | { success: true; items: ParsedProject[] }
  | { success: false; error: string };

function coerceProject(raw: unknown): ParsedProject | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const proj: ParsedProject = {
    title: asString(o.title),
    role: asString(o.role),
    duration: asString(o.duration),
    problem: asString(o.problem),
    solution: asString(o.solution),
    impact: asString(o.impact),
    stack: asStringArray(o.stack),
    liveLink: asString(o.liveLink),
    repoLink: asString(o.repoLink),
  };
  // Só vale se tiver título OU alguma descrição — senão é ruído.
  if (!proj.title && !proj.problem && !proj.impact) return null;
  return proj;
}

/**
 * "Brain dump" de projetos: texto livre → um ou mais projetos estruturados
 * (título, desafio, impacto, stack, links). Não persiste — o client adiciona.
 */
export async function parseProjectsFromText(text: string): Promise<ParseProjectResult> {
  const userId = await requireUserId();

  const clean = text?.trim();
  if (!clean) return { success: false, error: "Cole ou escreva algo para a IA estruturar." };

  const system =
    "Você estrutura projetos de portfólio para um currículo, em português do Brasil. " +
    "A partir do texto livre, extraia UM OU MAIS projetos e responda APENAS com um ARRAY JSON válido, sem comentários nem cercas. " +
    "Cada item: " +
    '{"title": string, "role": string, "duration": string, "problem": string, "solution": string, "impact": string, "stack": string[], "liveLink": string, "repoLink": string}. ' +
    "Regras: use SÓ o que está no texto (não invente); campos ausentes = \"\" ou []; " +
    "'problem' = o desafio em 1-2 frases; 'impact' = resultado com métrica quando houver; 'stack' = tecnologias citadas; " +
    "extraia URLs para liveLink/repoLink (github = repoLink).";

  const out = await runOneShotAi(userId, system, `Texto do usuário:\n${clean}`);
  if (!out) return { success: false, error: "IA indisponível. Verifique a configuração em Configurações → Inteligência." };

  const parsed = extractJson(out);
  const rawItems = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];
  const items = rawItems.map(coerceProject).filter((x): x is ParsedProject => x !== null);

  if (items.length === 0) {
    return { success: false, error: "Não consegui estruturar esse texto. Tente descrever o projeto, o desafio e o resultado." };
  }
  return { success: true, items };
}

// Resumo textual compacto do currículo para alimentar a revisão da IA.
function summarizeForReview(p: PortfolioData): string {
  const skills = [
    ...p.skills.languages.map((s) => s.name),
    ...p.skills.frameworks.map((s) => s.name),
    ...p.skills.tools.map((s) => s.name),
  ].join(", ");

  const exp = p.experience
    .map((e) => `- ${e.role || "(sem cargo)"} @ ${e.company || "(sem empresa)"} (${e.startDate}–${e.endDate}): ${e.summary} | conquistas: ${e.achievements.join("; ") || "(nenhuma)"}`)
    .join("\n");

  const projects = p.projects
    .map((pr) => `- ${pr.title}: ${pr.problem} → ${pr.impact}`)
    .join("\n");

  return [
    `Nome: ${p.hero.name || "(não informado)"}`,
    `Headline: ${p.hero.headline || "(vazio)"}`,
    `Resumo (sobre): ${p.about.short || p.about.long || "(vazio)"}`,
    `Skills: ${skills || "(nenhuma)"}`,
    `Idiomas: ${p.languages.map((l) => `${l.name} (${l.level})`).join(", ") || "(nenhum)"}`,
    `\nExperiência:\n${exp || "(nenhuma)"}`,
    `\nProjetos:\n${projects || "(nenhum)"}`,
    `Formação: ${p.education.map((e) => `${e.degree} - ${e.institution}`).join("; ") || "(nenhuma)"}`,
  ].join("\n");
}

/**
 * Revisão/coach do currículo inteiro. Devolve markdown com pontos fortes,
 * o que melhorar e reescritas sugeridas por seção.
 */
export async function reviewResume(data: PortfolioData): Promise<AiTextResult> {
  const userId = await requireUserId();

  const system =
    "Você é um coach de carreira e revisor sênior de currículos técnicos no Brasil. " +
    "Analise o currículo e responda em português do Brasil, em Markdown, EXATAMENTE nesta estrutura:\n" +
    "## Nota geral: X/10\n(uma linha justificando)\n\n" +
    "### ✅ Pontos fortes\n- ...\n\n" +
    "### 🔧 O que melhorar\n- ... (seja específico: cite a seção e o problema)\n\n" +
    "### ✍️ Reescritas sugeridas\n(pegue de 1 a 3 trechos fracos e mostre 'Antes → Depois')\n" +
    "Baseie-se só nos dados fornecidos; não invente experiências. Seja direto e acionável.";

  const out = await runOneShotAi(userId, system, `### CURRÍCULO\n${summarizeForReview(data)}\n\nFaça a revisão.`);
  if (!out) return { success: false, error: "IA indisponível. Verifique a configuração em Configurações → Inteligência." };

  return { success: true, content: out.trim() };
}

// ============================================================================
// TRADUÇÃO DO CONTEÚDO (Fase 6) — gera uma NOVA versão traduzida, sem tocar no
// original. Traduz só os textos (títulos, resumos, conquistas, soft skills,
// idiomas…), preservando ids, datas, e-mails, URLs e nomes próprios/técnicos.
// ============================================================================

// Percorre todos os campos traduzíveis numa ordem DETERMINÍSTICA aplicando `fn`.
// Como a coleta e a reaplicação usam a mesma travessia, os índices casam 1:1.
function mapTranslatableText(d: PortfolioData, fn: (s: string) => string): PortfolioData {
  return {
    ...d,
    hero: { ...d.hero, headline: fn(d.hero.headline), location: fn(d.hero.location) },
    about: { short: fn(d.about.short), long: fn(d.about.long) },
    experience: d.experience.map((e) => ({
      ...e,
      role: fn(e.role),
      location: fn(e.location),
      summary: fn(e.summary),
      achievements: e.achievements.map(fn),
    })),
    projects: d.projects.map((p) => ({
      ...p,
      role: fn(p.role),
      duration: fn(p.duration),
      problem: fn(p.problem),
      solution: fn(p.solution),
      impact: fn(p.impact),
    })),
    education: d.education.map((ed) => ({ ...ed, degree: fn(ed.degree), dates: fn(ed.dates) })),
    certifications: d.certifications.map((c) => ({ ...c, name: fn(c.name) })),
    skills: { ...d.skills, softSkills: d.skills.softSkills.map(fn) },
    testimonials: d.testimonials.map((t) => ({ ...t, authorRole: fn(t.authorRole), text: fn(t.text) })),
    languages: d.languages.map((l) => ({ ...l, name: fn(l.name), level: fn(l.level) })),
  };
}

const LOCALE_LABEL: Record<string, string> = {
  "en-US": "English (United States)",
  "pt-BR": "Portuguese (Brazil)",
  "es-ES": "Spanish (Spain)",
};

function coerceStringMap(raw: unknown): Record<string, string> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

export type TranslateResult =
  | { success: true; data: PortfolioData }
  | { success: false; error: string };

/**
 * Traduz o CONTEÚDO textual de um currículo para o idioma-alvo, devolvendo um
 * novo PortfolioData com a mesma estrutura. Não persiste.
 */
export async function translateResumeData(data: PortfolioData, targetLocale: string): Promise<TranslateResult> {
  const userId = await requireUserId();
  const lang = LOCALE_LABEL[targetLocale] ?? targetLocale;

  // 1) Coleta os textos não-vazios num mapa indexado (chave = ordem de travessia).
  const map: Record<string, string> = {};
  let i = 0;
  mapTranslatableText(data, (s) => {
    const k = String(i++);
    if (s.trim()) map[k] = s;
    return s;
  });

  if (Object.keys(map).length === 0) {
    return { success: false, error: "Não há texto para traduzir — preencha o currículo primeiro." };
  }

  const system =
    `You are a professional resume translator. Translate the VALUES of the given JSON object into ${lang}. ` +
    "Return ONLY a JSON object with the SAME keys and translated values — no comments, no code fences. " +
    "Translate: job titles, role descriptions, summaries, achievements/bullets, soft skills, academic degrees, " +
    "locations, language names and proficiency levels, and testimonial text. " +
    "DO NOT translate or alter: person names, company/organization names, product/project names, technology names, " +
    "URLs, e-mails, phone numbers, or dates. Preserve numbers, metrics and overall tone.";

  const out = await runOneShotAi(userId, system, JSON.stringify(map));
  if (!out) return { success: false, error: "IA indisponível. Verifique a configuração em Configurações → Inteligência." };

  const translated = coerceStringMap(extractJson(out));
  if (!translated) return { success: false, error: "A IA não retornou uma tradução válida. Tente de novo." };

  // 2) Reaplica na MESMA ordem: cada slot puxa o texto traduzido (ou mantém o original).
  let j = 0;
  const result = mapTranslatableText(data, (s) => {
    const k = String(j++);
    return translated[k] ?? s;
  });

  return { success: true, data: result };
}

// Tolera JSON antigo sem campos novos (mesma estratégia do resume-actions).
function parseResumeData(raw: string): PortfolioData {
  try {
    return { ...INITIAL_PORTFOLIO, ...(JSON.parse(raw) as Partial<PortfolioData>) };
  } catch {
    return INITIAL_PORTFOLIO;
  }
}

/**
 * Clona um currículo para uma nova versão no idioma-alvo, com o conteúdo já
 * traduzido pela IA. O original permanece intacto (fluxo de versões).
 */
export async function createTranslatedResume(resumeId: string, targetLocale: string): Promise<ResumeActionResult> {
  const userId = await requireUserId();

  const source = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
  if (!source) return { success: false, error: "Currículo não encontrado." };

  const translated = await translateResumeData(parseResumeData(source.data), targetLocale);
  if (!translated.success) return { success: false, error: translated.error };

  const suffix = targetLocale === "en-US" ? "EN" : targetLocale === "pt-BR" ? "PT" : targetLocale.slice(0, 2).toUpperCase();

  const created = await prisma.resume.create({
    data: {
      userId,
      name: `${source.name} (${suffix})`,
      locale: targetLocale,
      template: source.template,
      isBase: false,
      parentId: source.id,
      data: JSON.stringify(translated.data),
    },
  });

  revalidatePath("/jobs");
  return { success: true, id: created.id };
}

// ============================================================================
// CURRÍCULO SOB MEDIDA (vaga → currículo) — adapta os textos NARRATIVOS do CV
// para enfatizar o que casa com a vaga, usando SÓ fatos já presentes (não
// inventa). Gera uma nova versão; o Base fica intacto.
// ============================================================================

// Só os campos narrativos (resumo, conquistas, desafio/impacto). NÃO toca em
// nomes de empresa, cargos, datas, skills, idiomas — esses são fatos fixos.
function mapTailorableText(d: PortfolioData, fn: (s: string) => string): PortfolioData {
  return {
    ...d,
    about: { short: fn(d.about.short), long: fn(d.about.long) },
    experience: d.experience.map((e) => ({
      ...e,
      summary: fn(e.summary),
      achievements: e.achievements.map(fn),
    })),
    projects: d.projects.map((p) => ({
      ...p,
      problem: fn(p.problem),
      solution: fn(p.solution),
      impact: fn(p.impact),
    })),
  };
}

export interface JobContext {
  company: string;
  role: string;
  description: string;
}

export type TailorResult =
  | { success: true; data: PortfolioData }
  | { success: false; error: string };

/**
 * Reescreve os textos narrativos do currículo para MIRAR uma vaga específica,
 * enfatizando requisitos/palavras-chave — sem inventar fatos. Não persiste.
 */
export async function tailorResumeData(data: PortfolioData, job: JobContext): Promise<TailorResult> {
  const userId = await requireUserId();

  const map: Record<string, string> = {};
  let i = 0;
  mapTailorableText(data, (s) => {
    const k = String(i++);
    if (s.trim()) map[k] = s;
    return s;
  });

  if (Object.keys(map).length === 0) {
    return { success: false, error: "Preencha o currículo (resumo/experiências) antes de adaptar para a vaga." };
  }

  const system =
    "Você adapta um currículo para uma vaga específica, em português do Brasil. " +
    "Reescreva os VALORES do JSON para ENFATIZAR o que é relevante à vaga (requisitos, palavras-chave, stack pedida), " +
    "priorizando verbos de ação e termos que casam com a descrição. " +
    "REGRA DE OURO: use apenas fatos JÁ presentes no texto — NUNCA invente experiências, tecnologias, números ou resultados que não estavam lá. " +
    "Se um texto não tiver relação com a vaga, melhore-o levemente mas mantenha a verdade. " +
    "Responda APENAS com um objeto JSON com as MESMAS chaves e valores reescritos — sem comentários nem cercas.";

  const user =
    `### VAGA\nEmpresa: ${job.company}\nCargo: ${job.role}\n` +
    `Descrição/Requisitos:\n${job.description?.trim() || "(não informado)"}\n\n` +
    `### TEXTOS DO CURRÍCULO (JSON — reescreva os valores mirando a vaga)\n${JSON.stringify(map)}`;

  const out = await runOneShotAi(userId, system, user);
  if (!out) return { success: false, error: "IA indisponível. Verifique a configuração em Configurações → Inteligência." };

  const rewritten = coerceStringMap(extractJson(out));
  if (!rewritten) return { success: false, error: "A IA não retornou um resultado válido. Tente de novo." };

  let j = 0;
  const result = mapTailorableText(data, (s) => {
    const k = String(j++);
    return rewritten[k] ?? s;
  });

  return { success: true, data: result };
}

export type TailoredResumeResult =
  | { success: true; id: string; name: string }
  | { success: false; error: string };

/**
 * Cria uma nova versão de currículo adaptada a uma vaga do funil. Parte do
 * currículo Base; o original permanece intacto.
 */
export async function createTailoredResumeFromJob(jobId: string): Promise<TailoredResumeResult> {
  const userId = await requireUserId();

  const job = await prisma.jobApplication.findFirst({ where: { id: jobId, userId } });
  if (!job) return { success: false, error: "Vaga não encontrada." };

  const base =
    (await prisma.resume.findFirst({ where: { userId, isBase: true } })) ??
    (await prisma.resume.findFirst({ where: { userId }, orderBy: { updatedAt: "desc" } }));
  if (!base) return { success: false, error: "Nenhum currículo encontrado — abra a aba Currículos primeiro." };

  const tailored = await tailorResumeData(parseResumeData(base.data), {
    company: job.company,
    role: job.role,
    description: job.requirements ?? "",
  });
  if (!tailored.success) return { success: false, error: tailored.error };

  const name = `${job.role} · ${job.company}`.slice(0, 60);

  const created = await prisma.resume.create({
    data: {
      userId,
      name,
      locale: base.locale,
      template: base.template,
      isBase: false,
      parentId: base.id,
      data: JSON.stringify(tailored.data),
    },
  });

  revalidatePath("/jobs");
  return { success: true, id: created.id, name };
}
