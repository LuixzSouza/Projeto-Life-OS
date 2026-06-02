// Extração de metadados de produtos a partir de um link (server-side).
// Usado pela Wishlist (finanças) e pelo Closet (guarda-roupa).
//
// Estratégia em camadas para máxima taxa de sucesso:
//   1. Fetch direto com headers de navegador real → Open Graph + JSON-LD (schema.org/Product).
//   2. Fallback via Microlink (renderiza a página) quando não há imagem.
// Lojas com proteção anti-bot agressiva (ex: Akamai/Nike) podem bloquear tudo;
// nesse caso retornamos uma mensagem clara orientando os caminhos alternativos.

import * as cheerio from "cheerio";

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
};

export interface ProductPreview {
  success: boolean;
  message?: string;
  title: string | null;
  image: string | null;
  price: number | null;
  brand: string | null;
}

// Converte "R$ 1.234,56" / "1,234.56" / "1234.56" em número.
export function parsePriceString(raw?: string | null): number | null {
  if (!raw) return null;
  let s = String(raw).replace(/[^\d.,]/g, "").trim();
  if (!s) return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");

  if (hasDot && hasComma) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    s = s.replace(",", ".");
  }

  const n = parseFloat(s);
  return isNaN(n) || n <= 0 ? null : n;
}

// --- Helpers de tipagem segura (sem `any`) ---
function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}
function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function absolutize(img: string, origin: string): string {
  if (img.startsWith("//")) return "https:" + img;
  try {
    return new URL(img, origin).toString();
  } catch {
    return img;
  }
}

interface JsonLdResult {
  image?: string;
  title?: string;
  brand?: string;
  price?: number;
}

// Varre todos os blocos JSON-LD procurando dados de produto (image/name/brand/offers.price).
function extractFromJsonLd($: cheerio.CheerioAPI): JsonLdResult {
  const out: JsonLdResult = {};
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const el of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse($(el).contents().text());
    } catch {
      continue;
    }

    const stack: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];
    let guard = 0;

    while (stack.length && guard < 500) {
      guard++;
      const node = asRecord(stack.shift());
      if (!node) continue;

      // Desce em @graph e objetos aninhados
      const graph = node["@graph"];
      if (Array.isArray(graph)) stack.push(...graph);

      if (!out.image && node.image !== undefined) {
        const img = node.image;
        if (typeof img === "string") out.image = img;
        else if (Array.isArray(img) && img.length) {
          out.image = typeof img[0] === "string" ? img[0] : asString(asRecord(img[0])?.url) || undefined;
        } else {
          out.image = asString(asRecord(img)?.url) || undefined;
        }
      }

      if (!out.title) out.title = asString(node.name) || out.title;

      if (!out.brand && node.brand !== undefined) {
        out.brand = typeof node.brand === "string" ? node.brand : asString(asRecord(node.brand)?.name) || undefined;
      }

      if (out.price == null && node.offers !== undefined) {
        const offers = Array.isArray(node.offers) ? node.offers[0] : node.offers;
        const offerRec = asRecord(offers);
        const raw = offerRec?.price ?? offerRec?.lowPrice ?? node.price;
        if (raw != null) out.price = parsePriceString(String(raw)) ?? undefined;
      }

      // Empilha objetos aninhados para encontrar o Product em profundidade
      for (const key of Object.keys(node)) {
        const v = node[key];
        if (v && typeof v === "object") stack.push(v);
      }
    }
  }

  return out;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(url, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.text()).slice(0, 1_500_000);
  } catch {
    return null;
  }
}

// Fallback: serviço Microlink renderiza a página e devolve metadados.
async function fetchViaMicrolink(url: string): Promise<JsonLdResult> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return {};

    const json: unknown = await res.json();
    const root = asRecord(json);
    if (root?.status !== "success") return {};
    const data = asRecord(root.data);
    if (!data) return {};

    const image = asString(asRecord(data.image)?.url);
    return {
      title: asString(data.title) || undefined,
      image: image || undefined,
      brand: asString(data.publisher) || undefined,
    };
  } catch {
    return {};
  }
}

export async function getProductPreview(rawUrl: string): Promise<ProductPreview> {
  const empty = { title: null, image: null, price: null, brand: null };

  if (!rawUrl || typeof rawUrl !== "string") {
    return { success: false, message: "Informe um link válido.", ...empty };
  }

  let url: URL;
  try {
    url = new URL(rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`);
  } catch {
    return { success: false, message: "Link inválido.", ...empty };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { success: false, message: "Apenas links http/https são suportados.", ...empty };
  }

  let title: string | null = null;
  let image: string | null = null;
  let price: number | null = null;
  let brand: string | null = null;

  // 1. Fetch direto + parsing
  const html = await fetchHtml(url.toString());
  if (html) {
    const $ = cheerio.load(html);

    title =
      $('meta[property="og:title"]').attr("content")?.trim() ||
      $('meta[name="twitter:title"]').attr("content")?.trim() ||
      $("title").first().text().trim() ||
      null;

    image =
      $('meta[property="og:image"]').attr("content")?.trim() ||
      $('meta[property="og:image:secure_url"]').attr("content")?.trim() ||
      $('meta[name="twitter:image"]').attr("content")?.trim() ||
      $('meta[name="twitter:image:src"]').attr("content")?.trim() ||
      $('link[rel="image_src"]').attr("href")?.trim() ||
      $('meta[itemprop="image"]').attr("content")?.trim() ||
      null;

    brand =
      $('meta[property="og:site_name"]').attr("content")?.trim() ||
      $('meta[property="product:brand"]').attr("content")?.trim() ||
      null;

    price = parsePriceString(
      $('meta[property="product:price:amount"]').attr("content") ||
        $('meta[property="og:price:amount"]').attr("content") ||
        $('meta[itemprop="price"]').attr("content") ||
        $('[itemprop="price"]').first().attr("content") ||
        $('[itemprop="price"]').first().text() ||
        ""
    );

    // Completa com JSON-LD (mais confiável em e-commerce)
    const ld = extractFromJsonLd($);
    image = image || ld.image || null;
    title = title || ld.title || null;
    brand = brand || ld.brand || null;
    price = price ?? ld.price ?? null;

    if (image) image = absolutize(image, url.origin);
  }

  // 2. Fallback Microlink quando não achou imagem
  if (!image) {
    const ml = await fetchViaMicrolink(url.toString());
    image = ml.image || null;
    title = title || ml.title || null;
    brand = brand || ml.brand || null;
  }

  if (!image && !title) {
    return {
      success: false,
      message: "Esta loja bloqueia importação automática. Cole a URL direta da imagem ou use a câmera/galeria.",
      ...empty,
    };
  }

  return {
    success: true,
    title: title?.replace(/\s+/g, " ").slice(0, 120) || null,
    image,
    price,
    brand: brand?.slice(0, 60) || null,
  };
}

// Baixa a imagem e converte para base64 (persiste a foto e evita CORS no cliente).
// Retorna a URL original se falhar ou se a imagem for grande demais.
export async function inlineImageAsBase64(imageUrl: string, maxBytes = 2_000_000): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const res = await fetch(imageUrl, {
      headers: { "User-Agent": BROWSER_HEADERS["User-Agent"] },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return imageUrl;

    const type = res.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) return imageUrl;

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > maxBytes) return imageUrl;

    return `data:${type};base64,${buf.toString("base64")}`;
  } catch {
    return imageUrl;
  }
}
