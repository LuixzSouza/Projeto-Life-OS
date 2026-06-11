"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Meal } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Utensils, Trash2, Plus, Minus, Leaf, Pizza, Coffee,
    Pencil, Search, Loader2, UtensilsCrossed, X, Tags, CopyPlus, Sparkles
} from "lucide-react";
import {
    logMeal, updateMeal, deleteMeal, copyYesterdayMeals,
    estimateMealNutrition, recalculateMealsWithoutCalories
} from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { FoodSelector } from "./food-selector";
import { FoodItem } from "@/lib/food-db";
import { EntityConnectionsDialog } from "@/components/connect/entity-connections-dialog";

// --- TIPAGEM ---
type MealType = "HEALTHY" | "NEUTRAL" | "TRASH";

// Um item do prato carrega o alimento + a quantidade de porções.
interface PlateItem {
    food: FoodItem;
    quantity: number;
}

const mealConfigs: Record<MealType, { color: string; bg: string; icon: React.ElementType; label: string }> = {
    HEALTHY: { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: Leaf, label: "Saudável" },
    NEUTRAL: { color: "text-blue-500", bg: "bg-blue-500/10", icon: Coffee, label: "Moderado" },
    TRASH: { color: "text-rose-500", bg: "bg-rose-500/10", icon: Pizza, label: "Off-Plan" },
};

const fmtQty = (q: number) => (Number.isInteger(q) ? `${q}` : q.toFixed(2).replace(/\.?0+$/, ""));

