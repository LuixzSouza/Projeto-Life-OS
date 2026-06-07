import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";
import { NextResponse } from "next/server";

// Serve a imagem incorporada de uma nota (Base64 guardado em NoteImage).
// Protegida: só o dono acessa. Mesma origem → o cookie de sessão é enviado pelo <img>.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  if (!userId) return new NextResponse("Não autenticado", { status: 401 });

  const img = await prisma.noteImage.findFirst({
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
