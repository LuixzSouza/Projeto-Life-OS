import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { SMART_SUGGESTIONS } from "../weekly-planner-constants";
import type { GoalType, Suggestion } from "../weekly-planner-types";

interface SmartSuggestionsProps {
  goal: GoalType;
  setGoal: (goal: GoalType) => void;
  onApply: (suggestion: Suggestion) => void;
}

export function SmartSuggestions({ goal, setGoal, onApply }: SmartSuggestionsProps) {
  return (
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
            onClick={() => onApply(sug)}
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
  );
}
