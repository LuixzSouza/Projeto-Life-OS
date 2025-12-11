"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Droplets, Plus, GlassWater,  } from "lucide-react";
import { logMetric } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HydrationCardProps {
    total: number;
    goal?: number; // Agora a meta é opcional (default 3000)
}

export function HydrationCard({ total, goal = 3000 }: HydrationCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    
    const percentage = Math.min((total / goal) * 100, 100);
    const remaining = Math.max(goal - total, 0);

    // Função Wrapper para corrigir o erro de tipagem e adicionar Toast
    const handleAddWater = async (amount: number) => {
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("type", "WATER");
            formData.append("value", amount.toString());

            const result = await logMetric(formData);

            if (result.success) {
                toast.success(`+${amount}ml registrados! 💧`);
            } else {
                toast.error("Erro ao registrar.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-0 shadow-sm bg-blue-50 dark:bg-blue-950/20 ring-1 ring-blue-100 dark:ring-blue-900 overflow-hidden relative">
            {/* Background decorativo (ondas sutis) */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-blue-100/50 to-transparent pointer-events-none dark:from-blue-900/30"></div>

            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wider">
                    <Droplets className="h-4 w-4" /> Hidratação
                </CardTitle>
                <span className="text-xs font-medium text-blue-400 dark:text-blue-500">
                    Meta: {goal}ml
                </span>
            </CardHeader>
            
            <CardContent className="relative z-10 space-y-4">
                
                {/* Display Principal */}
                <div className="flex items-end justify-between">
                    <div>
                        <div className="text-4xl font-black text-blue-700 dark:text-blue-300 flex items-baseline">
                            {total}
                            <span className="text-sm font-bold text-blue-400 ml-1">ml</span>
                        </div>
                        <p className="text-xs text-blue-500 mt-1">
                            {remaining > 0 ? `Faltam ${remaining}ml` : "Meta atingida! 🎉"}
                        </p>
                    </div>
                    
                    {/* Gráfico Circular Simplificado ou Ícone */}
                    <div className="h-10 w-10 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300">
                        <span className="text-xs font-bold">{Math.round(percentage)}%</span>
                    </div>
                </div>

                {/* Barra de Progresso */}
                <div className="h-2.5 w-full bg-blue-200 dark:bg-blue-900 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-blue-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                        style={{ width: `${percentage}%` }} 
                    />
                </div>

                {/* Botões de Ação Rápida */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        disabled={isLoading}
                        onClick={() => handleAddWater(250)}
                        className="bg-white dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-600 hover:bg-blue-50 hover:text-blue-700 h-9"
                    >
                        <GlassWater className="h-3.5 w-3.5 mr-2" /> +250ml
                    </Button>
                    <Button 
                        size="sm" 
                        disabled={isLoading}
                        onClick={() => handleAddWater(500)}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 h-9"
                    >
                        <Plus className="h-3.5 w-3.5 mr-1" /> 500ml
                    </Button>
                </div>

            </CardContent>
        </Card>
    )
}