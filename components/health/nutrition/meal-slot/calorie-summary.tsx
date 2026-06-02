import { Calculator } from "lucide-react";

interface CalorieSummaryProps {
  totalCalories: number;
}

export function CalorieSummary({ totalCalories }: CalorieSummaryProps) {
  return (
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
  );
}
