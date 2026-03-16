"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
    Flame, Utensils, Activity, Zap, 
    Info, Target, ChevronRight, Brain, 
    Dumbbell, HeartPulse 
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CaloriesCardProps {
    weight: number;
    height: number;
    age?: number;
    gender?: 'MALE' | 'FEMALE';
    activityFactor?: number; // Agora usamos o fator de atividade
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
        { label: "Proteína", value: protein, desc: "Construção", color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
        { label: "Carbo", value: carbs, desc: "Energia", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
        { label: "Gordura", value: fat, desc: "Hormonal", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    ];

    return (
        <Card className="relative overflow-hidden border-border/40 bg-card rounded-[2.5rem] shadow-2xl h-full flex flex-col group transition-all duration-500">
            
            {/* Gradiente de Energia de Fundo */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />

            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10 px-6 pt-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-orange-500/10 rounded-2xl text-orange-600 dark:text-orange-400 border border-orange-500/20">
                        <Flame className="h-5 w-5 fill-current animate-pulse" />
                    </div>
                    <div>
                        <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Motor Metabólico</CardTitle>
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mt-0.5">Calculado via Mifflin-St Jeor</p>
                    </div>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger><Info className="h-4 w-4 text-muted-foreground/30 hover:text-foreground transition-colors" /></TooltipTrigger>
                        <TooltipContent className="bg-zinc-900 text-white border-none rounded-xl p-3 text-xs max-w-[250px]">
                            A taxa metabólica representa quanto seu corpo queima para manter órgãos vitais e atividades diárias.
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardHeader>
            
            <CardContent className="relative z-10 space-y-8 flex-1 flex flex-col justify-between px-6 pb-6 pt-4">
                
                {/* DISPLAY DE ENERGIA TOTAL */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block ml-1">Manutenção (Total)</span>
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-5xl font-black text-foreground tracking-tighter tabular-nums">
                                {Math.round(tdee)}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground uppercase">kcal</span>
                        </div>
                    </div>

                    <div className="flex flex-col justify-end items-end pb-1.5">
                        <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] block mr-1">Basal (Parado)</span>
                        <div className="flex items-baseline gap-1 text-muted-foreground">
                            <span className="text-xl font-bold font-mono">{Math.round(bmr)}</span>
                            <span className="text-[10px] font-bold">kcal</span>
                        </div>
                    </div>
                </div>

                {/* VISUALIZAÇÃO DE ESTRATÉGIA */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-3 flex items-center gap-3 shadow-inner">
                        <div className="h-8 w-8 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                            <Target className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 leading-none">Cutting (Perder)</p>
                            <p className="text-sm font-bold text-foreground truncate mt-1">{Math.round(tdee - 400)} <span className="text-[10px] opacity-50">kcal</span></p>
                        </div>
                    </div>
                    <div className="bg-muted/30 border border-border/50 rounded-2xl p-3 flex items-center gap-3 shadow-inner">
                        <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Zap className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[8px] font-black uppercase text-muted-foreground/60 leading-none">Bulking (Ganhar)</p>
                            <p className="text-sm font-bold text-foreground truncate mt-1">{Math.round(tdee + 300)} <span className="text-[10px] opacity-50">kcal</span></p>
                        </div>
                    </div>
                </div>

                {/* DISTRIBUIÇÃO DE MACROS */}
                <div className="space-y-4 pt-2 border-t border-border/40">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Utensils className="h-3 w-3" /> Distribuição Estratégica
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {macros.map((macro) => (
                            <div 
                                key={macro.label}
                                className={cn(
                                    "flex flex-col items-center justify-center p-3 rounded-2xl border transition-all duration-300 hover:scale-105 shadow-sm",
                                    macro.color
                                )}
                            >
                                <span className="text-lg font-black leading-none tabular-nums">
                                    {macro.value}<span className="text-[10px] ml-0.5">g</span>
                                </span>
                                <span className="text-[9px] font-black uppercase tracking-widest mt-1.5 opacity-90">
                                    {macro.label}
                                </span>
                                <span className="text-[8px] font-bold uppercase opacity-40 mt-0.5 tracking-tighter">
                                    {macro.desc}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* BOTÃO DE ACTION */}
                <button className="w-full h-10 rounded-2xl border border-dashed border-border/60 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted/50 hover:text-orange-500 hover:border-orange-500/40 transition-all group/btn">
                    Terminal de Nutrição Completo
                    <ChevronRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                </button>

            </CardContent>
        </Card>
    );
}