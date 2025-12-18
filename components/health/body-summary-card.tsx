"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Scale, Pencil, ArrowRight, User, Loader2, Ruler, Target, Info, TrendingDown, TrendingUp, CheckCircle2 } from "lucide-react";
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

export function BodySummaryCard({ 
    weight, height, age = 25, gender = 'MALE', 
    waist = 0, neck = 0, hip = 0, activityFactor = 1.2 
}: BodyStatsProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // --- CÁLCULOS MATEMÁTICOS ---
    const heightInMeters = height / 100;
    const bmi = (weight > 0 && height > 0) ? (weight / (heightInMeters * heightInMeters)) : 0;
    
    // Gordura Estimada
    const genderFactor = gender === 'MALE' ? 1 : 0;
    const estimatedBodyFat = bmi > 0 ? (1.2 * bmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4 : 0;

    // Faixa de Peso Ideal (IMC 18.5 a 24.9)
    const minIdealWeight = 18.5 * (heightInMeters * heightInMeters);
    const maxIdealWeight = 24.9 * (heightInMeters * heightInMeters);
    
    // Cálculo da Diferença para a Meta
    let goalDiff = 0;
    let goalLabel = "Manter";
    let GoalIcon = CheckCircle2;
    let goalColor = "text-emerald-500";

    if (weight < minIdealWeight) {
        goalDiff = minIdealWeight - weight;
        goalLabel = "Ganhar";
        GoalIcon = TrendingUp;
        goalColor = "text-blue-500";
    } else if (weight > maxIdealWeight) {
        goalDiff = weight - maxIdealWeight;
        goalLabel = "Perder";
        GoalIcon = TrendingDown;
        goalColor = "text-amber-500";
    }

    // Configuração visual baseada no IMC
    const getStatusConfig = (val: number) => {
        if (val === 0) return { label: "N/A", color: "text-muted-foreground", bg: "bg-muted", fill: 0 };
        if (val < 18.5) return { label: "Magreza", color: "text-blue-500", bg: "bg-blue-500", fill: 15 };
        if (val < 24.9) return { label: "Saudável", color: "text-emerald-500", bg: "bg-emerald-500", fill: 50 };
        if (val < 29.9) return { label: "Sobrepeso", color: "text-amber-500", bg: "bg-amber-500", fill: 85 };
        return { label: "Obesidade", color: "text-rose-500", bg: "bg-rose-500", fill: 100 };
    };

    const status = getStatusConfig(bmi);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            // Preserva dados ocultos
            formData.append("gender", gender);
            formData.append("activityFactor", activityFactor.toString());
            if (waist) formData.append("waist", waist.toString());
            if (neck) formData.append("neck", neck.toString());
            if (hip) formData.append("hip", hip.toString());

            const result = await saveBodyMeasurements(formData);

            if (result.success) {
                toast.success("Peso atualizado com sucesso!");
                setOpen(false);
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error("Erro ao salvar medidas.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="relative h-full flex flex-col overflow-hidden border-border/60 bg-card/50 shadow-sm hover:shadow-lg transition-all duration-300 group">
            
            {/* Efeito de Fundo */}
            <div className={cn("absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none opacity-10 transition-colors duration-500", status.bg)} />

            {/* --- HEADER --- */}
            <CardHeader className="pb-2 flex flex-row items-start justify-between relative z-10 space-y-0">
                <div className="space-y-1">
                    <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-md text-primary ring-1 ring-primary/20">
                            <User className="h-3.5 w-3.5" />
                        </div>
                        Composição Corporal
                    </CardTitle>
                </div>
                
                {/* Botão de Edição */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors -mr-2">
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px] rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Scale className="h-5 w-5 text-primary" /> Atualizar Peso Rápido
                            </DialogTitle>
                            <DialogDescription>
                                Atualize apenas o peso e altura. 
                            </DialogDescription>
                        </DialogHeader>
                        <form action={handleSubmit} className="space-y-6 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Peso (kg)</Label>
                                    <div className="relative">
                                        <Scale className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input name="weight" type="number" step="0.1" defaultValue={weight || ""} placeholder="0.0" className="pl-9 h-11 text-lg font-medium" required autoFocus />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Altura (cm)</Label>
                                    <div className="relative">
                                        <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input name="height" type="number" defaultValue={height || ""} placeholder="0" className="pl-9 h-11 text-lg font-medium" required />
                                    </div>
                                </div>
                            </div>
                            <Button className="w-full h-11 font-semibold shadow-md shadow-primary/20" disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Salvar Alterações"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            
            {/* --- CONTEÚDO PRINCIPAL --- */}
            <CardContent className="flex-1 flex flex-col gap-6 relative z-10 pt-2">
                
                {/* Linha 1: Dados Grandes */}
                <div className="flex items-end justify-between">
                    <div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black text-foreground tracking-tighter drop-shadow-sm">
                                {bmi.toFixed(1)}
                            </span>
                            <span className="text-sm font-bold text-muted-foreground uppercase mb-1.5 ml-1">IMC</span>
                        </div>
                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border", status.color.replace("text-", "bg-").replace("500", "500/10"), status.color.replace("text", "border").replace("500", "500/20"))}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", status.bg)}></span>
                            {status.label}
                        </div>
                    </div>

                    <div className="text-right space-y-1">
                        <div className="flex flex-col items-end">
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-bold text-foreground/90">
                                    {estimatedBodyFat > 0 ? estimatedBodyFat.toFixed(1) : '-'}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground">%</span>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Gordura (Est.)</span>
                        </div>
                    </div>
                </div>

                {/* Linha 2: Barra de Progresso Segmentada Customizada */}
                <div className="space-y-2">
                    <div className="h-2.5 w-full bg-secondary/50 rounded-full overflow-hidden flex relative">
                        {/* Indicador de Posição */}
                        <div 
                            className="absolute h-full w-1 bg-foreground z-10 shadow-[0_0_10px_rgba(0,0,0,0.5)] transition-all duration-1000 ease-out"
                            style={{ left: `${Math.min(Math.max((bmi / 40) * 100, 0), 100)}%` }}
                        />
                        
                        {/* Segmentos Coloridos */}
                        <div className="h-full w-[46%] bg-blue-500/30 border-r border-background/20" /> {/* Magreza até 18.5 (aprox 46% de 40) */}
                        <div className="h-full w-[16%] bg-emerald-500/40 border-r border-background/20" /> {/* Saudável até 24.9 */}
                        <div className="h-full w-[13%] bg-amber-500/40 border-r border-background/20" /> {/* Sobrepeso até 29.9 */}
                        <div className="h-full w-[25%] bg-rose-500/40" /> {/* Obesidade */}
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-muted-foreground/60 uppercase px-0.5 tracking-wide">
                        <span>18.5</span>
                        <span>25</span>
                        <span>30</span>
                        <span>40+</span>
                    </div>
                </div>

                {/* Linha 3: Insight Inteligente (Peso Ideal) */}
                <div className="bg-muted/30 border border-border/50 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={cn("p-2 rounded-full bg-background border shadow-sm", goalColor)}>
                            <GoalIcon className="h-4 w-4" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-muted-foreground">Peso Ideal ({minIdealWeight.toFixed(0)}-{maxIdealWeight.toFixed(0)}kg)</p>
                            <p className="text-xs font-medium text-foreground">
                                {goalDiff > 0 ? (
                                    <>Precisa <span className={cn("font-bold", goalColor)}>{goalLabel} {goalDiff.toFixed(1)}kg</span></>
                                ) : (
                                    <span className="text-emerald-500 font-bold">Peso Excelente!</span>
                                )}
                            </p>
                        </div>
                    </div>
                    
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Info className="h-4 w-4 text-muted-foreground/50 hover:text-foreground transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent className="text-xs max-w-[200px]">
                                Baseado na faixa de IMC saudável (18.5 - 24.9) para sua altura.
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                {/* Footer Action */}
                <div className="mt-auto pt-2">
                    <Link href="/health/body" className="block">
                        <Button variant="outline" size="sm" className="w-full h-9 text-xs font-medium border-dashed border-border/60 hover:bg-muted/50 hover:border-primary/30 hover:text-primary transition-all group/btn">
                            Relatório Completo 
                            <ArrowRight className="h-3 w-3 ml-2 opacity-50 group-hover/btn:translate-x-1 group-hover/btn:opacity-100 transition-all" />
                        </Button>
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}