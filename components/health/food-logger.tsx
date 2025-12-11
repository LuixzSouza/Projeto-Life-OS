"use client";

import { useState, useMemo } from "react";
import { Meal } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Utensils, Trash2, Plus, Leaf, Pizza, Coffee, Flame, Check, Pencil, ChefHat, ArrowRight, Search, Activity, Droplets, Wheat, X } from "lucide-react";
import { logMeal, updateMeal, deleteMeal } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FoodSelector } from "./food-selector";
import { FoodItem } from "@/lib/food-db";
import { cn } from "@/lib/utils";

// --- COMPONENTE PRINCIPAL (DASHBOARD DIÁRIO) ---
export function FoodLogger({ meals }: { meals: Meal[] }) {
    const todayMeals = meals.filter(m => new Date(m.date).toDateString() === new Date().toDateString());
    
    // Cálculos
    const totalCals = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);
    const dailyGoal = 2500; 
    const progressPercentage = Math.min((totalCals / dailyGoal) * 100, 100);
    
    // Cores dinâmicas para a barra de progresso
    const progressColor = totalCals > dailyGoal 
        ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.6)]" 
        : totalCals > (dailyGoal * 0.9) 
            ? "bg-yellow-500" 
            : "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]";

    const handleDelete = async (id: string) => {
        if(confirm("Tem certeza que deseja remover esta refeição?")) {
            await deleteMeal(id);
            toast.success("Refeição removida.");
        }
    }

    return (
        <Card className="border-0 shadow-xl bg-white dark:bg-zinc-900 h-full flex flex-col overflow-hidden relative ring-1 ring-zinc-100 dark:ring-zinc-800">
            {/* Header */}
            <div className="p-6 pb-4 relative z-10 bg-gradient-to-b from-white to-zinc-50/50 dark:from-zinc-900 dark:to-zinc-900/50">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
                            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-lg">
                                <Utensils className="h-4 w-4" /> 
                            </div>
                            Diário Alimentar
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1 pl-1">Hoje, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
                    </div>
                    <MealFormDialog />
                </div>

                {/* Painel de Metas */}
                <div className="bg-white dark:bg-zinc-950 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <div className="flex justify-between items-end mb-3">
                        <div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Consumido Hoje</span>
                            <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-3xl font-black text-zinc-900 dark:text-white">{totalCals}</span>
                                <span className="text-sm font-medium text-zinc-400">kcal</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-zinc-400 font-medium">Meta: {dailyGoal}</span>
                            <p className={`text-xs font-bold ${totalCals > dailyGoal ? 'text-red-500' : 'text-emerald-600'}`}>
                                {Math.round(dailyGoal - totalCals)} restantes
                            </p>
                        </div>
                    </div>
                    
                    <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-zinc-100 dark:border-zinc-800/50">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${progressColor}`} 
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>
            </div>

            {/* Lista Scrollável */}
            <CardContent className="p-0 flex-1 relative bg-zinc-50/50 dark:bg-black/40">
                <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 p-2">
                    {todayMeals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-3 min-h-[150px]">
                             <Leaf className="h-8 w-8 opacity-20" />
                             <p className="text-xs font-medium">Nenhum registro hoje.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {todayMeals.map(meal => (
                                <div key={meal.id} className="group flex items-center justify-between p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/50 dark:border-zinc-800 shadow-sm hover:shadow-md transition-all hover:border-emerald-500/30">
                                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                                        <div className={`
                                            w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg shadow-inner
                                            ${meal.type === 'HEALTHY' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 
                                              meal.type === 'TRASH' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 
                                              'bg-amber-50 text-amber-600 dark:bg-amber-900/20'}
                                        `}>
                                            {getMealEmoji(meal.title, meal.type)}
                                        </div>
                                        
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-zinc-800 dark:text-zinc-100 truncate">{meal.title}</p>
                                            <p className="text-xs text-zinc-500 truncate">{meal.items || "Sem descrição"}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3 shrink-0">
                                        <Badge variant="secondary" className="font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-0">
                                            {meal.calories}
                                        </Badge>
                                        
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MealFormDialog meal={meal}>
                                                <button className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors">
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                            </MealFormDialog>
                                            <button onClick={() => handleDelete(meal.id)} className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function getMealEmoji(title: string, type: string) {
    if (title.includes('Café')) return "☕";
    if (type === 'TRASH') return "🍕";
    if (title.includes('Treino') || title.includes('Whey')) return "💪";
    return "🥗";
}

// --- MODAL DE REFEIÇÃO (LAYOUT OTIMIZADO) ---
function MealFormDialog({ meal, children }: { meal?: Meal, children?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [selectedItems, setSelectedItems] = useState<FoodItem[]>([]);
    
    // Estados Controlados
    const [description, setDescription] = useState(meal?.items || "");
    const [calories, setCalories] = useState<number>(meal?.calories || 0);
    const [title, setTitle] = useState(meal?.title || "Almoço");
    const [type, setType] = useState(meal?.type || "HEALTHY");

    // Lógica de Dados Derivados (Memoizada)
    const calculatedCalories = useMemo(() => 
        selectedItems.reduce((acc, item) => acc + item.calories, 0), 
    [selectedItems]);

    const generatedDescription = useMemo(() => {
        if (selectedItems.length === 0) return "";
        const counts: Record<string, number> = {};
        selectedItems.forEach(item => {
            counts[item.name] = (counts[item.name] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([name, count]) => count > 1 ? `${count}x ${name}` : name)
            .join(", ");
    }, [selectedItems]);

    // Lógica Híbrida
    const isUsingSelector = selectedItems.length > 0;
    const finalDescription = isUsingSelector ? generatedDescription : description;
    const finalCalories = isUsingSelector ? calculatedCalories : calories;

    const detectedType = useMemo(() => {
        if (!isUsingSelector) return type;
        const avgCal = calculatedCalories / selectedItems.length;
        return avgCal > 300 ? "TRASH" : "HEALTHY";
    }, [isUsingSelector, type, calculatedCalories, selectedItems.length]);

    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen);
        if (!newOpen && !meal) {
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
        if (!finalDescription && !isUsingSelector) {
            toast.error("Adicione alimentos ou descreva a refeição.");
            return;
        }

        const formData = new FormData();
        formData.append("title", title);
        formData.append("type", (isUsingSelector && !meal) ? detectedType : type);
        formData.append("items", finalDescription);
        formData.append("calories", finalCalories.toString());

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
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white gap-2 shadow-md hover:shadow-lg transition-all dark:bg-white dark:text-black dark:hover:bg-zinc-200">
                        <Plus className="h-4 w-4" /> Registrar
                    </Button>
                )}
            </DialogTrigger>
            
            {/* MODAL RESPONSIVO (Split View em Desktop, Stack em Mobile) */}
            <DialogContent className="sm:max-w-[90vw] md:max-w-[1100px] h-[90vh] p-0 gap-0 overflow-hidden bg-zinc-50 dark:bg-zinc-950 border-0 shadow-2xl flex flex-col md:flex-row">
                
                {/* --- LADO ESQUERDO: SELETOR (MERCADO) --- */}
                <div className="w-full md:w-[60%] flex flex-col border-b md:border-b-0 md:border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-1/2 md:h-full relative">
                    <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-white/50 backdrop-blur-sm z-10 sticky top-0">
                        <h2 className="font-bold flex items-center gap-2 text-lg text-zinc-800 dark:text-white">
                            <Search className="h-5 w-5 text-emerald-500" /> Selecionar Alimentos
                        </h2>
                    </div>
                    {/* Container Scrollável do Seletor */}
                    <div className="flex-1 overflow-hidden relative">
                         <div className="absolute inset-0 p-2 overflow-y-auto">
                            <FoodSelector onSelectionChange={setSelectedItems} />
                         </div>
                    </div>
                </div>

                {/* --- LADO DIREITO: FICHA TÉCNICA (RESUMO) --- */}
                <div className="w-full md:w-[40%] flex flex-col h-1/2 md:h-full bg-zinc-50 dark:bg-zinc-950/50">
                    
                    {/* Header da Ficha */}
                    <div className="p-6 pb-4 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-xl flex items-center gap-2 font-bold text-zinc-800 dark:text-zinc-100">
                                <ChefHat className="h-6 w-6 text-zinc-400" />
                                {meal ? "Editar Prato" : "Novo Prato"}
                            </DialogTitle>
                            <DialogDescription className="text-xs mt-1">
                                Revise os detalhes antes de salvar.
                            </DialogDescription>
                        </div>
                        {/* Botão Limpar Rápido */}
                        {(finalDescription || finalCalories > 0) && (
                            <Button variant="ghost" size="sm" onClick={handleClear} className="h-8 text-xs text-red-500 hover:text-red-600 hover:bg-red-50">
                                <X className="h-3 w-3 mr-1" /> Limpar
                            </Button>
                        )}
                    </div>

                    {/* Formulário com Scroll */}
                    <ScrollArea className="flex-1 px-6">
                        <div className="space-y-6 py-6">
                            
                            {/* Inputs de Categoria */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Horário</Label>
                                    <Select value={title} onValueChange={setTitle}>
                                        <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 h-9 text-sm"><SelectValue /></SelectTrigger>
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
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Qualidade</Label>
                                    <Select value={isUsingSelector && !meal ? detectedType : type} onValueChange={setType}>
                                        <SelectTrigger className="bg-white dark:bg-zinc-900 border-zinc-200 h-9 text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HEALTHY">✅ Saudável</SelectItem>
                                            <SelectItem value="NEUTRAL">⚖️ Neutro</SelectItem>
                                            <SelectItem value="TRASH">🍔 Lixo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Card de Resumo (Estilo Ticket) */}
                            <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                                
                                <div className="flex justify-between items-start mb-6">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Total Calórico</Label>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="number" 
                                                value={finalCalories}
                                                onChange={(e) => setCalories(Number(e.target.value))}
                                                readOnly={isUsingSelector}
                                                className="h-12 text-4xl font-black text-zinc-900 dark:text-white border-none p-0 bg-transparent w-40 focus-visible:ring-0 placeholder:text-zinc-200"
                                                placeholder="0"
                                            />
                                            <span className="text-base font-medium text-zinc-400 mt-2">kcal</span>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-full group-hover:scale-110 transition-transform">
                                        <Flame className="h-6 w-6 text-emerald-500" />
                                    </div>
                                </div>

                                {/* Macros Simulados (Visual) */}
                                <div className="flex gap-2 mb-6">
                                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg text-center border border-zinc-100 dark:border-zinc-700">
                                        <Activity className="h-3 w-3 mx-auto mb-1 text-blue-500" />
                                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">Carb</span>
                                    </div>
                                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg text-center border border-zinc-100 dark:border-zinc-700">
                                        <Wheat className="h-3 w-3 mx-auto mb-1 text-amber-500" />
                                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">Prot</span>
                                    </div>
                                    <div className="flex-1 bg-zinc-50 dark:bg-zinc-800 p-2 rounded-lg text-center border border-zinc-100 dark:border-zinc-700">
                                        <Droplets className="h-3 w-3 mx-auto mb-1 text-red-500" />
                                        <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400">Gord</span>
                                    </div>
                                </div>

                                <div className="space-y-2 pt-4 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                                    <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Descrição</Label>
                                    <Input 
                                        value={finalDescription}
                                        onChange={(e) => setDescription(e.target.value)}
                                        readOnly={isUsingSelector}
                                        placeholder="Descreva sua refeição..."
                                        className="bg-zinc-50 dark:bg-zinc-950 border-zinc-100 dark:border-zinc-800 font-medium h-10 text-sm focus-visible:ring-emerald-500"
                                    />
                                    {isUsingSelector && (
                                        <p className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1 font-medium animate-in fade-in slide-in-from-top-1">
                                            <Check className="h-3 w-3" /> Calculado automaticamente.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScrollArea>

                    {/* Footer Fixo */}
                    <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 mt-auto shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-20">
                        <Button 
                            onClick={handleSubmit} 
                            disabled={(!finalDescription && !isUsingSelector)}
                            className="w-full h-12 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                        >
                            {meal ? "Salvar Alterações" : "Confirmar Refeição"} <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    )
}