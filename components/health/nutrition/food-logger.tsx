"use client";

import { useState, useMemo } from "react";
import { Meal } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Utensils, Trash2, Plus, Leaf, Pizza, Coffee, Flame, Check, 
    Pencil, ChefHat, ArrowRight, Search, Activity, Droplets, Wheat, X, 
    AlertCircle, Sparkles
} from "lucide-react";
import { logMeal, updateMeal, deleteMeal } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FoodSelector } from "./food-selector";
import { FoodItem } from "@/lib/food-db";
import { cn } from "@/lib/utils";

// --- TIPOS E UTILITÁRIOS ---
type MealType = "HEALTHY" | "NEUTRAL" | "TRASH";

// --- COMPONENTE PRINCIPAL ---
export function FoodLogger({ meals }: { meals: Meal[] }) {
    const todayMeals = meals.filter(m => new Date(m.date).toDateString() === new Date().toDateString());
    
    // Cálculos
    const totalCals = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const dailyGoal = 2500; 
    const progressPercentage = Math.min((totalCals / dailyGoal) * 100, 100);
    const remaining = Math.max(dailyGoal - totalCals, 0);
    const isOverLimit = totalCals > dailyGoal;

    return (
        <Card className="border-border/60 shadow-sm bg-card h-full flex flex-col overflow-hidden relative group">
            
            {/* Header com Resumo */}
            <div className="p-6 pb-2 bg-gradient-to-b from-muted/30 to-background border-b border-border/40 relative z-10">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                            <div className="p-1.5 bg-primary/10 text-primary rounded-lg">
                                <Utensils className="h-4 w-4" /> 
                            </div>
                            Diário Alimentar
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 pl-1">
                            Hoje, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                        </p>
                    </div>
                    <MealFormDialog />
                </div>

                {/* Painel de Metas */}
                <div className="space-y-3">
                    <div className="flex justify-between items-end">
                        <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Consumido</span>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                                <span className={cn("text-3xl font-black tracking-tight", isOverLimit ? "text-destructive" : "text-foreground")}>
                                    {totalCals}
                                </span>
                                <span className="text-sm font-medium text-muted-foreground">kcal</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-muted-foreground font-medium">Meta: {dailyGoal}</span>
                            <p className={cn("text-xs font-bold", isOverLimit ? "text-destructive" : "text-primary")}>
                                {isOverLimit ? `+${Math.abs(remaining)} excesso` : `${remaining} restantes`}
                            </p>
                        </div>
                    </div>
                    
                    <div className="h-2.5 w-full bg-secondary rounded-full overflow-hidden shadow-inner">
                        <div 
                            className={cn(
                                "h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                                isOverLimit ? "bg-destructive" : "bg-primary"
                            )} 
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Lista Scrollável */}
            <CardContent className="p-0 flex-1 relative bg-muted/10">
                <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-3">
                    {todayMeals.length === 0 ? (
                        <EmptyState />
                    ) : (
                        <div className="space-y-3">
                            {todayMeals.map(meal => (
                                <MealCard key={meal.id} meal={meal} />
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

// --- SUBCOMPONENTES ---

function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3 min-h-[200px] opacity-60">
             <div className="p-4 bg-muted rounded-full">
                <Leaf className="h-8 w-8 text-muted-foreground" />
             </div>
             <div className="text-center">
                <p className="text-sm font-semibold text-foreground">Diário vazio</p>
                <p className="text-xs">Registre sua primeira refeição do dia.</p>
             </div>
        </div>
    )
}

function MealCard({ meal }: { meal: Meal }) {
    
    const handleDelete = async () => {
        // Em um app real, use um Toast com Undo ou um Alert Dialog. 
        // `confirm` bloqueia a thread, mas é aceitável para MVP.
        if(confirm("Remover esta refeição?")) {
            await deleteMeal(meal.id);
            toast.success("Refeição removida.");
        }
    }

    const typeConfig = {
        HEALTHY: { bg: "bg-primary/10", text: "text-primary", icon: Leaf },
        NEUTRAL: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", icon: Coffee },
        TRASH: { bg: "bg-destructive/10", text: "text-destructive", icon: Pizza },
    }[meal.type as MealType] || { bg: "bg-muted", text: "text-muted-foreground", icon: Utensils };

    const Icon = typeConfig.icon;

    return (
        <div className="group flex items-center justify-between p-3.5 bg-card rounded-xl border border-border/60 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300">
            <div className="flex items-center gap-4 overflow-hidden flex-1">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors", typeConfig.bg, typeConfig.text)}>
                    <Icon className="h-5 w-5" />
                </div>
                
                <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="text-sm font-bold text-foreground truncate leading-none">{meal.title}</p>
                    <p className="text-xs text-muted-foreground truncate font-medium">{meal.items || "Sem descrição"}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0">
                <Badge variant="secondary" className="font-mono font-bold bg-muted/50 text-foreground border-border/50">
                    {meal.calories} kcal
                </Badge>
                
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 duration-200">
                    <MealFormDialog meal={meal}>
                        <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                    </MealFormDialog>
                    <button onClick={handleDelete} className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>
        </div>
    )
}

// --- MODAL DE REFEIÇÃO ---
function MealFormDialog({ meal, children }: { meal?: Meal, children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<FoodItem[]>([]);
    
    // Estados Controlados
    const [description, setDescription] = useState(meal?.items || "");
    const [calories, setCalories] = useState<number>(meal?.calories || 0);
    const [title, setTitle] = useState(meal?.title || "Almoço");
    const [type, setType] = useState(meal?.type || "HEALTHY");

    // Lógica Derivada
    const calculatedCalories = useMemo(() => 
        selectedItems.reduce((acc, item) => acc + item.calories, 0), 
    [selectedItems]);

    const generatedDescription = useMemo(() => {
        if (selectedItems.length === 0) return "";
        const counts: Record<string, number> = {};
        selectedItems.forEach(item => counts[item.name] = (counts[item.name] || 0) + 1);
        return Object.entries(counts)
            .map(([name, count]) => count > 1 ? `${count}x ${name}` : name)
            .join(", ");
    }, [selectedItems]);

    const isUsingSelector = selectedItems.length > 0;
    const finalDescription = isUsingSelector ? generatedDescription : description;
    const finalCalories = isUsingSelector ? calculatedCalories : calories;

    // Detecção automática de tipo baseada em caloria média (Regra de Negócio Exemplo)
    const detectedType = useMemo(() => {
        if (!isUsingSelector) return type;
        const avgCal = calculatedCalories / selectedItems.length;
        return avgCal > 350 ? "TRASH" : "HEALTHY";
    }, [isUsingSelector, type, calculatedCalories, selectedItems.length]);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen && !meal) {
            // Reset delay para animação
            setTimeout(() => {
                setSelectedItems([]);
                setDescription("");
                setCalories(0);
                setTitle("Almoço");
                setType("HEALTHY");
            }, 300);
        }
    };

    const handleClear = () => {
        setSelectedItems([]);
        setDescription("");
        setCalories(0);
    }

    const handleSubmit = async () => {
        if (!finalDescription && !isUsingSelector && finalCalories === 0) {
            toast.error("Preencha os dados da refeição.");
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
                toast.success("Refeição atualizada!");
            } else {
                await logMeal(formData);
                toast.success("Refeição registrada!");
            }
            handleClear();
            handleOpenChange(false);
        } catch (e) {
            toast.error("Erro ao salvar.");
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md gap-2 font-semibold">
                        <Plus className="h-4 w-4" /> Registrar
                    </Button>
                )}
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[95vw] md:max-w-[1100px] h-[92vh] p-0 gap-0 bg-background border-border shadow-2xl flex flex-col md:flex-row overflow-hidden rounded-xl">
                
                {/* --- LADO ESQUERDO: SELETOR (MERCADO) --- */}
                <div className="w-full md:w-[60%] flex flex-col border-b md:border-b-0 md:border-r border-border bg-muted/10 h-[45%] md:h-full relative">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-background/80 backdrop-blur-md z-10 sticky top-0">
                        <h2 className="font-bold flex items-center gap-2 text-lg text-foreground">
                            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                                <Search className="h-4 w-4" /> 
                            </div>
                            Selecionar Alimentos
                        </h2>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative">
                         <div className="absolute inset-0 p-2 overflow-y-auto custom-scrollbar">
                            <FoodSelector onSelectionChange={setSelectedItems} />
                         </div>
                    </div>
                </div>

                {/* --- LADO DIREITO: FICHA TÉCNICA --- */}
                <div className="w-full md:w-[40%] flex flex-col h-[55%] md:h-full bg-card shadow-[inset_10px_0_20px_-10px_rgba(0,0,0,0.02)]">
                    
                    {/* Header da Ficha */}
                    <div className="p-6 pb-4 border-b border-border flex justify-between items-start bg-background/50">
                        <div>
                            <DialogTitle className="text-xl flex items-center gap-2 font-bold text-foreground">
                                <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                                    <ChefHat className="h-5 w-5" />
                                </div>
                                {meal ? "Editar Prato" : "Novo Prato"}
                            </DialogTitle>
                            <DialogDescription className="text-xs mt-1 text-muted-foreground">
                                Revise os macros e detalhes.
                            </DialogDescription>
                        </div>
                        {(finalDescription || finalCalories > 0) && (
                            <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive">
                                <X className="h-3 w-3 mr-1" /> Limpar
                            </Button>
                        )}
                    </div>

                    <ScrollArea className="flex-1 px-6 bg-background">
                        <div className="space-y-6 py-6">
                            
                            {/* Inputs Principais */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Momento</Label>
                                    <Select value={title} onValueChange={setTitle}>
                                        <SelectTrigger className="h-10 bg-muted/20 border-border focus:ring-primary/20"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Café da Manhã">☕ Café da Manhã</SelectItem>
                                            <SelectItem value="Almoço">🥗 Almoço</SelectItem>
                                            <SelectItem value="Lanche">🥪 Lanche</SelectItem>
                                            <SelectItem value="Jantar">🍲 Jantar</SelectItem>
                                            <SelectItem value="Ceia">🌙 Ceia</SelectItem>
                                            <SelectItem value="Pós-Treino">💪 Pós-Treino</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Classificação</Label>
                                    <Select value={isUsingSelector && !meal ? detectedType : type} onValueChange={setType}>
                                        <SelectTrigger className="h-10 bg-muted/20 border-border focus:ring-primary/20"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HEALTHY">✅ Saudável</SelectItem>
                                            <SelectItem value="NEUTRAL">⚖️ Neutro</SelectItem>
                                            <SelectItem value="TRASH">🍔 Off-Plan</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Card de Resumo (Calorias) */}
                            <div className="bg-gradient-to-br from-muted/30 to-background p-5 rounded-xl border border-border relative overflow-hidden group hover:border-primary/30 transition-all">
                                <div className="flex justify-between items-start mb-6 relative z-10">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Energia Total</Label>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="number" 
                                                value={finalCalories}
                                                onChange={(e) => setCalories(Number(e.target.value))}
                                                readOnly={isUsingSelector}
                                                className="h-12 text-4xl font-black text-foreground border-none p-0 bg-transparent w-40 focus-visible:ring-0 placeholder:text-muted/50 tracking-tighter"
                                                placeholder="0"
                                            />
                                            <span className="text-sm font-bold text-muted-foreground mt-2">kcal</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-primary/10 rounded-full text-primary">
                                        <Flame className="h-6 w-6" />
                                    </div>
                                </div>

                                {/* Macros Visuais (Simulado para UI) */}
                                <div className="flex gap-2 mb-6 relative z-10">
                                    <MacroBadge label="Carb" icon={Wheat} color="text-blue-500" bg="bg-blue-500/10" />
                                    <MacroBadge label="Prot" icon={Activity} color="text-emerald-500" bg="bg-emerald-500/10" />
                                    <MacroBadge label="Gord" icon={Droplets} color="text-amber-500" bg="bg-amber-500/10" />
                                </div>

                                <div className="space-y-2 pt-4 border-t border-border/50 relative z-10">
                                    <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Conteúdo</Label>
                                    <Input 
                                        value={finalDescription}
                                        onChange={(e) => setDescription(e.target.value)}
                                        readOnly={isUsingSelector}
                                        placeholder="Ex: Arroz, feijão e frango..."
                                        className="bg-background/80 border-border font-medium h-10 text-sm focus-visible:ring-primary/20"
                                    />
                                    {isUsingSelector && (
                                        <p className="text-[10px] text-primary flex items-center gap-1 mt-1 font-medium animate-in fade-in">
                                            <Sparkles className="h-3 w-3" /> Calculado automaticamente via seleção.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Footer Fixo */}
                    <div className="p-6 border-t border-border bg-background z-20">
                        <Button 
                            onClick={handleSubmit} 
                            disabled={(!finalDescription && !isUsingSelector && finalCalories === 0)}
                            className="w-full h-12 text-lg font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all active:scale-[0.99]"
                        >
                            {meal ? "Salvar Alterações" : "Confirmar Registro"} <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    )
}

function MacroBadge({ label, icon: Icon, color, bg }: { label: string, icon: React.ElementType, color: string, bg: string }) {
    return (
        <div className={cn("flex-1 p-2 rounded-lg text-center border border-transparent hover:border-border transition-all cursor-default", bg)}>
            <Icon className={cn("h-3.5 w-3.5 mx-auto mb-1", color)} />
            <span className={cn("text-[10px] font-bold opacity-80", color)}>{label}</span>
        </div>
    )
}