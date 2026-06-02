"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    HeartPulse, Scale, Sparkles, Dumbbell, Beef, Wheat, Droplet,
    Activity, Ruler, Plus,
} from "lucide-react";
import {
    BodyStats, calculateAge, calculateBMI, calculateBMIPrime, healthyWeightRange,
    calculateIdealWeight, calculateLeanMassBoer, calculateBSA, estimateBodyFatBMI,
    calculateMaxHR, heartRateZones, calculateMacros, calculateBMR, calculateTDEE,
} from "@/lib/body-math";
import { cn } from "@/lib/utils";

export function BodyVitalMetrics({ stats, onEdit }: { stats: BodyStats; onEdit: () => void }) {
    const hasBase = stats.weight > 0 && stats.height > 0;

    if (!hasBase) {
        return (
            <Card className="border-dashed border-border/60 bg-muted/10">
                <CardContent className="flex flex-col items-center justify-center text-center py-12 gap-3">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="font-semibold">Descubra dados úteis sobre o seu corpo</p>
                        <p className="text-sm text-muted-foreground max-w-md mt-1">
                            Com apenas <strong>peso, altura, nascimento e gênero</strong> calculamos peso ideal,
                            zonas de treino, gordura estimada e mais — sem precisar de equipamento.
                        </p>
                    </div>
                    <Button onClick={onEdit} className="gap-2 mt-2">
                        <Plus className="h-4 w-4" /> Adicionar dados básicos
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const age = calculateAge(stats.birthDate);
    const bmi = calculateBMI(stats.weight, stats.height).value;
    const prime = calculateBMIPrime(bmi);
    const range = healthyWeightRange(stats.height);
    const ideal = calculateIdealWeight(stats.height, stats.gender);
    const leanBoer = calculateLeanMassBoer(stats.weight, stats.height, stats.gender);
    const bsa = calculateBSA(stats.weight, stats.height);
    const bfEstimate = estimateBodyFatBMI(bmi, age, stats.gender);
    const maxHR = calculateMaxHR(age);
    const zones = heartRateZones(maxHR);

    const tdee = calculateTDEE(calculateBMR(stats), stats.activityFactor);
    const macros = calculateMacros(tdee, stats.weight);

    // Posição do peso atual dentro da faixa saudável (0–100%).
    const weightPos = range
        ? Math.max(0, Math.min(100, ((stats.weight - range.min) / (range.max - range.min)) * 100))
        : 0;
    const withinRange = range && stats.weight >= range.min && stats.weight <= range.max;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></div>
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Insights de Saúde</h3>
                    <p className="text-xs text-muted-foreground">Estimativas calculadas — sem precisar de equipamento.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* PESO IDEAL / FAIXA SAUDÁVEL */}
                <Card className="border-border/40 bg-card shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <Scale className="h-4 w-4 text-primary" /> Peso Ideal
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-end justify-between">
                            <div>
                                <span className="text-3xl font-black tracking-tight">{ideal.toFixed(0)}</span>
                                <span className="text-sm text-muted-foreground ml-1">kg</span>
                            </div>
                            <Badge variant="outline" className={cn(withinRange ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20")}>
                                {withinRange ? "No peso" : "Fora da faixa"}
                            </Badge>
                        </div>
                        {range && (
                            <>
                                <div className="relative h-2 w-full bg-secondary rounded-full overflow-hidden">
                                    <div className="absolute inset-y-0 left-[15%] right-[15%] bg-emerald-500/30" />
                                    <div className="absolute top-1/2 -translate-y-1/2 h-3.5 w-1.5 rounded-full bg-primary shadow" style={{ left: `calc(${weightPos}% - 3px)` }} />
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Faixa saudável: <strong className="text-foreground">{range.min.toFixed(0)}–{range.max.toFixed(0)} kg</strong> · você: {stats.weight} kg
                                </p>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* GORDURA ESTIMADA (sem fita) */}
                <Card className="border-border/40 bg-card shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" /> Gordura Estimada
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black tracking-tight">{bfEstimate.toFixed(1)}</span>
                            <span className="text-sm text-muted-foreground">%</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-snug">
                            Estimativa pela fórmula de Deurenberg (IMC + idade + gênero). Para maior precisão, registre as medidas da fórmula naval.
                        </p>
                    </CardContent>
                </Card>

                {/* COMPOSIÇÃO RÁPIDA */}
                <Card className="border-border/40 bg-card shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <Dumbbell className="h-4 w-4 text-primary" /> Composição
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Massa magra (Boer)</span>
                            <span className="font-bold">{leanBoer.toFixed(1)} kg</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-1"><Ruler className="h-3 w-3" /> Superfície (BSA)</span>
                            <span className="font-bold">{bsa.toFixed(2)} m²</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">BMI Prime</span>
                            <span className="font-bold">{prime.value.toFixed(2)} <span className="text-xs text-muted-foreground font-medium">({prime.status})</span></span>
                        </div>
                    </CardContent>
                </Card>

                {/* MACROS SUGERIDOS */}
                <Card className="border-border/40 bg-card shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <Beef className="h-4 w-4 text-primary" /> Macros (manutenção)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                        <MacroRow icon={Beef} color="text-emerald-600" label="Proteínas" value={macros.protein} />
                        <MacroRow icon={Wheat} color="text-amber-600" label="Carboidratos" value={macros.carbs} />
                        <MacroRow icon={Droplet} color="text-blue-600" label="Gorduras" value={macros.fat} />
                        <p className="text-[10px] text-muted-foreground pt-1">Baseado em ~{tdee} kcal/dia e 2g de proteína por kg.</p>
                    </CardContent>
                </Card>

                {/* FREQUÊNCIA CARDÍACA + ZONAS */}
                <Card className="border-border/40 bg-card shadow-sm md:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <HeartPulse className="h-4 w-4 text-rose-500" /> Zonas de Treino (FC)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2 mb-4">
                            <span className="text-3xl font-black tracking-tight">{maxHR}</span>
                            <span className="text-sm text-muted-foreground">bpm máx · {age} anos</span>
                        </div>
                        <div className="space-y-1.5">
                            {zones.map((zone) => (
                                <div key={zone.name} className="flex items-center gap-3">
                                    <span className={cn("text-[11px] font-bold w-32 shrink-0 px-2 py-1 rounded-md", zone.color)}>{zone.name}</span>
                                    <span className="font-mono font-semibold text-sm w-20 shrink-0">{zone.range}</span>
                                    <span className="text-xs text-muted-foreground truncate">{zone.desc}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function MacroRow({ icon: Icon, color, label, value }: { icon: React.ElementType; color: string; label: string; value: number }) {
    return (
        <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icon className={cn("h-3.5 w-3.5", color)} /> {label}
            </span>
            <span className="font-bold">{value} <span className="text-xs text-muted-foreground font-medium">g</span></span>
        </div>
    );
}
