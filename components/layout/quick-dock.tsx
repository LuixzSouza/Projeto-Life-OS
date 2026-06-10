"use client";

// QuickDock — hub flutuante unificado do canto inferior direito.
// UM botão abre um speed-dial fluido com as ações globais (Inbox Mágica,
// Modo Foco, ...). Para adicionar uma ação nova no futuro, basta incluir
// uma entrada no array ITEMS — o resto (animação, backdrop, Esc) é genérico.
//
// Comunicação desacoplada: cada item dispara um CustomEvent global que o
// widget dono escuta (MagicInbox, FocusDock). O dial também anuncia
// abrir/fechar via QUICK_DOCK_EVENT para widgets vizinhos (a pílula do Foco
// se esconde enquanto o dial está aberto, evitando sobreposição).

import { useCallback, useEffect, useState } from "react";
import { BrainCircuit, Plus, Timer, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOCUS_OPEN_EVENT } from "@/components/focus/focus-core";
import { MAGIC_INBOX_OPEN_EVENT } from "@/components/ai/magic-inbox";

/** Anuncia o estado do dial (detail: { open: boolean }). */
export const QUICK_DOCK_EVENT = "lifeos:quick-dock";

interface DockItem {
    id: string;
    label: string;
    /** Dica curta ao lado do rótulo (atalho, modo...). */
    hint?: string;
    icon: LucideIcon;
    /** Cor do ícone no disco (o disco em si é neutro, premium). */
    iconCls: string;
    /** Evento global que o widget dono escuta. */
    event: string;
}

const ITEMS: DockItem[] = [
    { id: "focus", label: "Modo Foco", hint: "Pomodoro", icon: Timer, iconCls: "text-orange-500", event: FOCUS_OPEN_EVENT },
    { id: "inbox", label: "Inbox Mágica", hint: "Ctrl+J", icon: BrainCircuit, iconCls: "text-primary", event: MAGIC_INBOX_OPEN_EVENT },
];

export function QuickDock() {
    const [open, setOpen] = useState(false);

    const setOpenNotify = useCallback((v: boolean) => {
        setOpen(v);
        window.dispatchEvent(new CustomEvent(QUICK_DOCK_EVENT, { detail: { open: v } }));
    }, []);

    // Esc fecha o dial.
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpenNotify(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, setOpenNotify]);

    // Recolhe o dial primeiro e só então abre o destino — a transição fica fluida.
    const fire = (event: string) => {
        setOpenNotify(false);
        window.setTimeout(() => window.dispatchEvent(new CustomEvent(event)), 130);
    };

    return (
        <>
            {/* Backdrop: clique fora fecha; blur sutil destaca o dial. */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[2px] animate-in fade-in duration-200"
                    onClick={() => setOpenNotify(false)}
                    aria-hidden
                />
            )}

            <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-4 z-50 flex flex-col items-end gap-2.5 md:bottom-6 md:right-6">
                {ITEMS.map((item, i) => {
                    const Icon = item.icon;
                    return (
                        <div
                            key={item.id}
                            className={cn(
                                "flex items-center gap-2.5 transition-all duration-300 ease-out",
                                open
                                    ? "translate-y-0 scale-100 opacity-100"
                                    : "pointer-events-none translate-y-3 scale-90 opacity-0"
                            )}
                            // Escalonado: ao abrir, o item mais próximo do botão entra primeiro.
                            style={{ transitionDelay: open ? `${(ITEMS.length - 1 - i) * 45}ms` : `${i * 30}ms` }}
                        >
                            <span className="rounded-full border border-border/40 bg-card/95 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground shadow-md backdrop-blur">
                                {item.label}
                                {item.hint && (
                                    <span className="ml-1.5 font-bold normal-case tracking-normal text-muted-foreground/60">{item.hint}</span>
                                )}
                            </span>
                            <button
                                type="button"
                                onClick={() => fire(item.event)}
                                title={item.label}
                                className="flex h-11 w-11 items-center justify-center rounded-full border border-border/40 bg-card/95 shadow-lg backdrop-blur transition-transform hover:scale-105 hover:border-primary/30 active:scale-95"
                            >
                                <Icon className={cn("h-5 w-5", item.iconCls)} />
                            </button>
                        </div>
                    );
                })}

                {/* Botão principal: + vira × girando (speed-dial clássico). */}
                <button
                    type="button"
                    onClick={() => setOpenNotify(!open)}
                    title="Ações rápidas"
                    aria-expanded={open}
                    className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105 active:scale-95",
                        open && "rotate-45 bg-foreground text-background shadow-foreground/20"
                    )}
                >
                    <Plus className="h-5 w-5" />
                </button>
            </div>
        </>
    );
}
