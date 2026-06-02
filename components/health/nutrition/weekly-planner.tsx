"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Trash2, CalendarRange, CalendarDays, LayoutGrid, Copy,
  Flame, Target, UtensilsCrossed, CheckCircle2, Sparkles, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { clearDayPlan, copyDayPlan } from "@/app/(dashboard)/health/actions";
import { MacroEducation } from "./macro-education";
import { ShoppingListDialog } from "./shopping-list-dialog";
import { PrintMealPlanButton } from "./print-meal-plan-button";
import { cn } from "@/lib/utils";

import { DAYS, MEAL_TYPES } from "./weekly-planner-constants";
import { MealSlotDialog } from "./meal-slot-dialog";

// Re-exporta o tipo público para manter imports existentes estáveis.
export type { MealPlanSlot } from "./weekly-planner-types";
import type { MealPlanSlot } from "./weekly-planner-types";

const GOAL_STORAGE_KEY = "lifeos:nutrition:dailyGoal";
const DEFAULT_GOAL = 2000;

// --- Store do override manual da meta (localStorage, privacy-first) ---
// null = usar a meta sugerida automaticamente pelo perfil corporal.
// useSyncExternalStore evita mismatch de hidratação sem setState em efeito.
let goalListeners: Array<() => void> = [];

function readOverride(): number | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(GOAL_STORAGE_KEY);
  if (stored === null || stored === "") return null;
  const n = Number(stored);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function notifyGoal() {
  goalListeners.forEach((l) => l());
}

function subscribeGoal(cb: () => void) {
  goalListeners.push(cb);
  return () => { goalListeners = goalListeners.filter((l) => l !== cb); };
}

function useGoalOverride() {
  const override = useSyncExternalStore(subscribeGoal, readOverride, () => null);

  const setOverride = (value: number) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(GOAL_STORAGE_KEY, String(Math.max(0, Math.round(value || 0))));
    notifyGoal();
  };

  const clearOverride = () => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(GOAL_STORAGE_KEY);
    notifyGoal();
  };

  return { override, setOverride, clearOverride };
}

