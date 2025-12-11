"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Moon, Plus, ArrowRight, BedDouble, AlarmClock, BrainCircuit, Battery } from "lucide-react";
import { logMetric } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function SleepCard({ value }: { value: number | string }) {
    const [isOpen, setIsOpen] = useState(false);
    const hours = Number(value) || 0;

    // --- LÓGICA DE ANÁLISE DO SONO ---
    const getSleepAnalysis = (h: number) => {
        if (h === 0) return {
            status: "Sem dados",
            color: "bg-zinc-100 text-zinc-500",
            barColor: "bg-zinc-200",
            icon: BedDouble,
            tip: "Registre seu sono para receber análises."
        };
        if (h < 5) return { 
            status: "Crítico", 
            color: "bg-red-100 text-red-700 border-red-200", 
            barColor: "bg-red-500",
            icon: Battery,
            tip: "Cuidado! Privação de sono afeta a imunidade e o foco. Tente sonecas de 20min."
        };
        if (h < 7) return { 
            status: "Insuficiente", 
            color: "bg-orange-100 text-orange-700 border-orange-200", 
            barColor: "bg-orange-500",
            icon: AlarmClock,
            tip: "Quase lá. Tente dormir 30min mais cedo hoje para melhorar a recuperação."
        };
        if (h <= 9) return { 
            status: "Excelente", 
            color: "bg-indigo-100 text-indigo-700 border-indigo-200", 
            barColor: "bg-indigo-500",
            icon: Moon,
            tip: "Ótimo descanso! Seu corpo e mente estão recuperados para hoje."
        };
        return { 
            status: "Excesso", 
            color: "bg-blue-100 text-blue-700 border-blue-200", 
            barColor: "bg-blue-500",
            icon: BrainCircuit,
            tip: "Dormir demais pode causar letargia. Tente manter uma rotina consistente."
        };
    };

    const analysis = getSleepAnalysis(hours);
    const percentage = Math.min((hours / 8) * 100, 100); // Baseado em meta de 8h

    const handleSave = async (formData: FormData) => {
        await logMetric(formData);
        toast.success("Sono registrado! Bons sonhos. 💤");
        setIsOpen(false);
    };

    return (
        <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 h-full flex flex-col relative overflow-hidden group">
            
            {/* Background Decorativo Suave */}
            <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 -translate-y-1/2 translate-x-1/2 transition-colors duration-500 ${analysis.barColor}`}></div>

            <CardContent className="p-5 flex flex-col h-full justify-between relative z-10">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-3 items-center">
                        <div className={cn("p-2.5 rounded-xl transition-colors duration-300", analysis.color)}>
                            <analysis.icon className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Última Noite</p>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-zinc-900 dark:text-zinc-100">{hours}h</span>
                                <span className="text-xs text-zinc-400 font-medium">/ 8h meta</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Botão de Registro Rápido */}
                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full">
                                <Plus className="h-5 w-5" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-xs">
                            <DialogHeader>
                                <DialogTitle>Registrar Sono</DialogTitle>
                                <DialogDescription>Quantas horas você dormiu?</DialogDescription>
                            </DialogHeader>
                            <form action={handleSave} className="space-y-4 mt-2">
                                <input type="hidden" name="type" value="SLEEP" />
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-zinc-500">Horas</Label>
                                    <div className="flex items-center gap-2">
                                        <Input 
                                            name="value" 
                                            type="number" 
                                            step="0.5" 
                                            placeholder="Ex: 7.5" 
                                            className="text-2xl font-bold h-12" 
                                            autoFocus 
                                        />
                                        <span className="text-sm font-medium text-zinc-400">horas</span>
                                    </div>
                                </div>
                                <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Salvar Registro</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Barra de Progresso Visual */}
                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400">
                        <span>Qualidade</span>
                        <span className={cn("transition-colors duration-300", analysis.color.split(' ')[1])}>{analysis.status}</span>
                    </div>
                    <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                            className={cn("h-full rounded-full transition-all duration-1000 ease-out", analysis.barColor)} 
                            style={{ width: `${percentage}%` }} 
                        />
                    </div>
                </div>

                {/* Dica do Coach (Feedback) */}
                <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg border border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 italic leading-relaxed">
                        &quot;{analysis.tip}&quot;
                    </p>
                </div>

                {/* Link para Página Detalhada */}
                <Link href="/health/sleep" className="mt-4 pt-3 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex justify-between items-center group cursor-pointer">
                    <span className="text-xs font-medium text-zinc-500 group-hover:text-indigo-600 transition-colors">Ver histórico completo</span>
                    <ArrowRight className="h-3 w-3 text-zinc-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </Link>

            </CardContent>
        </Card>
    )
}