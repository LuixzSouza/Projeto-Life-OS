"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Droplets, Plus, GlassWater, Loader2, 
    CheckCircle2, AlertTriangle, Zap, Waves,
    TrendingUp, Coffee, Beer, CupSoda
} from "lucide-react";
import { logMetric } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HydrationCardProps {
    total: number;
    goal?: number;
}

export function HydrationCard({ total, goal = 3000 }: HydrationCardProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [customAmount, setCustomAmount] = useState<string>("");
    
    const percentage = Math.min((total / goal) * 100, 100);
    const remaining = Math.max(goal - total, 0);
    const isGoalReached = percentage >= 100;

    // --- LOGICA DE STATUS E VISUAL CONDICIONAL ---
    const status = percentage < 30 ? { label: "Crítico", color: "text-rose-500", icon: AlertTriangle, bg: "bg-rose-500/10" }
                 : percentage < 70 ? { label: "Baixo Nível", color: "text-amber-500", icon: Zap, bg: "bg-amber-500/10" }
                 : percentage < 100 ? { label: "Otimizado", color: "text-blue-500", icon: Waves, bg: "bg-blue-500/10" }
                 : { label: "Alta Performance", color: "text-emerald-500", icon: CheckCircle2, bg: "bg-emerald-500/10" };

    const handleAddWater = async (amount: number) => {
        if (!amount || amount <= 0) return;

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append("type", "WATER");
                formData.append("value", amount.toString());

                const result = await logMetric(formData);
                
                if (result.success) {
                    toast.success(`+${amount}ml registrados! 🔥`, {
                        description: "Nível de hidratação atualizado."
                    });
                    setCustomAmount("");
                    router.refresh(); 
                } else {
                    toast.error("Erro ao registrar hidratação.");
                }
            } catch {
                toast.error("Falha na sincronização com o banco.");
            }
        });
    };

    return (
        <Card className="relative overflow-hidden border-border/40 bg-card rounded-[2rem] shadow-2xl h-full flex flex-col group transition-all duration-500 min-h-[360px]">
            
            {/* --- EFEITO LÍQUIDO DE FUNDO (PROGRESSO) --- */}
            <div 
                className="absolute bottom-0 left-0 right-0 bg-blue-500/5 transition-all duration-1000 ease-in-out pointer-events-none"
                style={{ height: `${percentage}%` }}
            />
            
            <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10 px-6 pt-6 bg-muted/20 border-b border-border/40">
                <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("p-2.5 rounded-2xl border shrink-0 shadow-inner transition-all", status.bg, status.color, "border-current/10")}>
                        <Droplets className="h-5 w-5 fill-current" />
                    </div>
                    <div className="min-w-0">
                        <CardTitle className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Tanque de Hidratação</CardTitle>
                        <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                            <status.icon className={cn("h-3.5 w-3.5 shrink-0", status.color)} />
                            <span className={cn("text-[10px] font-black uppercase tracking-widest truncate", status.color)}>{status.label}</span>
                        </div>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <span className="text-[9px] font-black text-muted-foreground/30 uppercase tracking-[0.1em] block">Objetivo Base</span>
                    <span className="text-xs font-mono font-bold text-foreground/70">{goal}ml</span>
                </div>
            </CardHeader>
            
            <CardContent className="relative z-10 flex-1 flex flex-col gap-6 p-6">
                
                {/* --- DISPLAY DE VALORES --- */}
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-5xl font-black text-foreground tracking-tighter tabular-nums leading-none">
                                {total}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground uppercase">ml</span>
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest leading-none truncate">
                            {isGoalReached ? "Meta Batida! Excelente!" : `Faltam ${remaining}ml`}
                        </p>
                    </div>

                    {/* % Circular Minimalista */}
                    <div className="relative h-16 w-16 flex items-center justify-center shrink-0 drop-shadow-lg">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <circle className="text-muted/10" stroke="currentColor" strokeWidth="3" fill="none" cx="18" cy="18" r="16" />
                            <circle 
                                className={cn("transition-all duration-1000 ease-in-out", isGoalReached ? "text-emerald-500" : "text-blue-500")}
                                stroke="currentColor" strokeWidth="3" strokeDasharray={`${percentage}, 100`} strokeLinecap="round" fill="none" cx="18" cy="18" r="16" 
                            />
                        </svg>
                        <span className="absolute text-[11px] font-mono font-black text-foreground">{Math.round(percentage)}%</span>
                    </div>
                </div>

                {/* --- CONTROLES DE INGESTÃO --- */}
                <div className="space-y-4">
                    {/* Presets mais robustos em grid de 2 (melhor para telas menores) */}
                    <div className="grid grid-cols-2 gap-3">
                        <PresetButton ml={200} label="Copo" onClick={() => handleAddWater(200)} disabled={isPending} />
                        <PresetButton ml={500} label="Garrafa" onClick={() => handleAddWater(500)} disabled={isPending} />
                    </div>

                    {/* Entrada Manual de Alta Precisão */}
                    <div className="flex gap-3 p-1.5 bg-muted/30 border border-border/40 rounded-2xl shadow-inner group focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                        <div className="relative flex-1">
                            <Input 
                                type="number" 
                                placeholder="Dose customizada..." 
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                className="h-11 bg-transparent border-none shadow-none font-bold text-sm focus-visible:ring-0 pl-3 tabular-nums placeholder:font-medium placeholder:text-muted-foreground/40"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/30 uppercase">ML</span>
                        </div>
                        <Button 
                            size="sm" 
                            disabled={isPending || !customAmount}
                            onClick={() => handleAddWater(Number(customAmount))}
                            className="bg-foreground text-background hover:bg-primary hover:text-white h-11 w-11 p-0 rounded-xl transition-all shadow-lg shrink-0"
                        >
                            {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                        </Button>
                    </div>
                </div>

            </CardContent>
        </Card>
    );
}

/* --- SUBCOMPONENTES AUXILIARES --- */

interface PresetButtonProps {
    ml: number;
    label: string;
    onClick: () => void;
    disabled: boolean;
}

function PresetButton({ ml, label, onClick, disabled }: PresetButtonProps) {
    return (
        <Button 
            variant="outline" 
            size="sm" 
            disabled={disabled}
            onClick={onClick}
            className="h-14 rounded-2xl border-border/60 bg-background/50 hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30 transition-all flex flex-col gap-0.5 group/btn shadow-sm"
        >
            <div className="flex items-baseline gap-1">
                <Plus className="h-3.5 w-3.5 opacity-40 group-hover/btn:scale-110 transition-transform" />
                <span className="font-black text-sm tracking-tighter tabular-nums">{ml}ml</span>
            </div>
            <span className="font-medium text-[9px] uppercase tracking-widest text-muted-foreground group-hover/btn:text-blue-500 opacity-70 group-hover/btn:opacity-100">{label}</span>
        </Button>
    );
}