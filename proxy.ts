import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth";

// 1. Rotas que não exigem autenticação
// "/" é a landing page de marketing — pública por design (ela própria trata
// o estado deslogado e direciona para /setup ou /login conforme o caso).
// As páginas institucionais do rodapé (grupo (marketing)) também são públicas.
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/setup",
  "/privacy",
  "/terms",
  "/contact",
  "/changelog",
];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Verifica se a rota é pública
  const isPublicRoute = publicRoutes.includes(path);

  // 2. Validação da Sessão
  const cookie = request.cookies.get("session")?.value;
  let session = null;

  if (cookie) {
    try {
      session = await decrypt(cookie);
    } catch {
      session = null;
    }
  }

  // ============================================================
  // CENÁRIO A: Usuário Logado
  // ============================================================
  if (session) {
    // Se logado, não faz sentido ver login, cadastro ou setup inicial
    if (path === "/login" || path === "/register" || path === "/setup") {
      return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
    }
    return NextResponse.next();
  }

  // ============================================================
  // CENÁRIO B: Usuário Não Logado
  // ============================================================
  
  // Se tentar acessar qualquer rota interna (Dashboard, Agenda, API) sem login
  if (!isPublicRoute) {
    // Redireciona para o login mantendo a URL que ele tentou acessar originalmente
    // Isso permite que, após logar, ele volte para onde estava.
    const loginUrl = new URL("/login", request.nextUrl);
    // loginUrl.searchParams.set("callbackUrl", path); // Opcional: para redirecionar pós-login
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // No Next 16 o proxy (antigo middleware) já roda sempre em Node.js runtime,
  // então a verificação de sessão pode usar segredos vindos de arquivo local.
  matcher: [
    /*
     * Matcher atualizado: 
     * - AGORA PROTEGE AS APIS TAMBÉM (removido o ?!api)
     * - Continua ignorando arquivos estáticos para performance
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.webp$|.*\\.css$|.*\\.js$).*)',
  ],
};