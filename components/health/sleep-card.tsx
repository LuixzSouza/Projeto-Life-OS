"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogTrigger, DialogDescription 
} from "@/components/ui/dialog";
import { 
    Moon, Plus, ArrowRight, BedDouble, 
    Loader2, Sparkles, Zap, Brain, Coffee, LucideIcon 
} from "lucide-react";
import { logSleep } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

// --- INTERFACES ESTREITAS ---
interface SleepCardProps {
    value: number | string;
    targetGoal?: number;
}

interface SleepAnalysis {
    status: string;
    label: string;
    color: string;
    bg: string;
    icon: LucideIcon; // Aqui removemos o 'any'
    recovery: number;
    message: string;
}

export function SleepCard({ value, targetGoal = 7.5 }: SleepCardProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [customValue, setCustomValue] = useState("");
    const hours = Number(value) || 0;

    // --- ANÁLISE DINÂMICA ---
    const getAnalysis = (h: number): SleepAnalysis => {
        if (h === 0) return { 
            status: "NONE", label: "Aguardando Log", color: "text-muted-foreground", bg: "bg-muted", 
            icon: BedDouble, recovery: 0, message: "Sincronize seus dados de descanso para calcular a regeneração neural." 
        };
        if (h < 5) return { 
            status: "CRITICAL", label: "Modo Sobrevivência", color: "text-rose-500", bg: "bg-rose-500/10", 
            icon: Coffee, recovery: 20, message: "Alta carga de cortisol. Priorize tarefas leves e evite decisões críticas hoje." 
        };
        if (h < targetGoal) return { 
            status: "LOW", label: "Déficit de Atenção", color: "text-amber-500", bg: "bg-amber-500/10", 
            icon: Zap, recovery: 60, message: "Você está operando com bateria parcial. Consistência é melhor que perfeição." 
        };
        if (h <= 9) return { 
            status: "OPTIMAL", label: "Recuperação Total", color: "text-emerald-500", bg: "bg-emerald-500/10", 
            icon: Brain, recovery: 100, message: "Pico de performance cognitiva atingido. Excelente janela para aprendizado." 
        };
        return { 
            status: "OVER", label: "Inércia Pós-Sono", color: "text-blue-500", bg: "bg-blue-500/10", 
            icon: Moon, recovery: 90, message: "Ciclo extendido. Monitore possíveis dores de cabeça ou lentidão motora." 
        };
    };

    const analysis = getAnalysis(hours);

    const handleQuickLog = async (val: number) => {
        if (!val || val <= 0) {
            toast.error("Informe uma duração válida.");
            return;
        }
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append("value", val.toString());
            const res = await logSleep(formData);
            if (res.success) {
                toast.success(`Log de ${val}h registrado.`);
                setCustomValue("");
                setIsOpen(false);
                router.refresh();
            } else {
                toast.error(res.message);
            }
        } catch {
            toast.error("Falha no uplink.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="relative overflow-hidden border-border/40 bg-card rounded-[2rem] shadow-2xl h-full flex flex-col group transition-all duration-500">
            
            {/* --- INDICADOR DE CARGA (BARRA LATERAL) --- */}
            <div 
                className={cn("absolute top-0 left-0 bottom-0 w-1.5 transition-all duration-1000", analysis.bg.replace('/10', ''))} 
                style={{ height: `${analysis.recovery}%` }}
            />

            <CardContent className="p-6 flex flex-col h-full relative z-10 min-h-[350px]">
                
                {/* HEADER */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-3 items-center">
                        <div className={cn("p-2.5 rounded-xl border transition-all duration-500 shadow-inner", analysis.bg, analysis.color)}>
                            <analysis.icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 truncate">Recuperação</p>
                            <h3 className={cn("text-[11px] font-black uppercase tracking-widest mt-0.5 truncate", analysis.color)}>
                                {analysis.label}
                            </h3>
                        </div>
                    </div>

                    <Dialog open={isOpen} onOpenChange={setIsOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl border-border/40 bg-background/50 hover:bg-primary hover:text-primary-foreground transition-all shrink-0">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-sm rounded-[2rem] border-border/40 bg-card p-6 shadow-2xl z-[100]">
                            <DialogHeader className="items-center text-center">
                                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 mb-2">
                                    <Moon className="h-6 w-6" />
                                </div>
                                <DialogTitle className="text-xl font-black uppercase tracking-tighter">Log de Ciclo</DialogTitle>
                                <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Duração do Repouso</DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 mt-4">
                                <div className="grid grid-cols-3 gap-2">
                                    {[6, 7, 8].map((val) => (
                                        <Button 
                                            key={val} 
                                            variant="outline" 
                                            className="h-10 rounded-xl font-bold font-mono text-xs"
                                            onClick={() => handleQuickLog(val)}
                                            disabled={isLoading}
                                        >
                                            {val}h
                                        </Button>
                                    ))}
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Personalizado</Label>
                                    <Input
                                        type="number" step="0.1" placeholder="0.0"
                                        value={customValue}
                                        onChange={(e) => setCustomValue(e.target.value)}
                                        className="h-12 rounded-xl bg-muted/40 border-border/60 shadow-inner font-bold text-center text-lg focus-visible:ring-primary/20"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleQuickLog(Number(e.currentTarget.value));
                                        }}
                                    />
                                </div>
                                <Button
                                    className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px]"
                                    disabled={isLoading || !customValue}
                                    onClick={() => handleQuickLog(Number(customValue))}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* DISPLAY DE ENERGIA */}
                <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black tracking-tighter text-foreground tabular-nums leading-none">
                            {hours > 0 ? hours : '--'}
                        </span>
                        <div className="flex flex-col">
                            <span className="text-xs font-black text-muted-foreground uppercase leading-none">Horas</span>
                            <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest mt-0.5">Dormidas</span>
                        </div>
                    </div>
                    
                    <div className="mt-6 space-y-2">
                        <div className="flex justify-between items-end px-0.5">
                            <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-[0.2em]">Carga Vital</span>
                            <span className={cn("text-[10px] font-mono font-bold", analysis.color)}>{analysis.recovery}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden border border-border/20 shadow-inner">
                            <div 
                                className={cn("h-full rounded-full transition-all duration-1000 ease-in-out", analysis.bg.replace('/10', ''))}
                                style={{ width: `${analysis.recovery}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* INSIGHT */}
                <div className="mt-6 p-4 bg-muted/20 rounded-2xl border border-border/40 flex gap-3 items-start shadow-inner">
                    <Sparkles className={cn("h-4 w-4 mt-0.5 shrink-0", analysis.color)} />
                    <p className="text-[11px] font-medium text-muted-foreground leading-relaxed">
                        {analysis.message}
                    </p>
                </div>

                {/* FOOTER */}
                <Link href="/health/sleep" className="mt-6 group/link">
                    <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 group-hover/link:text-primary transition-colors border-t border-border/40 pt-4">
                        <span>Terminal Circadiano</span>
                        <ArrowRight className="h-3 w-3 group-hover/link:translate-x-1 transition-transform" />
                    </div>
                </Link>

            </CardContent>
        </Card>
    );
}