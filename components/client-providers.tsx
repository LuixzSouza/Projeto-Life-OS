// components/client-providers.tsx
"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { DialogProvider } from "@/components/ui/dialog-context";

interface ClientProvidersProps {
    children: React.ReactNode;
    themeClass: string;
}

export default function ClientProviders({ children, themeClass }: ClientProvidersProps) {
    return (
        // O themeClass é injetado no <html> do servidor, mas o ThemeProvider precisa dele
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            <div className={themeClass}>
                <DialogProvider>
                    {children}
                </DialogProvider>
            </div>
            <Toaster richColors position="top-right" />
        </ThemeProvider>
    );
}