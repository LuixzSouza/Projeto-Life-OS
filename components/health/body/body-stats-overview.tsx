"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Scale, Activity, Droplets, Flame,
    Utensils, Edit3, Ruler, Shirt, Footprints,
} from "lucide-react";
import {
    calculateBMI, calculateBMR, calculateTDEE, calculateBodyFat,
    calculateComposition, calculateWater, BodyStats,
} from "@/lib/body-math";
import { cn } from "@/lib/utils";
import { AdvancedInsights } from "./advanced-insights";
import { MeasureRow } from "./body-measure-fields";

// Faixas da régua de gordura corporal (escala até 40%).
const FAT_SCALE_MAX = 40;
const FAT_SEGMENTS = [
    { label: "Atleta", to: 13, tone: "bg-emerald-500/40", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "Fitness", to: 20, tone: "bg-blue-500/40", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { label: "Médio", to: 28, tone: "bg-amber-500/40", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: "Acima", to: FAT_SCALE_MAX, tone: "bg-rose-500/40", badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
];

export function BodyStatsOverview({ stats, onEdit }: { stats: BodyStats; onEdit: () => void }) {
    // --- CÁLCULOS PRINCIPAIS ---
    const bmi = calculateBMI(stats.weight, stats.height);
    const bodyFat = calculateBodyFat(stats);
    const { fatMass, leanMass } = calculateComposition(stats.weight, bodyFat);
    const bmr = calculateBMR(stats);
    const tdee = calculateTDEE(bmr, stats.activityFactor);
    const waterGoal = calculateWater(stats.weight);

    const cutCalories = Math.round(tdee * 0.8);
    const bulkCalories = Math.round(tdee * 1.1);

    const fatSegment = FAT_SEGMENTS.find((s) => bodyFat < s.to) ?? FAT_SEGMENTS[FAT_SEGMENTS.length - 1];

    return (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-12">

            {/* 1. GORDURA E COMPOSIÇÃO */}
            <Card className="md:col-span-8 border-border/40 bg-card shadow-sm transition-all hover:shadow-md">
                <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                    <div className="min-w-0">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <div className="rounded-lg bg-primary/10 p-1.5 text-primary"><Scale className="h-4 w-4" /></div>
                            Composição Corporal
                        </CardTitle>
                        <p className="mt-1 text-xs text-muted-foreground">Estimada pelas suas medidas e idade (fórmula Naval).</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={onEdit} className="h-9 shrink-0 gap-2 rounded-xl border-border/40">
                        <Edit3 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Atualizar</span>
                    </Button>
                </CardHeader>

                <CardContent className="pt-4">
                    <div className="flex flex-col gap-6 md:flex-row md:items-end md:gap-10">
                        <div className="flex-1 space-y-4">
                            <div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-5xl font-bold tracking-tight">
                                        {bodyFat > 0 ? bodyFat.toFixed(1) : '--'}
                                    </span>
                                    <span className="text-lg font-semibold text-muted-foreground">%</span>
                                    {bodyFat > 0 && (
                                        <Badge className={cn("ml-1 border-none", fatSegment.badge)}>
                                            {fatSegment.label}
                                        </Badge>
                                    )}
                                </div>
                                <p className="mt-0.5 text-sm text-muted-foreground">Gordura corporal estimada</p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-none bg-amber-500/10 px-2.5 py-1 text-amber-600 dark:text-amber-400">
                                    Gordura: <span className="ml-1 font-bold tabular-nums">{fatMass.toFixed(1)}kg</span>
                                </Badge>
                                <Badge variant="outline" className="border-none bg-blue-500/10 px-2.5 py-1 text-blue-600 dark:text-blue-400">
                                    Massa magra: <span className="ml-1 font-bold tabular-nums">{leanMass.toFixed(1)}kg</span>
                                </Badge>
                            </div>
                        </div>

                        {/* Régua segmentada com marcador na sua posição */}
                        <div className="w-full space-y-1.5 md:w-1/2">
                            <div className="flex text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {FAT_SEGMENTS.map((s, i) => {
                                    const from = i === 0 ? 0 : FAT_SEGMENTS[i - 1].to;
                                    return (
                                        <span key={s.label} className="text-center" style={{ width: `${((s.to - from) / FAT_SCALE_MAX) * 100}%` }}>
                                            {s.label}
                                        </span>
                                    );
                                })}
                            </div>
                            <div className="relative flex h-2.5 w-full gap-0.5">
                                {bodyFat > 0 && (
                                    <div
                                        className="absolute -top-0.5 bottom-[-2px] z-10 w-1 rounded-full bg-foreground ring-2 ring-background transition-all duration-1000 ease-out"
                                        style={{ left: `calc(${Math.min((bodyFat / FAT_SCALE_MAX) * 100, 98)}%)` }}
                                    />
                                )}
                                {FAT_SEGMENTS.map((s, i) => {
                                    const from = i === 0 ? 0 : FAT_SEGMENTS[i - 1].to;
                                    return (
                                        <div
                                            key={s.label}
                                            className={cn("h-full", s.tone, i === 0 && "rounded-l-full", i === FAT_SEGMENTS.length - 1 && "rounded-r-full")}
                                            style={{ width: `${((s.to - from) / FAT_SCALE_MAX) * 100}%` }}
                                        />
                                    );
                                })}
                            </div>
                            <p className="text-right text-[10px] text-muted-foreground">escala até {FAT_SCALE_MAX}%</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. IMC */}
            <Card className="md:col-span-4 flex flex-col justify-between border-border/40 bg-card shadow-sm transition-all hover:shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <div className="rounded-lg bg-indigo-500/10 p-1.5 text-indigo-500"><Activity className="h-4 w-4" /></div>
                        IMC
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="flex items-end justify-between">
                        <span className="text-5xl font-bold tracking-tight tabular-nums">{bmi.value.toFixed(1)}</span>
                        <Badge className={cn("mb-2 border-none", bmi.value < 24.9 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600')}>{bmi.status}</Badge>
                    </div>
                    <div className="space-y-1.5">
                        <Progress value={(bmi.value / 40) * 100} className="h-2" />
                        <p className="text-right text-[10px] font-medium text-muted-foreground">Saudável: 18,5 – 24,9</p>
                    </div>
                </CardContent>
            </Card>

            {/* 3. INSIGHTS AVANÇADOS */}
            <div className="min-w-0 md:col-span-12">
                <AdvancedInsights stats={stats} />
            </div>

            {/* 4. METABOLISMO & PLANO */}
            <Card className="md:col-span-12 grid divide-y divide-border/40 border-border/40 bg-card shadow-sm md:grid-cols-3 md:divide-x md:divide-y-0">
                <div className="space-y-3 p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                        <Flame className="h-4 w-4" /> Gasto calórico (dia)
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold tabular-nums">{Math.round(tdee)}</span>
                        <span className="text-sm text-muted-foreground">kcal</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-lg border border-border/40 bg-muted/20 p-2">
                            <span className="mb-0.5 block text-muted-foreground">Perder peso</span>
                            <span className="font-bold tabular-nums text-emerald-500">{cutCalories}</span>
                        </div>
                        <div className="rounded-lg border border-border/40 bg-muted/20 p-2">
                            <span className="mb-0.5 block text-muted-foreground">Ganhar massa</span>
                            <span className="font-bold tabular-nums text-blue-500">{bulkCalories}</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                        <Droplets className="h-4 w-4" /> Hidratação ideal
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold tabular-nums">{(waterGoal / 1000).toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">litros/dia</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        Distribua ao longo do dia para otimizar transporte de nutrientes e recuperação.
                    </p>
                </div>

                <div className="space-y-3 p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        <Utensils className="h-4 w-4" /> Proteína diária
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold tabular-nums">~{(leanMass * 2).toFixed(0)}</span>
                        <span className="text-sm text-muted-foreground">gramas</span>
                    </div>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                        2g por kg de massa magra — o suficiente para manter e construir músculo.
                    </p>
                </div>
            </Card>

            {/* 5. RELATÓRIO DE MEDIDAS (cm) */}
            <Card className="md:col-span-12 border-border/40 bg-card shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                        <div className="rounded-lg bg-primary/10 p-1.5 text-primary"><Ruler className="h-4 w-4" /></div>
                        Medidas atuais (cm)
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground">
                        <Edit3 className="h-3.5 w-3.5" /> Editar
                    </Button>
                </CardHeader>
                <CardContent className="pt-5">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 md:gap-8">

                        <div className="space-y-3">
                            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <Shirt className="h-3.5 w-3.5" /> Tronco & superior
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <MeasureRow label="Ombros" value={stats.shoulders} />
                                <MeasureRow label="Peitoral" value={stats.chest} />
                                <MeasureRow label="Braço Esq." value={stats.armLeft} />
                                <MeasureRow label="Braço Dir." value={stats.armRight} />
                                <MeasureRow label="Antebraço Esq." value={stats.forearmLeft} />
                                <MeasureRow label="Antebraço Dir." value={stats.forearmRight} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <Activity className="h-3.5 w-3.5" /> Core & base
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <MeasureRow label="Pescoço" value={stats.neck} highlight />
                                <MeasureRow label="Cintura" value={stats.waist} highlight />
                                <MeasureRow label="Quadril" value={stats.hip} highlight />
                            </div>
                            <p className="rounded-xl border border-border/40 bg-muted/20 p-3 text-[11px] leading-relaxed text-muted-foreground">
                                As 3 medidas destacadas calculam seu % de gordura e o risco metabólico.
                            </p>
                        </div>

                        <div className="space-y-3">
                            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <Footprints className="h-3.5 w-3.5" /> Inferiores
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <MeasureRow label="Coxa Esq." value={stats.thighLeft} />
                                <MeasureRow label="Coxa Dir." value={stats.thighRight} />
                                <MeasureRow label="Panturrilha Esq." value={stats.calfLeft} />
                                <MeasureRow label="Panturrilha Dir." value={stats.calfRight} />
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
