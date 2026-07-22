"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Binary, Crown, HeartCrack, TrendingUp, Ruler, Droplet, AlertTriangle } from "lucide-react";
import {
    calculateSymmetry, calculateFFMI, calculateWHR, calculateAdonisIndex,
    calculateBodyFat, calculateRFM, calculateWHtR, BodyStats,
} from "@/lib/body-math";
import { cn } from "@/lib/utils";
import { MetricExplainer } from "./metric-explainer";

export function AdvancedInsights({ stats }: { stats: BodyStats }) {
    const bodyFat = calculateBodyFat(stats);
    const ffmi = calculateFFMI(stats.weight, stats.height, bodyFat);
    const whr = calculateWHR(stats.waist, stats.hip, stats.gender);
    const whtr = calculateWHtR(stats.waist, stats.height);
    const rfm = calculateRFM(stats.height, stats.waist, stats.gender);
    const adonis = calculateAdonisIndex(stats.shoulders || 0, stats.waist);
    const armSym = calculateSymmetry(stats.armLeft, stats.armRight);
    const legSym = calculateSymmetry(stats.thighLeft, stats.thighRight);

    return (
        <section className="mt-6 space-y-3">
            <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">Proporções, estética & saúde</h3>
                <span className="text-xs text-muted-foreground">— toque no <span className="font-semibold">?</span> de cada card para entender</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                {/* ESTÉTICA — V-SHAPE (ADONIS) */}
                <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-amber-600">
                            <Crown className="h-4 w-4" /> Estética (V-Shape)
                            <span className="ml-auto">
                                <MetricExplainer
                                    title="Formato em V (Golden Ratio)"
                                    whatItIs="A razão entre a circunferência dos seus ombros e a da sua cintura. O 'shape em V' — ombros largos e cintura fina — é o que dá a silhueta atlética."
                                    whatItMeans="Quanto mais perto de 1,618 (a 'proporção áurea'), mais harmônica é a sua silhueta. Abaixo disso, ombros e costas ainda têm espaço para crescer (ou a cintura para afinar)."
                                    howToImprove="Treine ombros (elevações laterais) e dorsais (puxadas/barra) para alargar a parte de cima, e reduza a gordura abdominal para afinar a cintura."
                                    reference="Alvo: 1,618 · Meça a CIRCUNFERÊNCIA dos ombros, não a largura"
                                />
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {adonis ? (
                            <div className="space-y-2.5">
                                <div className="flex items-end justify-between gap-2">
                                    <span className="text-2xl font-black leading-none">{adonis.ratio}</span>
                                    <Badge className={cn("text-[10px]", adonis.likelyWidth ? "bg-amber-500" : "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-none")}>
                                        {adonis.status}
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <Progress value={adonis.score} className="h-1.5" />
                                    <div className="flex justify-between text-[9px] font-medium text-muted-foreground">
                                        <span>1,0</span>
                                        <span>alvo 1,618</span>
                                    </div>
                                </div>
                                {adonis.likelyWidth ? (
                                    <div className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 p-2 text-[10px] leading-snug text-amber-700 dark:text-amber-400">
                                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                                        <span>Ombros menores que a cintura — você deve ter medido a <b>largura</b>. Meça a <b>circunferência</b> (fita ao redor dos deltoides).</span>
                                    </div>
                                ) : (
                                    <p className="text-[10px] leading-snug text-muted-foreground">Proporção áurea ombro ÷ cintura. Quanto mais perto de 1,618, melhor o “V”.</p>
                                )}
                            </div>
                        ) : (
                            <p className="text-xs leading-snug text-muted-foreground">Preencha <b>Ombros</b> (circunferência) e <b>Cintura</b> na aba “Corpo completo”.</p>
                        )}
                    </CardContent>
                </Card>

                {/* POTENCIAL MUSCULAR — FFMI */}
                <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-transparent">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-indigo-500">
                            <TrendingUp className="h-4 w-4" /> Potencial Muscular
                            <span className="ml-auto">
                                <MetricExplainer
                                    title="FFMI — Índice de Massa Livre de Gordura"
                                    whatItIs="Mede quanto músculo você tem em relação à sua altura, descontando a gordura. É como o IMC, mas focado só na parte magra."
                                    whatItMeans="Mostra sua muscularidade real. Homens naturais (sem anabolizantes) costumam chegar no máximo perto de 25 — acima disso é raríssimo naturalmente."
                                    howToImprove="Treino de força consistente + proteína suficiente (~2 g por kg) + descanso. O número sobe conforme você ganha massa magra."
                                    reference="18 baixo · 20 média · 22 acima · 25 limite natural"
                                />
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-2 flex items-end justify-between">
                            <span className="text-2xl font-black">{ffmi.value}</span>
                            <Badge variant="secondary" className="mb-1 text-[10px]">{ffmi.label}</Badge>
                        </div>
                        <p className="text-[10px] leading-tight text-muted-foreground">Sua muscularidade real, descontando a gordura.</p>
                    </CardContent>
                </Card>

                {/* SIMETRIA */}
                <Card className="border-border/60 bg-card">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground">
                            <Binary className="h-4 w-4" /> Simetria (Esq vs Dir)
                            <span className="ml-auto">
                                <MetricExplainer
                                    title="Simetria entre os lados"
                                    whatItIs="Compara o tamanho do braço/perna esquerdos com os direitos."
                                    whatItMeans="Diferenças grandes (acima de ~4%) podem indicar um lado dominante ou desequilíbrio de força — comum, mas bom de acompanhar para evitar lesões."
                                    howToImprove="Priorize exercícios unilaterais (halteres, um braço/perna de cada vez) começando pelo lado mais fraco."
                                    reference="< 1,5% simétrico · até 4% leve · acima disso atenção"
                                />
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Braços</span>
                            {stats.armLeft && stats.armRight ? <span className={cn("font-bold", armSym.color)}>{armSym.status}</span> : <span className="text-muted-foreground">--</span>}
                        </div>
                        <Separator className="bg-border/50" />
                        <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Pernas</span>
                            {stats.thighLeft && stats.thighRight ? <span className={cn("font-bold", legSym.color)}>{legSym.status}</span> : <span className="text-muted-foreground">--</span>}
                        </div>
                    </CardContent>
                </Card>

                {/* RISCO CARDÍACO — WHR */}
                <Card className={cn("border-opacity-30 bg-gradient-to-br",
                    whr?.risk === 'Alto' ? "border-red-500 from-red-500/5" : "border-emerald-500 from-emerald-500/5"
                )}>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-foreground">
                            <HeartCrack className="h-4 w-4" /> Risco Cardíaco
                            <span className="ml-auto">
                                <MetricExplainer
                                    title="RCQ — Razão Cintura-Quadril"
                                    whatItIs="Divide a medida da cintura pela do quadril. Indica onde seu corpo acumula gordura."
                                    whatItMeans="Gordura concentrada na barriga (razão alta) tem mais ligação com problemas de coração e diabetes do que gordura no quadril/coxas, mesmo com peso normal."
                                    howToImprove="Reduzir gordura abdominal com déficit calórico leve, exercício aeróbico e sono de qualidade baixa a razão."
                                    reference="Homens saudável < 0,90 · Mulheres < 0,80"
                                />
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {whr ? (
                            <>
                                <div className="mb-2 flex items-end justify-between">
                                    <span className="text-2xl font-black">{whr.ratio}</span>
                                    <Badge className={cn("mb-1 text-[10px]", whr.risk === 'Alto' ? 'bg-red-500' : whr.risk === 'Moderado' ? 'bg-amber-500' : 'bg-emerald-500')}>{whr.risk}</Badge>
                                </div>
                                <p className="text-[10px] leading-tight text-muted-foreground">Onde seu corpo guarda gordura (barriga vs quadril).</p>
                            </>
                        ) : <p className="text-xs text-muted-foreground">Preencha <b>Cintura</b> e <b>Quadril</b>.</p>}
                    </CardContent>
                </Card>

                {/* CINTURA / ALTURA — WHtR */}
                <Card className={cn("border-opacity-30 bg-gradient-to-br",
                    whtr?.risk === 'Alto' ? "border-red-500 from-red-500/5" : whtr?.risk === 'Moderado' ? "border-amber-500 from-amber-500/5" : "border-emerald-500 from-emerald-500/5"
                )}>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-foreground">
                            <Ruler className="h-4 w-4" /> Cintura ÷ Altura
                            <span className="ml-auto">
                                <MetricExplainer
                                    title="WHtR — Razão Cintura-Altura"
                                    whatItIs="Sua cintura dividida pela sua altura. Um dos indicadores de saúde mais simples e confiáveis que existe."
                                    whatItMeans="A regra é fácil: mantenha a cintura abaixo de metade da sua altura (razão < 0,5). Acima disso, o risco metabólico começa a subir."
                                    howToImprove="Focar em perder circunferência abdominal — a altura não muda, então tudo depende de afinar a cintura."
                                    reference="< 0,5 saudável · 0,5–0,6 atenção · > 0,6 elevado"
                                />
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {whtr ? (
                            <>
                                <div className="mb-2 flex items-end justify-between">
                                    <span className="text-2xl font-black">{whtr.ratio}</span>
                                    <Badge className={cn("mb-1 text-[10px]", whtr.risk === 'Alto' ? 'bg-red-500' : whtr.risk === 'Moderado' ? 'bg-amber-500' : 'bg-emerald-500')}>{whtr.status}</Badge>
                                </div>
                                <p className="text-[10px] leading-tight text-muted-foreground">Mantenha a cintura abaixo de metade da altura.</p>
                            </>
                        ) : <p className="text-xs text-muted-foreground">Preencha <b>Cintura</b> e <b>Altura</b>.</p>}
                    </CardContent>
                </Card>

                {/* GORDURA MODERNA — RFM */}
                <Card className="border-sky-500/20 bg-gradient-to-br from-sky-500/5 to-transparent">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase text-sky-600">
                            <Droplet className="h-4 w-4" /> Gordura (RFM)
                            <span className="ml-auto">
                                <MetricExplainer
                                    title="RFM — Massa Gorda Relativa"
                                    whatItIs="Uma estimativa moderna (2018) da sua % de gordura que precisa só de altura e cintura — nenhum aparelho especial."
                                    whatItMeans="Para muita gente ela acerta mais que o IMC, porque leva em conta a barriga. Serve como um segundo palpite ao lado da fórmula Naval (pescoço/cintura/quadril) mostrada acima."
                                    howToImprove="Como depende da cintura, ela cai conforme você perde gordura abdominal."
                                    reference="Só precisa de fita métrica na cintura"
                                />
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {rfm != null && rfm > 0 ? (
                            <>
                                <div className="mb-2 flex items-end gap-1">
                                    <span className="text-2xl font-black">{rfm.toFixed(1)}</span>
                                    <span className="mb-1 text-sm font-semibold text-muted-foreground">%</span>
                                </div>
                                <p className="text-[10px] leading-tight text-muted-foreground">Estimativa alternativa, só com altura + cintura.</p>
                            </>
                        ) : <p className="text-xs text-muted-foreground">Preencha <b>Cintura</b> e <b>Altura</b>.</p>}
                    </CardContent>
                </Card>

            </div>
        </section>
    );
}
