// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// API pública de entrega: sites externos consomem via fetch() do NAVEGADOR, então
// PRECISA de CORS — sem `Access-Control-Allow-Origin` o browser bloqueia a resposta
// mesmo com 200. É read-only e semi-pública (a chave vai na URL), logo liberar "*".
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=10" },
  });
}

// Preflight CORS (o navegador dispara OPTIONS antes de fetches cross-origin).
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ apiKey: string; slug: string }> },
) {
  const { apiKey, slug } = await params;

  // 1. Valida o site pela API Key (só o id/slug — sem arrastar linhas de páginas).
  const site = await prisma.managedSite.findUnique({
    where: { apiKey },
    select: { id: true },
  });
  if (!site) {
    return json({ error: "Site não encontrado ou API Key inválida" }, 401);
  }

  // 2. Busca o conteúdo da página solicitada.
  const page = await prisma.sitePage.findFirst({
    where: { siteId: site.id, slug },
    select: { content: true },
  });
  if (!page) {
    return json({ error: "Página não encontrada" }, 404);
  }

  // 3. Entrega o JSON. Se o conteúdo (por dado legado) não for JSON válido, NÃO
  // derruba o endpoint com 500 — devolve o texto cru como fallback, então a rota
  // sempre entrega algo. Conteúdo novo já é validado no save (savePageContent).
  const raw = page.content ?? "";
  try {
    return json(JSON.parse(raw));
  } catch {
    return new NextResponse(raw, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=10",
      },
    });
  }
}
