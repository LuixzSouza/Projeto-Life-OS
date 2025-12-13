import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { prisma } from "@/lib/prisma"; 
import ClientProviders from "@/components/client-providers"; // Importe o wrapper

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Life OS - Seu Sistema Pessoal",
    description: "Gerencie Finanças, Projetos e IA em um só lugar.",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // 1. BUSCA DE DADOS (NO SERVIDOR)
    const settings = await prisma.settings.findFirst();
    const themeClass = settings?.accentColor || "theme-blue";

    return (
        <html 
            lang="pt-BR" 
            suppressHydrationWarning 
            className={`${geistSans.variable} ${geistMono.variable}`} // Adiciona classes de fontes aqui
        >
            <body className={`antialiased bg-background text-foreground`}>
                {/* 2. PASSA OS DADOS PARA O CLIENTE */}
                <ClientProviders themeClass={themeClass}>
                    {children}
                </ClientProviders>
            </body>
        </html>
    );
}