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

    return (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

            {/* 1. GORDURA E COMPOSIÇÃO */}
            <Card className="md:col-span-8 relative overflow-hidden border-border/60 bg-card shadow-lg group">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none transition-opacity group-hover:opacity-80" />

                <CardHeader className="flex flex-row justify-between items-start pb-2 relative z-10">
                    <div>
                        <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 rounded-md text-primary"><Scale className="h-4 w-4" /></div>
                            Composição Corporal
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1.5 ml-1">Análise baseada em medidas antropométricas e idade.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={onEdit} className="gap-2 h-9 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors">
                        <Edit3 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Atualizar</span>
                    </Button>
                </CardHeader>

                <CardContent className="relative z-10 pt-6">
                    <div className="flex flex-col md:flex-row gap-10 items-end">
                        <div className="flex-1 space-y-6">
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-6xl font-black tracking-tighter text-foreground">
                                        {bodyFat > 0 ? bodyFat.toFixed(1) : '--'}
                                    </span>
                                    <span className="text-xl font-bold text-muted-foreground mb-1">%</span>
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">Gordura Corporal Estimada</p>
                            </div>
                            <div className="flex gap-3">
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 py-1 px-3">
                                    Gordura: <span className="font-bold ml-1">{fatMass.toFixed(1)}kg</span>
                                </Badge>
                                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 py-1 px-3">
                                    Massa Magra: <span className="font-bold ml-1">{leanMass.toFixed(1)}kg</span>
                                </Badge>
                            </div>
                        </div>
                        <div className="w-full md:w-1/2 space-y-3 pb-2">
                            <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                <span>Atleta</span><span>Fitness</span><span>Médio</span><span>Acima</span>
                            </div>
                            <div className="h-5 w-full bg-secondary rounded-full overflow-hidden relative shadow-inner">
                                <div className="absolute left-[13%] h-full w-px bg-background/50 z-10"></div>
                                <div className="absolute left-[17%] h-full w-px bg-background/50 z-10"></div>
                                <div className="absolute left-[24%] h-full w-px bg-background/50 z-10"></div>
                                <div
                                    className={cn("h-full transition-all duration-1000 ease-out shadow-sm", bodyFat < 13 ? 'bg-emerald-500' : bodyFat < 24 ? 'bg-blue-500' : 'bg-amber-500')}
                                    style={{ width: `${Math.min(bodyFat, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 2. IMC */}
            <Card className="md:col-span-4 flex flex-col justify-between border-border/60 bg-card shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                        <Activity className="h-4 w-4" /> Índice de Massa (IMC)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex justify-between items-end">
                        <span className="text-5xl font-black text-foreground tracking-tighter">{bmi.value.toFixed(1)}</span>
                        <Badge className={cn("mb-2", bmi.value < 24.9 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600')}>{bmi.status}</Badge>
                    </div>
                    <div className="space-y-2">
                        <Progress value={(bmi.value / 40) * 100} className="h-2" />
                        <p className="text-[10px] text-muted-foreground text-right font-medium">Saudável: 18.5 - 24.9</p>
                    </div>
                </CardContent>
            </Card>

            {/* 3. INSIGHTS AVANÇADOS */}
            <div className="md:col-span-12">
                <AdvancedInsights stats={stats} />
            </div>

            {/* 4. METABOLISMO & PLANO */}
            <Card className="md:col-span-12 grid md:grid-cols-3 border-border/60 bg-card shadow-sm divide-y md:divide-y-0 md:divide-x divide-border/50">
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-xs uppercase">
                        <Flame className="h-4 w-4" /> Gasto Calórico (TDEE)
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black">{Math.round(tdee)}</span>
                        <span className="text-sm text-muted-foreground">kcal/dia</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted/30 p-2 rounded border border-border/50">
                            <span className="block text-muted-foreground mb-1">Perder Peso</span>
                            <span className="font-bold text-emerald-500">{cutCalories}</span>
                        </div>
                        <div className="bg-muted/30 p-2 rounded border border-border/50">
                            <span className="block text-muted-foreground mb-1">Ganhar Massa</span>
                            <span className="font-bold text-blue-500">{bulkCalories}</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase">
                        <Droplets className="h-4 w-4" /> Hidratação Ideal
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black">{(waterGoal / 1000).toFixed(1)}</span>
                        <span className="text-sm text-muted-foreground">Litros/dia</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight">
                        Beba água ao longo do dia para otimizar o transporte de nutrientes e a queima de gordura.
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase">
                        <Utensils className="h-4 w-4" /> Proteína Diária
                    </div>
                    <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-black">~{(leanMass * 2).toFixed(0)}</span>
                        <span className="text-sm text-muted-foreground">gramas</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-tight">
                        Baseado em 2g/kg de massa magra. Essencial para manutenção e crescimento muscular.
                    </p>
                </div>
            </Card>

            {/* 5. RELATÓRIO DE MEDIDAS (cm) */}
            <Card className="col-span-1 md:col-span-12 border-border/60 bg-card shadow-sm">
                <CardHeader className="border-b border-border/40 pb-4">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
                        <Ruler className="h-4 w-4 text-primary" />
                        Relatório de Medidas (cm)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-4">
                                <Shirt className="h-3.5 w-3.5" /> Tronco & Superior
                            </h4>
                            <div className="space-y-3">
                                <MeasureRow label="Ombros" value={stats.shoulders} />
                                <MeasureRow label="Peitoral" value={stats.chest} />
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground">Braço Esq.</span>
                                        <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.armLeft || '--'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground">Braço Dir.</span>
                                        <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.armRight || '--'}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground">Antebraço Esq.</span>
                                        <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.forearmLeft || '--'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground">Antebraço Dir.</span>
                                        <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.forearmRight || '--'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-4">
                                <Activity className="h-3.5 w-3.5" /> Core & Base
                            </h4>
                            <div className="space-y-3">
                                <MeasureRow label="Pescoço" value={stats.neck} highlight />
                                <MeasureRow label="Cintura" value={stats.waist} highlight />
                                <MeasureRow label="Quadril" value={stats.hip} highlight />
                            </div>
                            <div className="mt-6 p-4 rounded-xl bg-secondary/30 border border-border/50">
                                <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                                    <span className="font-bold text-foreground">Nota:</span> Estas 3 medidas centrais são usadas para calcular seu % de gordura e risco metabólico.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-4">
                                <Footprints className="h-3.5 w-3.5" /> Membros Inferiores
                            </h4>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground">Coxa Esq.</span>
                                        <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.thighLeft || '--'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground">Coxa Dir.</span>
                                        <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.thighRight || '--'}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground">Panturrilha Esq.</span>
                                        <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.calfLeft || '--'}</div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-[10px] text-muted-foreground">Panturrilha Dir.</span>
                                        <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.calfRight || '--'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>

        </div>
    );
}
