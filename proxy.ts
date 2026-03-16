import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth";

// 1. Rotas que não exigem autenticação
// Removi o "/" daqui para que o sistema seja 100% privado. 
// Se você quiser uma página inicial pública, adicione "/" de volta.
const publicRoutes = ["/login", "/setup"];

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
    } catch (err) {
      session = null;
    }
  }

  // ============================================================
  // CENÁRIO A: Usuário Logado
  // ============================================================
  if (session) {
    // Se logado, não faz sentido ver a tela de login ou setup inicial
    if (path === "/login" || path === "/setup") {
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
  matcher: [
    /*
     * Matcher atualizado: 
     * - AGORA PROTEGE AS APIS TAMBÉM (removido o ?!api)
     * - Continua ignorando arquivos estáticos para performance
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.webp$|.*\\.css$|.*\\.js$).*)',
  ],
};