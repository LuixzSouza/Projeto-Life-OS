"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as cheerio from "cheerio"; // Certifique-se de ter instalado: npm install cheerio
import { requireUserId } from "@/lib/auth";

// Schema de Validação
const LinkSchema = z.object({
  title: z.string().min(1, "Título obrigatório"),
  url: z.string().url("URL inválida"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  category: z.string().optional(),
});

// --- 1. BUSCAR METADADOS (Scraping) ---
export async function fetchMetadata(url: string) {
  try {
    // Usamos um User-Agent de navegador real para evitar bloqueios em sites protegidos
    const response = await fetch(url, { 
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' 
      },
      next: { revalidate: 3600 } 
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);

    // Tenta pegar Open Graph tags, se falhar pega tags normais
    const title = $('meta[property="og:title"]').attr('content') || $('title').text() || "";
    const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || "";
    const image = $('meta[property="og:image"]').attr('content') || "";

    return { success: true, data: { title, description, image } };
  } catch (error) {
    console.error("Erro ao buscar metadata:", error);
    return { success: false, data: null };
  }
}

// --- 2. CRIAR LINK ---
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
    const userId = await requireUserId();
    await prisma.savedLink.create({
      data: {
        title: validated.data.title,
        url: validated.data.url,
        description: validated.data.description,
        imageUrl: validated.data.imageUrl || null, // Garante null se vazio
        category: validated.data.category || "Geral",
        userId,
      },
    });

    revalidatePath("/links");
    return { success: true, message: "Link salvo com sucesso!" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao salvar no banco." };
  }
}

// --- 3. ATUALIZAR LINK (NOVO) ---
export async function updateLink(id: string, formData: FormData) {
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
    const userId = await requireUserId();
    await prisma.savedLink.updateMany({
      where: { id, userId },
      data: {
        title: validated.data.title,
        url: validated.data.url,
        description: validated.data.description,
        imageUrl: validated.data.imageUrl || null,
        category: validated.data.category || "Geral",
      },
    });

    revalidatePath("/links");
    return { success: true, message: "Link atualizado com sucesso!" };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao atualizar o link." };
  }
}

// --- VERIFICAÇÃO DE SAÚDE DOS LINKS (detecta links quebrados/offline) ---
export type LinkHealth = {
  statusById: Record<string, "ok" | "broken">;
  brokenIds: string[];
  checked: number;
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Sonda um único URL: HEAD com fallback para GET, com timeout.
async function probeLink(url: string): Promise<boolean> {
  const target = url.startsWith("http") ? url : `https://${url}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    let res = await fetch(target, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": BROWSER_UA },
      cache: "no-store",
    });
    // Muitos servidores não implementam HEAD — tenta GET nesses casos.
    if (res.status === 405 || res.status === 501 || res.status === 403) {
      res = await fetch(target, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": BROWSER_UA },
        cache: "no-store",
      });
    }
    return res.status < 400;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkLinksHealth(): Promise<LinkHealth> {
  const userId = await requireUserId();
  const links = await prisma.savedLink.findMany({
    where: { userId, deletedAt: null },
    select: { id: true, url: true },
  });

  const statusById: Record<string, "ok" | "broken"> = {};
  const brokenIds: string[] = [];

  await Promise.all(
    links.map(async (l) => {
      const ok = await probeLink(l.url);
      statusById[l.id] = ok ? "ok" : "broken";
      if (!ok) brokenIds.push(l.id);
    })
  );

  return { statusById, brokenIds, checked: links.length };
}

// --- FAVORITO (1 clique no card; campo existia no schema sem UI) ---
export async function toggleLinkFavorite(id: string, isFavorite: boolean) {
  try {
    const userId = await requireUserId();
    await prisma.savedLink.updateMany({ where: { id, userId, deletedAt: null }, data: { isFavorite } });
    revalidatePath("/links");
    return { success: true };
  } catch (error) {
    console.error("Erro ao favoritar link:", error);
    return { success: false };
  }
}

// --- 4. REMOVER LINK ---
export async function deleteLink(id: string) {
  try {
    const userId = await requireUserId();
    await prisma.savedLink.updateMany({ where: { id, userId }, data: { deletedAt: new Date() } });
    revalidatePath("/links");
    return { success: true, message: "Link movido para a lixeira." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao remover." };
  }
}