"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/* SCHEMAS ZOD                                                                */
/* -------------------------------------------------------------------------- */

const DeckSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  description: z.string().optional(),
  subjectId: z.string().optional(), 
});

const CardSchema = z.object({
  deckId: z.string().uuid(),
  term: z.string().min(1, "O termo é obrigatório."),
  definition: z.string().min(1, "A definição é obrigatória."),
});

const UpdateCardSchema = z.object({
  cardId: z.string().uuid(),
  term: z.string().min(1, "O termo é obrigatório."),
  definition: z.string().min(1, "A definição é obrigatória."),
});

/* -------------------------------------------------------------------------- */
/* DECK ACTIONS                                                               */
/* -------------------------------------------------------------------------- */

export async function createDeck(formData: FormData) {
  try {
    const userId = await requireUserId();
    const rawData = {
      title: String(formData.get("title") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      subjectId: String(formData.get("subjectId") ?? "").trim(),
    };

    const cleanData = {
      ...rawData,
      description: rawData.description || undefined,
      subjectId: rawData.subjectId || undefined,
    };

    const parsed = DeckSchema.safeParse(cleanData);

    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." };
    }

    await prisma.flashcardDeck.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        studySubjectId: parsed.data.subjectId || null,
        userId,
      },
    });

    revalidatePath("/flashcards");
    return { success: true, message: "Baralho criado com sucesso!" };
  } catch (error) {
    console.error("Erro ao criar deck:", error);
    return { success: false, message: "Erro interno ao criar baralho." };
  }
}

export async function deleteDeck(deckId: string) {
  try {
    const userId = await requireUserId();
    if (!deckId) return { success: false, message: "ID inválido." };

    const res = await prisma.flashcardDeck.deleteMany({
      where: { id: deckId, userId },
    });
    if (res.count === 0) return { success: false, message: "Baralho não encontrado." };

    revalidatePath("/flashcards");
    return { success: true, message: "Baralho removido com sucesso." };
  } catch (error) {
    console.error("Erro ao deletar deck:", error);
    return { success: false, message: "Erro ao remover baralho." };
  }
}

/* -------------------------------------------------------------------------- */
/* CARD ACTIONS                                                               */
/* -------------------------------------------------------------------------- */

export async function createCard(deckId: string, formData: FormData) {
  try {
    const userId = await requireUserId();
    const rawData = {
      deckId,
      term: String(formData.get("term") ?? "").trim(),
      definition: String(formData.get("definition") ?? "").trim(),
    };

    const parsed = CardSchema.safeParse(rawData);

    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Campos inválidos." };
    }

    // Só permite adicionar cartão a um baralho do próprio usuário.
    const deck = await prisma.flashcardDeck.findFirst({
      where: { id: parsed.data.deckId, userId },
      select: { id: true },
    });
    if (!deck) return { success: false, message: "Baralho não encontrado." };

    await prisma.flashcard.create({
      data: {
        deckId: parsed.data.deckId,
        term: parsed.data.term,
        definition: parsed.data.definition,
        box: 1, // Começa na caixa 1 (Novos cartões)
        interval: 0,
        easeFactor: 2.5, // Padrão SM-2
        nextReview: new Date(),
        userId,
      },
    });

    revalidatePath(`/flashcards/${deckId}/edit`);
    return { success: true, message: "Cartão adicionado com sucesso!" };
  } catch (error) {
    console.error("Erro ao criar card:", error);
    return { success: false, message: "Erro ao adicionar cartão." };
  }
}

export async function deleteCard(cardId: string, deckId: string) {
  try {
    const userId = await requireUserId();
    const res = await prisma.flashcard.deleteMany({
      where: { id: cardId, userId },
    });
    if (res.count === 0) return { success: false, message: "Cartão não encontrado." };

    revalidatePath(`/flashcards/${deckId}/edit`);
    return { success: true, message: "Cartão removido com sucesso." };
  } catch (error) {
    console.error("Erro ao remover card:", error);
    return { success: false, message: "Erro ao remover cartão." };
  }
}

export async function updateCard(deckId: string, formData: FormData) {
  try {
    const rawData = {
      cardId: String(formData.get("cardId")),
      term: String(formData.get("term")),
      definition: String(formData.get("definition")),
    };

    const parsed = UpdateCardSchema.safeParse(rawData);

    if (!parsed.success) {
      return { success: false, message: "Dados inválidos." };
    }

    const userId = await requireUserId();
    const res = await prisma.flashcard.updateMany({
      where: { id: parsed.data.cardId, userId },
      data: {
        term: parsed.data.term,
        definition: parsed.data.definition,
      },
    });
    if (res.count === 0) return { success: false, message: "Cartão não encontrado." };

    revalidatePath(`/flashcards/${deckId}/edit`);
    return { success: true, message: "Cartão atualizado!" };
  } catch (error) {
    console.error("Erro ao atualizar card:", error);
    return { success: false, message: "Erro ao atualizar cartão." };
  }
}

/* -------------------------------------------------------------------------- */
/* REPETIÇÃO ESPAÇADA (ALGORITMO SM-2 ADAPTADO)                               */
/* -------------------------------------------------------------------------- */

type ReviewRating = "AGAIN" | "HARD" | "GOOD" | "EASY";

export async function reviewFlashcard(cardId: string, rating: ReviewRating) {
  try {
    const userId = await requireUserId();
    const card = await prisma.flashcard.findFirst({
      where: { id: cardId, userId }
    });

    if (!card) return { success: false, message: "Cartão não encontrado." };

    let { interval, easeFactor, box } = card;
    const nextReview = new Date();

    // Mapeamento da nota (0 a 3) para o cálculo do SM-2
    // AGAIN = 0, HARD = 1, GOOD = 2, EASY = 3
    const q = rating === "AGAIN" ? 0 : rating === "HARD" ? 1 : rating === "GOOD" ? 2 : 3;

    if (q === 0) {
      // Se errou (AGAIN), volta para a estaca zero
      box = 1;
      interval = 1; // 1 dia (ou pode ser 0 para rever no mesmo dia)
      easeFactor = Math.max(1.3, easeFactor - 0.20); 
    } else {
      // Se acertou (HARD, GOOD, EASY)
      if (box === 1) {
        interval = 1;
      } else if (box === 2) {
        interval = 6;
      } else {
        interval = Math.round(interval * easeFactor);
      }
      box += 1;
      
      // Ajusta o Ease Factor baseado na facilidade
      // easeFactor = easeFactor + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02))
      const easeModifier = 0.1 - (3 - q) * (0.08 + (3 - q) * 0.02);
      easeFactor = Math.max(1.3, easeFactor + easeModifier);
    }

    // Calcula a próxima data de revisão baseada no intervalo em dias
    nextReview.setDate(nextReview.getDate() + interval);

    await prisma.flashcard.updateMany({
      where: { id: cardId, userId },
      data: {
        interval,
        easeFactor,
        box,
        nextReview,
        // Opcional: Se você tiver um campo lastReviewed no seu schema
        // lastReviewed: new Date()
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Erro ao registrar revisão:", error);
    return { success: false, message: "Erro ao salvar o progresso." };
  }
}