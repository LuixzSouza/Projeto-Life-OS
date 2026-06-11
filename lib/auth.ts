import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";
import { cache } from "react";
import bcrypt from "bcryptjs";
import { getOrCreateSecret } from "./db-config";

/**
 * Chave de assinatura do JWT. Prioriza `process.env.JWT_SECRET`; em builds
 * desktop sem .env, usa um segredo forte auto-gerado e persistido no config
 * local (estável entre reinícios). Avaliada de forma preguiçosa (não no import).
 */
function getKey(): Uint8Array {
  return new TextEncoder().encode(getOrCreateSecret("JWT_SECRET"));
}

// 1. Definimos a interface do Payload da Sessão
interface SessionPayload extends JWTPayload {
  userId: string;
  expires: Date;
  /** Versão do token (User.tokenVersion). Ausente em sessões antigas = 0. */
  tv?: number;
}

/**
 * tokenVersion atual do usuário, 1 consulta por request (React cache dedupe).
 * Import dinâmico do prisma: o proxy.ts importa decrypt() deste módulo e não
 * deve carregar o client do banco junto.
 * Retornos: número = versão atual; "gone" = usuário apagado (rejeitar);
 * "unavailable" = banco fora do ar (degradar aceitando o token assinado).
 */
const getDbTokenVersion = cache(
  async (userId: string): Promise<number | "gone" | "unavailable"> => {
    try {
      const { prisma } = await import("./prisma");
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tokenVersion: true },
      });
      return user ? user.tokenVersion : "gone";
    } catch {
      return "unavailable";
    }
  }
);

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Sessão dura 7 dias
    .sign(getKey());
}

export async function decrypt(input: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(input, getKey(), {
    algorithms: ["HS256"],
  });
  // Forçamos a tipagem do retorno para nossa interface
  return payload as SessionPayload;
}

// =========================================================
// HASH DE SENHAS (bcryptjs)
// =========================================================

const SALT_ROUNDS = 12;

/** Gera o hash bcrypt de uma senha em texto plano. */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/**
 * Compara uma senha em texto plano com um hash bcrypt.
 * Retorna false (em vez de lançar) se o hash for inválido/legado.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export async function login(userId: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias

  // Embute a versão atual do token: "Desconectar outros dispositivos"
  // incrementa User.tokenVersion e invalida todo cookie com `tv` antigo.
  const { prisma } = await import("./prisma");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenVersion: true },
  });
  const session = await encrypt({ userId, expires, tv: user?.tokenVersion ?? 0 });

  // Salva o cookie
  (await cookies()).set("session", session, { expires, httpOnly: true });
}

export async function logout() {
  (await cookies()).delete("session");
}

export async function getSession(): Promise<SessionPayload | null> {
  const session = (await cookies()).get("session")?.value;
  if (!session) return null;
  try {
    const payload = await decrypt(session);

    // Revogação de sessões: o token só vale se a versão embutida (`tv`) bater
    // com User.tokenVersion. Sessões antigas sem `tv` contam como versão 0.
    const dbVersion = await getDbTokenVersion(payload.userId);
    if (dbVersion === "gone") return null;
    if (dbVersion !== "unavailable" && (payload.tv ?? 0) !== dbVersion) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Retorna o ID do usuário autenticado, ou null se não houver sessão válida.
 * Use em leituras onde a ausência de usuário deve ser tratada de forma suave.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.userId ?? null;
}

/**
 * Retorna o ID do usuário autenticado ou lança um erro.
 * Use em Server Actions (mutações) que SEMPRE exigem um usuário logado.
 * O `proxy.ts` já redireciona rotas não autenticadas, mas isto garante
 * a segurança no nível da camada de dados (defense-in-depth).
 */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) {
    throw new Error("Não autorizado: sessão de usuário não encontrada.");
  }
  return userId;
}