/**
 * ============================================================================
 *  CATALOG — Catálogo de PRODUTOS e CATEGORIAS (editável)
 * ============================================================================
 *
 *  Fonte única dos itens vendidos na loja. Quando você fechar com um cliente
 *  real, é AQUI que você troca categorias, produtos, preços e fotos — sem
 *  tocar em componente nenhum.
 *
 *  ▶ Preços são em CENTAVOS (inteiros) para evitar erros de ponto flutuante.
 *    Ex.: R$ 49,90 → `price: 4990`.
 *  ▶ Imagens: use caminhos em /public (ex.: "/produtos/camiseta.webp") ou
 *    Base64/URL. Mantém o app portátil (ver diretrizes do projeto).
 * ============================================================================
 */

export type Currency = "BRL" | "USD" | "EUR";

export interface ProductCategory {
  /** Identificador estável (não muda; usado em URLs e relações). */
  id: string;
  /** Nome exibido. */
  name: string;
  /** Slug para a URL (ex.: "camisetas"). */
  slug: string;
  /** Descrição curta opcional para a página da categoria. */
  description?: string;
  /** Nome do ícone lucide-react (o componente resolve), opcional. */
  icon?: string;
  /** Ordem de exibição (menor primeiro). */
  order?: number;
}

export interface ProductVariant {
  id: string;
  /** Ex.: "P", "M", "G" ou "Azul". */
  label: string;
  /** Ajuste de preço em centavos (pode ser 0 ou negativo). */
  priceDelta?: number;
  /** Estoque desta variação; undefined = sem controle. */
  stock?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  /** id de uma ProductCategory. */
  categoryId: string;
  /** Preço em CENTAVOS. */
  price: number;
  /** Preço "de" (riscado) em centavos, para promoções. Opcional. */
  compareAtPrice?: number;
  currency: Currency;
  /** Descrição curta (card) e longa (página). */
  shortDescription: string;
  description?: string;
  /** Caminhos/URLs de imagem; a primeira é a capa. */
  images: string[];
  /** Selo opcional (ex.: "Novo", "Mais vendido"). */
  badge?: string;
  /** Aparece em destaques da home. */
  featured?: boolean;
  /** Disponível para compra. */
  inStock: boolean;
  /** Palavras-chave para busca/filtro. */
  tags?: string[];
  /** Variações opcionais (tamanho/cor). */
  variants?: ProductVariant[];
}

/**
 * ▼▼▼  EDITE AS CATEGORIAS AQUI  ▼▼▼
 * (dados de exemplo — troque pelos da loja real)
 */
export const categories: ProductCategory[] = [
  { id: "cat-destaque", name: "Destaques", slug: "destaques", icon: "Sparkles", order: 0, description: "Seleção principal da loja." },
  { id: "cat-vestuario", name: "Vestuário", slug: "vestuario", icon: "Shirt", order: 1, description: "Roupas e acessórios." },
  { id: "cat-acessorios", name: "Acessórios", slug: "acessorios", icon: "Watch", order: 2, description: "Complementos e detalhes." },
];

/**
 * ▼▼▼  EDITE OS PRODUTOS AQUI  ▼▼▼
 * (dados de exemplo — troque pelos da loja real)
 */
export const products: Product[] = [
  {
    id: "prod-001",
    name: "Produto Exemplo A",
    slug: "produto-exemplo-a",
    categoryId: "cat-vestuario",
    price: 12990,
    compareAtPrice: 16990,
    currency: "BRL",
    shortDescription: "Descrição curta que aparece no card do produto.",
    description: "Descrição completa exibida na página do produto. Fale de material, medidas e benefícios.",
    images: ["/produtos/placeholder-1.webp"],
    badge: "Mais vendido",
    featured: true,
    inStock: true,
    tags: ["novo", "promoção"],
    variants: [
      { id: "v-p", label: "P" },
      { id: "v-m", label: "M" },
      { id: "v-g", label: "G", priceDelta: 500 },
    ],
  },
  {
    id: "prod-002",
    name: "Produto Exemplo B",
    slug: "produto-exemplo-b",
    categoryId: "cat-acessorios",
    price: 4990,
    currency: "BRL",
    shortDescription: "Outro item de exemplo para preencher a grade.",
    images: ["/produtos/placeholder-2.webp"],
    featured: true,
    inStock: true,
    tags: ["acessório"],
  },
  {
    id: "prod-003",
    name: "Produto Exemplo C",
    slug: "produto-exemplo-c",
    categoryId: "cat-vestuario",
    price: 8990,
    currency: "BRL",
    shortDescription: "Esgotado — demonstra o estado 'sem estoque'.",
    images: ["/produtos/placeholder-3.webp"],
    inStock: false,
    tags: ["clássico"],
  },
];

/* --------------------------------------------------------------------------
 * Helpers de leitura (sem estado; seguros no cliente e no servidor).
 * ------------------------------------------------------------------------ */

const CURRENCY_LOCALE: Record<Currency, string> = {
  BRL: "pt-BR",
  USD: "en-US",
  EUR: "de-DE",
};

/** Formata centavos → texto de moeda. Ex.: formatPrice(4990) → "R$ 49,90". */
export function formatPrice(cents: number, currency: Currency = "BRL"): string {
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency], {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** Percentual de desconto (0–100) quando há compareAtPrice; senão null. */
export function discountPercent(product: Product): number | null {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) return null;
  return Math.round((1 - product.price / product.compareAtPrice) * 100);
}

export function getCategoryBySlug(slug: string): ProductCategory | undefined {
  return categories.find((c) => c.slug === slug);
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(categoryId: string): Product[] {
  return products.filter((p) => p.categoryId === categoryId);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}

/** Categorias ordenadas por `order` (fallback: ordem de declaração). */
export function getSortedCategories(): ProductCategory[] {
  return [...categories].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
}
