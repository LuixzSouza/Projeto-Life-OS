"use client";

import { Toaster } from "sonner";
import { DialogProvider } from "@/components/ui/dialog-context";
import { ThemeProvider } from "@/components/providers/theme-provider"; // Importe o do passo 2
import { ThemeColorProvider } from "@/components/providers/theme-color-provider"; // Importe o do passo 3

interface ClientProvidersProps {
    children: React.ReactNode;
    themeClass: string; // Vem do Layout
}

export default function ClientProviders({ children, themeClass }: ClientProvidersProps) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {/* ✅ Passamos a cor do banco para o Provider iniciar corretamente */}
            <ThemeColorProvider initialColor={themeClass}>
                <DialogProvider>
                    {children}
                </DialogProvider>
                <Toaster richColors position="top-right" />
            </ThemeColorProvider>
        </ThemeProvider>
    );
}