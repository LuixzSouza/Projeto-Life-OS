"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { SubjectSchema } from "./schemas";

// -------------------------------------
// C: CREATE SUBJECT (Criar Matéria/Tópico)
// -------------------------------------
export async function createSubject(formData: FormData) {
  try {
    const rawData = {
      title: formData.get("title"),
      category: formData.get("category"),
      icon: formData.get("icon"),
      difficulty: formData.get("difficulty"),
      goalMinutes: formData.get("goalMinutes"),
      parentId: formData.get("parentId"),
    };

    const validatedFields = SubjectSchema.safeParse(rawData);

    if (!validatedFields.success) {
      const firstError = validatedFields.error.flatten().fieldErrors.title?.[0] || "Dados inválidos.";
      return { success: false, message: firstError };
    }

    const { title, category, icon, difficulty, goalMinutes, parentId } = validatedFields.data;

    const userId = await requireUserId();

    const existingSubject = await prisma.studySubject.findFirst({
      where: {
        title: title,
        parentId: parentId || null,
        userId
      }
    });

    if (existingSubject) {
      return { success: false, message: "Este tópico já existe neste nível!" };
    }

    const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    await prisma.studySubject.create({
      data: {
        title,
        category: category || "Geral",
        color: randomColor,
        icon: icon || null,
        difficulty,
        goalMinutes,
        parentId: parentId || null,
        userId,
      },
    });

    revalidatePath("/studies");
    return { success: true, message: "Matéria criada com sucesso!" };

  } catch (error) {
    console.error("Erro em createSubject:", error);
    return { success: false, message: "Erro interno ao criar matéria." };
  }
}

// -------------------------------------
// R: GET SUBJECT DETAILS (Ver Matéria)
// -------------------------------------
export async function getSubjectDetails(subjectId: string) {
  try {
    if (!subjectId || typeof subjectId !== 'string' || !z.string().uuid().safeParse(subjectId).success) {
        return { success: false, message: "ID de matéria inválido." };
    }

    const userId = await requireUserId();

    const totalDurationResult = await prisma.studySession.aggregate({
        where: { subjectId: subjectId, userId },
        _sum: { durationMinutes: true }
    });

    const totalDuration = totalDurationResult._sum?.durationMinutes || 0;

    const subject = await prisma.studySubject.findFirst({
        where: { id: subjectId, userId },
        include: {
            children: { select: { id: true, title: true, icon: true, color: true } },
            parent: { select: { id: true, title: true } }
        }
    });

    const sessions = await prisma.studySession.findMany({
        where: { subjectId: subjectId, userId },
        orderBy: { date: 'desc' },
        take: 20,
        include: { notes: true }
    });

    if (!subject) {
        return { success: false, message: "Matéria não encontrada." };
    }

    return {
        success: true,
        data: {
            subjectTitle: subject.title,
            goalMinutes: subject.goalMinutes,
            difficulty: subject.difficulty,
            icon: subject.icon,
            totalDuration: totalDuration,
            sessions: sessions,
            subTopics: subject.children,
            parentTopic: subject.parent
        }
    };
  } catch (error) {
    console.error("Erro ao carregar detalhes:", error);
    return { success: false, message: "Não foi possível carregar os detalhes." };
  }
}

// -------------------------------------
// U: UPDATE SUBJECT (Editar Matéria)
// -------------------------------------
export async function updateSubject(formData: FormData) {
    const id = formData.get("id") as string;

    const rawData = {
        title: formData.get("title"),
        category: formData.get("category"),
        icon: formData.get("icon"),
        difficulty: formData.get("difficulty"),
        goalMinutes: formData.get("goalMinutes"),
        parentId: formData.get("parentId"),
    };

    const validatedFields = SubjectSchema.safeParse(rawData);

    if (!z.string().uuid().safeParse(id).success || !validatedFields.success) {
        return { success: false, message: "Dados inválidos." };
    }

    const { title, category, icon, difficulty, goalMinutes, parentId } = validatedFields.data;

    try {
        const userId = await requireUserId();
        await prisma.studySubject.updateMany({
            where: { id, userId },
            data: {
                title,
                category: category || "Geral",
                icon: icon || null,
                difficulty,
                goalMinutes,
                parentId: parentId || null
            },
        });

        revalidatePath("/studies");
        return { success: true, message: "Matéria atualizada com sucesso!" };
    } catch (error) {
        console.error("Erro ao atualizar matéria:", error);
        return { success: false, message: "Falha ao atualizar a matéria." };
    }
}

// -------------------------------------
// D: DELETE SUBJECT (Excluir Matéria) -> Faltava essa!
// -------------------------------------
export async function deleteSubject(subjectId: string) {
  try {
    if (!subjectId || !z.string().uuid().safeParse(subjectId).success) {
        return { success: false, message: "ID inválido." };
    }

    const userId = await requireUserId();
    await prisma.studySubject.deleteMany({
      where: { id: subjectId, userId },
    });

    revalidatePath("/studies");
    return { success: true, message: "Matéria removida!" };
  } catch (error) {
    console.error("Erro ao deletar matéria:", error);
    return { success: false, message: "Falha ao remover. Certifique-se de que não há sessões vinculadas." };
  }
}
