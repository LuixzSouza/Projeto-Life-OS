"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Pencil, ArrowRight, User, Loader2 } from "lucide-react";
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

    // Lógica de Classificação do IMC
    let status = "Não calculado";
    let colorClass = "bg-zinc-200";
    let textClass = "text-zinc-500";
    let percentage = 0;

    if (bmi > 0) {
        if (bmi < 18.5) { 
            status = "Abaixo do peso"; colorClass = "bg-blue-400"; textClass = "text-blue-500"; percentage = 25; 
        } else if (bmi < 24.9) { 
            status = "Peso Saudável"; colorClass = "bg-emerald-500"; textClass = "text-emerald-600"; percentage = 50; 
        } else if (bmi < 29.9) { 
            status = "Sobrepeso"; colorClass = "bg-yellow-500"; textClass = "text-yellow-600"; percentage = 75; 
        } else { 
            status = "Obesidade"; colorClass = "bg-red-500"; textClass = "text-red-600"; percentage = 100; 
        }
    }

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            const weightVal = formData.get("weight");
            const heightVal = formData.get("height");

            const promises = [];

            // Adiciona as promises de update apenas se houver valor
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

            // Executa em paralelo para ser mais rápido
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
        <Card className="border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 h-full flex flex-col justify-between group hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="h-4 w-4" /> Composição Corporal
                </CardTitle>
                
                {/* Modal de Edição Rápida */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                            <Pencil className="h-3 w-3" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader><DialogTitle>Atualizar Medidas</DialogTitle></DialogHeader>
                        <form action={handleSubmit} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Peso (kg)</Label>
                                    <Input name="weight" type="number" step="0.1" defaultValue={weight || ""} placeholder="0.0" required autoFocus />
                                </div>
                                <div className="space-y-2">
                                    <Label>Altura (cm)</Label>
                                    <Input name="height" type="number" defaultValue={height || ""} placeholder="0" required />
                                </div>
                            </div>
                            <Button className="w-full bg-zinc-900 dark:bg-zinc-100" disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                {isLoading ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            
            <CardContent className="space-y-6">
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-zinc-900 dark:text-zinc-100">{bmi.toFixed(1)}</span>
                            <span className="text-xs font-bold text-zinc-400 uppercase">IMC</span>
                        </div>
                        <p className={cn("text-xs font-bold mt-1 uppercase tracking-wide", textClass)}>{status}</p>
                    </div>

                    <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-2xl font-bold text-zinc-700 dark:text-zinc-300">
                                {estimatedBodyFat > 0 ? estimatedBodyFat.toFixed(1) : '-'}
                            </span>
                            <span className="text-xs font-bold text-zinc-400">%</span>
                        </div>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">Gordura (Est.)</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Progress value={percentage} className={cn("h-2.5", colorClass.replace("bg-", "bg-opacity-20 "))} indicatorClassName={colorClass} />
                    <div className="flex justify-between text-[9px] text-zinc-400 font-bold uppercase px-0.5">
                        <span>Magreza</span>
                        <span>Normal</span>
                        <span>Sobrepeso</span>
                        <span>Obesidade</span>
                    </div>
                </div>

                <Link href="/health/body" className="block pt-1">
                    <Button variant="outline" size="sm" className="w-full text-xs h-9 border-dashed border-zinc-300 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all">
                        Ver Relatório Completo <ArrowRight className="h-3 w-3 ml-2" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}