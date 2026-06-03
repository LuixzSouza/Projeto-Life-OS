import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { AI_PROVIDERS, type SetupFormData } from "../wizard-types";

interface StepIntelligenceProps {
  formData: SetupFormData;
  setFormData: React.Dispatch<React.SetStateAction<SetupFormData>>;
}

export function StepIntelligence({ formData, setFormData }: StepIntelligenceProps) {
  return (
    <div className="space-y-3 animate-in slide-in-from-right-8 fade-in duration-300">
      <p className="text-xs text-muted-foreground">
        Escolha o motor que vai conversar com você e organizar seus dados. Você pode
        trocar e configurar chaves de API depois, em Configurações.
      </p>

      {AI_PROVIDERS.map((p) => {
        const selected = formData.aiProvider === p.id;
        return (
          <button
            type="button"
            key={p.id}
            onClick={() => setFormData({ ...formData, aiProvider: p.id })}
            className={cn(
              "w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all",
              selected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:bg-muted/50 hover:border-primary/30"
            )}
          >
            <div className={cn("p-3 rounded-lg shrink-0", selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
              <p.icon className="h-6 w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-bold text-base text-foreground">{p.name}</p>
                <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-bold", p.badgeClass)}>
                  {p.badge}
                </span>
                <span className="text-xs text-muted-foreground">· {p.tagline}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{p.description}</p>
              <p className="text-[11px] text-muted-foreground/80 mt-1.5 italic">{p.needs}</p>
            </div>
            {selected && <Check className="h-5 w-5 text-primary shrink-0 mt-1" />}
          </button>
        );
      })}
    </div>
  );
}
