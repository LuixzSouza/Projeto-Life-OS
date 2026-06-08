"use server";

import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { getString, getEnumValue, generateUniqueSlug, JOB_STATUS, JOB_TYPES, JOB_PRIORITIES } from "./helpers";

// Registra um evento de mudança de estágio (alimenta a timeline do funil).
async function recordStatusEvent(userId: string, jobId: string, status: string) {
  try {
    await prisma.jobEvent.create({ data: { userId, jobId, status } });
  } catch (error) {
    console.error("Falha ao registrar evento de estágio:", error);
  }
}

// =========================================================
// JOB TRACKER (Vagas)
// =========================================================

// Datas vindas de <input type="date"> recebem T12:00:00Z para evitar o
// "bug do dia anterior" causado por fuso horário (regra do CLAUDE.md).
function parseFollowUp(value: string | null): Date | null {
  if (!value) return null;
  return new Date(`${value}T12:00:00Z`);
}

function revalidateJobs() {
  revalidatePath("/jobs");
  revalidatePath("/projects");
}

export async function createJob(formData: FormData) {
  const company = getString(formData, "company");
  const role = getString(formData, "role");

  if (!company || !role) throw new Error("Empresa e cargo são obrigatórios.");

  const status = getEnumValue(getString(formData, "status"), JOB_STATUS, "APPLIED") ?? "APPLIED";
  const type = getEnumValue(getString(formData, "type"), JOB_TYPES, "JOB");

  const userId = await requireUserId();

  const created = await prisma.jobApplication.create({
    data: {
      company,
      role,
      jobUrl: getString(formData, "jobUrl"),
      salary: getString(formData, "salary"),
      location: getString(formData, "location"),
      requirements: getString(formData, "requirements"),
      contactName: getString(formData, "contactName"),
      contactEmail: getString(formData, "contactEmail"),
      followUpDate: parseFollowUp(getString(formData, "followUpDate")),
      priority: getEnumValue(getString(formData, "priority"), JOB_PRIORITIES, "MEDIUM"),
      status,
      type,
      userId,
    },
    select: { id: true },
  });

  await recordStatusEvent(userId, created.id, status); // marco inicial da timeline
  revalidateJobs();
}

export async function updateJob(formData: FormData) {
  const id = getString(formData, "id");
  const company = getString(formData, "company");
  const role = getString(formData, "role");

  if (!id || !company || !role) throw new Error("Campos obrigatórios ausentes.");

  const status = getEnumValue(getString(formData, "status"), JOB_STATUS, "APPLIED") ?? "APPLIED";

  const userId = await requireUserId();

  // Estado anterior — só registra evento na timeline se o estágio realmente mudou.
  const prev = await prisma.jobApplication.findFirst({ where: { id, userId }, select: { status: true } });

  await prisma.jobApplication.updateMany({
    where: { id, userId },
    data: {
      company,
      role,
      jobUrl: getString(formData, "jobUrl"),
      salary: getString(formData, "salary"),
      location: getString(formData, "location"),
      requirements: getString(formData, "requirements"),
      contactName: getString(formData, "contactName"),
      contactEmail: getString(formData, "contactEmail"),
      followUpDate: parseFollowUp(getString(formData, "followUpDate")),
      priority: getEnumValue(getString(formData, "priority"), JOB_PRIORITIES, "MEDIUM"),
      status,
      type: getEnumValue(getString(formData, "type"), JOB_TYPES, "JOB"),
    },
  });

  if (prev && prev.status !== status) await recordStatusEvent(userId, id, status);
  revalidateJobs();
}

// Muda o estágio em 1 clique (card/Kanban) — sem abrir o formulário inteiro.
export async function updateJobStatus(jobId: string, status: string): Promise<{ success: boolean }> {
  const safe = getEnumValue(status, JOB_STATUS);
  if (!safe) return { success: false };
  const userId = await requireUserId();
  const prev = await prisma.jobApplication.findFirst({ where: { id: jobId, userId }, select: { status: true } });
  const res = await prisma.jobApplication.updateMany({ where: { id: jobId, userId }, data: { status: safe } });
  if (res.count === 0) return { success: false };
  if (prev && prev.status !== safe) await recordStatusEvent(userId, jobId, safe);
  revalidateJobs();
  return { success: true };
}

// Persiste o resultado da IA na vaga (carta e/ou % de match) — evita regenerar.
export async function saveJobAi(jobId: string, data: { coverLetter?: string; matchScore?: number | null }): Promise<{ success: boolean }> {
  const userId = await requireUserId();
  const patch: { coverLetter?: string; matchScore?: number | null } = {};
  if (typeof data.coverLetter === "string") patch.coverLetter = data.coverLetter;
  if (data.matchScore !== undefined) patch.matchScore = data.matchScore;
  if (Object.keys(patch).length === 0) return { success: true };
  const res = await prisma.jobApplication.updateMany({ where: { id: jobId, userId }, data: patch });
  revalidateJobs();
  return { success: res.count > 0 };
}

export async function deleteJob(jobId: string) {
  const userId = await requireUserId();
  await prisma.jobApplication.deleteMany({
    where: { id: jobId, userId },
  });

  revalidateJobs();
}

// =========================================================
// CONEXÃO VAGA <-> PROJETO
// =========================================================

