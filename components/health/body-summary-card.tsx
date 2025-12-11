"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Pencil, ArrowRight, User } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { logMetric } from "@/app/(dashboard)/health/actions"; // Importe a action
import { toast } from "sonner";
import { useState } from "react";

interface BodyStatsProps {
    weight: number;
    height: number;
    age?: number; 
    gender?: 'MALE' | 'FEMALE';
}

export function BodySummaryCard({ weight, height, age = 25, gender = 'MALE' }: BodyStatsProps) {
    const [open, setOpen] = useState(false);

    // 1. IMC
    const heightInMeters = height / 100;
    const bmi = (weight > 0 && height > 0) ? (weight / (heightInMeters * heightInMeters)) : 0;
    
    // 2. Estimativa de Gordura
    const genderFactor = gender === 'MALE' ? 1 : 0;
    const estimatedBodyFat = bmi > 0 ? (1.2 * bmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4 : 0;

    // Classificação IMC
    let status = "Não calculado";
    let colorClass = "bg-zinc-200";
    let textClass = "text-zinc-500";
    let percentage = 0;

    if (bmi > 0) {
        if (bmi < 18.5) { 
            status = "Abaixo do peso"; 
            colorClass = "bg-blue-400"; 
            textClass = "text-blue-500";
            percentage = 25; 
        } else if (bmi < 24.9) { 
            status = "Peso Saudável"; 
            colorClass = "bg-emerald-500"; 
            textClass = "text-emerald-600";
            percentage = 50; 
        } else if (bmi < 29.9) { 
            status = "Sobrepeso"; 
            colorClass = "bg-yellow-500"; 
            textClass = "text-yellow-600";
            percentage = 75; 
        } else { 
            status = "Obesidade"; 
            colorClass = "bg-red-500"; 
            textClass = "text-red-600";
            percentage = 100; 
        }
    }

    // ✅ CORREÇÃO: Função Wrapper para o formulário
    const handleSubmit = async (formData: FormData) => {
        // Enviar Peso
        const weightData = new FormData();
        weightData.append("type", "WEIGHT");
        weightData.append("value", formData.get("weight") as string);
        await logMetric(weightData);

        // Enviar Altura
        const heightData = new FormData();
        heightData.append("type", "HEIGHT");
        heightData.append("value", formData.get("height") as string);
        const result = await logMetric(heightData);

        if (result.success) {
            toast.success("Medidas atualizadas!");
            setOpen(false); // Fecha o modal
        } else {
            toast.error("Erro ao salvar: " + result.message);
        }
    };

    return (
        <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 relative overflow-hidden group hover:ring-zinc-300 dark:hover:ring-zinc-700 transition-all h-full">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <User className="h-4 w-4" /> Composição Corporal
                </CardTitle>
                
                {/* Modal de Edição Rápida */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-zinc-600">
                            <Pencil className="h-3 w-3" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Atualizar Medidas</DialogTitle></DialogHeader>
                        {/* A action agora aponta para o wrapper */}
                        <form action={handleSubmit} className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Peso (kg)</Label>
                                    <Input name="weight" type="number" step="0.1" defaultValue={weight} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Altura (cm)</Label>
                                    <Input name="height" type="number" defaultValue={height} required />
                                </div>
                            </div>
                            <Button className="w-full">Salvar Medidas</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            
            <CardContent className="space-y-5">
                {/* IMC Principal */}
                <div className="flex justify-between items-end">
                    <div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{bmi.toFixed(1)}</span>
                            <span className="text-xs font-bold text-zinc-400">IMC</span>
                        </div>
                        <p className={cn("text-xs font-medium mt-1", textClass)}>{status}</p>
                    </div>

                    {/* Estimativa de Gordura (Secundário) */}
                    <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className="text-xl font-bold text-zinc-700 dark:text-zinc-300">
                                {estimatedBodyFat > 0 ? estimatedBodyFat.toFixed(1) : '-'}
                            </span>
                            <span className="text-[10px] font-bold text-zinc-400">%</span>
                        </div>
                        <p className="text-[10px] text-zinc-400">Gordura (Est.)</p>
                    </div>
                </div>

                {/* Barra Visual */}
                <div className="space-y-1.5">
                    <Progress value={percentage} className={cn("h-2", colorClass)} />
                    <div className="flex justify-between text-[10px] text-zinc-400 font-medium px-0.5">
                        <span>Magreza</span>
                        <span>Saudável</span>
                        <span>Sobrepeso</span>
                        <span>Obesidade</span>
                    </div>
                </div>

                {/* Link para Página Completa */}
                <Link href="/health/body" className="block pt-2">
                    <Button variant="ghost" size="sm" className="w-full text-xs h-8 gap-1 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        Ver Bioimpedância Completa <ArrowRight className="h-3 w-3" />
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}