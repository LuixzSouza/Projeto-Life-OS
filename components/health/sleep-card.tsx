"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
    Moon, Plus, ArrowRight, BedDouble,
    Loader2, Sparkles, Zap, Brain, Coffee, LucideIcon,
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
    bar: string;
    icon: LucideIcon;
    recovery: number;
    message: string;
}

export function SleepCard({ value, targetGoal = 7.5 }: SleepCardProps) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [customValue, setCustomValue] = useState("");
    const hours = Number(value) || 0;

    // --- ANÁLISE DINÂMICA (linguagem natural, paleta do sistema) ---
    const getAnalysis = (h: number): SleepAnalysis => {
        if (h === 0) return {
            status: "NONE", label: "Sem registro", color: "text-muted-foreground", bg: "bg-muted", bar: "bg-muted-foreground/30",
            icon: BedDouble, recovery: 0, message: "Registre quantas horas você dormiu para acompanhar sua recuperação.",
        };
        if (h < 5) return {
            status: "CRITICAL", label: "Muito pouco", color: "text-rose-500", bg: "bg-rose-500/10", bar: "bg-rose-500",
            icon: Coffee, recovery: 20, message: "Noite curta demais. Pegue leve hoje e evite decisões importantes se puder.",
        };
        if (h < targetGoal) return {
            status: "LOW", label: "Abaixo da meta", color: "text-amber-500", bg: "bg-amber-500/10", bar: "bg-amber-500",
            icon: Zap, recovery: 60, message: "Deu pra funcionar, mas tente dormir mais cedo hoje — consistência vale mais que perfeição.",
        };
        if (h <= 9) return {
            status: "OPTIMAL", label: "Boa recuperação", color: "text-emerald-500", bg: "bg-emerald-500/10", bar: "bg-emerald-500",
            icon: Brain, recovery: 100, message: "Noite no ponto! Ótima janela para treinos pesados e trabalho que exige foco.",
        };
        return {
            status: "OVER", label: "Sono longo", color: "text-blue-500", bg: "bg-blue-500/10", bar: "bg-blue-500",
            icon: Moon, recovery: 90, message: "Dormiu além do habitual — repare se acordou com lentidão ou dor de cabeça.",
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
                toast.success(`${val}h de sono registradas. 😴`);
                setCustomValue("");
                setIsOpen(false);
                router.refresh();
            } else {
                toast.error(res.message);
            }
        } catch {
            toast.error("Não foi possível salvar agora. Tente de novo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl border-border/40 bg-card shadow-sm transition-all hover:shadow-md">

            {/* Indicador lateral: altura acompanha a recuperação */}
            <div
                className={cn("absolute bottom-0 left-0 top-0 w-1 transition-all duration-1000", analysis.bar)}
                style={{ height: `${analysis.recovery}%` }}
            />

            <CardHeader className="relative z-10 flex flex-row items-center justify-between gap-2 space-y-0 p-5 pb-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className={cn("shrink-0 rounded-xl p-2 transition-colors", analysis.bg, analysis.color)}>
                        <analysis.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold">Sono</CardTitle>
                        <span className={cn("mt-0.5 block truncate text-[11px] font-medium", analysis.color)}>{analysis.label}</span>
                    </div>
                </div>

                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-xl border-border/40" aria-label="Registrar sono">
                            <Plus className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="fixed left-1/2 top-1/2 z-[100] w-[95%] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border-border/40 bg-card p-6 shadow-lg">
                        <DialogHeader className="items-center text-center">
                            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-500">
                                <Moon className="h-6 w-6" />
                            </div>
                            <DialogTitle className="text-lg font-bold">Registrar sono</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground">Quantas horas você dormiu esta noite?</DialogDescription>
                        </DialogHeader>

                        <div className="mt-4 space-y-5">
                            <div className="grid grid-cols-3 gap-2">
                                {[6, 7, 8].map((val) => (
                                    <Button
                                        key={val}
                                        variant="outline"
                                        className="h-10 rounded-xl font-mono text-sm font-bold"
                                        onClick={() => handleQuickLog(val)}
                                        disabled={isLoading}
                                    >
                                        {val}h
                                    </Button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-medium text-muted-foreground">Outro valor</Label>
                                <Input
                                    type="number" step="0.1" placeholder="0.0"
                                    value={customValue}
                                    onChange={(e) => setCustomValue(e.target.value)}
                                    className="h-11 rounded-xl border-border/40 bg-muted/30 text-center text-lg font-bold"
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleQuickLog(Number(e.currentTarget.value));
                                    }}
                                />
                            </div>
                            <Button
                                className="h-11 w-full rounded-xl font-semibold"
                                disabled={isLoading || !customValue}
                                onClick={() => handleQuickLog(Number(customValue))}
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Registrar"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent className="relative z-10 flex flex-1 flex-col p-5 pt-1">

                {/* Horas dormidas + barra de recuperação */}
                <div className="flex flex-1 flex-col justify-center">
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-4xl font-bold tabular-nums leading-none tracking-tight">
                            {hours > 0 ? hours : "--"}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">horas dormidas</span>
                    </div>

                    <div className="mt-5 space-y-1.5">
                        <div className="flex items-end justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground">Recuperação</span>
                            <span className={cn("text-[11px] font-bold tabular-nums", analysis.color)}>{analysis.recovery}%</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/40">
                            <div
                                className={cn("h-full rounded-full transition-all duration-1000 ease-in-out", analysis.bar)}
                                style={{ width: `${analysis.recovery}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Insight do dia */}
                <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-border/40 bg-muted/20 p-3.5">
                    <Sparkles className={cn("mt-0.5 h-4 w-4 shrink-0", analysis.color)} />
                    <p className="text-xs leading-relaxed text-muted-foreground">{analysis.message}</p>
                </div>

                {/* Link para a análise completa */}
                <Link href="/health/sleep" className="group/link mt-4 block">
                    <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs font-medium text-muted-foreground transition-colors group-hover/link:text-primary">
                        <span>Ver análise de sono</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-1" />
                    </div>
                </Link>

            </CardContent>
        </Card>
    );
}
