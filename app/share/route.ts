import { NextResponse } from "next/server";

// Web Share Target (PWA): o Android abre /share?title=&text=&url= quando o
// usuário compartilha algo com o Life OS. Encaminhamos para o dashboard com
// ?capture=1 — a Inbox Mágica abre pré-preenchida e a IA classifica.
export function GET(request: Request) {
  const incoming = new URL(request.url);
  const target = new URL("/dashboard", incoming.origin);
  target.searchParams.set("capture", "1");
  for (const key of ["title", "text", "url"] as const) {
    const value = incoming.searchParams.get(key);
    if (value) target.searchParams.set(key, value);
  }
  return NextResponse.redirect(target);
}
