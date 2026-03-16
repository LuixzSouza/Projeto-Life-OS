"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ✅ DEFINIÇÃO MANUAL DO TIPO (Sincronizado com o Frontend)
export type SessionType = "LEITURA" | "VIDEO" | "EXERCICIO" | "REVISAO" | "PROJETO" | "PRATICA";

// --- ENUMS E TIPOS DE SESSÃO ---
const SESSION_TYPES = z.enum(["LEITURA", "VIDEO", "EXERCICIO", "REVISAO", "PROJETO", "PRATICA"]);

// --- SCHEMAS DE VALIDAÇÃO ---

const SubjectSchema = z.object({
  title: z.string().min(2, "O título deve ter pelo menos 2 caracteres."),
  category: z.string().optional().or(z.literal("")),
  icon: z.string().optional().or(z.literal("")),
  difficulty: z.coerce.number().int().min(1).max(5).default(3),
  goalMinutes: z.coerce.number().int().positive().default(3600), // Padrão 60h
  parentId: z.string().uuid().optional().or(z.literal("")),
});

const SessionSchema = z.object({
  subjectId: z.string().uuid("Matéria inválida."),
  durationMinutes: z.coerce.number().int().min(0, "A duração não pode ser negativa."),
  notes: z.string().optional().or(z.literal("")),
  focusLevel: z.coerce.number().int().min(1).max(5).default(3),
  type: SESSION_TYPES.default("LEITURA"), 
  tags: z.string().optional().or(z.literal("")),
});

// --- ACTIONS ---

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

    const existingSubject = await prisma.studySubject.findFirst({
      where: { 
        title: title,
        parentId: parentId || null 
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

    const session = await prisma.studySession.create({
      data: {
        subjectId: subjectId, 
        durationMinutes: validDuration,
        notesRaw: validNotes || "", 
        date: new Date(), 
        focusLevel: validFocus,
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
                subjectId: subjectId 
            }
        });
    }

    const baseXP = validDuration * 10;
    const focusBonus = (validFocus - 3) * 5; 
    const totalXP = Math.max(0, baseXP + (validDuration > 0 ? focusBonus : 0));

    revalidatePath("/studies");
    return { 
      success: true, 
      message: `Sessão registrada!`, 
      data: { xpGained: totalXP } 
    };

  } catch (error) {
    console.error("Erro em logSession:", error);
    return { success: false, message: "Erro ao salvar a sessão no banco." };
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
      
    const totalDurationResult = await prisma.studySession.aggregate({
        where: { subjectId: subjectId },
        _sum: { durationMinutes: true }
    });
    
    const totalDuration = totalDurationResult._sum?.durationMinutes || 0;

    const subject = await prisma.studySubject.findUnique({
        where: { id: subjectId },
        include: {
            children: { select: { id: true, title: true, icon: true, color: true } },
            parent: { select: { id: true, title: true } }
        }
    });

    const sessions = await prisma.studySession.findMany({
        where: { subjectId: subjectId },
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
        await prisma.studySubject.update({
            where: { id: id },
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
      
    await prisma.studySubject.delete({
      where: { id: subjectId },
    });
    
    revalidatePath("/studies");
    return { success: true, message: "Matéria removida!" };
  } catch (error) {
    console.error("Erro ao deletar matéria:", error);
    return { success: false, message: "Falha ao remover. Certifique-se de que não há sessões vinculadas." };
  }
}

// -------------------------------------
// D: DELETE SESSION (Excluir Sessão)
// -------------------------------------
export async function deleteSession(sessionId: string) {
  try {
    if (!sessionId || !z.string().uuid().safeParse(sessionId).success) {
        return { success: false, message: "ID inválido." };
    }
      
    await prisma.studySession.delete({
      where: { id: sessionId },
    });
    
    revalidatePath("/studies");
    return { success: true, message: "Sessão removida do histórico." };

  } catch (error) {
    console.error("Erro ao deletar sessão:", error);
    return { success: false, message: "Falha ao remover o registro." };
  }
}