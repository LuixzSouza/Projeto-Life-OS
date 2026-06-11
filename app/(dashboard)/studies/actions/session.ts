"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUserId } from "@/lib/auth";
import { SessionSchema, SessionType } from "./schemas";

// -------------------------------------
// C: LOG SESSION (Registrar Estudo)
// -------------------------------------
export async function logSession(
    subjectId: string,
    durationMinutes: number | string,
    notes: string,
    focusLevel: number | string,
    type: string,
    tags: string
) {
  try {
    const rawData = { subjectId, durationMinutes, notes, focusLevel, type, tags };
    const validated = SessionSchema.safeParse(rawData);

    if (!validated.success) {
        return { success: false, message: "Dados da sessão inválidos." };
    }

    const { durationMinutes: validDuration, notes: validNotes, focusLevel: validFocus, type: validType, tags: rawTags } = validated.data;

    const processedTags = rawTags
        ? rawTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : [];

    const sessionTypeEnum = validType as SessionType;

    const userId = await requireUserId();

    // Garante que a matéria pertence ao usuário
    const ownedSubject = await prisma.studySubject.findFirst({ where: { id: subjectId, userId }, select: { id: true } });
    if (!ownedSubject) {
        return { success: false, message: "Matéria não encontrada." };
    }

    const session = await prisma.studySession.create({
      data: {
        subjectId: subjectId,
        durationMinutes: validDuration,
        notesRaw: validNotes || "",
        date: new Date(),
        focusLevel: validFocus,
        userId,
      },
    });

    const hasNotesToSave = (validNotes && validNotes.trim().length > 0) || processedTags.length > 0;

    if (hasNotesToSave) {
        await prisma.studyNote.create({
            data: {
                title: `Anotações de ${sessionTypeEnum} (${validDuration}m)`,
                content: validNotes || "Sessão focada.",
                tags: JSON.stringify(processedTags),
                sessionId: session.id,
                subjectId: subjectId,
                userId,
            }
        });
    }

    // XP = 10 por minuto (mesma regra usada no total da página, mantendo consistência).
    const xpGained = validDuration * 10;

    revalidatePath("/studies");
    return {
      success: true,
      message: `Sessão registrada!`,
      data: { xpGained }
    };

  } catch (error) {
    console.error("Erro em logSession:", error);
    return { success: false, message: "Erro ao salvar a sessão no banco." };
  }
}

// -------------------------------------
// R: HISTÓRICO PAGINADO ("Ver tudo" do Histórico recente)
// Cursor por data: escala para anos de sessões sem carregar tudo de uma vez.
// -------------------------------------
export async function getSessionHistory(beforeISO?: string, limit = 30) {
  const userId = await requireUserId();
  const before = beforeISO ? new Date(beforeISO) : null;
  return prisma.studySession.findMany({
    where: {
      userId,
      ...(before && !Number.isNaN(before.getTime()) ? { date: { lt: before } } : {}),
    },
    orderBy: { date: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
    include: { subject: true },
  });
}

// -------------------------------------
// D: DELETE SESSION (Excluir Sessão)
// -------------------------------------
export async function deleteSession(sessionId: string) {
  try {
    if (!sessionId || !z.string().uuid().safeParse(sessionId).success) {
        return { success: false, message: "ID inválido." };
    }

    const userId = await requireUserId();
    await prisma.studySession.deleteMany({
      where: { id: sessionId, userId },
    });

    revalidatePath("/studies");
    return { success: true, message: "Sessão removida do histórico." };

  } catch (error) {
    console.error("Erro ao deletar sessão:", error);
    return { success: false, message: "Falha ao remover o registro." };
  }
}
