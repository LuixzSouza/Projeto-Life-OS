"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Helper para obter um valor de FormData, retornando string (limpa) ou null se vazio.
 * Esta função resolve os erros de 'any' e 'as string'.
 */
function getStringValue(formData: FormData, key: string): string | null {
    const value = formData.get(key);
    // Verifica se é string e se não está vazio após remover espaços
    if (typeof value === 'string' && value.trim() !== '') {
        return value.trim();
    }
    return null;
}

// =========================================================
// 1. GERENCIAMENTO DE PROJETOS
// =========================================================

export async function createProject(formData: FormData) {
    const title = getStringValue(formData, "title");
    const description = getStringValue(formData, "description");
    const color = getStringValue(formData, "color") || "#6366f1";
    
    if (!title) throw new Error("O título do projeto é obrigatório.");

    await prisma.project.create({
        data: { 
            title, 
            description,
            color
        },
    });

    revalidatePath("/projects");
}

export async function updateProject(formData: FormData) {
    const id = getStringValue(formData, "id");
    const title = getStringValue(formData, "title");
    const description = getStringValue(formData, "description");

    if (!id || !title) throw new Error("ID e título são obrigatórios para atualização.");

    await prisma.project.update({
        where: { id },
        data: { 
            title, 
            description 
        }
    });

    revalidatePath("/projects");
}

export async function deleteProject(projectId: string) {
    // 1. Deleta todas as tarefas associadas primeiro (Limpeza)
    await prisma.task.deleteMany({
        where: { projectId: projectId }
    });

    // 2. Deleta o projeto pai
    await prisma.project.delete({
        where: { id: projectId }
    });

    revalidatePath("/projects");
}


// =========================================================
// 2. GERENCIAMENTO DE TAREFAS
// =========================================================

export async function createTask(formData: FormData) {
    const title = getStringValue(formData, "title");
    const projectId = getStringValue(formData, "projectId");
    // Usamos || "MEDIUM" para fallback do valor enum, mas o helper garante que é string ou null
    const priority = getStringValue(formData, "priority") || "MEDIUM"; 
    const dateStr = getStringValue(formData, "dueDate");
    const image = getStringValue(formData, "image"); 
    
    if (!title) throw new Error("O título da tarefa é obrigatório.");

    await prisma.task.create({
        data: {
            title,
            // Castamos para garantir que o Prisma aceite o valor string que pegamos
            priority: priority as "HIGH" | "MEDIUM" | "LOW", 
            image, 
            dueDate: dateStr ? new Date(dateStr) : null,
            projectId: projectId === "inbox" ? null : projectId,
        },
    });

    revalidatePath("/projects");
}

export async function updateTask(formData: FormData) {
    const id = getStringValue(formData, "id");
    const title = getStringValue(formData, "title");
    const priority = getStringValue(formData, "priority");
    const dateStr = getStringValue(formData, "dueDate");
    const image = getStringValue(formData, "image");

    if (!id || !title) throw new Error("ID e título são obrigatórios para atualização de tarefa.");

    await prisma.task.update({
        where: { id },
        data: {
            title,
            // Se o campo for nulo (priority === null), passamos undefined para o Prisma
            // não tocar no campo. Se tiver valor, castamos para o tipo enum.
            priority: (priority || undefined) as "HIGH" | "MEDIUM" | "LOW" | undefined, 
            dueDate: dateStr ? new Date(dateStr) : null,
            image, 
        }
    });

    revalidatePath("/projects");
}

export async function toggleTask(taskId: string, currentStatus: boolean) {
    await prisma.task.update({
        where: { id: taskId },
        data: { isDone: !currentStatus },
    });
    revalidatePath("/projects");
}

export async function deleteTask(taskId: string) {
    await prisma.task.delete({ where: { id: taskId } });
    revalidatePath("/projects");
}


// =========================================================
// 3. GERENCIAMENTO DE VAGAS & SERVIÇOS (JOB TRACKER)
// =========================================================

export async function createJob(formData: FormData) {
    const company = getStringValue(formData, "company");
    const role = getStringValue(formData, "role");
    const jobUrl = getStringValue(formData, "jobUrl");
    const salary = getStringValue(formData, "salary");
    const status = getStringValue(formData, "status") || "APPLIED";
    const requirements = getStringValue(formData, "requirements");
    const type = getStringValue(formData, "type") || "JOB"; 

    if (!company || !role) throw new Error("Empresa/Cliente e Cargo/Serviço são obrigatórios.");

    const user = await prisma.user.findFirst();

    await prisma.jobApplication.create({
        data: {
            company,
            role,
            jobUrl,
            salary,
            // Casts para tipos enum (assumindo que o status/type estão corretos no formulário)
            status: status as "APPLIED" | "SCREENING" | "INTERVIEW" | "TEST" | "OFFER" | "ACTIVE" | "REJECTED",
            requirements,
            type: type as "JOB" | "FREELANCE",
            userId: user?.id 
        }
    });

    revalidatePath("/projects");
}

export async function updateJob(formData: FormData) {
    const id = getStringValue(formData, "id");
    const company = getStringValue(formData, "company");
    const role = getStringValue(formData, "role");
    const jobUrl = getStringValue(formData, "jobUrl");
    const salary = getStringValue(formData, "salary");
    const status = getStringValue(formData, "status");
    const requirements = getStringValue(formData, "requirements");
    const type = getStringValue(formData, "type");
    
    if (!id || !company || !role) throw new Error("Campos chave são obrigatórios para atualização.");

    await prisma.jobApplication.update({
        where: { id },
        data: {
            company,
            role,
            jobUrl,
            salary,
            // Conversão segura com fallback para undefined
            status: (status || undefined) as "APPLIED" | "SCREENING" | "INTERVIEW" | "TEST" | "OFFER" | "ACTIVE" | "REJECTED" | undefined, 
            requirements,
            type: (type || undefined) as "JOB" | "FREELANCE" | undefined
        }
    });

    revalidatePath("/projects");
}

export async function deleteJob(jobId: string) {
    await prisma.jobApplication.delete({ where: { id: jobId } });
    revalidatePath("/projects");
}