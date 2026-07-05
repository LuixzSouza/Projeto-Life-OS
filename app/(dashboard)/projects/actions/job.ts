"use server";

import * as cheerio from "cheerio";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { getString, getEnumValue, generateUniqueSlug, JOB_STATUS, JOB_TYPES, JOB_PRIORITIES } from "./helpers";
import { INITIAL_PORTFOLIO, type PortfolioData } from "@/types/portfolio";
import { parseSnapshot, type ResumeSnapshot } from "@/types/resume-snapshot";

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

// =========================================================
// RASTREABILIDADE DO CURRÍCULO ENVIADO (Fase 3 do Career OS)
// =========================================================

function parsePortfolio(raw: string): PortfolioData {
  try {
    return { ...INITIAL_PORTFOLIO, ...(JSON.parse(raw) as Partial<PortfolioData>) };
  } catch {
    return INITIAL_PORTFOLIO;
  }
}

/**
 * Vincula uma versão de currículo à vaga e CONGELA um snapshot imutável dos
 * dados naquele instante. O snapshot é o que garante que "o que a empresa
 * recebeu" nunca mude — mesmo que a versão viva seja editada ou excluída depois.
 *
 * `markApplied`: usado pelo fluxo "Candidatei-me" (dropdown) — move a vaga para
 * APPLIED e registra o evento na timeline. Ao apenas TROCAR o currículo enviado
 * (aba da vaga, processo já em andamento), passe `false` para não regredir o
 * estágio.
 */
export async function attachResumeSnapshot(
  jobId: string,
  resumeId: string,
  markApplied = false
): Promise<{ success: boolean; error?: string }> {
  const userId = await requireUserId();

  const resume = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
  if (!resume) return { success: false, error: "Currículo não encontrado." };

  const job = await prisma.jobApplication.findFirst({
    where: { id: jobId, userId },
    select: { status: true },
  });
  if (!job) return { success: false, error: "Vaga não encontrada." };

  const snapshot: ResumeSnapshot = {
    resumeId: resume.id,
    resumeName: resume.name,
    locale: resume.locale,
    template: resume.template,
    data: parsePortfolio(resume.data),
    capturedAt: new Date().toISOString(),
  };

  const goApplied = markApplied && job.status !== "APPLIED";
  const data: {
    resumeId: string;
    resumeSnapshot: string;
    snapshotAt: Date;
    status?: string;
  } = {
    resumeId: resume.id,
    resumeSnapshot: JSON.stringify(snapshot),
    snapshotAt: new Date(),
  };
  if (goApplied) data.status = "APPLIED";

  const res = await prisma.jobApplication.updateMany({ where: { id: jobId, userId }, data });
  if (res.count === 0) return { success: false, error: "Vaga não encontrada." };

  if (goApplied) await recordStatusEvent(userId, jobId, "APPLIED");
  revalidateJobs();
  return { success: true };
}

/**
 * Devolve o snapshot COMPLETO (com PortfolioData) de uma vaga sob demanda —
 * usado só na hora de baixar o "PDF exato" na aba Currículo Enviado. A lista de
 * vagas nunca trafega esse JSON pesado (só os metadados leves).
 */