// --- DASHBOARD PRINCIPAL ---
export function FoodLogger({ meals, dailyGoal = 2000, workoutBurn = 0, missingKcalCount = 0 }: { meals: Meal[]; dailyGoal?: number; workoutBurn?: number; missingKcalCount?: number }) {
    const router = useRouter();
    const today = new Date().toDateString();
    const todayMeals = meals.filter(m => new Date(m.date).toDateString() === today);
    const [connMeal, setConnMeal] = useState<{ id: string; title: string } | null>(null);
    const [mealToDelete, setMealToDelete] = useState<{ id: string; title: string } | null>(null);
    const [copying, setCopying] = useState(false);
    const [recalcing, setRecalcing] = useState(false);
    // Some o aviso na hora após um recálculo bem-sucedido (o refresh confirma depois).
    const [recalcDone, setRecalcDone] = useState(false);

    const totalCals = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
    // Alvo do dia = meta + gasto do treino (mesma conta do saldo do dashboard).
    const effectiveGoal = dailyGoal + workoutBurn;
    const progress = effectiveGoal > 0 ? Math.min((totalCals / effectiveGoal) * 100, 100) : 0;
    const isOverLimit = effectiveGoal > 0 && totalCals > effectiveGoal;

    const confirmDelete = async () => {
        if (!mealToDelete) return;
        await deleteMeal(mealToDelete.id);
        toast.success("Refeição excluída.");
        setMealToDelete(null);
    };

    const handleRecalcMissing = async () => {
        setRecalcing(true);
        const res = await recalculateMealsWithoutCalories();
        setRecalcing(false);
        if (res.success) {
            toast.success(res.message);
            if (res.updated > 0) {
                setRecalcDone(true);
                router.refresh();
            }
        } else {
            toast.error(res.message);
        }
    };

    const handleCopyYesterday = async () => {
        setCopying(true);
        const res = await copyYesterdayMeals();
        setCopying(false);
        if (res.success) {
            toast.success(res.message);
            router.refresh(); // re-busca os dados do servidor (page é server-rendered)
        } else {
            toast.error(res.message);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background rounded-2xl">
            <div className="p-5 border-b border-border/40 space-y-4 bg-muted/10">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Utensils className="h-4 w-4 text-muted-foreground" /> Consumo Diário
                        </h3>
                        <p className="text-xs text-muted-foreground">{todayMeals.length} registros ativos hoje</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyYesterday}
                            disabled={copying}
                            className="h-9 gap-1.5 rounded-lg text-xs"
                            title="Copiar todas as refeições de ontem para hoje"
                        >
                            {copying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CopyPlus className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">Copiar ontem</span>
                        </Button>
                        <MealFormDialog />
                    </div>
                </div>

                <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-end">
                        <div className="flex items-baseline gap-1">
                            <span className={cn("text-3xl font-bold tracking-tight", isOverLimit ? "text-rose-500" : "text-foreground")}>{totalCals}</span>
                            <span className="text-xs font-medium text-muted-foreground">
                                / {effectiveGoal} kcal alvo
                                {workoutBurn > 0 && <span className="text-emerald-500 font-semibold"> (+{workoutBurn} treino)</span>}
                            </span>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div className={cn("h-full transition-all duration-1000 ease-out", isOverLimit ? "bg-rose-500" : "bg-primary")} style={{ width: `${progress}%` }} />
                    </div>
                </div>
            </div>

            {/* Refeições antigas sem kcal (capturas de versões anteriores): 1 clique recalcula em lote com IA */}
            {missingKcalCount > 0 && !recalcDone && (
                <div className="mx-4 mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3.5 py-2.5">
                    <p className="text-xs text-muted-foreground min-w-0">
                        <span className="font-semibold text-foreground">{missingKcalCount} {missingKcalCount === 1 ? "refeição antiga está" : "refeições antigas estão"} sem calorias</span> — a IA pode estimar kcal e macros pela descrição.
                    </p>
                    <Button variant="outline" size="sm" onClick={handleRecalcMissing} disabled={recalcing} className="h-8 gap-1.5 rounded-lg text-xs shrink-0">
                        {recalcing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
                        Recalcular com IA
                    </Button>
                </div>
            )}

            <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                    {todayMeals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                            <Utensils className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
                            <p className="text-sm font-medium">Nenhuma refeição registrada hoje.</p>
                            <p className="text-xs text-muted-foreground mt-1">Acompanhe seus macros clicando em Registrar.</p>
                        </div>
                    ) : (
                        todayMeals.map(meal => (
                            <MealRow
                                key={meal.id}
                                meal={meal}
                                onConnections={(m) => setConnMeal({ id: m.id, title: m.title })}
                                onDelete={(m) => setMealToDelete({ id: m.id, title: m.title })}
                            />
                        ))
                    )}
                </div>
            </ScrollArea>

            <EntityConnectionsDialog
                entityType="meal"
                item={connMeal}
                onOpenChange={(o) => !o && setConnMeal(null)}
            />

            {/* Exclusão de refeição — modal único controlado (substitui o confirm() nativo) */}
            <AlertDialog open={mealToDelete !== null} onOpenChange={(o) => !o && setMealToDelete(null)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir &quot;{mealToDelete?.title}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>A refeição será removida permanentemente do seu diário.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDelete} className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// --- LINHA DE REFEIÇÃO ---
function MealRow({ meal, onConnections, onDelete }: { meal: Meal; onConnections: (meal: Meal) => void; onDelete: (meal: Meal) => void }) {
    const config = mealConfigs[meal.type as MealType] || mealConfigs.NEUTRAL;
    const Icon = config.icon;
    const hasMacros = meal.protein != null || meal.carbs != null || meal.fat != null;

    return (
        <div className="group flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-card hover:bg-muted/40 transition-all shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-current/10", config.bg, config.color)}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold truncate leading-none mb-1.5">{meal.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate leading-none">{meal.items || "Sem descrição detalhada"}</p>
                    {hasMacros && (
                        <div className="flex items-center gap-2 mt-1.5 text-[10px] font-semibold">
                            {meal.protein != null && <span className="text-blue-500">P {fmtQty(meal.protein)}g</span>}
                            {meal.carbs != null && <span className="text-emerald-500">C {fmtQty(meal.carbs)}g</span>}
                            {meal.fat != null && <span className="text-amber-500">G {fmtQty(meal.fat)}g</span>}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 pl-3">
                <Badge variant="secondary" className="font-mono font-medium text-xs px-2.5 h-6 bg-background border-border/60">{meal.calories} kcal</Badge>
                <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <MealFormDialog meal={meal}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg"><Pencil className="h-4 w-4" /></Button>
                    </MealFormDialog>
                    <Button variant="ghost" size="icon" title="Tags & Anexos" onClick={() => onConnections(meal)} className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg"><Tags className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(meal)} className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded-lg"><Trash2 className="h-4 w-4" /></Button>
                </div>
            </div>
        </div>
    );
}

// --- MODAL: COMPOSITOR DE PRATO ---
function MealFormDialog({ meal, children }: { meal?: Meal; children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [estimating, setEstimating] = useState(false);
    const [showSearchMobile, setShowSearchMobile] = useState(false);

    const [title, setTitle] = useState(meal?.title || "Almoço");
    const [type, setType] = useState<MealType>((meal?.type as MealType) || "HEALTHY");
    const [manualDesc, setManualDesc] = useState(meal?.items || "");
    const [manualCals, setManualCals] = useState<number>(meal?.calories || 0);
    // Macros em gramas (opcionais) — string vazia = não informado (vira null no banco).
    const [protein, setProtein] = useState<string>(meal?.protein != null ? String(meal.protein) : "");
    const [carbs, setCarbs] = useState<string>(meal?.carbs != null ? String(meal.carbs) : "");
    const [fat, setFat] = useState<string>(meal?.fat != null ? String(meal.fat) : "");

    // Prato = lista de alimentos com quantidade (porções).
    const [plate, setPlate] = useState<PlateItem[]>([]);
    const usingPlate = plate.length > 0;

    const addedIds = useMemo(() => new Set(plate.map(p => p.food.id)), [plate]);

    const addFood = (food: FoodItem) => {
        setPlate(prev => {
            const existing = prev.find(p => p.food.id === food.id);
            if (existing) return prev.map(p => p.food.id === food.id ? { ...p, quantity: p.quantity + 1 } : p);
            return [...prev, { food, quantity: 1 }];
        });
    };
    const setQty = (id: string, q: number) => {
        if (q <= 0) { setPlate(prev => prev.filter(p => p.food.id !== id)); return; }
        setPlate(prev => prev.map(p => p.food.id === id ? { ...p, quantity: Math.round(q * 100) / 100 } : p));
    };
    const removeItem = (id: string) => setPlate(prev => prev.filter(p => p.food.id !== id));

    const plateCals = useMemo(() => plate.reduce((acc, p) => acc + Math.round(p.food.calories * p.quantity), 0), [plate]);
    const plateDesc = useMemo(
        () => plate.map(p => (p.quantity !== 1 ? `${fmtQty(p.quantity)}x ${p.food.name}` : p.food.name)).join(", "),
        [plate]
    );

    const detectedType = useMemo((): MealType => {
        if (!usingPlate) return type;
        const avg = plateCals / plate.length;
        if (avg > 450) return "TRASH";
        if (avg > 250) return "NEUTRAL";
        return "HEALTHY";
    }, [usingPlate, type, plateCals, plate.length]);

    const finalCals = usingPlate ? plateCals : manualCals;
    const finalDesc = usingPlate ? plateDesc : manualDesc;

    const reset = () => {
        setManualDesc(""); setManualCals(0); setPlate([]); setShowSearchMobile(false);
        setProtein(""); setCarbs(""); setFat("");
    };

    // Estima kcal + macros pela descrição (one-shot IA) e preenche o formulário
    // para o usuário revisar — nunca salva direto.
    const handleEstimate = async () => {
        if (!finalDesc.trim() && !title.trim()) {
            toast.error("Descreva a refeição antes de estimar.");
            return;
        }
        setEstimating(true);
        const res = await estimateMealNutrition({ title, items: finalDesc });
        setEstimating(false);
        if (!res.success || !res.estimate) {
            toast.error(res.message);
            return;
        }
        // No modo prato as kcal já vêm da soma dos alimentos — só completa macros.
        if (!usingPlate) setManualCals(res.estimate.calories);
        if (res.estimate.protein != null) setProtein(String(res.estimate.protein));
        if (res.estimate.carbs != null) setCarbs(String(res.estimate.carbs));
        if (res.estimate.fat != null) setFat(String(res.estimate.fat));
        toast.success(res.message);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (finalCals <= 0) return toast.error("Adicione alimentos ao prato ou informe as calorias.");

        setIsLoading(true);
        const formData = new FormData();
        formData.append("title", title);
        formData.append("type", (usingPlate && !meal) ? detectedType : type);
        formData.append("items", finalDesc);
        formData.append("calories", finalCals.toString());
        formData.append("protein", protein.trim());
        formData.append("carbs", carbs.trim());
        formData.append("fat", fat.trim());

        try {
            if (meal) {
                formData.append("id", meal.id);
                await updateMeal(formData);
                toast.success("Refeição atualizada.");
            } else {
                await logMeal(formData);
                toast.success("Refeição registrada!");
            }
            setOpen(false);
            if (!meal) reset();
        } catch {
            toast.error("Erro ao salvar refeição.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o && !meal) reset(); }}>
            <DialogTrigger asChild>
                {children || (
                    <Button size="sm" className="h-9 gap-1.5 font-bold rounded-lg px-4 shadow-sm">
                        <Plus className="h-4 w-4" /> Registrar
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent size="xl" className="w-[96vw] h-[88vh] md:h-[660px] p-0 gap-0 overflow-hidden rounded-[1.75rem] border-border/40 shadow-2xl flex flex-col md:flex-row">

                {/* --- ESQUERDA: BUSCA DE ALIMENTOS --- */}
                <div className={cn(
                    "flex-col w-full md:w-[42%] border-r border-border/40 bg-muted/10 h-full min-h-0",
                    showSearchMobile ? "flex" : "hidden md:flex"
                )}>
                    <div className="px-4 py-3.5 border-b border-border/40 bg-background/60 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-lg bg-primary/10 text-primary"><Search className="h-3.5 w-3.5" /></div>
                            <h3 className="font-semibold text-sm">Adicionar alimentos</h3>
                        </div>
                        <Button variant="ghost" size="icon" className="md:hidden h-7 w-7" onClick={() => setShowSearchMobile(false)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="flex-1 min-h-0">
                        <FoodSelector onAdd={addFood} addedIds={addedIds} />
                    </div>
                </div>

                {/* --- DIREITA: PRATO + DETALHES --- */}
                <div className={cn(
                    "flex-col flex-1 bg-background h-full min-h-0",
                    showSearchMobile ? "hidden md:flex" : "flex"
                )}>
                    <DialogHeader className="p-6 pb-4 border-b border-border/40 shrink-0 text-left">
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <UtensilsCrossed className="h-5 w-5 text-primary" />
                            {meal ? "Editar refeição" : "Montar refeição"}
                        </DialogTitle>
                        <DialogDescription className="mt-1">
                            Adicione alimentos e ajuste a quantidade de cada um — as calorias somam automaticamente.
                        </DialogDescription>
                    </DialogHeader>

                    <form id="meal-form" onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">

                            {/* Nome + Classificação */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Refeição</Label>
                                    <Select value={title} onValueChange={setTitle}>
                                        <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/40"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {["Café da Manhã", "Almoço", "Lanche", "Jantar", "Ceia", "Pós-Treino"].map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Classificação</Label>
                                    <Select value={usingPlate && !meal ? detectedType : type} onValueChange={(v) => setType(v as MealType)}>
                                        <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/40"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="HEALTHY">✅ Saudável</SelectItem>
                                            <SelectItem value="NEUTRAL">⚖️ Moderado</SelectItem>
                                            <SelectItem value="TRASH">🍔 Off-Plan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Botão de busca (mobile) */}
                            <Button type="button" variant="outline" className="md:hidden w-full h-11 border-dashed border-border/60 gap-2 rounded-xl" onClick={() => setShowSearchMobile(true)}>
                                <Search className="h-4 w-4" /> {usingPlate ? `Adicionar mais (${plate.length} no prato)` : "Buscar alimentos"}
                            </Button>

                            {/* O PRATO */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Seu prato</Label>
                                    {usingPlate && (
                                        <button type="button" onClick={() => setPlate([])} className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-destructive">Limpar</button>
                                    )}
                                </div>

                                {usingPlate ? (
                                    <div className="space-y-2">
                                        {plate.map(({ food, quantity }) => (
                                            <div key={food.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border/40 bg-muted/20">
                                                <div className="w-10 h-10 rounded-lg border border-border/40 overflow-hidden bg-background flex items-center justify-center shrink-0">
                                                    {food.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
                                                    ) : <span className="text-lg">{food.emoji}</span>}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-sm font-semibold truncate">{food.name}</p>
                                                    <p className="text-[11px] text-muted-foreground">{food.calories} kcal / {food.unit} · <span className="font-semibold text-foreground">{Math.round(food.calories * quantity)} kcal</span></p>
                                                </div>
                                                {/* Stepper de quantidade */}
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setQty(food.id, quantity - 1)}>
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <Input
                                                        value={quantity}
                                                        onChange={(e) => setQty(food.id, Number(e.target.value.replace(",", ".")) || 0)}
                                                        className="h-7 w-12 text-center px-1 rounded-lg bg-background border-border/40 font-mono text-sm"
                                                    />
                                                    <Button type="button" variant="outline" size="icon" className="h-7 w-7 rounded-lg" onClick={() => setQty(food.id, quantity + 1)}>
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => removeItem(food.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        <p className="text-[11px] text-muted-foreground px-1">A quantidade é em porções do tamanho indicado (ex: 1 = uma porção de 100g).</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center gap-2 py-7 border border-dashed border-border/50 rounded-xl bg-muted/10 text-center px-4">
                                        <UtensilsCrossed className="h-6 w-6 text-muted-foreground/40" />
                                        <p className="text-xs text-muted-foreground">Busque alimentos à esquerda para montar o prato — ou preencha manualmente abaixo.</p>
                                    </div>
                                )}
                            </div>

                            {/* Modo manual (quando não há prato) */}
                            {!usingPlate && (
                                <>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Descrição</Label>
                                        <textarea
                                            value={manualDesc}
                                            onChange={(e) => setManualDesc(e.target.value)}
                                            placeholder="Ex: 2 ovos, pão integral e café preto..."
                                            className="w-full rounded-xl border border-border/40 bg-muted/20 p-3.5 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 min-h-[80px] resize-none"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Calorias (kcal)</Label>
                                        <Input type="number" value={manualCals} onChange={(e) => setManualCals(Number(e.target.value))} className="h-12 text-lg font-bold font-mono rounded-xl bg-muted/20 border-border/40" />
                                    </div>
                                </>
                            )}

                            {/* Macros (opcional) — gramas. Vazio = não informado. */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <Label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Macros <span className="font-normal normal-case">(opcional, em gramas)</span></Label>
                                    <button
                                        type="button"
                                        onClick={handleEstimate}
                                        disabled={estimating}
                                        className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 disabled:opacity-50 transition-colors"
                                        title="A IA estima kcal e macros pela descrição da refeição"
                                    >
                                        {estimating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                        Estimar com IA
                                    </button>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="relative">
                                        <Input inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder="0" className="h-11 pl-9 rounded-xl bg-muted/20 border-border/40 font-mono" />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-500">P</span>
                                    </div>
                                    <div className="relative">
                                        <Input inputMode="decimal" value={carbs} onChange={(e) => setCarbs(e.target.value)} placeholder="0" className="h-11 pl-9 rounded-xl bg-muted/20 border-border/40 font-mono" />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-500">C</span>
                                    </div>
                                    <div className="relative">
                                        <Input inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} placeholder="0" className="h-11 pl-9 rounded-xl bg-muted/20 border-border/40 font-mono" />
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-500">G</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RODAPÉ: total + ações */}
                        <div className="p-5 border-t border-border/40 bg-muted/10 shrink-0 flex items-center justify-between gap-4">
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total</p>
                                <p className="text-2xl font-bold tracking-tight leading-none">{finalCals} <span className="text-sm font-medium text-muted-foreground">kcal</span></p>
                            </div>
                            <div className="flex gap-2 shrink-0">
                                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl h-11 px-5">Cancelar</Button>
                                <Button type="submit" disabled={isLoading} className="rounded-xl h-11 px-7 font-bold gap-2">
                                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {meal ? "Salvar" : "Registrar"}
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
