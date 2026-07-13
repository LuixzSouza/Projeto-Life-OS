"use client";

import { ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Troca o item de posição na lista (imutável). dir -1 = sobe, +1 = desce. */
export function moveItem<T>(arr: T[], index: number, dir: -1 | 1): T[] {
    const target = index + dir;
    if (target < 0 || target >= arr.length) return arr;
    const copy = [...arr];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    return copy;
}

/**
 * Setas ↑/↓ para reordenar um item numa lista. Desabilitadas nas pontas.
 * Empilhadas por padrão (vertical) para caber no canto de um card.
 */
export function ReorderControls({
    index,
    count,
    onMove,
    orientation = "vertical",
    className,
}: {
    index: number;
    count: number;
    onMove: (dir: -1 | 1) => void;
    orientation?: "vertical" | "horizontal";
    className?: string;
}) {
    if (count < 2) return null;
    const btn =
        "flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed";
    return (
        <div
            className={cn(
                "flex items-center gap-0.5 rounded-lg border border-border/40 bg-muted/30 p-0.5",
                orientation === "vertical" && "flex-col",
                className
            )}
        >
            <button
                type="button"
                onClick={() => onMove(-1)}
                disabled={index === 0}
                aria-label="Mover para cima"
                title="Mover para cima"
                className={btn}
            >
                <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <button
                type="button"
                onClick={() => onMove(1)}
                disabled={index === count - 1}
                aria-label="Mover para baixo"
                title="Mover para baixo"
                className={btn}
            >
                <ChevronDown className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}
