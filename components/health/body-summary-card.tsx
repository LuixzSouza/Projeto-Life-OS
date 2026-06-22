"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogTrigger, DialogDescription, DialogBody,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    Scale, Pencil, ArrowRight, Loader2, Info, TrendingDown, TrendingUp, CheckCircle2,
    Activity,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { saveBodyMeasurements } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";

interface BodyStatsProps {
    weight: number;
    height: number;
    age?: number;
    gender?: 'MALE' | 'FEMALE';
    waist?: number;
    neck?: number;
    hip?: number;
    activityFactor?: number;
}

interface StatusConfig {
    label: string;
    color: string;
    bg: string;
    bar: string;
}

export function BodySummaryCard({
    weight, height, age = 25, gender = 'MALE',
    waist = 0, neck = 0, hip = 0, activityFactor = 1.2
}: BodyStatsProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // --- CÁLCULOS BIOMÉTRICOS ---
    const heightInMeters = height / 100;
    const bmi = (weight > 0 && height > 0) ? (weight / (heightInMeters * heightInMeters)) : 0;

    const genderFactor = gender === 'MALE' ? 1 : 0;
    const estimatedBodyFat = bmi > 0 ? (1.2 * bmi) + (0.23 * age) - (10.8 * genderFactor) - 5.4 : 0;

    const minIdealWeight = 18.5 * (heightInMeters * heightInMeters);
    const maxIdealWeight = 24.9 * (heightInMeters * heightInMeters);

    let goalDiff = 0;
    let GoalIcon = CheckCircle2;
    let goalColor = "text-emerald-500";
    let goalBg = "bg-emerald-500/10";
    let goalText = "Você está na faixa de peso ideal";

    if (weight > 0 && weight < minIdealWeight) {
        goalDiff = minIdealWeight - weight;
        GoalIcon = TrendingUp;
        goalColor = "text-blue-500";
        goalBg = "bg-blue-500/10";
        goalText = `Faltam ${goalDiff.toFixed(1)}kg para a faixa ideal`;
    } else if (weight > maxIdealWeight) {
        goalDiff = weight - maxIdealWeight;
        GoalIcon = TrendingDown;
        goalColor = "text-rose-500";
        goalBg = "bg-rose-500/10";
        goalText = `${goalDiff.toFixed(1)}kg acima da faixa ideal`;
    }

    const getStatusConfig = (val: number): StatusConfig => {
        if (val === 0) return { label: "Sem dados", color: "text-muted-foreground", bg: "bg-muted", bar: "bg-muted-foreground/30" };
        if (val < 18.5) return { label: "Abaixo do peso", color: "text-blue-500", bg: "bg-blue-500/10", bar: "bg-blue-500" };
        if (val < 24.9) return { label: "Peso ideal", color: "text-emerald-500", bg: "bg-emerald-500/10", bar: "bg-emerald-500" };
        if (val < 29.9) return { label: "Sobrepeso", color: "text-amber-500", bg: "bg-amber-500/10", bar: "bg-amber-500" };
        return { label: "Obesidade", color: "text-rose-500", bg: "bg-rose-500/10", bar: "bg-rose-500" };
    };

    const status = getStatusConfig(bmi);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        const formData = new FormData(event.currentTarget);

        try {
            formData.append("gender", gender);
            formData.append("activityFactor", activityFactor.toString());
            if (waist) formData.append("waist", waist.toString());
            if (neck) formData.append("neck", neck.toString());
            if (hip) formData.append("hip", hip.toString());

            const result = await saveBodyMeasurements(formData);

            if (result.success) {
                toast.success("Medidas atualizadas!");
                setOpen(false);
            } else {
                toast.error(result.message);
            }
        } catch {
            toast.error("Não foi possível salvar agora. Tente de novo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl border-border/40 bg-card shadow-sm transition-all hover:shadow-md">

            {/* Indicador de status lateral */}
            <div className={cn("absolute bottom-0 left-0 top-0 w-1 transition-colors duration-500", status.bar)} />

            <CardHeader className="relative z-10 flex flex-row items-center justify-between gap-2 space-y-0 p-5 pb-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="shrink-0 rounded-xl bg-primary/10 p-2 text-primary">
                        <Activity className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold">Composição Corporal</CardTitle>
                        <span className={cn("mt-0.5 block truncate text-[11px] font-medium", status.color)}>{status.label}</span>
                    </div>
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 rounded-xl border-border/40" aria-label="Atualizar medidas">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent size="sm">
                        <DialogHeader className="flex flex-col items-center text-center">
                            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <Scale className="h-6 w-6" />
                            </div>
                            <DialogTitle className="text-lg font-bold">Atualizar medidas</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground">Peso e altura atuais para recalcular IMC e metas.</DialogDescription>
                        </DialogHeader>
                        <DialogBody>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground">Peso (kg)</Label>
                                    <Input name="weight" type="number" step="0.1" defaultValue={weight || ""} placeholder="0.0" className="h-11 rounded-xl border-border/40 bg-muted/30 text-center text-lg font-bold" required autoFocus />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-medium text-muted-foreground">Altura (cm)</Label>
                                    <Input name="height" type="number" defaultValue={height || ""} placeholder="0" className="h-11 rounded-xl border-border/40 bg-muted/30 text-center text-lg font-bold" required />
                                </div>
                            </div>
                            <Button type="submit" className="h-11 w-full rounded-xl font-semibold" disabled={isLoading}>
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar medidas"}
                            </Button>
                        </form>
                        </DialogBody>
                    </DialogContent>
                </Dialog>
            </CardHeader>

            <CardContent className="relative z-10 flex flex-1 flex-col gap-5 p-5 pt-1">

                {/* IMC + gordura estimada */}
                <div className="flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-4xl font-bold tabular-nums leading-none tracking-tight">{bmi > 0 ? bmi.toFixed(1) : "--"}</span>
                            <span className="text-xs font-medium text-muted-foreground">IMC</span>
                        </div>
                        <span className={cn("mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", status.bg, status.color)}>
                            {status.label}
                        </span>
                    </div>

                    <div className="shrink-0 text-right">
                        <div className="flex items-baseline justify-end gap-1">
                            <span className="text-2xl font-bold tabular-nums tracking-tight">
                                {estimatedBodyFat > 0 ? estimatedBodyFat.toFixed(1) : "--"}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">%</span>
                        </div>
                        <span className="text-[11px] text-muted-foreground">gordura estimada</span>
                    </div>
                </div>

                {/* Escala de IMC com indicador */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-muted-foreground">Escala de IMC</span>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger aria-label="Como ler a escala">
                                    <Info className="h-3.5 w-3.5 text-muted-foreground/40 transition-colors hover:text-primary" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-[220px] text-xs">
                                    Ideal: 18,5–24,9 · Sobrepeso: 25–29,9 · Obesidade: 30+
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                    <div className="relative flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
                        <div
                            className="absolute bottom-0 top-0 z-10 w-1 rounded-full bg-foreground ring-2 ring-background transition-all duration-1000 ease-in-out"
                            style={{ left: `calc(${Math.min(Math.max((bmi / 40) * 100, 0), 98)}%)` }}
                        />
                        <div className="h-full flex-1 rounded-l-full bg-blue-500/30" />
                        <div className="h-full flex-1 bg-emerald-500/40" />
                        <div className="h-full flex-1 bg-amber-500/40" />
                        <div className="h-full flex-1 rounded-r-full bg-rose-500/40" />
                    </div>
                </div>

                {/* Peso ideal */}
                <div className={cn("flex items-center justify-between gap-3 rounded-xl border border-border/40 p-3.5", goalBg)}>
                    <div className="flex min-w-0 items-center gap-3">
                        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/80", goalColor)}>
                            <GoalIcon className="h-4 w-4" />
                        </div>
                        <p className="truncate text-sm font-medium">{weight > 0 ? goalText : "Registre seu peso para começar"}</p>
                    </div>
                    {height > 0 && (
                        <div className="shrink-0 text-right">
                            <span className="block text-[10px] text-muted-foreground">faixa ideal</span>
                            <span className="font-mono text-xs font-semibold text-foreground/70">{minIdealWeight.toFixed(0)}–{maxIdealWeight.toFixed(0)}kg</span>
                        </div>
                    )}
                </div>

                {/* Link para a análise completa */}
                <Link href="/health/body" className="group/link mt-auto block">
                    <div className="flex items-center justify-between border-t border-border/40 pt-3 text-xs font-medium text-muted-foreground transition-colors group-hover/link:text-primary">
                        <span>Ver análise completa</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/link:translate-x-1" />
                    </div>
                </Link>

            </CardContent>
        </Card>
    );
}
