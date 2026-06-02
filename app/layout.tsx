import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { prisma } from "@/lib/prisma";
import ClientProviders from "@/components/providers/client-providers";
import { SecurityProvider } from "@/components/providers/security-provider";
import { isSystemInstalled } from "@/lib/db-config";
import { ConsoleWelcome } from "@/components/console-welcome";
import { getCurrentUserId } from "@/lib/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Life OS",
  description: "Gerencie Finanças, Projetos e IA.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let themeClass = "theme-blue";
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
      console.warn("⚠️ [LAYOUT] Erro ao carregar configurações.", error);
    }
  }

  return (
    <html 
      lang="pt-BR" 
      suppressHydrationWarning  
      className={`${geistSans.variable} ${geistMono.variable}`} 
    >
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