"use client";

import { useState, useMemo } from "react";
import { Meal } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Utensils, Trash2, Plus, Leaf, Pizza, Coffee, Flame, Check, 
    Pencil, ChefHat, ArrowRight, Search, Activity, X, 
    Sparkles, CalendarClock, ShoppingBasket
} from "lucide-react";
import { logMeal, updateMeal, deleteMeal } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Importe seu componente FoodSelector aqui
import { FoodSelector } from "./food-selector";
import { FoodItem } from "@/lib/food-db";

// --- TIPOS ---
type MealType = "HEALTHY" | "NEUTRAL" | "TRASH";

// --- COMPONENTE PRINCIPAL (DASHBOARD CARD) ---
export function FoodLogger({ meals }: { meals: Meal[] }) {
    const todayMeals = meals.filter(m => new Date(m.date).toDateString() === new Date().toDateString());
    
    // Cálculos
    const totalCals = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const dailyGoal = 2500; 
    const progressPercentage = Math.min((totalCals / dailyGoal) * 100, 100);
    const remaining = Math.max(dailyGoal - totalCals, 0);
    const isOverLimit = totalCals > dailyGoal;

    return (
        <Card className="border-border/60 shadow-sm bg-card h-full flex flex-col overflow-hidden relative">
            
            {/* Header com Progresso */}
            <div className="p-5 pb-4 bg-muted/20 border-b border-border/50">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-base font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                                <Flame className="h-4 w-4" /> 
                            </div>
                            Diário Alimentar
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 ml-1">
                            {todayMeals.length} refeições hoje
                        </p>
                    </div>
                    <MealFormDialog />
                </div>

                {/* Barra de Calorias */}
                <div className="space-y-2">
                    <div className="flex justify-between text-xs font-medium">
                        <span className={cn(isOverLimit ? "text-destructive" : "text-foreground")}>
                            {totalCals} <span className="text-muted-foreground">kcal consumidas</span>
                        </span>
                        <span className="text-muted-foreground">Meta: {dailyGoal}</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                        <div 
                            className={cn(
                                "h-full rounded-full transition-all duration-1000 ease-out",
                                isOverLimit ? "bg-destructive" : "bg-primary"
                            )} 
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Lista Scrollável */}
            <CardContent className="p-0 flex-1 relative bg-background">
                <ScrollArea className="h-[300px] w-full">
                    <div className="p-4 space-y-3">
                        {todayMeals.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground opacity-60 gap-2">
                                <Utensils className="h-8 w-8" />
                                <span className="text-xs">Nenhum registro hoje.</span>
                            </div>
                        ) : (
                            todayMeals.map(meal => (
                                <MealCard key={meal.id} meal={meal} />
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}

// --- CARD DE REFEIÇÃO INDIVIDUAL ---
function MealCard({ meal }: { meal: Meal }) {
    const handleDelete = async () => {
        if(confirm("Deseja excluir este registro?")) {
            await deleteMeal(meal.id);
            toast.success("Excluído com sucesso.");
        }
    }

    const typeConfig = {
        HEALTHY: { color: "text-emerald-500", bg: "bg-emerald-500/10", icon: Leaf },
        NEUTRAL: { color: "text-blue-500", bg: "bg-blue-500/10", icon: Coffee },
        TRASH: { color: "text-rose-500", bg: "bg-rose-500/10", icon: Pizza },
    }[meal.type as MealType] || { color: "text-muted-foreground", bg: "bg-muted", icon: Utensils };

    const Icon = typeConfig.icon;

    return (
        <div className="group flex items-center justify-between p-3 rounded-xl border border-border/40 hover:border-primary/20 hover:bg-muted/30 transition-all bg-card/50">
            <div className="flex items-center gap-3 overflow-hidden">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", typeConfig.bg, typeConfig.color)}>
                    <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{meal.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate max-w-[150px]">{meal.items || "Sem descrição"}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <Badge variant="outline" className="h-6 font-mono text-[10px]">
                    {meal.calories} kcal
                </Badge>
                
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <MealFormDialog meal={meal}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary">
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    </MealFormDialog>
                    <Button variant="ghost" size="icon" onClick={handleDelete} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

// --- MODAL DE CRIAÇÃO/EDIÇÃO (OTIMIZADO) ---
function MealFormDialog({ meal, children }: { meal?: Meal, children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<FoodItem[]>([]);
    
    // Estados do Formulário
    const [title, setTitle] = useState(meal?.title || "Almoço");
    const [type, setType] = useState(meal?.type || "HEALTHY");
    const [manualDesc, setManualDesc] = useState(meal?.items || "");
    const [manualCals, setManualCals] = useState<number>(meal?.calories || 0);

    // Lógica Computada
    const isUsingSelector = selectedItems.length > 0;
    
    const computedCalories = useMemo(() => 
        selectedItems.reduce((acc, item) => acc + item.calories, 0), 
    [selectedItems]);

    const computedDesc = useMemo(() => {
        if (selectedItems.length === 0) return "";
        const counts: Record<string, number> = {};
        selectedItems.forEach(item => counts[item.name] = (counts[item.name] || 0) + 1);
        return Object.entries(counts)
            .map(([name, count]) => count > 1 ? `${count}x ${name}` : name)
            .join(", ");
    }, [selectedItems]);

    // Valores Finais (Selector > Manual)
    const finalCalories = isUsingSelector ? computedCalories : manualCals;
    const finalDescription = isUsingSelector ? computedDesc : manualDesc;

    // Sugestão Automática de Tipo
    const detectedType = useMemo(() => {
        if (!isUsingSelector) return type;
        const avgCal = computedCalories / (selectedItems.length || 1);
        if (avgCal > 400) return "TRASH";
        if (avgCal > 200) return "NEUTRAL";
        return "HEALTHY";
    }, [isUsingSelector, type, computedCalories, selectedItems.length]);

    const handleOpenChange = (val: boolean) => {
        setOpen(val);
        if(!val && !meal) {
            setTimeout(() => {
                setSelectedItems([]);
                setManualDesc("");
                setManualCals(0);
                setTitle("Almoço");
                setType("HEALTHY");
            }, 200);
        }
    }

    const handleSubmit = async () => {
        if (finalCalories === 0 && !finalDescription) {
            toast.error("Adicione alimentos ou insira as calorias manualmente.");
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("type", (isUsingSelector && !meal) ? detectedType : type);
        formData.append("items", finalDescription);
        formData.append("calories", finalCalories.toString());

        try {
            if (meal) {
                formData.append("id", meal.id);
                await updateMeal(formData);
                toast.success("Atualizado!");
            } else {
                await logMeal(formData);
                toast.success("Registrado!");
            }
            handleOpenChange(false);
        } catch (e) {
            toast.error("Erro ao salvar.");
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button size="sm" className="bg-primary text-primary-foreground shadow-md gap-1.5 h-8">
                        <Plus className="h-4 w-4" /> Registrar
                    </Button>
                )}
            </DialogTrigger>
            
            {/* Modal Wide e Responsivo */}
            <DialogContent className="sm:max-w-[90vw] md:max-w-[1000px] h-[85vh] p-0 overflow-hidden flex flex-col md:flex-row gap-0 bg-background">
                
                {/* --- COLUNA ESQUERDA: MERCADO (Seletor) --- */}
                <div className="hidden md:flex flex-col w-[60%] border-r border-border bg-muted/5 relative">
                    <div className="p-4 border-b border-border bg-background/50 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <ShoppingBasket className="h-5 w-5" />
                            <span className="font-semibold text-sm">Mercado de Alimentos</span>
                        </div>
                        {selectedItems.length > 0 && (
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer" onClick={() => setSelectedItems([])}>
                                Limpar {selectedItems.length} itens
                            </Badge>
                        )}
                    </div>
                    {/* Área de Scroll isolada para não quebrar o layout */}
                    <div className="flex-1 overflow-hidden relative">
                        <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-2">
                            <FoodSelector onSelectionChange={setSelectedItems} />
                        </div>
                    </div>
                </div>

                {/* --- COLUNA DIREITA: FICHA TÉCNICA (Formulário) --- */}
                <div className="flex-1 flex flex-col w-full h-full bg-card">
                    
                    {/* Header da Ficha */}
                    <div className="p-5 border-b border-border bg-background">
                        <DialogTitle className="flex items-center gap-2 text-lg font-bold">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <ChefHat className="h-5 w-5" />
                            </div>
                            {meal ? "Editar Refeição" : "Nova Refeição"}
                        </DialogTitle>
                    </div>

                    {/* Conteúdo Scrollável da Ficha */}
                    <ScrollArea className="flex-1">
                        <div className="p-6 space-y-6">
                            
                            {/* Bloco 1: Detalhes Básicos */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground">Refeição</Label>
                                    <Select value={title} onValueChange={setTitle}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Café da Manhã">Café da Manhã</SelectItem>
                                            <SelectItem value="Almoço">Almoço</SelectItem>
                                            <SelectItem value="Lanche">Lanche</SelectItem>
                                            <SelectItem value="Jantar">Jantar</SelectItem>
                                            <SelectItem value="Ceia">Ceia</SelectItem>
                                            <SelectItem value="Pós-Treino">Pós-Treino</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground">Qualidade</Label>
                                    <Select value={isUsingSelector && !meal ? detectedType : type} onValueChange={setType}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HEALTHY">✅ Saudável</SelectItem>
                                            <SelectItem value="NEUTRAL">⚖️ Neutro</SelectItem>
                                            <SelectItem value="TRASH">🍔 Off-Plan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <Separator />

                            {/* Bloco 2: Resumo Financeiro/Calórico */}
                            <div className="bg-muted/20 rounded-xl p-4 border border-border/50 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Activity className="h-4 w-4" />
                                        <span className="text-sm font-medium">Total Calórico</span>
                                    </div>
                                    {isUsingSelector && <Badge variant="outline" className="text-[10px] bg-background">Auto</Badge>}
                                </div>
                                
                                <div className="flex items-end gap-2">
                                    <Input 
                                        type="number"
                                        value={finalCalories}
                                        onChange={(e) => setManualCals(Number(e.target.value))}
                                        readOnly={isUsingSelector}
                                        className="text-3xl font-black h-14 w-full bg-background border-border focus-visible:ring-primary/20"
                                    />
                                    <span className="text-sm font-bold text-muted-foreground mb-3">kcal</span>
                                </div>
                            </div>

                            {/* Bloco 3: Itens (Mobile Only Button) */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs uppercase font-bold text-muted-foreground">Composição do Prato</Label>
                                    {/* Botão visível apenas em Mobile para abrir foods */}
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" className="md:hidden h-7 text-xs">
                                                <Plus className="h-3 w-3 mr-1" /> Add Itens
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="h-[80vh] flex flex-col p-0">
                                            <div className="p-4 border-b">
                                                <DialogTitle>Selecionar Alimentos</DialogTitle>
                                            </div>
                                            <div className="flex-1 overflow-hidden relative">
                                                <div className="absolute inset-0 overflow-y-auto p-2">
                                                    <FoodSelector onSelectionChange={setSelectedItems} />
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>

                                <textarea 
                                    value={finalDescription}
                                    onChange={(e) => setManualDesc(e.target.value)}
                                    readOnly={isUsingSelector}
                                    placeholder="Descreva sua refeição ou selecione itens..."
                                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px] resize-none"
                                />
                                {isUsingSelector && (
                                    <p className="text-[10px] text-primary flex items-center gap-1">
                                        <Sparkles className="h-3 w-3" /> Gerado automaticamente da seleção.
                                    </p>
                                )}
                            </div>

                        </div>
                    </ScrollArea>

                    {/* Footer Fixo */}
                    <div className="p-5 border-t border-border bg-background mt-auto">
                        <Button className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/20" onClick={handleSubmit}>
                            {meal ? "Salvar Alterações" : "Confirmar Registro"}
                            <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    )
}