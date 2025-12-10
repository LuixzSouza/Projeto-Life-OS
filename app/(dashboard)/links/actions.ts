"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const LinkSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  url: z.string().url("URL inválida"),
  description: z.string().optional(),
  imageUrl: z.string().url("URL da imagem inválida").optional().or(z.literal("")),
  category: z.string().optional(),
});

export async function createLink(formData: FormData) {
  const rawData = {
    title: formData.get("title"),
    url: formData.get("url"),
    description: formData.get("description"),
    imageUrl: formData.get("imageUrl"),
    category: formData.get("category"),
  };

  const validated = LinkSchema.safeParse(rawData);

  if (!validated.success) {
    return { success: false, message: "Dados inválidos." };
  }

  try {
    await prisma.savedLink.create({
      data: {
        title: validated.data.title,
        url: validated.data.url,
        description: validated.data.description,
        imageUrl: validated.data.imageUrl,
        category: validated.data.category || "Geral",
      },
    });

    revalidatePath("/links");
    return { success: true, message: "Link salvo!" };
  } catch (error) {
    return { success: false, message: "Erro ao salvar." };
  }
}

export async function deleteLink(id: string) {
  try {
    await prisma.savedLink.delete({ where: { id } });
    revalidatePath("/links");
    return { success: true, message: "Link removido." };
  } catch (error) {
    return { success: false, message: "Erro ao remover." };
  }
}