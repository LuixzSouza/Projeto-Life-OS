// Resolve o token da brapi.dev a partir das Configurações do usuário (cifrado),
// com fallback para a env BRAPI_TOKEN e, por fim, "public" (limitado).
import { prisma } from "@/lib/prisma";
import { decryptKey } from "@/lib/settings-crypto";

export async function getBrapiToken(userId?: string): Promise<string> {
  try {
    if (userId) {
      const s = await prisma.settings.findUnique({ where: { userId }, select: { brapiToken: true } });
      const token = decryptKey(s?.brapiToken)?.trim();
      if (token) return token;
    }
  } catch {
    /* sem settings — cai no fallback */
  }
  return process.env.BRAPI_TOKEN?.trim() || "public";
}

export const isRealBrapiToken = (token: string) => token !== "public" && token.length > 0;
