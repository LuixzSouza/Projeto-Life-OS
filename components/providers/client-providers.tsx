"use client";

import { Toaster } from "sonner";
import { DialogProvider } from "@/components/ui/dialog-context";
import { ThemeProvider } from "@/components/providers/theme-provider"; // Importe o do passo 2
import { ThemeColorProvider } from "@/components/providers/theme-color-provider"; // Importe o do passo 3
import { CurrencyProvider } from "@/components/providers/currency-provider";
import { RecordingProvider } from "@/components/providers/recording-provider";

interface ClientProvidersProps {
    children: React.ReactNode;
    themeClass: string; // Vem do Layout
    currency?: string;  // Moeda do usuário (Configurações > Regional)
}

export default function ClientProviders({ children, themeClass, currency }: ClientProvidersProps) {
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {/* ✅ Passamos a cor do banco para o Provider iniciar corretamente */}
            <ThemeColorProvider initialColor={themeClass}>
                <CurrencyProvider currency={currency}>
                    <RecordingProvider>
                        <DialogProvider>
                            {children}
                        </DialogProvider>
                    </RecordingProvider>
                    <Toaster richColors position="top-right" />
                </CurrencyProvider>
            </ThemeColorProvider>
        </ThemeProvider>
    );
}