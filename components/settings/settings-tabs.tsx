"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";

interface SettingsTabsProps {
    defaultValue: string;
    className?: string;
    children: React.ReactNode;
}

/**
 * Tabs com a aba ativa espelhada em `?tab=` via history API (shallow — sem
 * round-trip ao servidor). Assim F5, voltar e compartilhar link preservam a
 * aba aberta, mantendo o deep-link que a página já aceita ao carregar.
 */
export function SettingsTabs({ defaultValue, className, children }: SettingsTabsProps) {
    const [value, setValue] = useState(defaultValue);

    const handleChange = (next: string) => {
        setValue(next);
        const url = new URL(window.location.href);
        url.searchParams.set("tab", next);
        window.history.replaceState(null, "", url);
    };

    return (
        <Tabs value={value} onValueChange={handleChange} className={className}>
            {children}
        </Tabs>
    );
}
