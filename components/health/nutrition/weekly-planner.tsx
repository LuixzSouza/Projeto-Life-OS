"use client";

import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Printer, Sparkles, Trash2, Plus, ChefHat, CalendarRange, 
  X, Calculator, Search, Scale, AlignJustify, Check,
  Coffee, Utensils, Apple, Moon
} from "lucide-react";
import { toast } from "sonner";
import { saveMealPlanSlot, clearDayPlan } from "@/app/(dashboard)/health/actions";
import { MacroEducation } from "./macro-education";
import { cn } from "@/lib/utils";

// --- COMBOBOX COMPONENTS (Busca de Alimentos) ---
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

// --- IMPORTAÇÃO DO SEU BANCO DE DADOS ---
import { FOOD_DATABASE, type FoodItem } from "@/lib/food-db";

// --- TIPAGEM ---
export interface MealPlanSlot {
  id: string;
  dayOfWeek: number;
  mealType: string;
  title: string;
  items: string; 
  calories: number | null;
}

interface IngredientRow {
  id: string;
  foodId: string;
  name: string;
  amount: number;
  unit: string;
  unitCalories: number;
}

interface Suggestion {
  title: string;
  ingredients: IngredientRow[];
  cal: number;
}

type GoalType = "LOSE_WEIGHT" | "GAIN_MUSCLE";

const DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const MEAL_TYPES = [
  { id: "BREAKFAST", label: "Café da Manhã", icon: Coffee, color: "text-amber-600" },
  { id: "LUNCH", label: "Almoço", icon: Utensils, color: "text-emerald-600" },
  { id: "SNACK", label: "Lanche", icon: Apple, color: "text-orange-600" },
  { id: "DINNER", label: "Jantar", icon: Moon, color: "text-indigo-600" }
];

const MEAL_ICONS: Record<string, React.ReactNode> = {
  BREAKFAST: <Coffee className="h-4 w-4" />,
  LUNCH: <Utensils className="h-4 w-4" />,
  SNACK: <Apple className="h-4 w-4" />,
  DINNER: <Moon className="h-4 w-4" />
};

const SMART_SUGGESTIONS: Record<GoalType, Suggestion[]> = {
  "LOSE_WEIGHT": [
    { 
      title: "Omelete Fit", 
      ingredients: [
        { id: "1", foodId: "egg", name: "Ovo Cozido", amount: 3, unit: "unid", unitCalories: 70 },
        { id: "2", foodId: "cheese", name: "Queijo Mussarela", amount: 1, unit: "30g", unitCalories: 90 }
      ], 
      cal: 300 
    },
    { 
      title: "Salada Proteica", 
      ingredients: [
        { id: "1", foodId: "chicken", name: "Peito de Frango", amount: 1, unit: "100g", unitCalories: 165 },
        { id: "2", foodId: "lettuce", name: "Alface", amount: 2, unit: "xíc", unitCalories: 10 }
      ], 
      cal: 175 
    }
  ],
  "GAIN_MUSCLE": [
    { 
      title: "Mingau Turbinado", 
      ingredients: [
        { id: "1", foodId: "oats", name: "Aveia", amount: 2, unit: "30g", unitCalories: 120 },
        { id: "2", foodId: "milk", name: "Leite Integral", amount: 1, unit: "200ml", unitCalories: 120 }
      ], 
      cal: 360 
    },
    { 
      title: "Wrap Proteico", 
      ingredients: [
        { id: "1", foodId: "beef", name: "Carne Moída", amount: 1, unit: "150g", unitCalories: 250 },
        { id: "2", foodId: "wheat", name: "Tortilla Integral", amount: 1, unit: "unid", unitCalories: 120 }
      ], 
      cal: 370 
    }
  ]
};