// --- Barra de progresso calórico (refeição vs. meta diária) ---
function GoalBar({ calories, goal, compact = false }: { calories: number; goal: number; compact?: boolean }) {
  const pct = goal > 0 ? Math.min((calories / goal) * 100, 100) : 0;
  const over = goal > 0 && calories > goal;

  return (
    <div className={cn("space-y-1.5", compact && "space-y-1")}>
      {!compact && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            <span className={cn("font-bold", over ? "text-rose-500" : "text-foreground")}>{calories}</span>
            <span className="text-muted-foreground"> / {goal} kcal</span>
          </span>
          <span className={cn("font-semibold", over ? "text-rose-500" : "text-muted-foreground")}>
            {goal > 0 ? `${Math.round((calories / goal) * 100)}%` : "—"}
          </span>
        </div>
      )}
      <div className={cn("w-full rounded-full bg-secondary overflow-hidden", compact ? "h-1.5" : "h-2")}>
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", over ? "bg-rose-500" : "bg-primary")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// --- Slot de refeição (usado no detalhe do dia) ---
function MealSlotRow({ slot, dayIdx, type }: {
  slot?: MealPlanSlot;
  dayIdx: number;
  type: typeof MEAL_TYPES[number];
}) {
  const Icon = type.icon;

  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-xl border border-border/50 hover:border-primary/30 transition-colors bg-gradient-to-r from-background to-muted/5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <div className={cn("p-1.5 rounded-md", type.bg, type.color)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {type.label}
          </span>
        </div>

        {slot ? (
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-sm text-foreground">{slot.title}</p>
              <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-full whitespace-nowrap">
                {slot.calories} kcal
              </span>
            </div>
            {slot.items && (
              <div className="flex flex-wrap gap-1.5">
                {slot.items.split(",").map((item, i) => (
                  <span
                    key={i}
                    className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-md border border-border/30"
                  >
                    {item.trim()}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-8 flex items-center">
            <p className="text-sm text-muted-foreground/60 italic">Nenhuma refeição planejada</p>
          </div>
        )}
      </div>

      <MealSlotDialog dayIdx={dayIdx} type={type.id} label={type.label} existingSlot={slot} />
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
interface WeeklyPlannerProps {
  initialData: MealPlanSlot[];
  /** Meta calórica sugerida automaticamente pelo perfil corporal (TDEE). */
  suggestedGoal?: number | null;
  /** Gasto energético estimado (para exibir no PDF/UI). */
  tdee?: number | null;
  userName?: string;
}

export function WeeklyPlanner({ initialData, suggestedGoal = null, tdee = null, userName }: WeeklyPlannerProps) {
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [view, setView] = useState<"day" | "week">("day");
  const { override, setOverride, clearOverride } = useGoalOverride();

  // Meta efetiva: override manual > sugestão do perfil > padrão.
  const goal = override ?? suggestedGoal ?? DEFAULT_GOAL;
  const isAutoGoal = override === null;
  const hasSuggestion = suggestedGoal != null && suggestedGoal > 0;

  // --- Métricas derivadas ---
  const caloriesByDay = useMemo(
    () => DAYS.map((_, i) => initialData.filter(p => p.dayOfWeek === i).reduce((acc, m) => acc + (m.calories || 0), 0)),
    [initialData]
  );
  const mealsByDay = useMemo(
    () => DAYS.map((_, i) => initialData.filter(p => p.dayOfWeek === i).length),
    [initialData]
  );

  const weekTotal = caloriesByDay.reduce((a, b) => a + b, 0);
  const daysPlanned = mealsByDay.filter(c => c > 0).length;
  const dailyAvg = daysPlanned ? Math.round(weekTotal / daysPlanned) : 0;
  const totalMeals = mealsByDay.reduce((a, b) => a + b, 0);

  const activeDayPlan = initialData.filter(p => p.dayOfWeek === activeDayIndex);
  const activeDayCalories = caloriesByDay[activeDayIndex];

  // --- Ações ---
  const handleClearDay = async () => {
    await clearDayPlan(activeDayIndex);
    toast.success(`${DAYS[activeDayIndex]} limpo com sucesso!`);
  };

  const handleCopyDay = async (toDay: number) => {
    if (caloriesByDay[activeDayIndex] === 0 && mealsByDay[activeDayIndex] === 0) {
      toast.error("Este dia não tem refeições para copiar.");
      return;
    }
    await copyDayPlan(activeDayIndex, toDay);
    toast.success(`Cardápio copiado para ${DAYS[toDay]}!`);
  };

  return (
    <div className="space-y-6">
      {/* HEADER + CONTROLES GLOBAIS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
            <CalendarRange className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Planejador Semanal</h2>
            <p className="text-sm text-muted-foreground">Monte um cardápio profissional, equilibrado e do seu jeito.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Meta calórica diária — automática (perfil) e editável */}
          <div className="flex items-center gap-2 h-10 px-3 rounded-lg border border-border/50 bg-muted/20">
            <Target className="h-4 w-4 text-primary shrink-0" />
            <label htmlFor="daily-goal" className="text-xs font-medium text-muted-foreground whitespace-nowrap">Meta/dia</label>
            <Input
              id="daily-goal"
              type="number"
              min={0}
              step={50}
              value={goal}
              onChange={(e) => setOverride(Number(e.target.value))}
              className="h-7 w-20 px-2 text-sm font-bold font-mono border-border/40 bg-background"
            />
            <span className="text-xs text-muted-foreground">kcal</span>
            {hasSuggestion && (
              isAutoGoal ? (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  <Sparkles className="h-2.5 w-2.5" /> Auto
                </span>
              ) : (
                <button
                  type="button"
                  onClick={clearOverride}
                  className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors"
                  title={`Usar sugestão do perfil (${suggestedGoal} kcal)`}
                >
                  <Wand2 className="h-2.5 w-2.5" /> Auto
                </button>
              )
            )}
          </div>

          <ShoppingListDialog plan={initialData} />

          <PrintMealPlanButton
            plan={initialData}
            goal={goal}
            isAutoGoal={isAutoGoal}
            tdee={tdee}
            userName={userName}
          />
        </div>
      </div>

      {hasSuggestion && (
        <p className="text-xs text-muted-foreground -mt-2">
          {isAutoGoal ? (
            <>Meta calculada do seu perfil corporal{tdee ? ` (gasto estimado ${tdee.toLocaleString("pt-BR")} kcal/dia)` : ""}. Você pode ajustá-la quando quiser.</>
          ) : (
            <>Meta personalizada. Sugestão do perfil: <strong>{suggestedGoal!.toLocaleString("pt-BR")} kcal/dia</strong>.</>
          )}
        </p>
      )}

      {/* RESUMO SEMANAL */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Flame} label="Total da semana" value={`${weekTotal.toLocaleString("pt-BR")}`} unit="kcal" tone="primary" />
        <StatCard icon={Target} label="Média por dia" value={`${dailyAvg.toLocaleString("pt-BR")}`} unit="kcal" tone="emerald" />
        <StatCard icon={CalendarDays} label="Dias planejados" value={`${daysPlanned}`} unit="/ 7" tone="blue" />
        <StatCard icon={UtensilsCrossed} label="Refeições" value={`${totalMeals}`} unit="no total" tone="amber" />
      </div>

      <MacroEducation />

      {/* ALTERNADOR DE VISÃO */}
      <div className="flex items-center justify-center">
        <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-border/50 bg-muted/30">
          <button
            onClick={() => setView("day")}
            className={cn(
              "flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium transition-all",
              view === "day" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <CalendarDays className="h-4 w-4" /> Por Dia
          </button>
          <button
            onClick={() => setView("week")}
            className={cn(
              "flex items-center gap-1.5 h-9 px-4 rounded-lg text-sm font-medium transition-all",
              view === "week" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" /> Semana Inteira
          </button>
        </div>
      </div>

      {/* ---------- VISÃO POR DIA ---------- */}
      {view === "day" && (
        <div className="space-y-5">
          {/* Navegação por dias */}
          <Tabs value={String(activeDayIndex)} onValueChange={(v) => setActiveDayIndex(Number(v))}>
            <TabsList className="w-full inline-flex h-auto p-1 bg-gradient-to-r from-background via-muted/30 to-background border rounded-xl overflow-x-auto scrollbar-hide">
              {DAYS.map((day, idx) => (
                <TabsTrigger
                  key={idx}
                  value={String(idx)}
                  className={cn(
                    "relative flex-1 min-w-[88px] h-12 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/10 data-[state=active]:to-primary/5",
                    "data-[state=active]:border data-[state=active]:border-primary/20 data-[state=active]:shadow-sm transition-all duration-200"
                  )}
                >
                  <span className="font-medium">{day}</span>
                  {mealsByDay[idx] > 0 && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {/* Cabeçalho do dia ativo: progresso + ações específicas */}
          <Card className="border-primary/10 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                    <CalendarRange className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{DAYS[activeDayIndex]}</p>
                    <p className="text-sm text-muted-foreground">
                      {activeDayPlan.length} refeição{activeDayPlan.length !== 1 ? "es" : ""} planejada{activeDayPlan.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Copiar dia para... */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Copy className="h-4 w-4" />
                        <span className="hidden sm:inline">Copiar para</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Copiar {DAYS[activeDayIndex]} para</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {DAYS.map((day, idx) =>
                        idx === activeDayIndex ? null : (
                          <DropdownMenuItem key={idx} onClick={() => handleCopyDay(idx)} className="cursor-pointer">
                            {day}
                            {mealsByDay[idx] > 0 && (
                              <span className="ml-auto text-[10px] text-muted-foreground">substituir</span>
                            )}
                          </DropdownMenuItem>
                        )
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Limpar dia */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <div className="flex items-center gap-2 text-destructive">
                          <Trash2 className="h-5 w-5" />
                          <AlertDialogTitle>Limpar {DAYS[activeDayIndex]}?</AlertDialogTitle>
                        </div>
                        <AlertDialogDescription className="pt-2">
                          Todas as refeições planejadas para {DAYS[activeDayIndex].toLowerCase()} serão removidas permanentemente.
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
                </div>
              </div>

              <GoalBar calories={activeDayCalories} goal={goal} />
            </CardContent>
          </Card>

          {/* Slots do dia */}
          <Card className="border-border/60 shadow-sm">
            <CardContent className="p-4 space-y-3">
              {MEAL_TYPES.map((type) => {
                const slot = activeDayPlan.find(p => p.mealType === type.id);
                return <MealSlotRow key={type.id} slot={slot} dayIdx={activeDayIndex} type={type} />;
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ---------- VISÃO SEMANA INTEIRA ---------- */}
      {view === "week" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {DAYS.map((day, idx) => {
            const dayPlan = initialData.filter(p => p.dayOfWeek === idx);
            const cals = caloriesByDay[idx];

            return (
              <Card
                key={day}
                className={cn(
                  "border-border/60 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer",
                  cals > goal && goal > 0 && "border-rose-500/30"
                )}
                onClick={() => { setActiveDayIndex(idx); setView("day"); }}
              >
                <CardHeader className="pb-3 border-b border-border/50">
                  <CardTitle className="flex items-center justify-between">
                    <span className="text-base font-bold text-foreground">{day}</span>
                    <span className={cn(
                      "text-xs font-bold px-2 py-1 rounded-md",
                      cals > goal && goal > 0 ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
                    )}>
                      {cals} kcal
                    </span>
                  </CardTitle>
                  <div className="pt-2">
                    <GoalBar calories={cals} goal={goal} compact />
                  </div>
                </CardHeader>

                <CardContent className="p-3 space-y-2">
                  {MEAL_TYPES.map((type) => {
                    const slot = dayPlan.find(p => p.mealType === type.id);
                    const Icon = type.icon;
                    return (
                      <div key={type.id} className="flex items-center gap-2.5 text-sm min-h-[28px]">
                        <div className={cn("p-1 rounded-md shrink-0", type.bg, type.color)}>
                          <Icon className="h-3 w-3" />
                        </div>
                        {slot ? (
                          <>
                            <span className="flex-1 truncate font-medium">{slot.title}</span>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          </>
                        ) : (
                          <span className="flex-1 truncate text-muted-foreground/50 italic text-xs">
                            {type.label} — vazio
                          </span>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

    </div>
  );
}

// --- Cartão de estatística ---
function StatCard({
  icon: Icon, label, value, unit, tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  unit: string;
  tone: "primary" | "emerald" | "blue" | "amber";
}) {
  const tones = {
    primary: "text-primary bg-primary/10",
    emerald: "text-emerald-600 bg-emerald-500/10",
    blue: "text-blue-600 bg-blue-500/10",
    amber: "text-amber-600 bg-amber-500/10",
  };

  return (
    <Card className="border-border/40 shadow-sm">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("p-2 rounded-lg shrink-0", tones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-lg font-bold leading-tight">
            {value} <span className="text-xs font-medium text-muted-foreground">{unit}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
