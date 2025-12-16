"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Droplets, Plus, GlassWater, Loader2, CheckCircle2 } from "lucide-react";
import { logMetric } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HydrationCardProps {
    total: number;
    goal?: number; // Padrão 3000ml
}

export function HydrationCard({ total, goal = 3000 }: HydrationCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [customAmount, setCustomAmount] = useState("");
    
    const percentage = Math.min((total / goal) * 100, 100);
    const remaining = Math.max(goal - total, 0);
    const isGoalReached = percentage >= 100;

    const handleAddWater = async (amount: number) => {
        if (!amount || amount <= 0) return;

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("type", "WATER");
            formData.append("value", amount.toString());

            const result = await logMetric(formData);

            if (result.success) {
                toast.success(`+${amount}ml hidratados! 💧`);
                setCustomAmount("");
            } else {
                toast.error("Erro ao registrar hidratação.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        } finally {
            setIsLoading(false);
        }
    };

    // Cálculo para o círculo SVG (Circunferência = 2 * PI * R)
    // R = 16 (viewBox 36, stroke 4 -> raio aproximado) -> Circunferência ~ 100
    const strokeDasharray = `${percentage}, 100`;

    return (
        <Card className="relative overflow-hidden border-border/60 bg-card shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col justify-between group">
            
            {/* Background Decorativo */}
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
            
            {/* Header */}
            <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                        <Droplets className="h-3.5 w-3.5" />
                    </div>
                    Hidratação
                </CardTitle>
                <div className={cn(
                    "text-[10px] font-bold uppercase px-2 py-0.5 rounded-full transition-colors border",
                    isGoalReached 
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" 
                        : "bg-background text-muted-foreground border-border"
                )}>
                    Meta: {goal}ml
                </div>
            </CardHeader>
            
            <CardContent className="relative z-10 space-y-6 flex-1 flex flex-col justify-end">
                
                {/* Visualização Principal */}
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black text-foreground tracking-tighter">
                                {total}
                            </span>
                            <span className="text-sm font-semibold text-muted-foreground">ml</span>
                        </div>
                        <div className="flex items-center gap-1.5 h-5">
                            {isGoalReached ? (
                                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 animate-in fade-in slide-in-from-left-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Meta Batida!
                                </span>
                            ) : (
                                <span className="text-xs font-medium text-muted-foreground">
                                    Faltam <span className="text-primary font-bold">{remaining}ml</span>
                                </span>
                            )}
                        </div>
                    </div>
                    
                    {/* Radial Progress */}
                    <div className="relative h-14 w-14 flex items-center justify-center shrink-0">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            {/* Track */}
                            <path 
                                className="text-muted/20" 
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="3" 
                            />
                            {/* Indicator */}
                            <path 
                                className={cn("text-primary transition-all duration-1000 ease-out", isGoalReached && "text-emerald-500")}
                                strokeDasharray={strokeDasharray} 
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                                fill="none" 
                                stroke="currentColor" 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                            />
                        </svg>
                        <span className={cn("absolute text-[10px] font-bold", isGoalReached ? "text-emerald-600" : "text-primary")}>
                            {Math.round(percentage)}%
                        </span>
                    </div>
                </div>

                <div className="space-y-3">
                    {/* Input Customizado */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input 
                                type="number" 
                                placeholder="Qtd..." 
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                className="h-9 text-sm bg-background border-border focus-visible:ring-primary pl-3 pr-8 shadow-sm"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-bold pointer-events-none">
                                ml
                            </span>
                        </div>
                        <Button 
                            size="sm" 
                            disabled={isLoading || !customAmount}
                            onClick={() => handleAddWater(Number(customAmount))}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 w-9 p-0 shrink-0 shadow-sm"
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        </Button>
                    </div>

                    {/* Botões de Ação Rápida */}
                    <div className="grid grid-cols-2 gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            disabled={isLoading}
                            onClick={() => handleAddWater(250)}
                            className="h-8 text-xs border-border/50 bg-secondary/50 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all"
                        >
                            <GlassWater className="h-3 w-3 mr-1.5 opacity-70" /> +250ml
                        </Button>
                        <Button 
                            variant="outline"
                            size="sm" 
                            disabled={isLoading}
                            onClick={() => handleAddWater(500)}
                            className="h-8 text-xs border-border/50 bg-secondary/50 hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all"
                        >
                            <GlassWater className="h-3 w-3 mr-1.5 opacity-70" /> +500ml
                        </Button>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}