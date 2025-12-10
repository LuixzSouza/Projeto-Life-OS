"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
// ✅ Importa diretamente o tipo SessionType do $Enums do Prisma Client
import { $Enums } from "@prisma/client"; 

// --- ENUMS E TIPOS DE SESSÃO ---
const SESSION_TYPES = z.enum(["LEITURA", "VIDEO", "EXERCICIO", "REVISAO", "PROJETO"]);

// --- SCHEMAS DE VALIDAÇÃO ---

const SubjectSchema = z.object({
  title: z.string().min(2, "O título deve ter pelo menos 2 caracteres."),
  category: z.string().optional().or(z.literal("")),
  icon: z.string().optional().or(z.literal("")),
  difficulty: z.coerce.number().int().min(1).max(5).default(3),
  goalMinutes: z.coerce.number().int().positive().default(3600),
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
// C: CREATE SUBJECT
// -------------------------------------
export async function createSubject(formData: FormData) {
  try {
    const rawData = {
      title: formData.get("title"),
      category: formData.get("category"),
      icon: formData.get("icon"),
      difficulty: formData.get("difficulty"),
      goalMinutes: formData.get("goalMinutes"),
    };

    const validatedFields = SubjectSchema.safeParse(rawData);

    if (!validatedFields.success) {
      // ✅ Acesso seguro ao erro
      const firstError = validatedFields.error.flatten().fieldErrors.title?.[0] || "Dados inválidos.";
      return { success: false, message: firstError };
    }

    const { title, category, icon, difficulty, goalMinutes } = validatedFields.data;

    const existingSubject = await prisma.studySubject.findFirst({
      where: { title: title } 
    });

    if (existingSubject) {
      return { success: false, message: "Esta matéria já existe!" };
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
// C: LOG SESSION
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
        return { success: false, message: "Dados da sessão inválidos. Verifique duração e foco." };
    }

    const { durationMinutes: validDuration, notes: validNotes, focusLevel: validFocus, type: validType, tags: rawTags } = validated.data;
    
    const processedTags = rawTags ? rawTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
    
    // ✅ CORREÇÃO ENUM: Usamos o tipo correto do Prisma Client
    const sessionTypeEnum = validType as $Enums.SessionType; 

    // 2. Criação
    await prisma.studySession.create({
      data: {
        subjectId,
        durationMinutes: validDuration,
        notes: validNotes || "",
        date: new Date(),
        focusLevel: validFocus,
        type: sessionTypeEnum,
        tags: processedTags.length > 0 ? JSON.stringify(processedTags) : null,
      },
    });

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
// R: GET SUBJECT DETAILS (Read)
// -------------------------------------
export async function getSubjectDetails(subjectId: string) {
  try {
    if (!subjectId || typeof subjectId !== 'string' || !z.string().uuid().safeParse(subjectId).success) {
        return { success: false, message: "ID de matéria inválido." };
    }
      
    // Usamos $queryRaw para calcular a duração total do assunto no MySQL
    const totalDurationResult = await prisma.$queryRaw<[{ totalDuration: bigint }]>`
        SELECT CAST(SUM(durationMinutes) AS SIGNED) as totalDuration
        FROM StudySession
        WHERE subjectId = ${subjectId}
    `;
    
    const totalDuration = Number(totalDurationResult[0]?.totalDuration || 0);

    const [subject, sessions] = await Promise.all([
        prisma.studySubject.findUnique({
            where: { id: subjectId },
            select: { title: true, goalMinutes: true, difficulty: true, icon: true }
        }),
        prisma.studySession.findMany({
            where: { subjectId: subjectId },
            orderBy: { date: 'desc' },
            select: {
                id: true, // ✅ ID da sessão é necessário para exclusão no modal
                durationMinutes: true,
                notes: true,
                date: true,
                focusLevel: true,
                type: true,
                tags: true
            },
        })
    ]);
    
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
            sessions: sessions
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
    };

    const validatedFields = SubjectSchema.safeParse(rawData);

    if (!z.string().uuid().safeParse(id).success || !validatedFields.success) {
        // ✅ Acesso seguro ao erro
        const firstError = validatedFields.error?.flatten().fieldErrors.title?.[0] || "Dados inválidos.";
        return { success: false, message: "ID ou campos inválidos: " + firstError };
    }
    
    const { title, category, icon, difficulty, goalMinutes } = validatedFields.data;

    try {
        await prisma.studySubject.update({
            where: { id: id },
            data: {
                title: title,
                category: category || "Geral",
                icon: icon || null,
                difficulty,
                goalMinutes,
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
// D: DELETE SUBJECT
// -------------------------------------
export async function deleteSubject(subjectId: string) {
  try {
    if (!subjectId || typeof subjectId !== 'string' || !z.string().uuid().safeParse(subjectId).success) {
        return { success: false, message: "ID de matéria inválido. (Null/Empty/Invalid)" };
    }
      
    await prisma.studySubject.delete({
      where: { id: subjectId },
    });
    
    revalidatePath("/studies");
    return { success: true, message: "Matéria removida com sucesso!" };
  } catch (error) {
    console.error("Erro ao deletar matéria:", error);
    return { success: false, message: "Falha ao remover a matéria. Verifique se há registros de tempo associados." };
  }
}


// -------------------------------------
// D: DELETE SESSION
// -------------------------------------
export async function deleteSession(sessionId: string) {
  try {
    if (!sessionId || typeof sessionId !== 'string' || !z.string().uuid().safeParse(sessionId).success) {
        return { success: false, message: "ID de sessão inválido. (Null/Empty/Invalid)" };
    }
      
    await prisma.studySession.delete({
      where: { id: sessionId },
    });
    
    revalidatePath("/studies");
    return { success: true, message: "Histórico removido." };

  } catch (error) {
    console.error("Erro ao deletar sessão:", error);
    return { success: false, message: "Falha ao remover o registro." };
  }
}