"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// Criar Site (Container)
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
        { 
            system: "Life OS CMS",
            status: "online",
            message: "Edite este JSON via terminal web." 
        },
        null,
        2
      )
    }
  });

  // PREPARAÇÃO: Cria rota padrão para as variáveis de ambiente simuladas (Opcional, mas muito legal)
  await prisma.sitePage.create({
    data: {
      siteId: site.id,
      slug: "env-vars",
      content: JSON.stringify(
        { 
            NEXT_PUBLIC_API_URL: "https://api.exemplo.com",
            DATABASE_USER: "root_admin"
        },
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

// Criar Nova Rota (Página/Endpoint)
export async function createPage(formData: FormData) {
  const siteId = formData.get("siteId") as string;

  const rawSlug = formData.get("slug") as string;
  const slug = rawSlug
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\-]/g, ""); // Limpa caracteres especiais

  if (!slug) throw new Error("O nome da rota não pode estar vazio.");

  // Verifica duplicidade
  const exists = await prisma.sitePage.findFirst({
    where: { siteId, slug }
  });

  if (exists) throw new Error("A rota '/" + slug + "' já está em uso neste container.");

  await prisma.sitePage.create({
    data: {
      siteId,
      slug,
      content: "{\n  \"status\": \"novo_endpoint\",\n  \"data\": []\n}"
    }
  });

  revalidatePath("/cms");
}

// Deletar Página/Rota
export async function deletePage(pageId: string) {
  await prisma.sitePage.delete({ where: { id: pageId } });
  revalidatePath("/cms");
}

// Salvar Conteúdo (Validação Estrita de JSON)
export async function savePageContent(formData: FormData) {
  const pageId = formData.get("pageId") as string;
  const content = formData.get("content") as string;

  // Remova o bloco try/catch com JSON.parse() que tinha aqui!
  // Agora vamos apenas salvar o conteúdo cru (seja JSON, HTML, Texto...)

  await prisma.sitePage.update({
    where: { id: pageId },
    data: { content }
  });

  revalidatePath("/cms");
}

export async function updateSite(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;

  if (!id || !name) throw new Error("ID e Nome são obrigatórios.");

  await prisma.managedSite.update({
    where: { id },
    data: { name, url }
  });

  revalidatePath("/cms");
  revalidatePath(`/cms/${id}`);
}


