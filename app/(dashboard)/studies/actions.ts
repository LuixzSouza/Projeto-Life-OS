"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// --- SCHEMAS DE VALIDAÇÃO ---
const SubjectSchema = z.object({
  title: z.string().min(2, "O título deve ter pelo menos 2 caracteres."),
  category: z.string().optional().or(z.literal("")),
});

const SessionSchema = z.object({
  subjectId: z.string().uuid(),
  durationMinutes: z.number().int().positive("A duração deve ser positiva."),
  notes: z.string().optional(),
});

// --- ACTIONS ---

export async function createSubject(formData: FormData) {
  try {
    // 1. Validação e Transformação dos dados
    const rawData = {
      title: formData.get("title"),
      category: formData.get("category"),
    };

    const validatedFields = SubjectSchema.safeParse(rawData);

    if (!validatedFields.success) {
      return { 
        success: false, 
        message: validatedFields.error.flatten().fieldErrors.title?.[0] || "Dados inválidos." 
      };
    }

    const { title, category } = validatedFields.data;

    // 2. (Opcional) Verificar Autenticação
    // const session = await auth();
    // if (!session) return { success: false, message: "Não autorizado" };

    // 3. Verificar se já existe (Evitar duplicatas)
    const existingSubject = await prisma.studySubject.findFirst({
      where: { title: title } 
    });

    if (existingSubject) {
      return { success: false, message: "Esta matéria já existe!" };
    }

    // 4. Cores do Graph View
    const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    await prisma.studySubject.create({
      data: {
        title,
        category: category || "Geral",
        color: randomColor,
        // userId: session.user.id // Se tiver auth
      },
    });

    revalidatePath("/studies");
    return { success: true, message: "Matéria criada com sucesso!" };

  } catch (error) {
    console.error("Erro em createSubject:", error);
    return { success: false, message: "Erro interno ao criar matéria." };
  }
}

export async function logSession(subjectId: string, durationMinutes: number, notes: string) {
  try {
    // 1. Validação
    const validated = SessionSchema.safeParse({ subjectId, durationMinutes, notes });
    
    if (!validated.success) {
      return { success: false, message: "Dados da sessão inválidos." };
    }

    if (durationMinutes < 1) {
        return { success: false, message: "Tempo muito curto para registrar." };
    }

    // 2. Criação
    const session = await prisma.studySession.create({
      data: {
        subjectId,
        durationMinutes,
        notes: notes || "", // Garante string vazia se null
        date: new Date(),
      },
    });

    // 3. Cálculo de XP (Pode ser usado no frontend para animação)
    const xpGained = durationMinutes * 10;

    revalidatePath("/studies");
    
    return { 
      success: true, 
      message: "Sessão registrada!", 
      data: { xpGained, sessionId: session.id } 
    };

  } catch (error) {
    console.error("Erro em logSession:", error);
    return { success: false, message: "Erro ao salvar sessão." };
  }
}

export async function deleteSession(sessionId: string) {
  try {
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

export async function deleteSubject(subjectId: string) {
  try {
    // ⚠️ ATENÇÃO: Se um Subject for deletado, suas Sessions associadas
    // também precisam ser deletadas (usando CASCADE no Prisma ou aqui).
    // Vou assumir que você tem CASCADE configurado, senão o Prisma bloqueará.
    
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

export async function updateSubject(formData: FormData) {
  const id = formData.get("id") as string;
  const title = formData.get("title") as string;
  const category = formData.get("category") as string;
  
  // ⚠️ Adicione aqui a validação Zod para title e category!

  try {
    await prisma.studySubject.update({
      where: { id: id },
      data: {
        title: title,
        category: category || "Geral",
      },
    });

    revalidatePath("/studies");
    return { success: true, message: "Matéria atualizada!" };
  } catch (error) {
    console.error("Erro ao atualizar matéria:", error);
    return { success: false, message: "Falha ao atualizar a matéria." };
  }
}

export async function getSubjectDetails(subjectId: string) {
  // ⚠️ Adicione aqui a validação Zod para subjectId (se necessário)
  
  try {
    const sessions = await prisma.studySession.findMany({
      where: { subjectId: subjectId },
      orderBy: { date: 'desc' },
      select: {
        durationMinutes: true,
        notes: true,
        date: true,
      },
    });
    
    // Busca o título da matéria (opcional, mas bom para o cabeçalho)
    const subject = await prisma.studySubject.findUnique({
        where: { id: subjectId },
        select: { title: true }
    });
    
    return { 
        success: true, 
        data: {
            subjectTitle: subject?.title || 'Assunto Desconhecido',
            sessions: sessions
        }
    };
  } catch (error) {
    console.error("Erro ao carregar detalhes:", error);
    return { success: false, message: "Não foi possível carregar detalhes." };
  }
}