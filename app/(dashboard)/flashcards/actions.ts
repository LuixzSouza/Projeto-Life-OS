"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";
import { scheduleReview, type ReviewRating } from "@/lib/srs";
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

// Limite de imagem em base64 (~4.5MB) — folga abaixo do bodySizeLimit de 5MB do
// Server Action (next.config). Sem isto, uma foto grande estoura o limite e a
// criação falha em silêncio.
const MAX_IMAGE_CHARS = 4_500_000;

/** Normaliza o campo de imagem do formulário: data URL base64 válida ou null. */
function readImageField(formData: FormData): { value: string | null; error?: string } {
  const raw = String(formData.get("image") ?? "").trim();
  if (!raw) return { value: null };
  if (!raw.startsWith("data:image/")) return { value: null }; // ignora lixo, não quebra
  if (raw.length > MAX_IMAGE_CHARS) {
    return { value: null, error: "Imagem muito grande (máx. ~4MB). Tente uma menor." };
  }
  return { value: raw };
}

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

    const image = readImageField(formData);
    if (image.error) return { success: false, message: image.error };

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
        imageUrl: image.value,
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

    const image = readImageField(formData);
    if (image.error) return { success: false, message: image.error };

    const userId = await requireUserId();
    const res = await prisma.flashcard.updateMany({
      where: { id: parsed.data.cardId, userId },
      data: {
        term: parsed.data.term,
        definition: parsed.data.definition,
        imageUrl: image.value,
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
/* GERAÇÃO COM IA (tema ou texto colado → cartões neste baralho)              */
/* -------------------------------------------------------------------------- */

export interface GenerateCardsResult {
  success: boolean;
  message: string;
  count?: number;
}

export async function generateDeckCardsWithAi(
  deckId: string,
  source: string,
  count = 8,
  images: string[] = [],
): Promise<GenerateCardsResult> {
  try {
    const userId = await requireUserId();

    // Só gera no baralho do próprio usuário (evita IDOR pelo deckId).
    const deck = await prisma.flashcardDeck.findFirst({
      where: { id: deckId, userId },
      select: { id: true, title: true },
    });
    if (!deck) return { success: false, message: "Baralho não encontrado." };

    const text = String(source ?? "").trim();

    // Só imagens válidas (data URL) e dentro do limite de tamanho. Visão é
    // opcional: com imagem, o texto vira contexto e pode ficar vazio.
    const validImages = (Array.isArray(images) ? images : [])
      .filter((u) => typeof u === "string" && u.startsWith("data:image/") && u.length <= MAX_IMAGE_CHARS)
      .slice(0, 4);

    if (text.length < 12 && validImages.length === 0) {
      return { success: false, message: "Descreva o tema, cole um texto ou anexe uma imagem." };
    }

    // Import dinâmico: o motor de IA é pesado e só carrega quando realmente gera.
    const { aiCardsFromText } = await import("@/lib/ai-creative");
    const result = await aiCardsFromText(userId, deck.title || "Estudo", text, count, validImages);
    if (result.erro) return { success: false, message: result.erro };

    const cards = result.cards ?? [];
    if (cards.length === 0) {
      return { success: false, message: "Nenhum cartão aproveitável foi gerado. Tente um tema mais específico." };
    }

    // Grava já na fila de revisão (nextReview = agora) com os padrões do SRS.
    await prisma.$transaction(
      cards.map((c) =>
        prisma.flashcard.create({
          data: {
            term: c.term,
            definition: c.definition,
            deckId: deck.id,
            userId,
            box: 1,
            interval: 0,
            easeFactor: 2.5,
            nextReview: new Date(),
          },
          select: { id: true },
        }),
      ),
    );

    revalidatePath(`/flashcards/${deckId}/edit`);
    revalidatePath("/flashcards");
    return {
      success: true,
      message: `${cards.length} ${cards.length === 1 ? "cartão gerado" : "cartões gerados"} pela IA!`,
      count: cards.length,
    };
  } catch (error) {
    console.error("Erro ao gerar cartões com IA:", error);
    return { success: false, message: "Erro interno ao gerar cartões." };
  }
}

/* -------------------------------------------------------------------------- */
/* REPETIÇÃO ESPAÇADA (motor em lib/srs.ts — compartilhado com a tela)        */
/* -------------------------------------------------------------------------- */

export async function reviewFlashcard(cardId: string, rating: ReviewRating) {
  try {
    const userId = await requireUserId();
    const card = await prisma.flashcard.findFirst({
      where: { id: cardId, userId },
      select: { id: true, box: true, easeFactor: true, interval: true },
    });

    if (!card) return { success: false, message: "Cartão não encontrado." };

    // Todo o cálculo do agendamento vive em lib/srs.ts — a MESMA função que a
    // tela usa para mostrar a prévia do intervalo. Aqui só persistimos.
    const schedule = scheduleReview(card, rating);

    await prisma.flashcard.updateMany({
      where: { id: cardId, userId },
      data: {
        interval: schedule.interval,
        easeFactor: schedule.easeFactor,
        box: schedule.box,
        nextReview: schedule.nextReview,
        // Antes ficavam de fora — sem eles as estatísticas (último estudo,
        // total de revisões) nunca saíam do zero.
        lastReviewed: new Date(),
        reviewCount: { increment: 1 },
      },
    });

    return { success: true, interval: schedule.interval };
  } catch (error) {
    console.error("Erro ao registrar revisão:", error);
    return { success: false, message: "Erro ao salvar o progresso." };
  }
}