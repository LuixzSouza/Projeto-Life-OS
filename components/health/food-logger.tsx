"use client";

import { useState } from "react";
import { Meal } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Utensils, Trash2, Plus, Leaf, Pizza, Coffee, Flame, Check, Pencil } from "lucide-react";
import { logMeal, updateMeal, deleteMeal } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { FoodSelector } from "./food-selector";
import { FoodItem } from "@/lib/food-db";

// --- COMPONENTE PRINCIPAL ---
export function FoodLogger({ meals }: { meals: Meal[] }) {
    const todayMeals = meals.filter(m => new Date(m.date).toDateString() === new Date().toDateString());
    const totalCals = todayMeals.reduce((acc, m) => acc + (m.calories || 0), 0);

    const handleDelete = async (id: string) => {
        if(confirm("Remover refeição?")) {
            await deleteMeal(id);
            toast.success("Refeição removida.");
        }
    }

    return (
        <Card className="border-0 shadow-sm bg-green-50 dark:bg-green-950/20 ring-1 ring-green-100 dark:ring-green-900 h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-green-700 dark:text-green-400 flex items-center gap-2">
                    <Utensils className="h-4 w-4" /> Diário Alimentar (Hoje)
                </CardTitle>
                <MealFormDialog />
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4">
                
                {/* Resumo */}
                <div className="flex justify-between items-baseline border-b border-green-200 dark:border-green-800 pb-2">
                    <span className="text-3xl font-bold text-green-800 dark:text-green-200">
                        {totalCals} <span className="text-sm font-normal opacity-60">kcal</span>
                    </span>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {todayMeals.length} refeições
                    </span>
                </div>

                {/* Lista de Refeições */}
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[250px] pr-1 scrollbar-thin">
                    {todayMeals.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-20 text-green-600/40">
                             <Leaf className="h-6 w-6 mb-1" />
                             <p className="text-xs">O que você comeu hoje?</p>
                        </div>
                    ) : todayMeals.map(meal => (
                        <div key={meal.id} className="group flex items-center justify-between bg-white dark:bg-zinc-900 p-3 rounded-lg border border-green-100 dark:border-green-900 shadow-sm transition-all hover:border-green-300">
                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                <div className={`p-2 rounded-full shrink-0 ${meal.type === 'HEALTHY' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {meal.title.includes('Café') ? <Coffee className="h-4 w-4" /> : meal.type === 'TRASH' ? <Pizza className="h-4 w-4" /> : <Leaf className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200 truncate">{meal.title}</p>
                                    <p className="text-[10px] text-zinc-500 truncate">{meal.items}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                                {meal.calories && <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono bg-zinc-100 text-zinc-600">{meal.calories} kcal</Badge>}
                                
                                {/* Ações: Editar e Deletar (Visíveis no Hover) */}
                                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MealFormDialog meal={meal}>
                                        <button className="p-1 text-zinc-400 hover:text-blue-500 transition-colors">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                    </MealFormDialog>
                                    <button onClick={() => handleDelete(meal.id)} className="p-1 text-zinc-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// --- SUB-COMPONENTE: MODAL DE FORMULÁRIO (CRIAÇÃO E EDIÇÃO) ---
function MealFormDialog({ meal, children }: { meal?: Meal, children?: React.ReactNode }) {
    const [selectedItems, setSelectedItems] = useState<FoodItem[]>([]);
    const [open, setOpen] = useState(false);
    
    // Se for edição, usamos os dados existentes, senão calculamos do zero
    const currentCalories = meal ? (meal.calories || 0) : selectedItems.reduce((acc, item) => acc + item.calories, 0);
    
    // Cálculo de auto-tipo para novos itens
    const avgCal = selectedItems.length > 0 ? currentCalories / selectedItems.length : 0;
    const detectedType = avgCal > 300 ? "TRASH" : "HEALTHY";

    const handleSubmit = async (formData: FormData) => {
        // Lógica: Se o usuário usou o seletor, atualizamos os itens e calorias.
        // Se não usou (está editando só o título por exemplo), mantemos o que estava no input.
        
        if (!meal && selectedItems.length === 0 && !formData.get("items")) {
            toast.error("Adicione alimentos ou descreva a refeição.");
            return;
        }

        // Se o seletor foi usado, ele sobrescreve. Se não, usa o input manual (necessário para edição rápida)
        if (selectedItems.length > 0) {
            const itemsString = selectedItems.map(i => i.name).join(", ");
            formData.set("items", itemsString);
            formData.set("calories", currentCalories.toString());
            if(!meal) formData.set("type", detectedType); // Só auto-detecta na criação
        }

        if (meal) {
            formData.append("id", meal.id);
            await updateMeal(formData);
            toast.success("Refeição atualizada!");
        } else {
            await logMeal(formData);
            toast.success("Refeição registrada! 🥗");
        }
        
        setSelectedItems([]); 
        setOpen(false); 
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children ? children : (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 hover:bg-green-200 text-green-700 rounded-full">
                        <Plus className="h-5 w-5" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{meal ? "Editar Refeição" : "Montar Prato"}</DialogTitle>
                </DialogHeader>
                
                <div className="flex-1 py-2">
                     <form id={`meal-form-${meal?.id || 'new'}`} action={handleSubmit} className="space-y-6">
                        
                        <div className="flex items-center gap-4">
                            <div className="w-1/3">
                                <Label className="text-xs text-zinc-500 uppercase font-bold">Refeição</Label>
                                <Select name="title" defaultValue={meal?.title || "Almoço"}>
                                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Café da Manhã">Café da Manhã</SelectItem>
                                        <SelectItem value="Almoço">Almoço</SelectItem>
                                        <SelectItem value="Lanche">Lanche</SelectItem>
                                        <SelectItem value="Jantar">Jantar</SelectItem>
                                        <SelectItem value="Ceia">Ceia</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {/* Card de Calorias (Editável manualmente se quiser) */}
                            <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 p-2 rounded-lg border flex justify-between items-center px-4">
                                <div>
                                    <p className="text-[10px] text-zinc-500 uppercase font-bold">Total (kcal)</p>
                                    <Input 
                                        name="calories" 
                                        type="number" 
                                        defaultValue={currentCalories} 
                                        className="h-6 w-20 p-0 border-none bg-transparent text-xl font-bold text-green-700 dark:text-green-400 focus-visible:ring-0"
                                    />
                                </div>
                                <div className="w-1/3">
                                     <Select name="type" defaultValue={meal?.type || "HEALTHY"}>
                                        <SelectTrigger className="h-7 text-xs bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="HEALTHY">Saudável</SelectItem>
                                            <SelectItem value="NEUTRAL">Neutro</SelectItem>
                                            <SelectItem value="TRASH">Lixo</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Input de Texto Manual (Para edição ou quando não usar o seletor) */}
                        <div className="space-y-2">
                             <Label className="text-xs text-zinc-500 uppercase font-bold">Descrição</Label>
                             <Input name="items" defaultValue={meal?.items || ""} placeholder="Ex: Arroz, feijão..." />
                        </div>

                        {/* SELETOR (Opcional na edição, útil na criação) */}
                        <div className="space-y-2 pt-2 border-t border-dashed">
                             <Label className="text-xs text-zinc-500 uppercase font-bold flex items-center gap-2">
                                <Plus className="h-3 w-3" /> Adicionar Itens Rápidos
                             </Label>
                             <FoodSelector onSelectionChange={setSelectedItems} />
                             <p className="text-[10px] text-zinc-400">
                                * Selecionar itens aqui somará ao total de calorias acima automaticamente.
                             </p>
                        </div>

                    </form>
                </div>

                <DialogFooter className="pt-2 border-t mt-auto">
                    <Button type="submit" form={`meal-form-${meal?.id || 'new'}`} className="w-full bg-green-600 hover:bg-green-700 text-white gap-2">
                        <Check className="h-4 w-4" /> {meal ? "Salvar Alterações" : "Registrar no Diário"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}