import { Geist, Geist_Mono } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { prisma } from "@/lib/prisma"; 
import ClientProviders from "@/components/providers/client-providers";

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
    // 1. Busca configuração no banco (se não existir, usa theme-blue)
    const settings = await prisma.settings.findFirst();
    const themeClass = settings?.accentColor || "theme-blue";

    return (
        <html 
            lang="pt-BR" 
            suppressHydrationWarning 
            className={`${geistSans.variable} ${geistMono.variable}`} 
        >
            <body className={`antialiased bg-background text-foreground`}>
                <ClientProviders themeClass={themeClass}>
                    {children}
                </ClientProviders>
            </body>
        </html>
    );
}