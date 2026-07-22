// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

// Serve o anexo de uma reunião (Base64 guardado em MeetingImage, fora da linha do
// Meeting). Protegida: só o dono acessa. Mesma origem → o cookie de sessão é
// enviado pelo <img>. Cache imutável de 1 ano (o id nunca muda de conteúdo).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return new NextResponse("Não autenticado", { status: 401 });

  const img = await prisma.meetingImage.findFirst({
    where: { id, userId },
    select: { mime: true, data: true },
  });
  if (!img) return new NextResponse("Imagem não encontrada", { status: 404 });

  const bytes = Buffer.from(img.data, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": img.mime,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
