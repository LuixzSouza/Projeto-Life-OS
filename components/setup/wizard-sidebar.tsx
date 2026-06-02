import { cn } from "@/lib/utils";
import { Check, Terminal } from "lucide-react";
import { STEPS } from "./wizard-types";

interface WizardSidebarProps {
  step: number;
  goToStep: (s: number) => void;
  progress: number;
}

export function WizardSidebar({ step, goToStep, progress }: WizardSidebarProps) {
  return (
    <div className="w-full md:w-72 bg-muted/30 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-border">
      <div>
        <div className="flex items-center gap-3 mb-10 text-primary">
          <div className="p-2 bg-primary/10 rounded-xl">
            <Terminal className="h-6 w-6" />
          </div>
          <span className="font-bold tracking-tight text-xl text-foreground">Life OS</span>
        </div>

        <nav className="space-y-2">
          {STEPS.map((s) => (
            <div
              key={s.id}
              onClick={() => goToStep(s.id)}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all select-none",
                step === s.id
                  ? "bg-background text-primary shadow-sm ring-1 ring-border cursor-default"
                  : step > s.id
                    ? "text-muted-foreground hover:text-foreground cursor-pointer hover:bg-muted/50"
                    : "text-muted-foreground/50 cursor-not-allowed"
              )}
            >
              <s.icon className={cn("h-4 w-4 transition-colors", step === s.id ? "text-primary" : step > s.id ? "text-primary/70" : "text-muted-foreground/50")} />
              {s.label}
              {step > s.id && <Check className="ml-auto h-3 w-3 text-primary" />}
            </div>
          ))}
        </nav>
      </div>

      <div className="hidden md:block">
        <div className="flex justify-between text-xs text-muted-foreground mb-2 font-medium">
          <span>Progresso</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  );
}
