"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { DAYS, MEAL_TYPES } from "./weekly-planner-constants";
import { buildShoppingList } from "./meal-plan-utils";
import type { MealPlanSlot } from "./weekly-planner-types";

interface PrintMealPlanButtonProps {
  plan: MealPlanSlot[];
  goal: number;
  isAutoGoal: boolean;
  tdee?: number | null;
  userName?: string;
}

export function PrintMealPlanButton({ plan, goal, isAutoGoal, tdee, userName }: PrintMealPlanButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Monta os dados do documento a partir do plano atual.
      const days = DAYS.map((name, idx) => {
        const dayPlan = plan.filter(p => p.dayOfWeek === idx);
        const calories = dayPlan.reduce((acc, m) => acc + (m.calories || 0), 0);
        return {
          name,
          calories,
          over: goal > 0 && calories > goal,
          meals: MEAL_TYPES.map(t => {
            const slot = dayPlan.find(p => p.mealType === t.id);
            return {
              label: t.label,
              title: slot?.title ?? null,
              items: slot?.items ?? null,
              calories: slot?.calories ?? null,
            };
          }),
        };
      });

      const weekTotal = days.reduce((acc, d) => acc + d.calories, 0);
      const daysPlanned = DAYS.filter((_, idx) => plan.some(p => p.dayOfWeek === idx)).length;
      const dailyAvg = daysPlanned ? Math.round(weekTotal / daysPlanned) : 0;
      const totalMeals = plan.length;

      const generatedAt = new Date().toLocaleString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      });

      // Lazy-load: a lib de PDF só entra no bundle quando o usuário exporta.
      const [{ pdf: renderPdf }, { MealPlanDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/meal-plan-document"),
      ]);

      const blob = await renderPdf(
        <MealPlanDocument
          userName={userName}
          goal={goal}
          isAutoGoal={isAutoGoal}
          tdee={tdee}
          generatedAt={generatedAt}
          stats={{ weekTotal, dailyAvg, daysPlanned, totalMeals }}
          days={days}
          shopping={buildShoppingList(plan)}
        />
      ).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cardapio-semanal-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);

      toast.success("PDF gerado com sucesso! 📄");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading} variant="secondary" className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
      <span className="hidden sm:inline">{loading ? "Gerando…" : "Exportar PDF"}</span>
    </Button>
  );
}
