"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Pencil, ArrowRight, User, Loader2, Ruler } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { logMetric } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";

interface BodyStatsProps {
    weight: number;
    height: number;
    age?: number; 
    gender?: 'MALE' | 'FEMALE';
}

export function BodySummaryCard({ weight, height, age = 25, gender = 'MALE' }: BodyStatsProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // 1. Cálculos (IMC e Gordura)
    const heightInMeters = height / 100;
    const bmi = (weight > 0 && height > 0) ? (weight / (heightInMeters * heightInMeters)) : 0;
    
    // Fórmula de Deurenberg para Gordura Corporal Estimada
    const genderFactor = gender === 'MALE' ? 1 : 0;
    const estimatedBodyFat = bmi > 0 ? (1.2 * bmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4 : 0;

    // Configuração visual baseada no IMC
    const getStatusConfig = (val: number) => {
        if (val === 0) return { label: "Não calculado", color: "text-muted-foreground", bg: "bg-muted", progress: 0 };
        if (val < 18.5) return { label: "Abaixo do peso", color: "text-blue-500", bg: "bg-blue-500", progress: 25 };
        if (val < 24.9) return { label: "Peso Saudável", color: "text-emerald-500", bg: "bg-emerald-500", progress: 50 };
        if (val < 29.9) return { label: "Sobrepeso", color: "text-amber-500", bg: "bg-amber-500", progress: 75 };
        return { label: "Obesidade", color: "text-destructive", bg: "bg-destructive", progress: 100 };
    };

    const status = getStatusConfig(bmi);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            const weightVal = formData.get("weight");
            const heightVal = formData.get("height");

            const promises = [];

            if (weightVal) {
                const wData = new FormData();
                wData.append("type", "WEIGHT");
                wData.append("value", weightVal.toString());
                promises.push(logMetric(wData));
            }

            if (heightVal) {
                const hData = new FormData();
                hData.append("type", "HEIGHT");
                hData.append("value", heightVal.toString());
                promises.push(logMetric(hData));
            }

            await Promise.all(promises);

            toast.success("Medidas atualizadas com sucesso!");
            setOpen(false);
        } catch (error) {
            toast.error("Erro ao salvar medidas.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm hover:shadow-md transition-all duration-300 group h-full flex flex-col justify-between">
            
            {/* Background Decorativo Sutil */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            <CardHeader className="pb-2 flex flex-row items-center justify-between relative z-10">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                        <User className="h-3.5 w-3.5" />
                    </div>
                    Composição Corporal
                </CardTitle>
                
                {/* Modal de Edição */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[400px] rounded-xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Scale className="h-5 w-5 text-primary" /> Atualizar Medidas
                            </DialogTitle>
                            <DialogDescription>Insira seus dados atuais para recalcular o IMC.</DialogDescription>
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
            
            <CardContent className="space-y-6 relative z-10 flex-1 flex flex-col justify-end">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-5xl font-black text-foreground tracking-tighter">
                                {bmi.toFixed(1)}
                            </span>
                            <span className="text-sm font-bold text-muted-foreground uppercase mb-1">IMC</span>
                        </div>
                        <div className={cn("text-xs font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-md w-fit", status.color.replace("text-", "bg-").replace("500", "500/10"), status.color)}>
                            {status.label}
                        </div>
                    </div>

                    <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-2xl font-bold text-foreground/80">
                                {estimatedBodyFat > 0 ? estimatedBodyFat.toFixed(1) : '-'}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground">%</span>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide opacity-80">Gordura (Est.)</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Progress value={status.progress} className="h-2 bg-secondary" indicatorClassName={status.bg} />
                    <div className="flex justify-between text-[9px] text-muted-foreground/60 font-bold uppercase px-0.5">
                        <span>Magreza</span>
                        <span>Normal</span>
                        <span>Sobrepeso</span>
                        <span>Obesidade</span>
                    </div>
                </div>

                <Link href="/health/body" className="block pt-2">
                    <Button variant="outline" size="sm" className="w-full h-9 text-xs border-dashed border-border/60 hover:bg-muted/50 hover:text-primary transition-all group/btn">
                        Ver Relatório Completo <ArrowRight className="h-3 w-3 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}