export async function getJobResumeSnapshot(jobId: string): Promise<ResumeSnapshot | null> {
  const userId = await requireUserId();
  const job = await prisma.jobApplication.findFirst({
    where: { id: jobId, userId },
    select: { resumeSnapshot: true },
  });
  return parseSnapshot(job?.resumeSnapshot ?? null);
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

// Normaliza um texto de descrição em Markdown legível PRESERVANDO as quebras de
// linha: vira bullets os marcadores soltos (•, –, *) e promove a "## Título" as
// linhas curtas de seção conhecidas (Requisitos, Responsabilidades, Benefícios…).
// Assim as notas já entram estruturadas, não como um parágrafo gigante.
const SECTION_RE =
  /^(requirements?|responsibilities|qualifications|about( the)?( role| company| job)?|benefits|nice to have|what you.?ll do|role overview|who you are|requisitos|responsabilidades|qualifica[çc][õo]es|sobre( a vaga| a empresa)?|benef[íi]cios|diferenciais|atividades|o que (voc[êe]|esperamos))\s*:?\s*$/i;

function toNotesMarkdown(raw: string, max = 4000): string {
  const lines = raw.replace(/\r/g, "").split("\n").map((l) => l.replace(/[ \t]+/g, " ").trimEnd());
  const out: string[] = [];
  for (let line of lines) {
    const t = line.trim();
    if (!t) { out.push(""); continue; }
    if (SECTION_RE.test(t)) { out.push("", `## ${t.replace(/:\s*$/, "")}`, ""); continue; }
    line = t.replace(/^[•·▪◦‣∙*]\s+/, "- ").replace(/^[–—]\s+/, "- ").replace(/^-\s+/, "- ");
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

// Converte uma descrição HTML (crua OU com entidades "&lt;p&gt;") em texto com
// quebras de linha e bullets — pronto para o toNotesMarkdown. Cobre JSON-LD
// (Greenhouse manda HTML escapado) e o container de descrição do LinkedIn.
function htmlToNotes(input: string | undefined | null): string {
  let html = input || "";
  if (!html) return "";
  // 1) HTML "escapado" (&lt;p&gt;…): decodifica uma vez para virar HTML real.
  if (/&lt;|&gt;/.test(html)) html = cheerio.load(html).root().text();
  // 2) Blocos → quebras; <li> → marcador de lista.
  const withBreaks = html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr)>/gi, "\n");
  // 3) Remove tags restantes e decodifica entidades finais.
  return cheerio.load(withBreaks).root().text();
}

// "gaudium" / "rd-station" → "Gaudium" / "Rd Station" (nome apresentável).
function prettifySlug(s: string | undefined): string | undefined {
  if (!s) return undefined;
  const t = s.replace(/[-_]+/g, " ").trim();
  return t ? t.replace(/\b\w/g, (c) => c.toUpperCase()) : undefined;
}

// Muitos boards (SPAs) não expõem a empresa no HTML, mas ela está no SUBDOMÍNIO
// (gaudium.gupy.io) ou no 1º segmento do CAMINHO (greenhouse/lever/ashby/…).
// Deriva daí de forma segura — é melhor que arriscar pegar o cargo como empresa.
function deriveBoardCompany(target: URL): string | undefined {
  const host = target.hostname.toLowerCase();
  const seg = target.pathname.split("/").filter(Boolean);

  const subBoards = ["gupy.io", "recruitee.com", "breezy.hr", "factorialhr.com", "solides.com.br"];
  for (const b of subBoards) {
    if (host.endsWith("." + b)) {
      const sub = host.slice(0, host.length - b.length - 1).split(".").pop();
      if (sub && !["www", "portal", "app", "jobs", "careers"].includes(sub)) return prettifySlug(sub);
    }
  }
  const pathBoards = ["greenhouse.io", "lever.co", "ashbyhq.com", "workable.com", "jobvite.com", "smartrecruiters.com"];
  if (pathBoards.some((b) => host.includes(b)) && seg[0] && !["jobs", "careers", "company", "o"].includes(seg[0].toLowerCase())) {
    return prettifySlug(seg[0]);
  }
  return undefined;
}

// Compara nomes de empresa ignorando caixa/pontuação ("RD Station" ≈ "rdstation").
// A inclusão só vale se os tamanhos forem PRÓXIMOS — senão um "cargo longo" que
// por acaso contém o slug da empresa seria confundido com a própria empresa.
function sameCompany(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const na = n(a);
  const nb = n(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const [short, long] = na.length <= nb.length ? [na, nb] : [nb, na];
  return long.includes(short) && short.length / long.length >= 0.6;
}

// Separa "{Cargo} - {Empresa}" / "{Cargo} at {Empresa}" / "{Cargo} @ {Empresa}".
// Com a empresa do board conhecida, sabe qual lado é qual; senão assume o padrão
// mais comum (cargo à esquerda). Título de UMA parte: é empresa se casar com o
// board (Greenhouse põe a empresa no og:title), senão é o cargo (Gupy).
function splitTitle(ogTitle: string, boardCompany: string | undefined): { role?: string; company?: string } {
  const parts = ogTitle.split(/\s+(?:[|@]|[-–—]|at)\s+/i).map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) {
    if (boardCompany && sameCompany(ogTitle, boardCompany)) return { company: ogTitle };
    return { role: ogTitle };
  }
  if (boardCompany) {
    const ci = parts.findIndex((p) => sameCompany(p, boardCompany));
    if (ci >= 0) return { company: parts[ci], role: parts[ci === 0 ? 1 : 0] };
  }
  return { role: parts[0], company: parts[parts.length - 1] };
}

// Tira sufixos de portal que vazam em títulos ("… | LinkedIn", "… Job Portal").
function stripPortalSuffix(s: string | undefined): string | undefined {
  if (!s) return s;
  return (
    s
      .replace(/\s*[|·—–-]\s*(LinkedIn|Apply on Job|Indeed|Glassdoor|Gupy|Vagas?|Job Portal|Greenhouse|Lever|Recruitee|Workable|SmartRecruiters).*$/i, "")
      .replace(/\s+(Job Portal|Careers?|Vagas)\s*$/i, "")
      .replace(/^(P[áa]gina da Vaga|Job Page)\s*[|:—–-]\s*/i, "")
      .trim() || s
  );
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
          const org = node.hiringOrganization;
          data.company ??= cleanText(typeof org === "string" ? org : org?.name, 200);
          const jl = Array.isArray(node.jobLocation) ? node.jobLocation[0] : node.jobLocation;
          const loc = jl?.address?.addressLocality ?? jl?.address?.addressRegion;
          data.location ??= cleanText(typeof loc === "string" ? loc : undefined, 120);
          if (node.baseSalary?.value) {
            const v = node.baseSalary.value;
            const amount = v.value ?? (v.minValue && v.maxValue ? `${v.minValue}–${v.maxValue}` : v.minValue ?? v.maxValue);
            if (amount) data.salary ??= cleanText(`${amount} ${node.baseSalary.currency ?? ""}`, 60);
          }
          if (node.description) data.requirements ??= toNotesMarkdown(htmlToNotes(node.description), 4000);
        }
      } catch {
        /* JSON-LD malformado — ignora */
      }
    });

    // 2) LinkedIn NÃO expõe JSON-LD na página de guest, mas o og:title segue um
    //    padrão fixo e a descrição fica num container conhecido. Tratamos à parte.
    if (target.hostname.toLowerCase().includes("linkedin.com")) {
      const ogTitle = $('meta[property="og:title"]').attr("content") || $("title").first().text() || "";
      // "{Empresa} hiring {Cargo} in {Local} | LinkedIn"
      const withLoc = ogTitle.match(/^(.+?)\s+hiring\s+(.+?)\s+in\s+(.+?)\s*(?:\||$)/i);
      const noLoc = ogTitle.match(/^(.+?)\s+hiring\s+(.+?)\s*(?:\||$)/i);
      if (withLoc) {
        data.company ||= cleanText(withLoc[1], 200);
        data.role = cleanText(withLoc[2], 200); // override: título cru vira algo limpo
        data.location ||= cleanText(withLoc[3], 120);
      } else if (noLoc) {
        data.company ||= cleanText(noLoc[1], 200);
        data.role = cleanText(noLoc[2], 200);
      }
      const $desc = $(".show-more-less-html__markup").first().length
        ? $(".show-more-less-html__markup").first()
        : $(".description__text").first();
      const md = toNotesMarkdown(htmlToNotes($desc.html()), 4000);
      if (md) data.requirements = md;
    }

    // 3) Fallbacks por meta/título — com cuidado para NÃO gravar lixo (ex.: pôr o
    //    nome da empresa no campo de cargo). Boards conhecidos dão a empresa pela URL.
    const boardCompany = deriveBoardCompany(target);
    const ogTitle = cleanText($('meta[property="og:title"]').attr("content") || $("title").first().text(), 200);
    const split = ogTitle ? splitTitle(ogTitle, boardCompany) : {};

    if (!data.role) data.role = split.role;

    // Alguns boards (Greenhouse) põem HTML na própria meta description → limpa.
    data.requirements ??= cleanText(
      htmlToNotes($('meta[name="description"]').attr("content") || $('meta[property="og:description"]').attr("content")),
      4000
    );

    // Empresa: JSON-LD > board (subdomínio/caminho) > og:title dividido >
    //          og:site_name (desde que ≠ do cargo, senão é o mesmo lixo do Gupy).
    if (!data.company) {
      const siteName = cleanText($('meta[property="og:site_name"]').attr("content"), 200);
      data.company =
        boardCompany ??
        split.company ??
        (siteName && !sameCompany(siteName, data.role) ? siteName : undefined);
    }

    data.role = stripPortalSuffix(data.role);
    data.company = stripPortalSuffix(data.company);

    if (!data.role && !data.company && !data.requirements) {
      return { success: false, error: "Este site bloqueia leitura automática. Cole o TEXTO da vaga no mesmo campo." };
    }
    return { success: true, data };
  } catch (error: unknown) {
    const msg = error instanceof Error && error.name === "AbortError" ? "O site demorou demais para responder." : "Falha ao ler o link.";
    return { success: false, error: msg };
  }
}

