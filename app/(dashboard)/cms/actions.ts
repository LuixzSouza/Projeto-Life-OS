"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Criar Site
export async function createSite(formData: FormData) {
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;

  await prisma.managedSite.create({
    data: { name, url }
  });

  revalidatePath("/cms");
}

// Criar/Atualizar Página
export async function savePageContent(formData: FormData) {
  const siteId = formData.get("siteId") as string;
  const slug = formData.get("slug") as string;
  const content = formData.get("content") as string;

  // Verifica se é um JSON válido antes de salvar
  try {
    JSON.parse(content);
  } catch (e) {
    throw new Error("JSON Inválido! Corrija a sintaxe.");
  }

  // Upsert: Atualiza se existir, Cria se não existir
  const existingPage = await prisma.sitePage.findFirst({
    where: { siteId, slug }
  });

  if (existingPage) {
    await prisma.sitePage.update({
      where: { id: existingPage.id },
      data: { content }
    });
  } else {
    await prisma.sitePage.create({
      data: { siteId, slug, content }
    });
  }

  revalidatePath(`/cms`);
}