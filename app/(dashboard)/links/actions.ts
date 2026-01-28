"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as cheerio from "cheerio"; // Certifique-se de ter instalado: npm install cheerio

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
    await prisma.savedLink.create({
      data: {
        title: validated.data.title,
        url: validated.data.url,
        description: validated.data.description,
        imageUrl: validated.data.imageUrl || null, // Garante null se vazio
        category: validated.data.category || "Geral",
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
    await prisma.savedLink.update({
      where: { id },
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

// --- 4. REMOVER LINK ---
export async function deleteLink(id: string) {
  try {
    await prisma.savedLink.delete({ where: { id } });
    revalidatePath("/links");
    return { success: true, message: "Link removido." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Erro ao remover." };
  }
}