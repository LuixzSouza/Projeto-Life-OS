"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/auth";

// Criar Site (Container)
export async function createSite(formData: FormData) {
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;

  const userId = await requireUserId();

  const site = await prisma.managedSite.create({
    data: { name, url, userId }
  });

  // Cria página "home" padrão
  await prisma.sitePage.create({
    data: {
      siteId: site.id,
      slug: "home",
      userId,
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
      userId,
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
  const userId = await requireUserId();
  await prisma.managedSite.deleteMany({ where: { id: siteId, userId } });
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

  const userId = await requireUserId();

  // Garante que o container pertence ao usuário
  const ownedSite = await prisma.managedSite.findFirst({ where: { id: siteId, userId }, select: { id: true } });
  if (!ownedSite) throw new Error("Container não encontrado.");

  // Verifica duplicidade
  const exists = await prisma.sitePage.findFirst({
    where: { siteId, slug }
  });

  if (exists) throw new Error("A rota '/" + slug + "' já está em uso neste container.");

  await prisma.sitePage.create({
    data: {
      siteId,
      slug,
      userId,
      content: "{\n  \"status\": \"novo_endpoint\",\n  \"data\": []\n}"
    }
  });

  revalidatePath("/cms");
}

// Deletar Página/Rota
export async function deletePage(pageId: string) {
  const userId = await requireUserId();
  await prisma.sitePage.deleteMany({ where: { id: pageId, userId } });
  revalidatePath("/cms");
}

// Salvar Conteúdo (Validação Estrita de JSON)
export async function savePageContent(formData: FormData) {
  const pageId = formData.get("pageId") as string;
  const content = formData.get("content") as string;

  const userId = await requireUserId();

  await prisma.sitePage.updateMany({
    where: { id: pageId, userId },
    data: { content }
  });

  revalidatePath("/cms");
}

export async function updateSite(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const url = formData.get("url") as string;

  if (!id || !name) throw new Error("ID e Nome são obrigatórios.");

  const userId = await requireUserId();

  await prisma.managedSite.updateMany({
    where: { id, userId },
    data: { name, url }
  });

  revalidatePath("/cms");
  revalidatePath(`/cms/${id}`);
}


