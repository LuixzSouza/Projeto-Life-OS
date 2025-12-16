"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/* -------------------------------------------------------------------------- */
/*                               SCHEMAS ZOD                                  */
/* -------------------------------------------------------------------------- */

const DeckSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  category: z.string().optional(),
  description: z.string().optional(),
  subjectId: z.string().optional(),
});

const CardSchema = z.object({
  deckId: z.string().uuid(),
  term: z.string().min(1, "O termo é obrigatório."),
  definition: z.string().min(1, "A definição é obrigatória."),
});

/* -------------------------------------------------------------------------- */
/*                              DECK ACTIONS                                  */
/* -------------------------------------------------------------------------- */

export async function createDeck(formData: FormData) {
  try {
    const rawData = {
      title: String(formData.get("title") ?? "").trim(),
      category: String(formData.get("category") ?? "").trim() || undefined,
      description: String(formData.get("description") ?? "").trim() || undefined,
      subjectId: String(formData.get("subjectId") ?? "").trim() || undefined,
    };

    const parsed = DeckSchema.safeParse(rawData);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Dados inválidos.",
      };
    }

    await prisma.flashcardDeck.create({
      data: {
        title: parsed.data.title,
        category: parsed.data.category ?? "Geral",
        description: parsed.data.description,
        studySubjectId: parsed.data.subjectId || null,
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
    await prisma.flashcardDeck.delete({
      where: { id: deckId },
    });

    revalidatePath("/flashcards");

    return { success: true, message: "Baralho removido com sucesso." };
  } catch (error) {
    console.error("Erro ao deletar deck:", error);
    return { success: false, message: "Erro ao remover baralho." };
  }
}

/* -------------------------------------------------------------------------- */
/*                              CARD ACTIONS                                  */
/* -------------------------------------------------------------------------- */

export async function createCard(deckId: string, formData: FormData) {
  try {
    const rawData = {
      deckId,
      term: String(formData.get("term") ?? "").trim(),
      definition: String(formData.get("definition") ?? "").trim(),
    };

    const parsed = CardSchema.safeParse(rawData);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Campos inválidos.",
      };
    }

    await prisma.flashcard.create({
      data: {
        deckId: parsed.data.deckId,
        term: parsed.data.term,
        definition: parsed.data.definition,
        box: 1, // Leitner: começa na caixa 1
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
    await prisma.flashcard.delete({
      where: { id: cardId },
    });

    revalidatePath(`/flashcards/${deckId}/edit`);

    return { success: true, message: "Cartão removido com sucesso." };
  } catch (error) {
    console.error("Erro ao remover card:", error);
    return { success: false, message: "Erro ao remover cartão." };
  }
}
