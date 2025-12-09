"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Pencil } from "lucide-react";
import { logMetric } from "@/app/(dashboard)/health/actions";
import { Progress } from "@/components/ui/progress";

interface BMICardProps {
    weight: number; // kg
    height: number; // cm
}

export function BMICard({ weight, height }: BMICardProps) {
    // Cálculo IMC: Peso / (Altura em metros * Altura em metros)
    const heightInMeters = height / 100;
    const bmi = (weight > 0 && height > 0) ? (weight / (heightInMeters * heightInMeters)) : 0;
    
    let status = "Não calculado";
    let color = "bg-zinc-200";
    let percentage = 0;

    if (bmi > 0) {
        if (bmi < 18.5) { status = "Abaixo do peso"; color = "bg-blue-400"; percentage = 25; }
        else if (bmi < 24.9) { status = "Peso Normal 🌟"; color = "bg-green-500"; percentage = 50; }
        else if (bmi < 29.9) { status = "Sobrepeso"; color = "bg-yellow-500"; percentage = 75; }
        else { status = "Obesidade"; color = "bg-red-500"; percentage = 100; }
    }

    return (
        <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-zinc-500">Índice de Massa Corporal (IMC)</CardTitle>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Pencil className="h-3 w-3" /></Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>Atualizar Medidas</DialogTitle></DialogHeader>
                        <form action={logMetric} className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Peso (kg)</Label>
                                    <Input name="value" type="number" step="0.1" defaultValue={weight} required />
                                    <input type="hidden" name="type" value="WEIGHT"/>
                                </div>
                                <div className="space-y-2">
                                    <Label>Altura (cm)</Label>
                                    <Input name="value" type="number" defaultValue={height} required />
                                    <input type="hidden" name="type" value="HEIGHT"/>
                                </div>
                             </div>
                             <Button className="w-full">Salvar Medidas</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-end mb-2">
                    <div className="text-3xl font-bold">{bmi.toFixed(1)}</div>
                    <div className={`text-xs px-2 py-1 rounded-full text-white font-medium mb-1 ${color.replace('bg-', 'bg-opacity-90 bg-')}`}>
                        {status}
                    </div>
                </div>
                <Progress value={percentage} className={`h-2 ${color}`} />
                <p className="text-xs text-zinc-400 mt-2">Baseado em {height}cm e {weight}kg.</p>
            </CardContent>
        </Card>
    )
}