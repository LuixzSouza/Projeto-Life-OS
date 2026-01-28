import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth";

// Rotas que não exigem autenticação
const publicRoutes = ["/login", "/setup", "/"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // 1. Verifica se a rota atual está na lista de públicas
  const isPublicRoute = publicRoutes.includes(path);

  // 2. Tenta obter e validar a sessão
  const cookie = request.cookies.get("session")?.value;
  let session = null;

  if (cookie) {
    try {
      session = await decrypt(cookie);
    } catch (err) {
      // Se o token existir mas for inválido/expirado, consideramos como não logado
      session = null;
    }
  }

  // ============================================================
  // CENÁRIO A: Usuário Logado (Sessão Válida)
  // ============================================================
  if (session) {
    // Se o usuário já está logado e tenta acessar Login ou Home (Landing),
    // mandamos direto para o Dashboard para melhorar a UX.
    if (path === "/login" || path === "/") {
      return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
    }
    
    // Se ele está tentando acessar /setup estando logado, deixamos passar (pode ser manutenção),
    // ou qualquer outra rota protegida, deixamos passar.
    return NextResponse.next();
  }

  // ============================================================
  // CENÁRIO B: Usuário Não Logado (Visitante)
  // ============================================================
  
  // Se a rota NÃO é pública e o usuário não tem sessão -> Manda pro Login
  if (!isPublicRoute) {
    // Dica: Você pode passar ?callbackUrl=... aqui se quiser redirecionar de volta depois
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  // Se for rota pública (/, /login, /setup), deixa passar
  return NextResponse.next();
}

// Configuração do Matcher para ignorar arquivos estáticos
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - static files (images, css, js, fonts)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.svg$|.*\\.webp$|.*\\.css$|.*\\.js$).*)',
  ],
};