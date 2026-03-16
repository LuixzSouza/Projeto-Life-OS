"use client";

import { useState, useMemo } from "react";
import { Meal } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Dialog, DialogContent, DialogHeader, DialogTitle, 
    DialogTrigger, DialogDescription 
} from "@/components/ui/dialog";
import { 
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
    Utensils, Trash2, Plus, Leaf, Pizza, Coffee, Flame, Check, 
    Pencil, ChefHat, ArrowRight, Activity, Sparkles, 
    ShoppingBasket, Target, AlertCircle, Info
} from "lucide-react";
import { logMeal, updateMeal, deleteMeal } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { FoodSelector } from "./food-selector";
import { FoodItem } from "@/lib/food-db";

// --- TIPAGEM ---
type MealType = "HEALTHY" | "NEUTRAL" | "TRASH";

interface TypeConfig {
    color: string;
    bg: string;
    icon: React.ElementType;
    label: string;
}

const mealConfigs: Record<MealType, TypeConfig> = {
    HEALTHY: { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: Leaf, label: "Saudável" },
    NEUTRAL: { color: "text-blue-500", bg: "bg-blue-500/10", icon: Coffee, label: "Neutro" },
    TRASH: { color: "text-rose-500", bg: "bg-rose-500/10", icon: Pizza, label: "Off-Plan" },
};

