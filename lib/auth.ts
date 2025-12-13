import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = "LIFE_OS_SECRET_KEY_CHANGE_ME"; // Em produção, use process.env
const key = new TextEncoder().encode(SECRET_KEY);

// 1. Definimos a interface do Payload da Sessão
interface SessionPayload extends JWTPayload {
  userId: string;
  expires: Date;
}

export async function encrypt(payload: SessionPayload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // Sessão dura 7 dias
    .sign(key);
}

export async function decrypt(input: string): Promise<SessionPayload> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ["HS256"],
  });
  // Forçamos a tipagem do retorno para nossa interface
  return payload as SessionPayload;
}

export async function login(userId: string) {
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
  
  // Agora o objeto corresponde à interface SessionPayload
  const session = await encrypt({ userId, expires });

  // Salva o cookie
  (await cookies()).set("session", session, { expires, httpOnly: true });
}

export async function logout() {
  (await cookies()).delete("session");
}

export async function getSession(): Promise<SessionPayload | null> {
  const session = (await cookies()).get("session")?.value;
  if (!session) return null;
  return await decrypt(session);
}