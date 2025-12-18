"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// ✅ DEFINIÇÃO MANUAL DO TIPO
type SessionType = "LEITURA" | "VIDEO" | "EXERCICIO" | "REVISAO" | "PROJETO";

// --- ENUMS E TIPOS DE SESSÃO ---
const SESSION_TYPES = z.enum(["LEITURA", "VIDEO", "EXERCICIO", "REVISAO", "PROJETO"]);

// --- SCHEMAS DE VALIDAÇÃO ---

const SubjectSchema = z.object({
  title: z.string().min(2, "O título deve ter pelo menos 2 caracteres."),
  category: z.string().optional().or(z.literal("")),
  icon: z.string().optional().or(z.literal("")),
  difficulty: z.coerce.number().int().min(1).max(5).default(3),
  goalMinutes: z.coerce.number().int().positive().default(3600),
  parentId: z.string().uuid().optional().or(z.literal("")),
});

const SessionSchema = z.object({
  subjectId: z.string().uuid(),
  durationMinutes: z.coerce.number().int().positive("A duração deve ser positiva."),
  notes: z.string().optional().or(z.literal("")),
  focusLevel: z.coerce.number().int().min(1).max(5).default(3),
  type: SESSION_TYPES.default("LEITURA"), 
  tags: z.string().optional().or(z.literal("")),
});

// --- ACTIONS ---

// -------------------------------------
// C: CREATE SUBJECT (Tópico de Estudo)
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

    // Verifica duplicidade
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
    return { success: true, message: "Tópico criado com sucesso!" };

  } catch (error) {
    console.error("Erro em createSubject:", error);
    return { success: false, message: "Erro interno ao criar tópico." };
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
    
    const processedTags = rawTags ? rawTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    const sessionTypeEnum = validType as SessionType; 

    // ✅ CORREÇÃO: Usar 'subjectId' conforme o Schema, não 'topicId'
    const session = await prisma.studySession.create({
      data: {
        subjectId: subjectId, 
        durationMinutes: validDuration,
        notesRaw: validNotes || "", 
        date: new Date(),
        focusLevel: validFocus,
      },
    });

    // Cria anotação estruturada
    if (validNotes || processedTags.length > 0) {
        // ✅ CORREÇÃO: Usar 'subjectId' aqui também
        await prisma.studyNote.create({
            data: {
                title: `Sessão de ${sessionTypeEnum}`,
                content: validNotes || "Sem anotações detalhadas.",
                tags: JSON.stringify(processedTags),
                sessionId: session.id,
                subjectId: subjectId 
            }
        });
    }

    const xpGained = validDuration * 10;

    revalidatePath("/studies");
    return { 
      success: true, 
      message: `Sessão registrada! Ganhou ${xpGained} XP.`, 
      data: { xpGained } 
    };

  } catch (error) {
    console.error("Erro em logSession:", error);
    return { success: false, message: "Erro ao salvar sessão." };
  }
}

// -------------------------------------
// R: GET SUBJECT DETAILS (Com Hierarquia)
// -------------------------------------
export async function getSubjectDetails(subjectId: string) {
  try {
    if (!subjectId || typeof subjectId !== 'string' || !z.string().uuid().safeParse(subjectId).success) {
        return { success: false, message: "ID de tópico inválido." };
    }
      
    // ✅ CORREÇÃO: Usar 'subjectId' no where
    const totalDurationResult = await prisma.studySession.aggregate({
        where: { subjectId: subjectId },
        _sum: { durationMinutes: true }
    });
    
    // ✅ CORREÇÃO: Adicionado '?' para evitar erro se _sum for null
    const totalDuration = totalDurationResult._sum?.durationMinutes || 0;

    const subject = await prisma.studySubject.findUnique({
        where: { id: subjectId },
        include: {
            children: { 
                select: { id: true, title: true, icon: true, color: true }
            },
            parent: { 
                select: { id: true, title: true }
            }
        }
    });

    // ✅ CORREÇÃO: Usar 'subjectId' no where
    const sessions = await prisma.studySession.findMany({
        where: { subjectId: subjectId },
        orderBy: { date: 'desc' },
        take: 20,
        include: {
            notes: true 
        }
    });
    
    if (!subject) {
        return { success: false, message: "Tópico não encontrado." };
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
    return { success: false, message: "Não foi possível carregar detalhes." };
  }
}

// -------------------------------------
// U: UPDATE SUBJECT
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
        return { success: true, message: "Tópico atualizado!" };
    } catch (error) {
        console.error("Erro ao atualizar tópico:", error);
        return { success: false, message: "Falha ao atualizar." };
    }
}

// -------------------------------------
// D: DELETE SUBJECT
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
    return { success: true, message: "Tópico removido!" };
  } catch (error) {
    console.error("Erro ao deletar tópico:", error);
    return { success: false, message: "Falha ao remover." };
  }
}

// -------------------------------------
// D: DELETE SESSION
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
    return { success: true, message: "Sessão removida." };

  } catch (error) {
    console.error("Erro ao deletar sessão:", error);
    return { success: false, message: "Falha ao remover o registro." };
  }
}