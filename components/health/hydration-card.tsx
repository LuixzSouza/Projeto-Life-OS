"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Droplets, Plus, Loader2,
    CheckCircle2, AlertTriangle, Zap, Waves,
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

    // Status em linguagem natural, com a paleta suave do sistema.
    const status = percentage < 30 ? { label: "Bem abaixo da meta", color: "text-rose-500", icon: AlertTriangle }
                 : percentage < 70 ? { label: "Continue bebendo", color: "text-amber-500", icon: Zap }
                 : percentage < 100 ? { label: "No ritmo certo", color: "text-blue-500", icon: Waves }
                 : { label: "Meta batida!", color: "text-emerald-500", icon: CheckCircle2 };

    const handleAddWater = async (amount: number) => {
        if (!amount || amount <= 0) return;

        startTransition(async () => {
            try {
                const formData = new FormData();
                formData.append("type", "WATER");
                formData.append("value", amount.toString());

                const result = await logMetric(formData);

                if (result.success) {
                    toast.success(`+${amount}ml registrados! 💧`);
                    setCustomAmount("");
                    router.refresh();
                } else {
                    toast.error("Erro ao registrar hidratação.");
                }
            } catch {
                toast.error("Não foi possível salvar agora. Tente de novo.");
            }
        });
    };

    return (
        <Card className="relative flex h-full flex-col overflow-hidden rounded-2xl border-border/40 bg-card shadow-sm transition-all hover:shadow-md">

            {/* Nível "líquido" de fundo acompanha o progresso do dia */}
            <div
                className="pointer-events-none absolute bottom-0 left-0 right-0 bg-blue-500/5 transition-all duration-1000 ease-in-out"
                style={{ height: `${percentage}%` }}
            />

            <CardHeader className="relative z-10 flex flex-row items-center justify-between gap-2 space-y-0 p-5 pb-3">
                <div className="flex min-w-0 items-center gap-2.5">
                    <div className="shrink-0 rounded-xl bg-blue-500/10 p-2 text-blue-500">
                        <Droplets className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                        <CardTitle className="text-sm font-semibold">Hidratação</CardTitle>
                        <span className={cn("mt-0.5 flex items-center gap-1 text-[11px] font-medium", status.color)}>
                            <status.icon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{status.label}</span>
                        </span>
                    </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">Meta {goal}ml</span>
            </CardHeader>

            <CardContent className="relative z-10 flex flex-1 flex-col gap-5 p-5 pt-1">

                {/* Total do dia + anel de progresso */}
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-1.5">
                            <span className="text-4xl font-bold tabular-nums leading-none tracking-tight">{total}</span>
                            <span className="text-xs font-medium text-muted-foreground">ml</span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                            {isGoalReached ? "Meta do dia concluída 🎉" : `Faltam ${remaining}ml para a meta`}
                        </p>
                    </div>

                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
                        <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                            <circle className="text-muted/20" stroke="currentColor" strokeWidth="3" fill="none" cx="18" cy="18" r="16" />
                            <circle
                                className={cn("transition-all duration-1000 ease-in-out", isGoalReached ? "text-emerald-500" : "text-blue-500")}
                                stroke="currentColor" strokeWidth="3" strokeDasharray={`${percentage}, 100`} strokeLinecap="round" fill="none" cx="18" cy="18" r="16"
                            />
                        </svg>
                        <span className="absolute text-[11px] font-bold tabular-nums">{Math.round(percentage)}%</span>
                    </div>
                </div>

                {/* Registrar: presets + valor livre */}
                <div className="mt-auto space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                        <PresetButton ml={200} label="Copo" onClick={() => handleAddWater(200)} disabled={isPending} />
                        <PresetButton ml={500} label="Garrafa" onClick={() => handleAddWater(500)} disabled={isPending} />
                    </div>

                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                type="number"
                                inputMode="numeric"
                                placeholder="Outro valor…"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleAddWater(Number(customAmount)); }}
                                className="h-10 rounded-xl border-border/40 bg-muted/30 pr-9 text-sm tabular-nums"
                            />
                            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-muted-foreground/50">ML</span>
                        </div>
                        <Button
                            size="icon"
                            disabled={isPending || !customAmount}
                            onClick={() => handleAddWater(Number(customAmount))}
                            className="h-10 w-10 shrink-0 rounded-xl"
                            aria-label="Registrar quantidade"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
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
            disabled={disabled}
            onClick={onClick}
            className="h-12 flex-col gap-0 rounded-xl border-border/40 transition-colors hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-600"
        >
            <span className="text-sm font-bold tabular-nums">+{ml}ml</span>
            <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
        </Button>
    );
}
