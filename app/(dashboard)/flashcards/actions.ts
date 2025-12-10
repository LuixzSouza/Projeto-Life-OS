"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Schema de validação
const DeckSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres."),
  category: z.string().optional(),
  description: z.string().optional(),
  subjectId: z.string().optional(),
});

export async function createDeck(formData: FormData) {
  try {
    const rawData = {
      title: formData.get("title"),
      category: formData.get("category"),
      description: formData.get("description"),
      subjectId: formData.get("subjectId") || undefined, // Pega o ID se existir
    };

    const validated = DeckSchema.safeParse(rawData);

    if (!validated.success) {
      return { success: false, message: "Dados inválidos." };
    }

    // Se vier um subjectId vazio string "", converte para undefined
    const subjectId = validated.data.subjectId === "" ? undefined : validated.data.subjectId;

    await prisma.flashcardDeck.create({
      data: {
        title: validated.data.title,
        category: validated.data.category || "Geral",
        description: validated.data.description,
        studySubjectId: subjectId, // ✅ Salva o vínculo
      },
    });

    revalidatePath("/flashcards");
    return { success: true, message: "Baralho criado com sucesso!" };
  } catch (error) {
    console.error("Erro ao criar deck:", error);
    return { success: false, message: "Erro interno ao criar baralho." };
  }
}

export async function deleteDeck(id: string) {
  try {
    await prisma.flashcardDeck.delete({ where: { id } });
    revalidatePath("/flashcards");
    return { success: true, message: "Baralho removido." };
  } catch (error) {
    return { success: false, message: "Erro ao remover baralho." };
  }
}

const CardSchema = z.object({
  deckId: z.string().uuid(),
  term: z.string().min(1, "O termo é obrigatório."),
  definition: z.string().min(1, "A definição é obrigatória."),
});

export async function createCard(deckId: string, formData: FormData) {
  try {
    const rawData = {
      deckId,
      term: formData.get("term"),
      definition: formData.get("definition"),
    };

    const validated = CardSchema.safeParse(rawData);

    if (!validated.success) {
      return { success: false, message: "Campos obrigatórios faltando." };
    }

    await prisma.flashcard.create({
      data: {
        deckId: validated.data.deckId,
        term: validated.data.term,
        definition: validated.data.definition,
        box: 1, // Começa na caixa 1 (novo)
      },
    });

    revalidatePath(`/flashcards/${deckId}/edit`);
    return { success: true, message: "Cartão adicionado!" };
  } catch (error) {
    return { success: false, message: "Erro ao adicionar cartão." };
  }
}

export async function deleteCard(cardId: string, deckId: string) {
  try {
    await prisma.flashcard.delete({ where: { id: cardId } });
    revalidatePath(`/flashcards/${deckId}/edit`);
    return { success: true, message: "Cartão removido." };
  } catch (error) {
    return { success: false, message: "Erro ao remover cartão." };
  }
}