/**
 * Extrai campos de uma vaga a partir do TEXTO COLADO (caminho primário quando o
 * site bloqueia scraping — LinkedIn/Gupy/SPAs). Heurístico e offline (sem
 * dependência de IA): procura rótulos comuns (Role/Cargo, Location/Local, salário)
 * e joga o texto inteiro nas notas. O usuário revisa antes de salvar.
 */
export async function parseJobText(
  text: string
): Promise<{ success: true; data: ScrapedJob } | { success: false; error: string }> {
  await requireUserId();
  const raw = (text || "").replace(/\r/g, "").trim();
  if (raw.length < 20) return { success: false, error: "Cole um texto maior da descrição da vaga." };

  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  const data: ScrapedJob = {};

  // Procura "Rótulo: valor" (aceita :, - ou –) em qualquer linha.
  const labeled = (labels: string[]): string | undefined => {
    for (const l of lines) {
      for (const lab of labels) {
        const m = l.match(new RegExp(`^${lab}\\s*[:\\-–]\\s*(.+)$`, "i"));
        if (m && m[1].trim()) return m[1].trim();
      }
    }
    return undefined;
  };

  data.role = cleanText(labeled(["role", "cargo", "vaga", "position", "t[ií]tulo", "job title"]) ?? lines[0], 200);
  data.company = cleanText(labeled(["company", "empresa", "organiza[çc][ãa]o", "employer", "cliente", "hiring company"]), 200);
  data.location = cleanText(labeled(["location", "local", "localiza[çc][ãa]o", "modelo", "modalidade", "workplace"]), 120);

  // Salário: faixas em R$/$ e por hora/mês/ano.
  const sal = raw.match(
    /(R\$\s?[\d.]+(?:,\d{2})?(?:\s?[-–a]\s?R?\$?\s?[\d.]+(?:,\d{2})?)?|\$\s?[\d,.]+(?:\s?[-–]\s?\$?\s?[\d,.]+)?)(\s?\/?\s?(?:hour|hr|hora|month|m[êe]s|year|ano))?/i
  );
  if (sal) data.salary = cleanText(sal[0], 60);

  // Notas em Markdown estruturado (preserva quebras, vira bullets/seções).
  data.requirements = toNotesMarkdown(raw, 4000);

  if (!data.role && !data.requirements) return { success: false, error: "Não consegui interpretar o texto colado." };
  return { success: true, data };
}
