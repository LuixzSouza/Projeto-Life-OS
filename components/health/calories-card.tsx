"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Flame, Utensils, Zap,
    Info, Target, ArrowRight,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CaloriesCardProps {
    weight: number;
    height: number;
    age?: number;
    gender?: 'MALE' | 'FEMALE';
    activityFactor?: number;
}

interface MacroInfo {
    label: string;
    value: number;
    desc: string;
    color: string;
}

export function CaloriesCard({
    weight,
    height,
    age = 25,
    gender = 'MALE',
    activityFactor = 1.2
}: CaloriesCardProps) {

    // Fallbacks para evitar NaN
    const w = weight || 70;
    const h = height || 170;
    const activity = activityFactor || 1.2;

    // 1. Cálculo TMB (Mifflin-St Jeor) - Energia para sobreviver
    const genderOffset = gender === 'MALE' ? 5 : -161;
    const bmr = (10 * w) + (6.25 * h) - (5 * age) + genderOffset;

    // 2. Gasto Energético Total (TDEE) - Energia real gasta no dia
    const tdee = bmr * activity;

    // 3. Cálculos de Macros (Foco em Performance/Saúde)
    const protein = Math.round(w * 2); // 2g/kg (Padrão para preservar músculo)
    const fat = Math.round(w * 0.8);   // 0.8g/kg (Padrão hormonal)
    const caloriesFromProteinAndFat = (protein * 4) + (fat * 9);
    const carbs = Math.max(0, Math.round((tdee - caloriesFromProteinAndFat) / 4));

    const macros: MacroInfo[] = [
        { label: "Proteína", value: protein, desc: "construção", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
        { label: "Carbo", value: carbs, desc: "energia", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
        { label: "Gordura", value: fat, desc: "hormonal", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    ];

    return (
        <Card className="flex h-full flex-col rounded-2xl border-border/40 bg-card shadow-sm transition-all hover:shadow-md">

            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 p-5 pb-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="shrink-0 rounded-xl bg-orange-500/10 p-2 text-orange-500">
                        <Flame className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold">Gasto Calórico</CardTitle>
                        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">Estimado pelo seu peso, altura e atividade</span>
                    </div>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger aria-label="Como o cálculo funciona">
                            <Info className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors hover:text-primary" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[240px] text-xs">
                            Fórmula Mifflin-St Jeor: quanto seu corpo queima por dia, parado (basal) e com sua rotina (manutenção).
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardHeader>

            <CardContent className="flex flex-1 flex-col gap-5 p-5 pt-1">

                {/* Manutenção + basal */}
                <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        <span className="text-[11px] font-medium text-muted-foreground">Manutenção (dia)</span>
                        <div className="mt-0.5 flex items-baseline gap-1.5">
                            <span className="text-4xl font-bold tabular-nums leading-none tracking-tight">{Math.round(tdee)}</span>
                            <span className="text-xs font-medium text-muted-foreground">kcal</span>
                        </div>
                    </div>

                    <div className="shrink-0 text-right">
                        <span className="block text-[11px] text-muted-foreground">Basal (parado)</span>
                        <div className="flex items-baseline justify-end gap-1">
                            <span className="font-mono text-xl font-bold text-foreground/70">{Math.round(bmr)}</span>
                            <span className="text-[10px] font-medium text-muted-foreground">kcal</span>
                        </div>
                    </div>
                </div>

                {/* Metas por objetivo */}
                <div className="grid grid-cols-2 gap-2.5">
                    <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
                            <Target className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-medium leading-none text-muted-foreground">Perder peso</p>
                            <p className="mt-1 truncate text-sm font-bold tabular-nums">{Math.round(tdee - 400)} <span className="text-[10px] font-medium text-muted-foreground">kcal</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                            <Zap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[10px] font-medium leading-none text-muted-foreground">Ganhar massa</p>
                            <p className="mt-1 truncate text-sm font-bold tabular-nums">{Math.round(tdee + 300)} <span className="text-[10px] font-medium text-muted-foreground">kcal</span></p>
                        </div>
                    </div>
                </div>

                {/* Distribuição de macros sugerida */}
                <div className="space-y-2.5 border-t border-border/40 pt-4">
                    <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <Utensils className="h-3 w-3" /> Macros sugeridos por dia
                    </span>

                    <div className="grid grid-cols-3 gap-2">
                        {macros.map((macro) => (
                            <div
                                key={macro.label}
                                className={cn("flex flex-col items-center justify-center rounded-xl p-3", macro.color)}
                            >
                                <span className="text-lg font-bold tabular-nums leading-none">
                                    {macro.value}<span className="ml-0.5 text-[10px] font-medium">g</span>
                                </span>
                                <span className="mt-1 text-[10px] font-semibold">{macro.label}</span>
                                <span className="text-[9px] opacity-60">{macro.desc}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Link para o diário nutricional (antes era um botão sem ação) */}
                <Link href="/health/nutrition" className="group/link mt-auto block">
                    <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs font-medium text-muted-foreground transition-colors group-hover/link:text-primary">
                        <span>Abrir diário nutricional</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-1" />
                    </div>
                </Link>

            </CardContent>
        </Card>
    );
}
