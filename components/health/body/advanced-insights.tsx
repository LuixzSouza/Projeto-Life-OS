"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Binary, Crown, HeartCrack, TrendingUp } from "lucide-react";
import { 
    calculateSymmetry, calculateFFMI, calculateWHR, calculateAdonisIndex, calculateBodyFat, BodyStats 
} from "@/lib/body-math";
import { cn } from "@/lib/utils";

export function AdvancedInsights({ stats }: { stats: BodyStats }) {
    const bodyFat = calculateBodyFat(stats);
    const ffmi = calculateFFMI(stats.weight, stats.height, bodyFat);
    const whr = calculateWHR(stats.waist, stats.hip, stats.gender);
    const adonis = calculateAdonisIndex(stats.shoulders || 0, stats.waist);
    const armSym = calculateSymmetry(stats.armLeft, stats.armRight);
    const legSym = calculateSymmetry(stats.thighLeft, stats.thighRight);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            
            {/* FFMI */}
            <Card className="bg-gradient-to-br from-indigo-500/5 to-transparent border-indigo-500/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase font-bold text-indigo-500 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Potencial Muscular
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end justify-between mb-2">
                        <span className="text-2xl font-black">{ffmi.value}</span>
                        <Badge variant="secondary" className="mb-1 text-[10px]">{ffmi.label}</Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                        Índice de massa livre de gordura. Indica sua muscularidade real.
                    </p>
                </CardContent>
            </Card>

            {/* WHR */}
            <Card className={cn("bg-gradient-to-br border-opacity-30", 
                whr?.risk === 'Alto' ? "from-red-500/5 border-red-500" : "from-emerald-500/5 border-emerald-500"
            )}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase font-bold text-foreground flex items-center gap-2">
                        <HeartCrack className="h-4 w-4" /> Risco Cardíaco
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {whr ? (
                        <>
                            <div className="flex items-end justify-between mb-2">
                                <span className="text-2xl font-black">{whr.ratio}</span>
                                <Badge className={cn("mb-1 text-[10px]", whr.risk === 'Alto' ? 'bg-red-500' : 'bg-emerald-500')}>{whr.risk}</Badge>
                            </div>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                                Relação Cintura-Quadril. Indicador de gordura visceral.
                            </p>
                        </>
                    ) : <p className="text-xs text-muted-foreground">Adicione Cintura e Quadril.</p>}
                </CardContent>
            </Card>

            {/* Golden Ratio */}
            <Card className="bg-gradient-to-br from-amber-500/5 to-transparent border-amber-500/20">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase font-bold text-amber-600 flex items-center gap-2">
                        <Crown className="h-4 w-4" /> Estética (V-Shape)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {adonis ? (
                        <>
                            <div className="flex items-end justify-between mb-2">
                                <span className="text-2xl font-black">{adonis.ratio}</span>
                                <span className="text-[10px] font-bold text-amber-600 mb-1">{adonis.status}</span>
                            </div>
                            <Progress value={(Number(adonis.ratio) / 1.618) * 100} className="h-1.5" />
                        </>
                    ) : <p className="text-xs text-muted-foreground">Adicione Ombros e Cintura.</p>}
                </CardContent>
            </Card>

            {/* Simetria */}
            <Card className="bg-card border-border/60">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                        <Binary className="h-4 w-4" /> Simetria (Esq vs Dir)
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Braços</span>
                        {stats.armLeft ? <span className={cn("font-bold", armSym.color)}>{armSym.status}</span> : '--'}
                    </div>
                    <Separator className="bg-border/50" />
                    <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Pernas</span>
                        {stats.thighLeft ? <span className={cn("font-bold", legSym.color)}>{legSym.status}</span> : '--'}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}