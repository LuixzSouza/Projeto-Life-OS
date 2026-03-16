"use client";

import { useState, useMemo } from "react";
import { Meal } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogDescription, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
    Utensils, Trash2, Plus, Leaf, Pizza, Coffee, 
    Pencil, Search, Loader2, Info
} from "lucide-react";
import { logMeal, updateMeal, deleteMeal } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

import { FoodSelector } from "./food-selector";
import { FoodItem } from "@/lib/food-db";

// --- TIPAGEM E CONFIGURAÇÃO ---
type MealType = "HEALTHY" | "NEUTRAL" | "TRASH";

const mealConfigs: Record<MealType, { color: string; bg: string; icon: React.ElementType; label: string }> = {
    HEALTHY: { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: Leaf, label: "Saudável" },
    NEUTRAL: { color: "text-blue-500", bg: "bg-blue-500/10", icon: Coffee, label: "Moderado" },
    TRASH: { color: "text-rose-500", bg: "bg-rose-500/10", icon: Pizza, label: "Off-Plan" },
};

// --- DASHBOARD PRINCIPAL ---
export function FoodLogger({ meals }: { meals: Meal[] }) {
    const today = new Date().toDateString();
    const todayMeals = meals.filter(m => new Date(m.date).toDateString() === today);
    
    const totalCals = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const dailyGoal = 2500; 
    const progress = Math.min((totalCals / dailyGoal) * 100, 100);
    const isOverLimit = totalCals > dailyGoal;

    return (
        <div className="flex flex-col h-full bg-background rounded-2xl">
            {/* PROGRESS HEADER */}
            <div className="p-5 border-b border-border/40 space-y-4 bg-muted/10">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Utensils className="h-4 w-4 text-muted-foreground" />
                            Consumo Diário
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {todayMeals.length} registros ativos hoje
                        </p>
                    </div>
                    <MealFormDialog />
                </div>

                {/* CALORIE TRACKER */}
                <div className="space-y-2 pt-2">
                    <div className="flex justify-between items-end">
                        <div className="flex items-baseline gap-1">
                            <span className={cn("text-3xl font-bold tracking-tight", isOverLimit ? "text-rose-500" : "text-foreground")}>
                                {totalCals}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground">/ {dailyGoal} kcal alvo</span>
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">
                            {Math.round(progress)}%
                        </span>
                    </div>
                    
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                            className={cn("h-full transition-all duration-1000 ease-out", isOverLimit ? "bg-rose-500" : "bg-primary")} 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* LISTA DE REFEIÇÕES */}
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                    {todayMeals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
                            <Utensils className="h-10 w-10 text-muted-foreground mb-3 opacity-20" />
                            <p className="text-sm font-medium">Nenhuma refeição registrada hoje.</p>
                            <p className="text-xs text-muted-foreground mt-1">Acompanhe seus macros clicando em Registrar.</p>
                        </div>
                    ) : (
                        todayMeals.map(meal => <MealRow key={meal.id} meal={meal} />)
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}

// --- LINHA DE REFEIÇÃO ---
function MealRow({ meal }: { meal: Meal }) {
    const config = mealConfigs[meal.type as MealType] || mealConfigs.NEUTRAL;
    const Icon = config.icon;

    const handleDelete = async () => {
        if(confirm("Excluir esta refeição permanentemente?")) {
            await deleteMeal(meal.id);
            toast.success("Refeição excluída.");
        }
    };

    return (
        <div className="group flex items-center justify-between p-3.5 rounded-xl border border-border/40 bg-card hover:bg-muted/40 transition-all shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-current/10", config.bg, config.color)}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold truncate leading-none mb-1.5">{meal.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate leading-none">
                        {meal.items || "Sem descrição detalhada"}
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0 pl-3">
                <Badge variant="secondary" className="font-mono font-medium text-xs px-2.5 h-6 bg-background border-border/60">
                    {meal.calories} kcal
                </Badge>
                
                <div className="flex gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <MealFormDialog meal={meal}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary rounded-lg">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </MealFormDialog>
                    <Button variant="ghost" size="icon" onClick={handleDelete} className="h-8 w-8 text-muted-foreground hover:text-rose-500 rounded-lg">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

// --- FORMULÁRIO MODAL RESPONSIVO (SPLIT-VIEW) ---
function MealFormDialog({ meal, children }: { meal?: Meal, children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Estados do Formulário
    const [title, setTitle] = useState(meal?.title || "Almoço");
    const [type, setType] = useState<MealType>((meal?.type as MealType) || "HEALTHY");
    const [manualDesc, setManualDesc] = useState(meal?.items || "");
    const [manualCals, setManualCals] = useState<number>(meal?.calories || 0);

    // Estado Inteligente (Mercado de Alimentos)
    const [showMobileMarket, setShowMobileMarket] = useState(false);
    const [selectedItems, setSelectedItems] = useState<FoodItem[]>([]);
    
    const isUsingSelector = selectedItems.length > 0;
    
    const computedCals = useMemo(() => selectedItems.reduce((acc, item) => acc + item.calories, 0), [selectedItems]);
    
    const computedDesc = useMemo(() => {
        if (selectedItems.length === 0) return "";
        const counts: Record<string, number> = {};
        selectedItems.forEach(item => counts[item.name] = (counts[item.name] || 0) + 1);
        return Object.entries(counts).map(([name, count]) => count > 1 ? `${count}x ${name}` : name).join(", ");
    }, [selectedItems]);

    const detectedType = useMemo((): MealType => {
        if (!isUsingSelector) return type;
        const avg = computedCals / selectedItems.length;
        if (avg > 450) return "TRASH";
        if (avg > 250) return "NEUTRAL";
        return "HEALTHY";
    }, [isUsingSelector, type, computedCals, selectedItems.length]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const cals = isUsingSelector ? computedCals : manualCals;
        const items = isUsingSelector ? computedDesc : manualDesc;

        if (cals <= 0) return toast.error("Insira o valor calórico da refeição.");

        setIsLoading(true);
        const formData = new FormData();
        formData.append("title", title);
        formData.append("type", (isUsingSelector && !meal) ? detectedType : type);
        formData.append("items", items);
        formData.append("calories", cals.toString());

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
            if (!meal) {
                setManualDesc("");
                setManualCals(0);
                setSelectedItems([]);
                setShowMobileMarket(false);
            }
        } catch {
            toast.error("Erro ao salvar refeição.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button size="sm" className="h-9 gap-1.5 font-bold rounded-lg px-4 shadow-sm">
                        <Plus className="h-4 w-4" /> Registrar
                    </Button>
                )}
            </DialogTrigger>
            
            <DialogContent className="max-w-5xl w-[95vw] h-[90vh] md:h-[650px] p-0 flex flex-col md:flex-row gap-0 overflow-hidden bg-background rounded-2xl shadow-2xl border-border/40">
                
                {/* --- LADO ESQUERDO: BANCO DE ALIMENTOS (Desktop: Sempre visível | Mobile: Controlado por botão) --- */}
                <div className={cn(
                    "flex-col w-full md:w-[45%] lg:w-[40%] border-r border-border/40 bg-muted/10 h-full",
                    showMobileMarket ? "flex" : "hidden md:flex"
                )}>
                    <div className="p-5 border-b border-border/40 bg-background/50 flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="font-bold text-sm">Banco de Alimentos</h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Selecione para auto-calcular</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {isUsingSelector && (
                                <Badge variant="secondary" className="text-[10px] h-6 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer" onClick={() => setSelectedItems([])}>
                                    Limpar ({selectedItems.length})
                                </Badge>
                            )}
                            <Button variant="ghost" size="icon" className="md:hidden h-7 w-7 text-muted-foreground" onClick={() => setShowMobileMarket(false)}>
                                <span className="sr-only">Fechar</span>
                                X
                            </Button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <FoodSelector onSelectionChange={setSelectedItems} />
                    </div>
                </div>

                {/* --- LADO DIREITO: FORMULÁRIO --- */}
                <div className={cn(
                    "flex-col w-full md:w-[55%] lg:w-[60%] bg-background h-full",
                    (!showMobileMarket) ? "flex" : "hidden md:flex"
                )}>
                    <DialogHeader className="p-6 border-b border-border/40 bg-muted/5 shrink-0 text-left">
                        <DialogTitle className="text-xl">{meal ? "Editar Refeição" : "Nova Refeição"}</DialogTitle>
                        <DialogDescription className="mt-1">
                            Ajuste os dados manuais ou use a seleção do banco de alimentos.
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="flex-1 p-6">
                        <form id="meal-form" onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
                            
                            {/* Mobile Toggle Button */}
                            <div className="md:hidden">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="w-full h-12 border-dashed border-border/60 text-muted-foreground gap-2 rounded-xl bg-muted/10"
                                    onClick={() => setShowMobileMarket(true)}
                                >
                                    <Search className="h-4 w-4" /> 
                                    {isUsingSelector ? `Modificar Seleção (${selectedItems.length} itens)` : "Buscar no Banco de Alimentos"}
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground">Refeição</Label>
                                    <Select value={title} onValueChange={setTitle}>
                                        <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/40"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {["Café da Manhã", "Almoço", "Lanche", "Jantar", "Ceia", "Pós-Treino"].map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-muted-foreground">Classificação</Label>
                                    <Select value={isUsingSelector && !meal ? detectedType : type} onValueChange={(v) => setType(v as MealType)}>
                                        <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-border/40"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="HEALTHY">✅ Saudável</SelectItem>
                                            <SelectItem value="NEUTRAL">⚖️ Moderado</SelectItem>
                                            <SelectItem value="TRASH">🍔 Off-Plan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-semibold text-muted-foreground">O que você comeu?</Label>
                                    {isUsingSelector && <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded font-medium">Preenchimento Automático</span>}
                                </div>
                                <textarea 
                                    value={isUsingSelector ? computedDesc : manualDesc}
                                    onChange={(e) => setManualDesc(e.target.value)}
                                    readOnly={isUsingSelector}
                                    placeholder="Ex: 2 Ovos, Pão Integral e Café preto..."
                                    className={cn(
                                        "w-full rounded-xl border border-border/40 p-4 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 min-h-[100px] resize-none transition-colors",
                                        isUsingSelector ? "bg-muted/50 text-muted-foreground cursor-not-allowed" : "bg-muted/10"
                                    )}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold text-muted-foreground">Carga Calórica (kcal)</Label>
                                <Input 
                                    type="number" 
                                    value={isUsingSelector ? computedCals : manualCals}
                                    onChange={(e) => setManualCals(Number(e.target.value))}
                                    readOnly={isUsingSelector}
                                    className={cn(
                                        "h-14 text-2xl font-bold font-mono rounded-xl",
                                        isUsingSelector ? "bg-muted/50 text-muted-foreground border-transparent cursor-not-allowed" : "bg-muted/10 border-border/40"
                                    )}
                                />
                            </div>
                        </form>
                    </ScrollArea>

                    <DialogFooter className="p-6 border-t border-border/40 bg-muted/5 shrink-0 flex-row justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl h-11 px-6">Cancelar</Button>
                        <Button type="submit" form="meal-form" disabled={isLoading} className="rounded-xl h-11 px-8 shadow-md">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Salvar Registro
                        </Button>
                    </DialogFooter>
                </div>

            </DialogContent>
        </Dialog>
    );
}