// Cria um projeto a partir de uma vaga/freela e os vincula.
export async function createProjectFromJob(jobId: string): Promise<{ success: boolean; slug?: string; error?: string }> {
  const userId = await requireUserId();

  const job = await prisma.jobApplication.findFirst({ where: { id: jobId, userId } });
  if (!job) return { success: false, error: "Vaga não encontrada." };

  const title = `${job.role} · ${job.company}`;
  const slug = await generateUniqueSlug(title);

  const project = await prisma.project.create({
    data: {
      title,
      slug,
      description: job.requirements || `Projeto criado a partir da ${job.type === "FREELANCE" ? "freela" : "vaga"} em ${job.company}.`,
      status: "ACTIVE",
      userId,
    },
  });

  await prisma.jobApplication.updateMany({
    where: { id: jobId, userId },
    data: { projectId: project.id },
  });

  revalidateJobs();
  return { success: true, slug };
}

// Vincula a vaga a um projeto existente.
export async function linkJobToProject(jobId: string, projectId: string): Promise<{ success: boolean; error?: string }> {
  const userId = await requireUserId();

  const project = await prisma.project.findFirst({ where: { id: projectId, userId, deletedAt: null }, select: { id: true } });
  if (!project) return { success: false, error: "Projeto não encontrado." };

  await prisma.jobApplication.updateMany({
    where: { id: jobId, userId },
    data: { projectId },
  });

  revalidateJobs();
  return { success: true };
}

export async function unlinkJobFromProject(jobId: string): Promise<{ success: boolean }> {
  const userId = await requireUserId();
  await prisma.jobApplication.updateMany({
    where: { id: jobId, userId },
    data: { projectId: null },
  });

  revalidateJobs();
  return { success: true };
}

// =========================================================
// AUTO-IMPORT POR URL (best-effort, sem chave/serviço externo)
// =========================================================

export interface ScrapedJob {
  company?: string;
  role?: string;
  location?: string;
  salary?: string;
  requirements?: string;
}

function cleanText(s: string | undefined | null, max = 4000): string | undefined {
  if (!s) return undefined;
  const t = s.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : undefined;
}

/**
 * Tenta extrair dados de uma vaga a partir do link. Prioriza JSON-LD (schema.org
 * JobPosting, padrão em LinkedIn/Gupy/sites de RH) e cai para <title>/meta. É
 * best-effort: cada site é diferente, então sempre permita ajuste manual depois.
 */
export async function scrapeJob(url: string): Promise<{ success: true; data: ScrapedJob } | { success: false; error: string }> {
  try {
    await requireUserId(); // exige sessão (evita uso anônimo do fetcher)
    let target: URL;
    try {
      target = new URL(url);
    } catch {
      return { success: false, error: "URL inválida." };
    }
    if (!/^https?:$/.test(target.protocol)) return { success: false, error: "Use um link http(s)." };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    let html: string;
    try {
      const res = await fetch(target.toString(), {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LifeOS/1.0)" },
        signal: controller.signal,
      });
      if (!res.ok) return { success: false, error: `O site respondeu ${res.status}.` };
      html = await res.text();
    } finally {
      clearTimeout(timeout);
    }

    const $ = cheerio.load(html);
    const data: ScrapedJob = {};

    // 1) JSON-LD JobPosting (mais confiável)
    $('script[type="application/ld+json"]').each((_, el) => {
      if (data.role && data.company) return;
      try {
        const json = JSON.parse($(el).contents().text());
        const nodes = Array.isArray(json) ? json : json["@graph"] ?? [json];
        for (const node of Array.isArray(nodes) ? nodes : [nodes]) {
          const type = node?.["@type"];
          const isJob = type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"));
          if (!isJob) continue;
          data.role ??= cleanText(node.title, 200);
          data.company ??= cleanText(node.hiringOrganization?.name, 200);
          const loc = node.jobLocation?.address?.addressLocality ?? node.jobLocation?.address?.addressRegion;
          data.location ??= cleanText(typeof loc === "string" ? loc : undefined, 120);
          if (node.baseSalary?.value) {
            const v = node.baseSalary.value;
            const amount = v.value ?? (v.minValue && v.maxValue ? `${v.minValue}–${v.maxValue}` : v.minValue ?? v.maxValue);
            if (amount) data.salary ??= cleanText(`${amount} ${node.baseSalary.currency ?? ""}`, 60);
          }
          data.requirements ??= cleanText(node.description?.replace(/<[^>]+>/g, " "), 4000);
        }
      } catch {
        /* JSON-LD malformado — ignora */
      }
    });

    // 2) Fallbacks por meta tags / título
    data.role ??= cleanText($('meta[property="og:title"]').attr("content") || $("title").first().text(), 200);
    data.requirements ??= cleanText(
      $('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content"),
      4000
    );
    data.company ??= cleanText($('meta[property="og:site_name"]').attr("content"), 200);

    if (!data.role && !data.company && !data.requirements) {
      return { success: false, error: "Não consegui extrair dados deste link. Preencha manualmente." };
    }
    return { success: true, data };
  } catch (error: unknown) {
    const msg = error instanceof Error && error.name === "AbortError" ? "O site demorou demais para responder." : "Falha ao ler o link.";
    return { success: false, error: msg };
  }
}
