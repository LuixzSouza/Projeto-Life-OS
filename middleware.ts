import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decrypt } from "@/lib/auth";

// Rotas que não precisam de login
const publicRoutes = ["/", "/login", "/setup"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // Se for rota pública ou arquivo estático (imagem, css), deixa passar
  const isPublic = publicRoutes.includes(path) || path.startsWith("/_next") || path.startsWith("/static");
  if (isPublic) {
      return NextResponse.next();
  }

  // Pega o cookie
  const cookie = request.cookies.get("session")?.value;
  
  // Se não tiver cookie, manda para o Login
  if (!cookie) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  try {
    // Tenta descriptografar. Se falhar (token falso), cai no catch
    await decrypt(cookie);
    return NextResponse.next();
  } catch (err) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}