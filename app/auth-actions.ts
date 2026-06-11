"use server";

import { prisma } from "@/lib/prisma";
import { login, logout, verifyPassword, hashPassword } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { isSystemInstalled, isRegistrationOpen } from "@/lib/db-config";
import { validatePasswordStrength } from "@/lib/password-policy";
import { isLoginBlocked, registerLoginFailure, clearLoginFailures } from "@/lib/rate-limit";

/** IP + dispositivo da requisição atual (para rate-limit e log de acessos). */
async function requestFingerprint(): Promise<{ ip: string; userAgent: string }> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "local";
  const userAgent = h.get("user-agent") ?? "desconhecido";
  return { ip, userAgent };
}

/** Registro de acesso (aba Segurança) — best-effort, nunca trava o login. */
async function logAccess(userId: string, action: "LOGIN" | "REGISTER", ip: string, userAgent: string) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        module: "auth",
        summary: `${action === "LOGIN" ? "Login" : "Conta criada"} de ${ip}`,
        meta: JSON.stringify({ ip, userAgent }),
      },
    });
  } catch (e) {
    console.warn("[auth] falha ao registrar acesso:", e);
  }
}

// 1. Definimos o tipo do estado (pode ser um erro ou nulo)
export type AuthState = {
  error?: string;
  message?: string;
} | null;

export async function authenticate(prevState: AuthState, formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    // 2. Verificação de Segurança de Instalação
    if (!isSystemInstalled()) {
        return { error: "Sistema não instalado. Acesse /setup." };
    }

    // 2.5 Rate-limit (força bruta): 5 falhas por email+IP a cada 10 minutos.
    const { ip, userAgent } = await requestFingerprint();
    const rateKey = `login:${email}:${ip}`;
    const block = isLoginBlocked(rateKey);
    if (block.blocked) {
      return { error: `Muitas tentativas. Tente novamente em ${block.retryMinutes} min.` };
    }

    // 3. Busca o usuário no banco
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // 4. Verifica senha (hash bcrypt)
    if (!user || !(await verifyPassword(password, user.password))) {
      registerLoginFailure(rateKey);
      return { error: "Email ou senha incorretos." };
    }

    // 5. Cria a sessão
    clearLoginFailures(rateKey);
    await login(user.id);
    await logAccess(user.id, "LOGIN", ip, userAgent);

  } catch (error) {
    // Tratamento específico para o erro de redirecionamento do Next.js
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
        throw error;
    }
    
    console.error("Erro de Autenticação:", error);
    return { error: "Erro no servidor. Tente novamente." };
  }

  // 6. Redirecionamento (Sucesso)
  // Fora do try/catch para evitar conflito com o Next.js
  redirect("/dashboard");
}

/**
 * Cadastro de uma NOVA conta num sistema já instalado (ex.: um amigo testando).
 * Não mexe na configuração do banco (isso é do /setup); só cria o usuário e suas
 * Settings padrão, isolados por `userId`. Loga e manda pro dashboard.
 */
export async function register(prevState: AuthState, formData: FormData) {
  const name = ((formData.get("name") as string) || "").trim();
  // Não normalizamos o case do email: o login (authenticate) compara como digitado.
  const email = ((formData.get("email") as string) || "").trim();
  const password = (formData.get("password") as string) || "";

  // O PRIMEIRO usuário é criado no /setup (que também configura o banco).
  if (!isSystemInstalled()) {
    return { error: "Sistema não instalado. Acesse /setup para a configuração inicial." };
  }
  // Instância pode estar fechada para novos cadastros (uso pessoal).
  if (!isRegistrationOpen()) {
    return { error: "O cadastro de novas contas está desativado neste sistema." };
  }
  if (!name || !email || !password) {
    return { error: "Preencha nome, email e senha." };
  }
  const pw = validatePasswordStrength(password);
  if (!pw.valid) {
    return { error: pw.message! };
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { error: "Este email já está em uso. Faça login." };
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: await hashPassword(password),
        bio: "Membro do Life OS",
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&bold=true`,
      },
    });

    // Settings só precisa do userId — os demais campos têm default no schema.
    await prisma.settings.create({
      data: { userId: user.id, onboardingCompleted: true },
    });

    await login(user.id);
    const { ip, userAgent } = await requestFingerprint();
    await logAccess(user.id, "REGISTER", ip, userAgent);
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Erro no cadastro:", error);
    return { error: "Erro ao criar conta. Tente novamente." };
  }

  redirect("/dashboard");
}

export async function signOut() {
    await logout();
    redirect("/login");
}

