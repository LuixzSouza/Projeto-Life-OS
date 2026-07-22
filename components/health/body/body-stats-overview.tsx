"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Scale, Activity, Droplets, Flame,
    Utensils, Edit3, Ruler, Shirt, Footprints, Gauge,
} from "lucide-react";
import {
    calculateBMI, calculateBMR, calculateTDEE, calculateBodyFat,
    calculateComposition, calculateWater, BodyStats, type DeviceMetrics,
} from "@/lib/body-math";
import { cn } from "@/lib/utils";
import { AdvancedInsights } from "./advanced-insights";
import { MeasureRow } from "./body-measure-fields";
import { MetricExplainer } from "./metric-explainer";

// Faixas da régua de gordura corporal (escala até 40%).
const FAT_SCALE_MAX = 40;
const FAT_SEGMENTS = [
    { label: "Atleta", to: 13, tone: "bg-emerald-500/40", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "Fitness", to: 20, tone: "bg-blue-500/40", badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { label: "Médio", to: 28, tone: "bg-amber-500/40", badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    { label: "Acima", to: FAT_SCALE_MAX, tone: "bg-rose-500/40", badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
];

export function BodyStatsOverview({ stats, deviceMetrics = null, onEdit }: { stats: BodyStats; deviceMetrics?: DeviceMetrics | null; onEdit: () => void }) {
    // --- CÁLCULOS PRINCIPAIS ---
    const bmi = calculateBMI(stats.weight, stats.height);
    const estimatedFat = calculateBodyFat(stats);
    // Se a pessoa mediu a gordura num aparelho (balança/adipômetro), esse valor
    // é mais confiável que a estimativa por fita — então ele vira o número
    // principal, e a estimativa Naval fica como comparação ("se conversam").
    const measuredFat = deviceMetrics?.bodyFatMeasured ?? null;
    const bodyFat = measuredFat ?? estimatedFat;
    const { fatMass, leanMass } = calculateComposition(stats.weight, bodyFat);
    const deviceList = deviceMetrics ? [
        { label: "Gordura medida", value: deviceMetrics.bodyFatMeasured, unit: "%", tone: "text-orange-600 dark:text-orange-400", bg: "bg-orange-500/10" },
        { label: "Massa muscular", value: deviceMetrics.muscleMass, unit: "kg", tone: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10" },
        { label: "Água corporal", value: deviceMetrics.bodyWater, unit: "%", tone: "text-sky-600 dark:text-sky-400", bg: "bg-sky-500/10" },
        { label: "Gordura visceral", value: deviceMetrics.visceralFat, unit: "", tone: "text-rose-600 dark:text-rose-400", bg: "bg-rose-500/10" },
        { label: "Massa óssea", value: deviceMetrics.boneMass, unit: "kg", tone: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10" },
        { label: "Idade metabólica", value: deviceMetrics.metabolicAge, unit: "anos", tone: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
    ].filter((d) => d.value != null && d.value > 0) : [];
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
                            <MetricExplainer
                                title="% de Gordura Corporal (fórmula Naval)"
                                whatItIs="A fatia do seu peso que é gordura. É calculada a partir das medidas de pescoço, cintura e quadril (o método usado pela Marinha dos EUA)."
                                whatItMeans="Diz muito mais sobre sua forma física do que só o peso na balança — dá para pesar 'igual' e ter composições bem diferentes. 'Massa magra' é tudo que não é gordura (músculo, osso, água)."
                                howToImprove="Déficit calórico leve + treino de força para preservar músculo. Medir sempre no mesmo horário (de manhã, em jejum) deixa a comparação mais justa."
                                reference="Homens: atleta ~6–13% · fitness ~14–17% · Mulheres somam ~8%"
                            />
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
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                    {measuredFat != null ? "Gordura corporal (medida por aparelho)" : "Gordura corporal estimada"}
                                </p>
                                {/* Aparelho e fórmula conversando: mostra a estimativa Naval ao lado da medida real. */}
                                {measuredFat != null && estimatedFat > 0 && (
                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                        Estimativa pela fita (Naval): <span className="font-semibold">{estimatedFat.toFixed(1)}%</span>
                                        {" · "}diferença {Math.abs(measuredFat - estimatedFat).toFixed(1)} pts
                                    </p>
                                )}
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
                        <MetricExplainer
                            title="IMC — Índice de Massa Corporal"
                            whatItIs="Seu peso dividido pela altura ao quadrado. Uma referência rápida e mundial para faixa de peso."
                            whatItMeans="É só um ponto de partida: não distingue músculo de gordura. Quem treina pesado pode aparecer como 'sobrepeso' sem ter excesso de gordura — por isso olhe também a % de gordura e a cintura."
                            howToImprove="Ajuste peso pela alimentação e atividade, mas confie mais nas medidas e no espelho do que só neste número."
                            reference="Abaixo 18,5 · Normal 18,5–24,9 · Sobrepeso 25–29,9"
                        />
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

            {/* 3b. MEDIÇÕES POR APARELHO (só aparece se houver dados de balança/adipômetro) */}
            {deviceList.length > 0 && (
                <Card className="md:col-span-12 border-border/40 bg-card shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <div className="rounded-lg bg-primary/10 p-1.5 text-primary"><Gauge className="h-4 w-4" /></div>
                            Medições por aparelho
                            <MetricExplainer
                                title="Dados da sua balança / adipômetro"
                                whatItIs="Valores que vêm de aparelhos: balança de bioimpedância (gordura, músculo, água, gordura visceral, massa óssea, idade metabólica) ou adipômetro (dobras cutâneas)."
                                whatItMeans="São medições diretas — quando você as informa, o Life OS passa a usar a sua % de gordura real no lugar da estimativa por fita, deixando todos os cálculos (massa magra, proteína, etc.) mais precisos."
                                howToImprove="Meça sempre no mesmo horário e condição (de manhã, em jejum, bem hidratado) para os números serem comparáveis entre semanas."
                                reference="Atualize pelo botão “Atualizar” → aba “Aparelhos & Dobras”"
                            />
                        </CardTitle>
                        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground">
                            <Edit3 className="h-3.5 w-3.5" /> Editar
                        </Button>
                    </CardHeader>
                    <CardContent className="pt-5">
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                            {deviceList.map((d) => (
                                <div key={d.label} className={cn("rounded-xl border border-border/40 p-3", d.bg)}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{d.label}</p>
                                    <p className="mt-1 flex items-baseline gap-1">
                                        <span className={cn("text-xl font-bold tabular-nums", d.tone)}>{d.value}</span>
                                        {d.unit && <span className="text-[10px] text-muted-foreground">{d.unit}</span>}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 4. METABOLISMO & PLANO */}
            <Card className="md:col-span-12 grid divide-y divide-border/40 border-border/40 bg-card shadow-sm md:grid-cols-3 md:divide-x md:divide-y-0">
                <div className="space-y-3 p-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                        <Flame className="h-4 w-4" /> Gasto calórico (dia)
                        <span className="ml-auto text-muted-foreground">
                            <MetricExplainer
                                title="TDEE — Gasto calórico diário"
                                whatItIs="Quantas calorias seu corpo queima por dia no total: o mínimo para existir (respirar, coração, cérebro) somado ao seu nível de atividade."
                                whatItMeans="É a sua 'linha de equilíbrio'. Comer nesse valor mantém o peso; comer menos emagrece; comer mais ganha peso. Os cartões ao lado já mostram o alvo para perder ou ganhar."
                                howToImprove="Mais massa muscular e mais atividade aumentam esse gasto — você passa a queimar mais mesmo parado."
                                reference="Perder ≈ −20% · Ganhar ≈ +10%"
                            />
                        </span>
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
                        <span className="ml-auto text-muted-foreground">
                            <MetricExplainer
                                title="Proteína diária recomendada"
                                whatItIs="A quantidade de proteína (em gramas) que ajuda a manter e construir músculo, calculada a partir da sua massa magra."
                                whatItMeans="Comer proteína suficiente é o que evita perder músculo quando você emagrece e o que permite ganhar músculo quando treina. Também dá mais saciedade."
                                howToImprove="Distribua ao longo do dia (ex.: ovos, frango, carne, peixe, feijão, whey). O registro de refeições já soma sua proteína — compare com esta meta."
                                reference="≈ 2 g por kg de massa magra"
                            />
                        </span>
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