// --- DASHBOARD PRINCIPAL ---
export function FoodLogger({ meals }: { meals: Meal[] }) {
    const today = new Date().toDateString();
    const todayMeals = meals.filter(m => new Date(m.date).toDateString() === today);
    
    const totalCals = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const dailyGoal = 2500; 
    const progress = Math.min((totalCals / dailyGoal) * 100, 100);

    return (
        <Card className="border-border/40 shadow-2xl bg-card rounded-[2rem] h-full flex flex-col overflow-hidden">
            {/* PROGRESS HEADER */}
            <div className="p-6 bg-muted/20 border-b border-border/40">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                            <Utensils className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black uppercase tracking-widest">Diário Nutricional</h3>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                                {todayMeals.length} registros ativos
                            </p>
                        </div>
                    </div>
                    <MealFormDialog />
                </div>

                {/* CALORIE TRACKER */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end px-1">
                        <div className="space-y-1">
                            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest block">Consumo Atual</span>
                            <div className="flex items-baseline gap-1.5">
                                <span className={cn("text-3xl font-black tracking-tighter tabular-nums", totalCals > dailyGoal ? "text-rose-500" : "text-foreground")}>
                                    {totalCals}
                                </span>
                                <span className="text-xs font-bold text-muted-foreground uppercase">kcal</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest block">Meta Alvo</span>
                            <span className="text-sm font-mono font-bold text-foreground/80">{dailyGoal} kcal</span>
                        </div>
                    </div>
                    
                    <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden p-0.5 border border-border/20 shadow-inner">
                        <div 
                            className={cn(
                                "h-full rounded-full transition-all duration-1000 ease-in-out shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                                totalCals > dailyGoal ? "bg-rose-500" : "bg-primary"
                            )} 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* LISTA DE REFEIÇÕES */}
            <CardContent className="p-0 flex-1 bg-background/30">
                <ScrollArea className="h-[350px] w-full">
                    <div className="p-4 space-y-3">
                        {todayMeals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 opacity-30 gap-3">
                                <ShoppingBasket className="h-10 w-10" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Aguardando logs de hoje...</span>
                            </div>
                        ) : (
                            todayMeals.map(meal => <MealRow key={meal.id} meal={meal} />)
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

// --- LINHA DE REFEIÇÃO ---
function MealRow({ meal }: { meal: Meal }) {
    const config = mealConfigs[meal.type as MealType] || mealConfigs.NEUTRAL;
    const Icon = config.icon;

    const handleDelete = async () => {
        if(confirm("Confirmar exclusão deste log nutricional?")) {
            await deleteMeal(meal.id);
            toast.success("Registro removido.");
        }
    };

    return (
        <div className="group flex items-center justify-between p-3.5 rounded-[1.25rem] border border-border/40 bg-card hover:border-primary/30 transition-all shadow-sm">
            <div className="flex items-center gap-4 min-w-0">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner", config.bg, config.color, "border-current/10")}>
                    <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-widest truncate">{meal.title}</p>
                    <p className="text-[10px] font-medium text-muted-foreground truncate opacity-70 mt-0.5 italic">
                        {meal.items || "Sem especificações"}
                    </p>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <Badge variant="secondary" className="font-mono text-[10px] font-black h-7 px-3 bg-muted/50 border border-border/60">
                    {meal.calories} KCAL
                </Badge>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MealFormDialog meal={meal}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </MealFormDialog>
                    <Button variant="ghost" size="icon" onClick={handleDelete} className="h-8 w-8 rounded-lg hover:bg-rose-500/10 hover:text-rose-500 transition-colors">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

// --- FORMULÁRIO / MODAL ---
function MealFormDialog({ meal, children }: { meal?: Meal, children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<FoodItem[]>([]);
    
    const [title, setTitle] = useState(meal?.title || "Almoço");
    const [type, setType] = useState<MealType>((meal?.type as MealType) || "HEALTHY");
    const [manualDesc, setManualDesc] = useState(meal?.items || "");
    const [manualCals, setManualCals] = useState<number>(meal?.calories || 0);

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

    const handleSubmit = async () => {
        const cals = isUsingSelector ? computedCals : manualCals;
        const items = isUsingSelector ? computedDesc : manualDesc;

        if (cals === 0) return toast.error("Defina o valor calórico.");

        const formData = new FormData();
        formData.append("title", title);
        formData.append("type", (isUsingSelector && !meal) ? detectedType : type);
        formData.append("items", items);
        formData.append("calories", cals.toString());

        try {
            if (meal) {
                formData.append("id", meal.id);
                await updateMeal(formData);
            } else {
                await logMeal(formData);
            }
            toast.success("Sincronizado com sucesso!");
            setOpen(false);
        } catch {
            toast.error("Falha na operação.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest text-[10px] h-9 rounded-xl shadow-lg transition-all active:scale-95">
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Registrar
                    </Button>
                )}
            </DialogTrigger>
            
            <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:max-w-[95vw] md:max-w-[1000px] h-[85vh] p-0 overflow-hidden flex flex-col md:flex-row gap-0 bg-background rounded-[2.5rem] shadow-2xl border-border/40 z-[100]">
                
                {/* MARKET SIDEBAR (ESQUERDA) */}
                <div className="hidden md:flex flex-col w-[60%] border-r border-border/40 bg-muted/5">
                    <div className="p-6 border-b border-border/40 bg-background/50 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-xl text-primary">
                                <ShoppingBasket className="h-5 w-5" />
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest">Base de Alimentos</span>
                        </div>
                        {isUsingSelector && (
                            <Button variant="ghost" size="sm" className="text-[10px] font-black uppercase tracking-widest text-primary" onClick={() => setSelectedItems([])}>
                                Resetar ({selectedItems.length})
                            </Button>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
                        <FoodSelector onSelectionChange={setSelectedItems} />
                    </div>
                </div>

                {/* FICHA TÉCNICA (DIREITA) */}
                <div className="flex-1 flex flex-col bg-card relative">
                    <div className="p-6 border-b border-border/40 bg-background">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                                <ChefHat className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg font-black uppercase tracking-tighter">Ficha Nutricional</DialogTitle>
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Status: {meal ? 'Edição' : 'Novo Registro'}</p>
                            </div>
                        </div>
                    </div>

                    <ScrollArea className="flex-1">
                        <div className="p-8 space-y-8">
                            {/* REFEIÇÃO E TIPO */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Momento</Label>
                                    <Select value={title} onValueChange={setTitle}>
                                        <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/40 font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {["Café da Manhã", "Almoço", "Lanche", "Jantar", "Ceia", "Pós-Treino"].map(t => <SelectItem key={t} value={t} className="font-bold">{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Classificação</Label>
                                    <Select value={isUsingSelector && !meal ? detectedType : type} onValueChange={(v) => setType(v as MealType)}>
                                        <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-border/40 font-bold"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="HEALTHY" className="text-emerald-500 font-bold">✅ Saudável</SelectItem>
                                            <SelectItem value="NEUTRAL" className="text-blue-500 font-bold">⚖️ Neutro</SelectItem>
                                            <SelectItem value="TRASH" className="text-rose-500 font-bold">🍔 Off-Plan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* DISPLAY DE CALORIAS */}
                            <div className="bg-muted/40 rounded-[1.5rem] p-6 border border-border/40 shadow-inner space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-2">
                                        <Activity className="h-3 w-3" /> Carga Calórica
                                    </span>
                                    {isUsingSelector && <Badge variant="outline" className="text-[9px] font-black uppercase bg-background">Calculado</Badge>}
                                </div>
                                <div className="flex items-end gap-3">
                                    <Input 
                                        type="number" value={isUsingSelector ? computedCals : manualCals}
                                        onChange={(e) => setManualCals(Number(e.target.value))}
                                        readOnly={isUsingSelector}
                                        className="text-4xl font-black h-16 bg-transparent border-none shadow-none focus-visible:ring-0 p-0 tabular-nums"
                                    />
                                    <span className="text-sm font-black text-muted-foreground mb-3 uppercase tracking-widest">kcal</span>
                                </div>
                            </div>

                            {/* COMPOSIÇÃO */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Composição do Prato</Label>
                                    <Dialog>
                                        <DialogTrigger asChild><Button variant="outline" size="sm" className="md:hidden rounded-lg text-[9px] font-black uppercase tracking-widest h-7">Abrir Mercado</Button></DialogTrigger>
                                        <DialogContent className="h-[80vh] flex flex-col p-0 rounded-[2rem]"><div className="p-4 border-b font-black text-center">Base de Alimentos</div><div className="flex-1 overflow-y-auto p-4"><FoodSelector onSelectionChange={setSelectedItems} /></div></DialogContent>
                                    </Dialog>
                                </div>
                                <textarea 
                                    value={isUsingSelector ? computedDesc : manualDesc}
                                    onChange={(e) => setManualDesc(e.target.value)}
                                    readOnly={isUsingSelector}
                                    placeholder="Descreva sua refeição ou use o mercado..."
                                    className="w-full rounded-2xl border border-border/40 bg-muted/20 p-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-within:ring-primary/20 min-h-[120px] resize-none leading-relaxed transition-all"
                                />
                                {isUsingSelector && (
                                    <p className="text-[10px] font-bold text-primary flex items-center gap-1.5 ml-1">
                                        <Sparkles className="h-3 w-3" /> Metadados gerados via Mercado.
                                    </p>
                                )}
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="p-6 border-t border-border/40 bg-background backdrop-blur-xl">
                        <Button className="w-full h-14 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest text-[11px] shadow-xl group" onClick={handleSubmit}>
                            {meal ? "Confirmar Atualização" : "Sincronizar Refeição"}
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}