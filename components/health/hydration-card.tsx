"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import do Input
import { Droplets, Plus, GlassWater, Loader2 } from "lucide-react";
import { logMetric } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HydrationCardProps {
    total: number;
    goal?: number; // Padrão 3000ml
}

export function HydrationCard({ total, goal = 3000 }: HydrationCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [customAmount, setCustomAmount] = useState(""); // Estado para o valor customizado
    
    const percentage = Math.min((total / goal) * 100, 100);
    const remaining = Math.max(goal - total, 0);

    const handleAddWater = async (amount: number) => {
        if (!amount || amount <= 0) return; // Validação simples

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("type", "WATER");
            formData.append("value", amount.toString());

            const result = await logMetric(formData);

            if (result.success) {
                toast.success(`+${amount}ml hidratados! 💧`);
                setCustomAmount(""); // Limpa o input após sucesso
            } else {
                toast.error("Erro ao registrar hidratação.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border border-blue-100 dark:border-blue-900 shadow-sm bg-blue-50/50 dark:bg-blue-950/10 overflow-hidden relative h-full flex flex-col justify-between">
            {/* Onda Decorativa */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-blue-100/40 to-transparent pointer-events-none dark:from-blue-900/20" />

            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-widest">
                    <Droplets className="h-4 w-4" /> Hidratação
                </CardTitle>
                <span className="text-[10px] font-bold text-blue-400/80 uppercase bg-blue-100/50 dark:bg-blue-900/30 px-2 py-0.5 rounded-full">
                    Meta: {goal}ml
                </span>
            </CardHeader>
            
            <CardContent className="relative z-10 space-y-5">
                
                {/* Display Principal */}
                <div className="flex items-end justify-between">
                    <div>
                        <div className="text-4xl font-black text-blue-600 dark:text-blue-400 flex items-baseline leading-none">
                            {total}
                            <span className="text-sm font-bold text-blue-400/70 ml-1">ml</span>
                        </div>
                        <p className="text-xs font-medium text-blue-500/80 mt-1">
                            {remaining > 0 ? `Faltam ${remaining}ml` : "Meta batida! 🎉"}
                        </p>
                    </div>
                    
                    {/* Radial Progress Simplificado */}
                    <div className="relative h-12 w-12 flex items-center justify-center">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <path className="text-blue-200 dark:text-blue-900" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" />
                            <path className="text-blue-500 transition-all duration-1000 ease-out" strokeDasharray={`${percentage}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                        <span className="absolute text-[10px] font-bold text-blue-600 dark:text-blue-400">{Math.round(percentage)}%</span>
                    </div>
                </div>

                {/* Input Customizado + Botão */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Input 
                            type="number" 
                            placeholder="Qtd (ml)" 
                            value={customAmount}
                            onChange={(e) => setCustomAmount(e.target.value)}
                            className="h-9 text-xs bg-white dark:bg-zinc-900 border-blue-200 dark:border-blue-800 focus-visible:ring-blue-400 pl-3 pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-blue-400 font-bold pointer-events-none">ml</span>
                    </div>
                    <Button 
                        size="sm" 
                        disabled={isLoading || !customAmount}
                        onClick={() => handleAddWater(Number(customAmount))}
                        className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 p-0 shrink-0"
                    >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                </div>

                {/* Botões de Ação Rápida (Secundários) */}
                <div className="grid grid-cols-2 gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={isLoading}
                        onClick={() => handleAddWater(250)}
                        className="bg-white/50 dark:bg-zinc-900/50 border-blue-200 dark:border-blue-800 text-blue-600 hover:bg-blue-100 hover:text-blue-700 h-8 text-xs"
                    >
                        <GlassWater className="h-3 w-3 mr-1.5" /> +250ml
                    </Button>
                    <Button 
                        variant="outline"
                        size="sm" 
                        disabled={isLoading}
                        onClick={() => handleAddWater(500)}
                        className="bg-white/50 dark:bg-zinc-900/50 border-blue-200 dark:border-blue-800 text-blue-600 hover:bg-blue-100 hover:text-blue-700 h-8 text-xs"
                    >
                        <GlassWater className="h-3 w-3 mr-1.5" /> +500ml
                    </Button>
                </div>

            </CardContent>
        </Card>
    )
}