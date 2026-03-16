"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogTrigger, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
    Scale, Pencil, ArrowRight, User, Loader2, Ruler, 
    Target, Info, TrendingDown, TrendingUp, CheckCircle2, 
    Zap, Activity, ShieldAlert 
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { saveBodyMeasurements } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";

interface BodyStatsProps {
    weight: number;
    height: number;
    age?: number; 
    gender?: 'MALE' | 'FEMALE';
    waist?: number;
    neck?: number;
    hip?: number;
    activityFactor?: number;
}

interface StatusConfig {
    label: string;
    color: string;
    bg: string;
    borderColor: string;
    description: string;
}

export function BodySummaryCard({ 
    weight, height, age = 25, gender = 'MALE', 
    waist = 0, neck = 0, hip = 0, activityFactor = 1.2 
}: BodyStatsProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // --- CÁLCULOS BIOMÉTRICOS ---
    const heightInMeters = height / 100;
    const bmi = (weight > 0 && height > 0) ? (weight / (heightInMeters * heightInMeters)) : 0;
    
    const genderFactor = gender === 'MALE' ? 1 : 0;
    const estimatedBodyFat = bmi > 0 ? (1.2 * bmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4 : 0;

    const minIdealWeight = 18.5 * (heightInMeters * heightInMeters);
    const maxIdealWeight = 24.9 * (heightInMeters * heightInMeters);
    
    let goalDiff = 0;
    let goalLabel = "Manter";
    let GoalIcon = CheckCircle2;
    let goalColor = "text-emerald-500";
    let goalBg = "bg-emerald-500/10";

    if (weight < minIdealWeight) {
        goalDiff = minIdealWeight - weight;
        goalLabel = "Ganhar";
        GoalIcon = TrendingUp;
        goalColor = "text-blue-500";
        goalBg = "bg-blue-500/10";
    } else if (weight > maxIdealWeight) {
        goalDiff = weight - maxIdealWeight;
        goalLabel = "Perder";
        GoalIcon = TrendingDown;
        goalColor = "text-rose-500";
        goalBg = "bg-rose-500/10";
    }

    const getStatusConfig = (val: number): StatusConfig => {
        if (val === 0) return { label: "N/A", color: "text-muted-foreground", bg: "bg-muted", borderColor: "border-muted", description: "Dados insuficientes" };
        if (val < 18.5) return { label: "Abaixo do Peso", color: "text-blue-500", bg: "bg-blue-500", borderColor: "border-blue-500/20", description: "Abaixo da faixa saudável" };
        if (val < 24.9) return { label: "Peso Ideal", color: "text-emerald-500", bg: "bg-emerald-500", borderColor: "border-emerald-500/20", description: "Composição corporal otimizada" };
        if (val < 29.9) return { label: "Sobrepeso", color: "text-amber-500", bg: "bg-amber-500", borderColor: "border-amber-500/20", description: "Levemente acima da média" };
        return { label: "Obesidade", color: "text-rose-500", bg: "bg-rose-500", borderColor: "border-rose-500/20", description: "Atenção: Risco à saúde detectado" };
    };

    const status = getStatusConfig(bmi);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        const formData = new FormData(event.currentTarget);
        
        try {
            formData.append("gender", gender);
            formData.append("activityFactor", activityFactor.toString());
            if (waist) formData.append("waist", waist.toString());
            if (neck) formData.append("neck", neck.toString());
            if (hip) formData.append("hip", hip.toString());

            const result = await saveBodyMeasurements(formData);

            if (result.success) {
                toast.success("Biometria atualizada!");
                setOpen(false);
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error("Falha na comunicação com o servidor.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="relative h-full flex flex-col overflow-hidden border-border/40 bg-card rounded-[2.5rem] shadow-2xl transition-all duration-500 group">
            
            {/* --- INDICADOR DE STATUS LATERAL --- */}
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 transition-colors duration-500", status.bg)} />

            <CardHeader className="pb-4 flex flex-row items-center justify-between relative z-10 space-y-0 px-8 pt-8">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-muted/50 rounded-2xl text-foreground/70 border border-border/40 shadow-inner group-hover:scale-110 transition-transform duration-500">
                        <Activity className="h-5 w-5" />
                    </div>
                    <div>
                        <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Análise Corporal</CardTitle>
                        <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">Sincronizado</p>
                    </div>
                </div>
                
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl border-border/40 bg-background/50 hover:bg-primary hover:text-primary-foreground transition-all shadow-sm">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-md rounded-[2.5rem] border-border/40 bg-card p-8 shadow-2xl z-[100]">
                        <DialogHeader className="flex flex-col items-center text-center">
                            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 border border-primary/20">
                                <Scale className="h-7 w-7" />
                            </div>
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Atualizar Biometria</DialogTitle>
                            <DialogDescription className="text-sm font-medium">Insira as medidas atuais para recalcular seu IMC e metas.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Massa (kg)</Label>
                                    <div className="relative">
                                        <Input name="weight" type="number" step="0.1" defaultValue={weight || ""} placeholder="0.0" className="h-14 rounded-2xl bg-muted/40 border-border/60 shadow-inner font-bold text-center text-lg focus-visible:ring-primary/20" required autoFocus />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Estatura (cm)</Label>
                                    <div className="relative">
                                        <Input name="height" type="number" defaultValue={height || ""} placeholder="0" className="h-14 rounded-2xl bg-muted/40 border-border/60 shadow-inner font-bold text-center text-lg focus-visible:ring-primary/20" required />
                                    </div>
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest text-[11px] shadow-lg shadow-primary/20 disabled:opacity-50" disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirmar Atualização"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col gap-8 px-8 pb-8 pt-2">
                
                {/* --- DISPLAY PRINCIPAL --- */}
                <div className="flex items-end justify-between">
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                            <span className="text-6xl font-black tracking-tighter text-foreground leading-none">
                                {bmi.toFixed(1)}
                            </span>
                            <div className="flex flex-col">
                                <span className="text-xs font-black text-muted-foreground uppercase">Índice</span>
                                <span className="text-xs font-black text-primary uppercase leading-none">IMC</span>
                            </div>
                        </div>
                        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-[0.1em] mt-3 shadow-sm", status.borderColor, status.color, "bg-background/50")}>
                            <Zap className="h-3 w-3 fill-current" />
                            {status.label}
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-foreground/80 font-mono tracking-tighter">
                                {estimatedBodyFat > 0 ? estimatedBodyFat.toFixed(1) : '--'}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground uppercase">%</span>
                        </div>
                        <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">Gordura Est.</span>
                    </div>
                </div>

                {/* --- ESCALA TÁTICA SEGMENTADA --- */}
                <div className="space-y-3">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[9px] font-black text-muted-foreground/60 uppercase tracking-[0.2em]">Escala de Performance</span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground/30 hover:text-primary transition-colors" /></TooltipTrigger>
                                <TooltipContent className="bg-zinc-900 text-white border-none rounded-xl p-3 text-xs">
                                    Normal: 18.5 - 24.9 | Sobrepeso: 25 - 29.9
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="h-3 w-full bg-muted/30 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-border/40 shadow-inner relative">
                        {/* Indicador Dinâmico */}
                        <div 
                            className="absolute top-0 bottom-0 w-1.5 bg-foreground z-20 rounded-full border-2 border-background shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-all duration-1000 ease-in-out"
                            style={{ left: `calc(${Math.min(Math.max((bmi / 40) * 100, 0), 98)}% )` }}
                        />
                        <div className="h-full flex-1 bg-blue-500/20 rounded-l-full" />
                        <div className="h-full flex-1 bg-emerald-500/30" />
                        <div className="h-full flex-1 bg-amber-500/30" />
                        <div className="h-full flex-1 bg-rose-500/30 rounded-r-full" />
                    </div>
                </div>

                {/* --- INSIGHT DE PESO IDEAL --- */}
                <div className={cn("border border-border/40 rounded-3xl p-5 flex items-center justify-between shadow-inner transition-all", goalBg)}>
                    <div className="flex items-center gap-4">
                        <div className={cn("h-12 w-12 rounded-2xl bg-background border shadow-xl flex items-center justify-center shrink-0", goalColor)}>
                            <GoalIcon className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Projeção de Saúde</p>
                            <h4 className="text-sm font-bold text-foreground truncate mt-0.5">
                                {goalDiff > 0 ? (
                                    <>Ajuste de <span className={cn("font-black underline decoration-2 underline-offset-4", goalColor)}>{goalDiff.toFixed(1)}kg</span> necessário</>
                                ) : (
                                    <span className="text-emerald-600 dark:text-emerald-400 font-black">Nível de Atleta Detectado</span>
                                )}
                            </h4>
                        </div>
                    </div>
                    <div className="text-right shrink-0">
                        <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest block">Meta Base</span>
                        <span className="text-xs font-mono font-bold text-foreground/60 tracking-tighter">{minIdealWeight.toFixed(0)}-{maxIdealWeight.toFixed(0)}kg</span>
                    </div>
                </div>

                {/* --- QUICK ACTION --- */}
                <Link href="/health/body" className="block mt-auto group/btn">
                    <div className="w-full h-12 rounded-2xl border border-dashed border-border/60 flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted/50 hover:text-primary hover:border-primary/40 transition-all">
                        Digitalizar Relatório Completo
                        <ArrowRight className="h-3 w-3 group-hover/btn:translate-x-1 transition-transform" />
                    </div>
                </Link>

            </CardContent>
        </Card>
    );
}