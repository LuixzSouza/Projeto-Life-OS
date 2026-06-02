"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trophy, Flame, Trash2, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createChallenge, toggleCheckin, deleteChallenge } from "@/app/(dashboard)/health/actions";
import { CHALLENGE_TEMPLATES, CATEGORY_LABELS, ChallengeTemplate } from "./challenge-templates";

export interface SerializedChallenge {
    id: string;
    title: string;
    description: string | null;
    category: string | null;
    durationDays: number;
    color: string | null;
    startDate: string;
    completedDays: number[];
}

function computeStreak(completed: number[]): number {
    if (completed.length === 0) return 0;
    const set = new Set(completed);
    const max = Math.max(...completed);
    let streak = 0;
    for (let i = max; i >= 0; i--) {
        if (set.has(i)) streak++;
        else break;
    }
    return streak;
}

export function ChallengesPanel({ challenges }: { challenges: SerializedChallenge[] }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [creatingKey, setCreatingKey] = useState<string | null>(null);

    const startTemplate = (tpl: ChallengeTemplate) => {
        setCreatingKey(tpl.key);
        startTransition(async () => {
            const res = await createChallenge({
                title: tpl.title,
                description: tpl.description,
                category: tpl.category,
                durationDays: tpl.durationDays,
                color: tpl.color,
            });
            setCreatingKey(null);
            if (res.success) { toast.success(res.message); router.refresh(); }
            else toast.error(res.message);
        });
    };

    return (
        <div className="space-y-8">
            {/* Desafios ativos */}
            {challenges.length > 0 && (
                <div className="space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        <h3 className="text-sm font-semibold text-foreground">Seus desafios</h3>
                        <span className="text-xs text-muted-foreground">· {challenges.length}</span>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {challenges.map((ch) => (
                            <ChallengeCard key={ch.id} challenge={ch} disabled={isPending} onRefresh={() => router.refresh()} />
                        ))}
                    </div>
                </div>
            )}

            {/* Galeria de templates */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                    <Plus className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-foreground">Iniciar um desafio</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {CHALLENGE_TEMPLATES.map((tpl) => (
                        <Card key={tpl.key} className="group border-border/40 bg-card rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
                            <CardContent className="p-5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${tpl.color}1a` }}>
                                        {tpl.emoji}
                                    </div>
                                    <Badge variant="secondary" className="text-[10px] font-semibold bg-muted/60 text-muted-foreground border-none">
                                        {tpl.durationDays} dias
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-sm text-foreground tracking-tight">{tpl.title}</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{tpl.description}</p>
                                </div>
                                <Button
                                    size="sm"
                                    disabled={isPending}
                                    onClick={() => startTemplate(tpl)}
                                    className="w-full h-9 rounded-lg font-semibold gap-1.5"
                                >
                                    <Plus className="h-3.5 w-3.5" /> {creatingKey === tpl.key ? "Iniciando..." : "Iniciar"}
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ChallengeCard({ challenge, disabled, onRefresh }: { challenge: SerializedChallenge; disabled: boolean; onRefresh: () => void }) {
    const [pendingDay, setPendingDay] = useState<number | null>(null);
    const completed = new Set(challenge.completedDays);
    const done = challenge.completedDays.length;
    const progress = Math.round((done / challenge.durationDays) * 100);
    const streak = computeStreak(challenge.completedDays);
    const accent = challenge.color || "#6366f1";

    // Dia atual relativo ao início (0-based).
    const startMs = new Date(challenge.startDate).setHours(0, 0, 0, 0);
    const todayMs = new Date().setHours(0, 0, 0, 0);
    const currentDay = Math.floor((todayMs - startMs) / 86400000);

    const handleToggle = async (dayIndex: number) => {
        setPendingDay(dayIndex);
        const res = await toggleCheckin(challenge.id, dayIndex);
        setPendingDay(null);
        if (res.success) onRefresh();
        else toast.error(res.message);
    };

    const handleDelete = async () => {
        const res = await deleteChallenge(challenge.id);
        if (res.success) { toast.success(res.message); onRefresh(); }
        else toast.error(res.message);
    };

    return (
        <Card className="border-border/40 bg-card rounded-2xl shadow-sm">
            <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
                            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: accent }} />
                            <h4 className="font-bold text-base text-foreground tracking-tight truncate">{challenge.title}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {CATEGORY_LABELS[challenge.category || "HABIT"]} · {challenge.durationDays} dias
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {streak > 0 && (
                            <Badge variant="secondary" className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 border-none gap-1">
                                <Flame className="h-3 w-3" /> {streak}
                            </Badge>
                        )}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-2xl">
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Remover desafio?</AlertDialogTitle>
                                    <AlertDialogDescription>Todo o progresso de &quot;{challenge.title}&quot; será apagado.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>

                {/* Progresso */}
                <div className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-muted-foreground">{done}/{challenge.durationDays} dias</span>
                        <span className="font-bold text-foreground">{progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: accent }} />
                    </div>
                </div>

                {/* Grid de dias */}
                <div className="grid grid-cols-10 gap-1.5">
                    {Array.from({ length: challenge.durationDays }).map((_, i) => {
                        const isDone = completed.has(i);
                        const isToday = i === currentDay;
                        const isFuture = i > currentDay;
                        return (
                            <button
                                key={i}
                                disabled={disabled || pendingDay === i}
                                onClick={() => handleToggle(i)}
                                title={`Dia ${i + 1}${isToday ? " (hoje)" : ""}`}
                                className={cn(
                                    "aspect-square rounded-md text-[9px] font-bold flex items-center justify-center transition-all border",
                                    isDone
                                        ? "text-white border-transparent"
                                        : isToday
                                            ? "border-primary/60 text-primary bg-primary/5"
                                            : isFuture
                                                ? "border-border/40 text-muted-foreground/40 bg-muted/20"
                                                : "border-border/60 text-muted-foreground bg-muted/30 hover:border-primary/40"
                                )}
                                style={isDone ? { backgroundColor: accent } : undefined}
                            >
                                {isDone ? <Check className="h-3 w-3" /> : i + 1}
                            </button>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