// --- COMPONENTE PRINCIPAL ---
export function WeeklyPlanner({ initialData }: { initialData: MealPlanSlot[] }) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  const handleClearDay = async () => {
    await clearDayPlan(activeDayIndex);
    toast.success("Dia limpo com sucesso!");
  };

  const activeDayPlan = initialData.filter(p => p.dayOfWeek === activeDayIndex);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <CalendarRange className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Planejador Semanal
              </h2>
              <p className="text-sm text-muted-foreground">Planeje suas refeições de forma inteligente</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Limpar Dia
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <div className="flex items-center gap-2 text-destructive">
                  <Trash2 className="h-5 w-5" />
                  <AlertDialogTitle>Limpar {DAYS[activeDayIndex]}?</AlertDialogTitle>
                </div>
                <AlertDialogDescription className="pt-2">
                  Todas as refeições planejadas para {DAYS[activeDayIndex].toLowerCase()} serão permanentemente removidas.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleClearDay} 
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                >
                  Confirmar Limpeza
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button 
            onClick={handlePrint} 
            variant="secondary"
            className="gap-2"
          >
            <Printer className="h-4 w-4" /> 
            <span>Imprimir Cardápio</span>
          </Button>
        </div>
      </div>

      <div className="print:hidden">
        <MacroEducation />
      </div>

      {/* NAVEGAÇÃO POR DIAS */}
      <div className="print:hidden">
        <Tabs 
          defaultValue="0" 
          value={String(activeDayIndex)} 
          onValueChange={(v) => setActiveDayIndex(Number(v))}
        >
          <TabsList className="w-full inline-flex h-auto p-1 bg-gradient-to-r from-background via-muted/30 to-background border rounded-xl">
            {DAYS.map((day, idx) => {
              const dayPlan = initialData.filter(p => p.dayOfWeek === idx);
              const hasContent = dayPlan.length > 0;
              
              return (
                <TabsTrigger
                  key={idx}
                  value={String(idx)}
                  className={cn(
                    "relative flex-1 min-w-[100px] h-12 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5",
                    "data-[state=active]:border data-[state=active]:border-primary/20 data-[state=active]:shadow-sm",
                    "transition-all duration-200"
                  )}
                >
                  <span className="font-medium">{day}</span>
                  {hasContent && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* RESUMO DO DIA ATIVO */}
      {!isPrinting && (
        <div className="print:hidden">
          <Card className="border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <CalendarRange className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{DAYS[activeDayIndex]}</p>
                    <p className="text-sm text-muted-foreground">
                      {activeDayPlan.length} refeição{activeDayPlan.length !== 1 ? 'es' : ''} planejada{activeDayPlan.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">
                    {activeDayPlan.reduce((acc, meal) => acc + (meal.calories || 0), 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">kcal totais</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* GRID DE REFEIÇÕES */}
      <div className="print:block">
        <div className="hidden print:block mb-6 text-center border-b pb-4">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Meu Cardápio Semanal
          </h1>
          <p className="text-gray-500">Planejamento Nutricional Personalizado</p>
        </div>

        <div className="grid grid-cols-1 print:grid-cols-2 gap-6">
          {DAYS.map((day, idx) => {
            if (idx !== activeDayIndex && !isPrinting) return null;
            const dayPlan = initialData.filter(p => p.dayOfWeek === idx);

            return (
              <Card 
                key={day} 
                className={cn(
                  "border-border/60 shadow-sm print:break-inside-avoid print:shadow-none print:border-gray-300",
                  "transition-all duration-300 hover:shadow-md",
                  idx === activeDayIndex && !isPrinting && "ring-1 ring-primary/10"
                )}
              >
                <CardHeader className="pb-2 border-b border-border/50">
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-md bg-primary/10">
                        <CalendarRange className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-lg font-bold text-foreground">{day}</span>
                    </div>
                    <span className="text-sm font-medium text-primary bg-primary/10 px-2 py-1 rounded-md">
                      {dayPlan.reduce((acc, meal) => acc + (meal.calories || 0), 0)} kcal
                    </span>
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="p-4 space-y-4">
                  {MEAL_TYPES.map((type) => {
                    const Icon = type.icon;
                    const slot = dayPlan.find(p => p.mealType === type.id);
                    
                    return (
                      <div 
                        key={type.id} 
                        className="relative group"
                      >
                        <div className="flex items-start justify-between p-3 rounded-lg border border-border/50 hover:border-primary/30 transition-colors bg-gradient-to-r from-background to-muted/5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className={cn("p-1.5 rounded-md", type.color, "bg-opacity-10")}>
                                <Icon className="h-3.5 w-3.5" />
                              </div>
                              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                {type.label}
                              </span>
                            </div>
                            
                            {slot ? (
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <p className="font-semibold text-sm text-foreground pr-2">{slot.title}</p>
                                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap">
                                    {slot.calories} kcal
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {slot.items.split(',').map((item, i) => (
                                    <span 
                                      key={i} 
                                      className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/30"
                                    >
                                      {item.trim()}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div className="h-8 flex items-center">
                                <p className="text-sm text-muted-foreground/60 italic">Nenhuma refeição planejada</p>
                              </div>
                            )}
                          </div>
                          
                          {!isPrinting && (
                            <MealSlotDialog 
                              dayIdx={idx} 
                              type={type.id} 
                              label={type.label} 
                              existingSlot={slot} 
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// --- DIALOG WRAPPER ---
interface MealSlotDialogProps {
  dayIdx: number;
  type: string;
  label: string;
  existingSlot?: MealPlanSlot;
}

function MealSlotDialog(props: MealSlotDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const Icon = MEAL_TYPES.find(t => t.id === props.type)?.icon || ChefHat;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant={props.existingSlot ? "outline" : "default"}
          size="sm"
          className={cn(
            "h-7 w-7 transition-all duration-200",
            props.existingSlot 
              ? "border-primary/20 hover:border-primary/40 hover:bg-primary/10" 
              : "bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
          )}
        >
          {props.existingSlot ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
            </svg>
          ) : (
            <Plus className="h-3.5 w-3.5" />
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[600px] bg-card max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Planejar {props.label}</DialogTitle>
              <p className="text-sm text-muted-foreground">Adicione alimentos e monte sua refeição</p>
            </div>
          </div>
        </DialogHeader>

        {isOpen && (
          <MealSlotForm 
            {...props} 
            onClose={() => setIsOpen(false)} 
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// --- FORMULÁRIO DE EDIÇÃO ---
interface MealSlotFormProps extends MealSlotDialogProps {
  onClose: () => void;
}

function MealSlotForm({ dayIdx, type, existingSlot, onClose }: MealSlotFormProps) {
  const [title, setTitle] = useState(existingSlot?.title || "");
  const [goal, setGoal] = useState<GoalType>("LOSE_WEIGHT");
  const [searchOpen, setSearchOpen] = useState(false);

  const [ingredients, setIngredients] = useState<IngredientRow[]>(() => {
    if (existingSlot?.items) {
      return existingSlot.items.split(',').map((item, idx) => {
        const parts = item.trim().split(' ');
        const quantityStr = parts[0]?.replace('x', '') || "1";
        const amount = parseFloat(quantityStr) || 1;
        const name = parts.slice(1).join(' ') || item.trim();
        
        const dbFood = FOOD_DATABASE.find(f => f.name.toLowerCase() === name.toLowerCase());
        
        return { 
          id: idx.toString(), 
          foodId: dbFood?.id || "custom", 
          name: name, 
          amount: amount,
          unit: dbFood?.unit || "porção",
          unitCalories: dbFood?.calories || 0 
        };
      });
    }
    return [];
  });

  const totalCalories = useMemo(() => {
    return ingredients.reduce((acc, item) => {
      return acc + Math.round(item.amount * item.unitCalories);
    }, 0);
  }, [ingredients]);

  const addIngredient = (foodId: string) => {
    const food = FOOD_DATABASE.find(f => f.id === foodId);
    if (!food) return;

    setIngredients(prev => [
      ...prev, 
      { 
        id: Math.random().toString(), 
        foodId: food.id, 
        name: food.name, 
        amount: 1, 
        unit: food.unit,
        unitCalories: food.calories 
      }
    ]);
    
    if (!title) setTitle(food.name);
    setSearchOpen(false);
  };

  const updateAmount = (id: string, newAmount: number) => {
    setIngredients(prev => prev.map(item => 
      item.id === id ? { ...item, amount: newAmount } : item
    ));
  };

  const removeIngredient = (id: string) => {
    setIngredients(prev => prev.filter(item => item.id !== id));
  };

  const applySuggestion = (suggestion: Suggestion) => {
    setTitle(suggestion.title);
    const mappedIngredients = suggestion.ingredients.map(ing => ({
      ...ing,
      id: Math.random().toString()
    }));
    setIngredients(mappedIngredients);
    toast.success("Sugestão aplicada com sucesso!");
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Defina um nome para o prato.");
      return;
    }

    const itemsString = ingredients
      .map(ing => `${ing.amount}x ${ing.name}`)
      .join(', ');

    const formData = new FormData();
    formData.append("dayOfWeek", dayIdx.toString());
    formData.append("mealType", type);
    formData.append("title", title);
    formData.append("items", itemsString);
    formData.append("calories", totalCalories.toString());

    try {
      await saveMealPlanSlot(formData);
      toast.success("Planejamento salvo com sucesso!");
      onClose();
    } catch (error) {
      toast.error("Erro ao salvar planejamento.");
    }
  };

  return (
    <div className="space-y-6 py-2">
      {/* CABEÇALHO DO PRATO */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-semibold flex items-center gap-2">
            <span className="text-foreground">Nome da Refeição</span>
            <span className="text-destructive">*</span>
          </Label>
          <Input 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Ex: Almoço Fit Segunda-feira" 
            className="h-12 text-base font-medium bg-background border-primary/20 focus:border-primary"
            autoFocus
          />
        </div>
      </div>

      {/* RESUMO DE CALORIAS */}
      <div className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 rounded-xl border border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Total de Calorias</p>
              <p className="text-xs text-muted-foreground">Calculado automaticamente</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {totalCalories}
            </p>
            <p className="text-xs font-medium text-muted-foreground">kcal</p>
          </div>
        </div>
      </div>

      <Separator className="bg-border/50" />

      {/* BUSCA DE ALIMENTOS */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Adicionar Alimentos
        </Label>
        
        <Popover open={searchOpen} onOpenChange={setSearchOpen} modal={true}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={searchOpen}
              className="w-full justify-between h-12 text-base font-normal border-primary/20 hover:border-primary/40"
            >
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <span>Busque por alimentos (ex: Arroz, Frango, Salada)...</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
            <Command className="border border-border">
              <CommandInput 
                placeholder="Digite o nome do alimento..." 
                className="h-12 border-b"
              />
              <CommandList className="max-h-[300px]">
                <CommandEmpty className="py-6 text-center text-muted-foreground">
                  Nenhum alimento encontrado.
                </CommandEmpty>
                <CommandGroup heading="Banco de Alimentos">
                  {FOOD_DATABASE.map((food) => (
                    <CommandItem
                      key={food.id}
                      value={food.name}
                      onSelect={() => addIngredient(food.id)}
                      className="cursor-pointer py-3 px-4 hover:bg-muted/50"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{food.emoji}</span>
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{food.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {food.calories} kcal / {food.unit}
                            </span>
                          </div>
                        </div>
                        <Check
                          className={cn(
                            "h-4 w-4",
                            ingredients.some(i => i.foodId === food.id) 
                              ? "opacity-100 text-primary" 
                              : "opacity-0"
                          )}
                        />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* LISTA DE INGREDIENTES */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Ingredientes Adicionados</Label>
          <span className="text-xs text-muted-foreground">
            {ingredients.length} item{ingredients.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {ingredients.length > 0 ? (
          <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
            {ingredients.map((ing) => (
              <div 
                key={ing.id} 
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-gradient-to-r from-background to-muted/5 hover:border-primary/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{ing.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ing.unitCalories} kcal / {ing.unit}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 rounded-md hover:bg-muted"
                      onClick={() => updateAmount(ing.id, Math.max(0.1, ing.amount - 0.1))}
                    >
                      <span className="sr-only">Diminuir</span>
                      -
                    </Button>
                    <input 
                      type="number" 
                      min="0.1" 
                      step="0.1"
                      className="w-12 text-center bg-transparent text-sm font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      value={ing.amount}
                      onChange={(e) => updateAmount(ing.id, parseFloat(e.target.value) || 0)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 rounded-md hover:bg-muted"
                      onClick={() => updateAmount(ing.id, ing.amount + 0.1)}
                    >
                      <span className="sr-only">Aumentar</span>
                      +
                    </Button>
                  </div>
                  
                  <div className="text-right min-w-[80px]">
                    <p className="text-sm font-bold text-primary">
                      {Math.round(ing.amount * ing.unitCalories)} kcal
                    </p>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive rounded-md"
                    onClick={() => removeIngredient(ing.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-border/50 rounded-xl bg-gradient-to-b from-muted/5 to-transparent">
            <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum ingrediente adicionado</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Use a busca acima para adicionar alimentos ao seu prato
            </p>
          </div>
        )}
      </div>

      {/* SUGESTÕES RÁPIDAS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-gradient-to-br from-primary/10 to-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <Label className="text-sm font-semibold">Sugestões Inteligentes</Label>
          </div>
          
          <Select value={goal} onValueChange={(val) => setGoal(val as GoalType)}>
            <SelectTrigger className="w-[160px] h-9 border-primary/20">
              <SelectValue placeholder="Selecione uma meta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOSE_WEIGHT" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <span>🔥</span>
                  <span>Perder Peso</span>
                </div>
              </SelectItem>
              <SelectItem value="GAIN_MUSCLE" className="cursor-pointer">
                <div className="flex items-center gap-2">
                  <span>💪</span>
                  <span>Ganhar Massa</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SMART_SUGGESTIONS[goal].map((sug, i) => (
            <div 
              key={i} 
              onClick={() => applySuggestion(sug)}
              className="group cursor-pointer"
            >
              <div className="p-3 rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/5 hover:border-primary/50 hover:shadow-md transition-all duration-200 group-hover:scale-[1.02]">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                    {sug.title}
                  </h4>
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full">
                    {sug.cal} kcal
                  </span>
                </div>
                <div className="space-y-1">
                  {sug.ingredients.map((ing, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{ing.name}</span>
                      <span className="font-medium">
                        {ing.amount} {ing.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AÇÕES */}
      <div className="flex gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onClose}
          className="flex-1 h-11 border-border/50 hover:border-primary/30"
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSubmit} 
          className="flex-1 h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-primary/25 transition-all duration-200"
        >
          Salvar Refeição
        </Button>
      </div>
    </div>
  );
}