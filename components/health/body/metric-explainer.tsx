"use client";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle, Lightbulb, Target, Info } from "lucide-react";

/**
 * Explicação "para leigos" de uma métrica corporal. Um ícone de ajuda discreto
 * que abre um popover com: o que é, o que significa PARA VOCÊ, e como melhorar —
 * em linguagem simples, sem jargão. Usado ao lado do título de cada card de
 * insight para que ninguém fique sem entender o número que está vendo.
 */
export interface MetricExplainerProps {
    title: string;
    whatItIs: string;
    whatItMeans: string;
    howToImprove?: string;
    /** Faixas de referência (ex.: "Ideal: 18,5–24,9"). */
    reference?: string;
}

export function MetricExplainer({ title, whatItIs, whatItMeans, howToImprove, reference }: MetricExplainerProps) {
    return (
        <Popover>
            <PopoverTrigger
                type="button"
                aria-label={`O que é ${title}?`}
                className="text-muted-foreground/60 transition-colors hover:text-primary"
            >
                <HelpCircle className="h-3.5 w-3.5" />
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 rounded-2xl p-0 text-sm shadow-lg">
                <div className="border-b border-border/40 bg-muted/30 px-4 py-2.5">
                    <p className="flex items-center gap-1.5 font-semibold">
                        <Info className="h-3.5 w-3.5 text-primary" /> {title}
                    </p>
                </div>
                <div className="space-y-3 p-4">
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">O que é</p>
                        <p className="mt-0.5 leading-relaxed text-foreground/90">{whatItIs}</p>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">O que significa pra você</p>
                        <p className="mt-0.5 leading-relaxed text-foreground/90">{whatItMeans}</p>
                    </div>
                    {howToImprove && (
                        <div className="flex gap-2 rounded-xl bg-emerald-500/10 p-2.5">
                            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <p className="leading-relaxed text-emerald-800 dark:text-emerald-200">{howToImprove}</p>
                        </div>
                    )}
                    {reference && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Target className="h-3 w-3" /> {reference}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}
