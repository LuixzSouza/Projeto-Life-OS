import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import ClientProviders from "@/components/providers/client-providers";
import { SecurityProvider } from "@/components/providers/security-provider";
import { isSystemInstalled } from "@/lib/db-config";
import { ConsoleWelcome } from "@/components/console-welcome";
import { getCurrentUserId } from "@/lib/auth";
import { THEME_PRESETS } from "@/components/settings/appearance/theme-presets";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Domínio de produção (sobrescreva com NEXT_PUBLIC_SITE_URL nas env vars).
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://life-os.vercel.app";
const MARKETING_TITLE = "Life OS — Seu segundo cérebro, 100% local";
const MARKETING_DESC =
  "Centralize finanças, projetos, estudos, saúde e mais num único arquivo SQLite que é seu. Privacidade total, sem assinatura e sem nuvem obrigatória.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  // Aba curta nas páginas internas; cada rota pode definir seu próprio título.
  title: { default: "Life OS", template: "%s · Life OS" },
  description: MARKETING_DESC,
  applicationName: "Life OS",
  keywords: [
    "second brain", "segundo cérebro", "produtividade", "finanças pessoais",
    "privacidade", "local-first", "SQLite", "self-hosted", "Life OS",
  ],
  authors: [{ name: "Luiz Souza" }],
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: SITE_URL,
    siteName: "Life OS",
    title: MARKETING_TITLE,
    description: MARKETING_DESC,
    images: [{ url: "/logo.webp", width: 512, height: 512, alt: "Life OS" }],
  },
  twitter: {
    card: "summary_large_image",
    title: MARKETING_TITLE,
    description: MARKETING_DESC,
    images: ["/logo.webp"],
  },
  icons: { icon: "/logo.webp" },
};

// Paleta de accents para quem ainda NÃO configurou (visitante na landing,
// telas de login/setup). Cada reload sorteia uma cor — o sistema "se mostra"
// personalizável antes mesmo do usuário escolher. Usuário logado mantém a sua.
const ACCENT_PRESETS: string[] = THEME_PRESETS.map((p) => p.name);
function randomAccent(): string {
  return ACCENT_PRESETS[Math.floor(Math.random() * ACCENT_PRESETS.length)];
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Default dinâmico: visitante vê uma cor diferente a cada carregamento.
  let themeClass = randomAccent();
  let currency = "BRL";

  // Configuração padrão tipada
  let securitySettings = {
    autoLockMinutes: 15,
    privacyMode: false,
  };

  if (isSystemInstalled()) {
    try {
      // Carrega as configurações do usuário logado (se houver sessão).
      // Em rotas públicas (login/setup) cai no fallback de tema padrão.
      const userId = await getCurrentUserId();
      const settings = userId ? await prisma.settings.findUnique({ where: { userId } }) : null;

      if (settings) {
        if (settings.accentColor) {
          themeClass = settings.accentColor;
        }
        if (settings.currency) {
          currency = settings.currency;
        }

        securitySettings = {
          autoLockMinutes: settings.autoLockMinutes ?? 15,
          privacyMode: settings.privacyMode ?? false,
        };
      }
    } catch (error) {
      // Logamos só a mensagem: passar o objeto de erro do Prisma para o console
      // dispara o overlay do Next por causa do source map quebrado do runtime.
      console.warn(
        "⚠️ [LAYOUT] Erro ao carregar configurações:",
        error instanceof Error ? error.message : error
      );
    }
  }

  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      data-theme={themeClass}
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <head>
        {/*
          LANDING ("/"): sorteia o accent ANTES da primeira pintura, sobrescrevendo
          o data-theme que o servidor renderizou (que, para usuário logado, seria a
          cor salva nas settings). Sem isso, a cor das settings apareceria por um
          instante antes do React trocar — o flash que o usuário via no reload.
          Roda só em carregamento real; navegação SPA é tratada pelo provider, que
          reaproveita window.__landingAccent para não piscar.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              `(function(){try{if(location.pathname==="/"){` +
              `var p=${JSON.stringify(ACCENT_PRESETS)};` +
              `var c=p[Math.floor(Math.random()*p.length)];` +
              `window.__landingAccent=c;` +
              `document.documentElement.setAttribute("data-theme",c);` +
              `}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`antialiased bg-background text-foreground`}>
        <ClientProviders themeClass={themeClass} currency={currency}>
          <SecurityProvider initialSettings={securitySettings}>
            <ConsoleWelcome />
            {children}
          </SecurityProvider>
        </ClientProviders>
      </body>
    </html>
  );
}