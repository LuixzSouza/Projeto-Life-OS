"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { callAIProvider } from "@/app/(dashboard)/ai/actions/providers";
import { getAiCallConfig } from "@/app/(dashboard)/ai/actions/oneshot";
import { getPortfolio } from "@/app/(dashboard)/projects/actions";
import { PortfolioData } from "@/types/portfolio";

type AIResult = { success: true; content: string } | { success: false; error: string };

// Monta um resumo textual compacto do portfólio para alimentar a IA.
function summarizePortfolio(p: PortfolioData): string {
  const skills = [
    ...p.skills.languages.map(s => s.name),
    ...p.skills.frameworks.map(s => s.name),
    ...p.skills.tools.map(s => s.name),
  ].join(", ");

  const exp = p.experience
    .map(e => `- ${e.role} @ ${e.company} (${e.startDate}–${e.endDate}): ${e.summary}`)
    .join("\n");

  const projects = p.projects
    .map(pr => `- ${pr.title} (${pr.role}): ${pr.problem} → ${pr.impact}`)
    .join("\n");

  return [
    `Nome: ${p.hero.name || "(não informado)"}`,
    `Headline: ${p.hero.headline}`,
    `Resumo: ${p.about.short || p.about.long}`,
    `Skills técnicas: ${skills || "(nenhuma)"}`,
    `Soft skills: ${p.skills.softSkills.join(", ") || "(nenhuma)"}`,
    `Idiomas: ${p.languages.map(l => `${l.name} (${l.level})`).join(", ") || "(nenhum)"}`,
    `\nExperiência:\n${exp || "(nenhuma)"}`,
    `\nProjetos:\n${projects || "(nenhum)"}`,
    `\nFormação: ${p.education.map(e => `${e.degree} - ${e.institution}`).join("; ") || "(nenhuma)"}`,
    `Certificações: ${p.certifications.map(c => c.name).join(", ") || "(nenhuma)"}`,
  ].join("\n");
}

async function runForJob(jobId: string, buildPrompts: (job: { company: string; role: string; requirements: string | null; location: string | null }, portfolio: string) => { system: string; user: string }): Promise<AIResult> {
  try {
    const userId = await requireUserId();

    const [job, portfolioData, config] = await Promise.all([
      prisma.jobApplication.findFirst({ where: { id: jobId, userId } }),
      getPortfolio(),
      getAiCallConfig(userId),
    ]);

    if (!job) return { success: false, error: "Vaga não encontrada." };
    if (!config.configured) return { success: false, error: config.error ?? "IA não configurada." };

    const { system, user } = buildPrompts(job, summarizePortfolio(portfolioData));
    const { text } = await callAIProvider(config.provider, config.model, system, user, [], config.keys);
    return { success: true, content: text };
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : "Falha ao consultar a IA." };
  }
}

export async function generateCoverLetter(jobId: string): Promise<AIResult> {
  const res = await runForJob(jobId, (job, portfolio) => ({
    system:
      "Você é um especialista em recrutamento e redação de cartas de apresentação no Brasil. " +
      "Escreva uma carta de apresentação profissional, calorosa e objetiva (3 a 4 parágrafos), em português do Brasil, " +
      "conectando o perfil do candidato à vaga. Use apenas informações fornecidas — não invente experiências. " +
      "Não use placeholders entre colchetes; finalize com uma assinatura simples com o nome do candidato.",
    user:
      `### VAGA\nEmpresa: ${job.company}\nCargo: ${job.role}\nLocal: ${job.location || "não informado"}\n` +
      `Requisitos/Descrição:\n${job.requirements || "(não informados)"}\n\n` +
      `### PERFIL DO CANDIDATO\n${portfolio}\n\n` +
      `Escreva a carta de apresentação para esta vaga.`,
  }));
  // Persiste a carta gerada (não regenerar à toa).
  if (res.success) {
    try {
      const userId = await requireUserId();
      await prisma.jobApplication.updateMany({ where: { id: jobId, userId }, data: { coverLetter: res.content } });
      revalidatePath("/jobs");
    } catch { /* persistência é best-effort */ }
  }
  return res;
}

export async function analyzeJobMatch(jobId: string): Promise<AIResult> {
  const res = await runForJob(jobId, (job, portfolio) => ({
    system:
      "Você é um analista de talentos técnico. Compare o perfil do candidato com a vaga e responda em português do Brasil, " +
      "em Markdown, EXATAMENTE nesta estrutura:\n" +
      "## Compatibilidade: X%\n(uma linha justificando a nota)\n\n" +
      "### ✅ Pontos fortes\n- ...\n\n### ⚠️ Lacunas\n- ...\n\n### 🎯 Como se preparar\n- ...\n" +
      "Seja honesto e específico; baseie-se apenas nos dados fornecidos.",
    user:
      `### VAGA\nEmpresa: ${job.company}\nCargo: ${job.role}\n` +
      `Requisitos/Descrição:\n${job.requirements || "(não informados)"}\n\n` +
      `### PERFIL DO CANDIDATO\n${portfolio}\n\n` +
      `Analise a compatibilidade do candidato com esta vaga.`,
  }));
  // Extrai o "## Compatibilidade: X%" e persiste o score (ordenação por fit).
  if (res.success) {
    const m = res.content.match(/Compatibilidade:\s*(\d{1,3})\s*%/i);
    const matchScore = m ? Math.min(100, Math.max(0, parseInt(m[1], 10))) : null;
    try {
      const userId = await requireUserId();
      await prisma.jobApplication.updateMany({ where: { id: jobId, userId }, data: { matchScore } });
      revalidatePath("/jobs");
    } catch { /* best-effort */ }
  }
  return res;
}
