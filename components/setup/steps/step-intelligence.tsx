import { cn } from "@/lib/utils";
import { Check, Cloud, HardDrive } from "lucide-react";
import type { SetupFormData } from "../wizard-types";

interface StepIntelligenceProps {
  formData: SetupFormData;
  setFormData: React.Dispatch<React.SetStateAction<SetupFormData>>;
}

export function StepIntelligence({ formData, setFormData }: StepIntelligenceProps) {
  return (
    <div className="space-y-4 animate-in slide-in-from-right-8 fade-in duration-300">
      <div
        onClick={() => setFormData({ ...formData, aiProvider: 'ollama' })}
        className={cn(
          "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
          formData.aiProvider === 'ollama' ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-muted/50"
        )}
      >
        <div className={cn("p-3 rounded-lg", formData.aiProvider === 'ollama' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          <HardDrive className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-base text-foreground">Local (Ollama)</p>
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">OFFLINE</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Privacidade total. Requer software Ollama instalado.</p>
        </div>
        {formData.aiProvider === 'ollama' && <Check className="h-5 w-5 text-primary" />}
      </div>

      <div
        onClick={() => setFormData({ ...formData, aiProvider: 'openai' })}
        className={cn(
          "flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
          formData.aiProvider === 'openai' ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card hover:bg-muted/50"
        )}
      >
        <div className={cn("p-3 rounded-lg", formData.aiProvider === 'openai' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
          <Cloud className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className="font-bold text-base text-foreground">Nuvem (OpenAI)</p>
          <p className="text-sm text-muted-foreground mt-1">Mais inteligente. Requer chave de API e internet.</p>
        </div>
        {formData.aiProvider === 'openai' && <Check className="h-5 w-5 text-primary" />}
      </div>
    </div>
  );
}
