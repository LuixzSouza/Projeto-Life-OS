"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { PortfolioData, INITIAL_PORTFOLIO } from "@/types/portfolio";

// =========================================================
// CURRÍCULOS VERSIONADOS (Fase 1 do Career OS)
// N currículos por usuário: 1 Base + variações por vaga/idioma.
// O Portfolio legado (1 por usuário) é migrado para o Base na 1ª leitura.
// =========================================================

// Registro serializável para o client (datas como ISO, data já parseada).
export interface ResumeRecord {
  id: string;
  name: string;
  locale: string;
  template: string;
  isBase: boolean;
  parentId: string | null;
  updatedAt: string;
  data: PortfolioData;
}

export type ResumeActionResult =
  | { success: true; id?: string }
  | { success: false; error: string };

// Tolera JSON antigo sem campos novos (mesma estratégia do getPortfolio).
function parseData(raw: string): PortfolioData {
  try {
    const parsed = JSON.parse(raw) as Partial<PortfolioData>;
    return { ...INITIAL_PORTFOLIO, ...parsed };
  } catch {
    return INITIAL_PORTFOLIO;
  }
}

// Migração suave e idempotente: garante exatamente 1 currículo Base.
// Se o usuário ainda não tem Resume, o Portfolio legado (ou o INITIAL) vira o Base.
async function ensureBaseResume(userId: string): Promise<void> {
  const count = await prisma.resume.count({ where: { userId } });
  if (count > 0) return;

  const legacy = await prisma.portfolio.findUnique({ where: { userId } });
  await prisma.resume.create({
    data: {
      userId,
      name: "Currículo Base",
      isBase: true,
      data: legacy?.data ?? JSON.stringify(INITIAL_PORTFOLIO),
    },
  });
}

export async function listResumes(): Promise<ResumeRecord[]> {
  const userId = await requireUserId();
  await ensureBaseResume(userId);

  const rows = await prisma.resume.findMany({
    where: { userId },
    orderBy: [{ isBase: "desc" }, { updatedAt: "desc" }],
  });

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    locale: r.locale,
    template: r.template,
    isBase: r.isBase,
    parentId: r.parentId,
    updatedAt: r.updatedAt.toISOString(),
    data: parseData(r.data),
  }));
}

export async function saveResumeData(resumeId: string, data: PortfolioData): Promise<ResumeActionResult> {
  const userId = await requireUserId();

  const payload = JSON.stringify({
    ...data,
    meta: { ...data.meta, lastUpdated: new Date().toISOString() },
  });

  const res = await prisma.resume.updateMany({
    where: { id: resumeId, userId },
    data: { data: payload },
  });
  if (res.count === 0) return { success: false, error: "Currículo não encontrado." };

  revalidatePath("/jobs");
  return { success: true };
}

export async function cloneResume(resumeId: string, name?: string): Promise<ResumeActionResult> {
  const userId = await requireUserId();

  const source = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
  if (!source) return { success: false, error: "Currículo não encontrado." };

  const created = await prisma.resume.create({
    data: {
      userId,
      name: name?.trim() || `${source.name} (cópia)`,
      locale: source.locale,
      template: source.template,
      isBase: false,
      parentId: source.id,
      data: source.data,
    },
  });

  revalidatePath("/jobs");
  return { success: true, id: created.id };
}

export async function renameResume(resumeId: string, name: string, locale?: string): Promise<ResumeActionResult> {
  const userId = await requireUserId();

  const trimmed = name.trim();
  if (!trimmed) return { success: false, error: "O nome não pode ficar vazio." };

  const res = await prisma.resume.updateMany({
    where: { id: resumeId, userId },
    data: { name: trimmed, ...(locale ? { locale } : {}) },
  });
  if (res.count === 0) return { success: false, error: "Currículo não encontrado." };

  revalidatePath("/jobs");
  return { success: true };
}

export async function deleteResume(resumeId: string): Promise<ResumeActionResult> {
  const userId = await requireUserId();

  const target = await prisma.resume.findFirst({ where: { id: resumeId, userId } });
  if (!target) return { success: false, error: "Currículo não encontrado." };
  if (target.isBase) return { success: false, error: "O Currículo Base não pode ser excluído — clone-o para criar variações." };

  await prisma.resume.deleteMany({ where: { id: resumeId, userId } });

  // Sem FK no banco (ensureSchema é aditivo): desfaz na mão o vínculo VIVO das
  // vagas que apontavam para esta versão. O resumeSnapshot é preservado de
  // propósito — o histórico da candidatura não pode ser afetado por esta exclusão.
  await prisma.jobApplication.updateMany({ where: { resumeId, userId }, data: { resumeId: null } });

  revalidatePath("/jobs");
  return { success: true };
}
