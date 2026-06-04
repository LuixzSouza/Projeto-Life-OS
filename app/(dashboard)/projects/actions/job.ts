"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { getString, getEnumValue, generateUniqueSlug, JOB_STATUS, JOB_TYPES, JOB_PRIORITIES } from "./helpers";

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

  await prisma.jobApplication.create({
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
  });

  revalidateJobs();
}

export async function updateJob(formData: FormData) {
  const id = getString(formData, "id");
  const company = getString(formData, "company");
  const role = getString(formData, "role");

  if (!id || !company || !role) throw new Error("Campos obrigatórios ausentes.");

  const userId = await requireUserId();

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
      status: getEnumValue(getString(formData, "status"), JOB_STATUS, "APPLIED"),
      type: getEnumValue(getString(formData, "type"), JOB_TYPES, "JOB"),
    },
  });

  revalidateJobs();
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
