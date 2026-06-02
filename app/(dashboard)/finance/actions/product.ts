"use server";

import { requireUserId } from "@/lib/auth";
import { getProductPreview } from "@/lib/product-preview";

interface ProductMetadata {
  title: string;
  image: string;
  price: number | null;
}

// =========================================================
// IMPORTAÇÃO DE PRODUTO POR LINK (Wishlist "Frictionless")
// =========================================================

/**
 * Extrai título, imagem e preço de uma página de produto.
 * Usa a lógica compartilhada: Open Graph + JSON-LD (schema.org/Product)
 * com fallback via Microlink para páginas renderizadas por JavaScript.
 */
export async function fetchProductMetadata(
  url: string
): Promise<{ success: boolean; data?: ProductMetadata; message?: string }> {
  await requireUserId();

  const preview = await getProductPreview(url);
  if (!preview.success) {
    return { success: false, message: preview.message || "Não foi possível ler os dados do produto." };
  }

  return {
    success: true,
    data: {
      title: preview.title || "",
      image: preview.image || "",
      price: preview.price,
    },
  };
}
