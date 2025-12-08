"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Criar Site
export async function createSite(formData: FormData) {
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;

  const site = await prisma.managedSite.create({
    data: { name, url }
  });

  // Cria página "home" padrão
  await prisma.sitePage.create({
    data: {
      siteId: site.id,
      slug: "home",
      content: JSON.stringify(
        { title: "Bem vindo", description: "Edite este JSON no Life OS" },
        null,
        2
      )
    }
  });

  revalidatePath("/cms");
}

// Deletar Site
export async function deleteSite(siteId: string) {
  await prisma.managedSite.delete({ where: { id: siteId } });
  revalidatePath("/cms");
}

// Criar Nova Página (Slug automático)
export async function createPage(formData: FormData) {
  const siteId = formData.get("siteId") as string;

  const rawSlug = formData.get("slug") as string;
  const slug = rawSlug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, ""); // opcional: limpa caracteres especiais

  // Verifica duplicidade
  const exists = await prisma.sitePage.findFirst({
    where: { siteId, slug }
  });

  if (exists) throw new Error("Essa página já existe neste site.");

  await prisma.sitePage.create({
    data: {
      siteId,
      slug,
      content: "{\n  \"message\": \"Novo conteúdo...\"\n}"
    }
  });

  revalidatePath("/cms");
}

// Deletar Página
export async function deletePage(pageId: string) {
  await prisma.sitePage.delete({ where: { id: pageId } });
  revalidatePath("/cms");
}

// Salvar Conteúdo (JSON)
export async function savePageContent(formData: FormData) {
  const pageId = formData.get("pageId") as string;
  const content = formData.get("content") as string;

  // Valida JSON
  try {
    JSON.parse(content);
  } catch {
    throw new Error("JSON Inválido. Corrija a sintaxe antes de salvar.");
  }

  await prisma.sitePage.update({
    where: { id: pageId },
    data: { content }
  });

  revalidatePath("/cms");
}
