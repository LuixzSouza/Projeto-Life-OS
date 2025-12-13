import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  // MUDANÇA 1: O tipo agora é uma Promise
  { params }: { params: Promise<{ apiKey: string; slug: string }> }
) {
  // MUDANÇA 2: Precisamos aguardar (await) os parâmetros antes de usar
  const { apiKey, slug } = await params;

  // 1. Valida se o site existe pela API Key
  const site = await prisma.managedSite.findUnique({
    where: { apiKey },
  });

  if (!site) {
    return NextResponse.json({ error: "Site não encontrado ou API Key inválida" }, { status: 401 });
  }

  // 2. Busca o conteúdo da página solicitada
  const page = await prisma.sitePage.findFirst({
    where: {
      siteId: site.id,
      slug: slug,
    },
  });

  if (!page) {
    return NextResponse.json({ error: "Página não encontrada" }, { status: 404 });
  }

  // 3. Retorna o JSON puro para o site externo consumir
  try {
    const jsonContent = JSON.parse(page.content);
    return NextResponse.json(jsonContent);
  } catch (e) {
    return NextResponse.json({ error: "Erro na formatação do JSON interno" }, { status: 500 });
  }
}