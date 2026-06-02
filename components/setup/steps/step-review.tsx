import { Card } from "@/components/ui/card";
import type { SetupFormData } from "../wizard-types";

interface StepReviewProps {
  formData: SetupFormData;
}

export function StepReview({ formData }: StepReviewProps) {
  return (
    <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
      <Card className="p-6 bg-muted/20 border-border border-dashed">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border border-primary/20">
            {formData.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-bold text-lg">{formData.name}</h3>
            <p className="text-sm text-muted-foreground">{formData.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-background p-3 rounded border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Banco de Dados</span>
            {formData.storageMode === "cloud" ? (
              <code className="text-primary font-mono break-all">{formData.tursoUrl || "Turso (nuvem)"}</code>
            ) : (
              <code className="text-primary font-mono">{formData.storagePath}\life_os.db</code>
            )}
          </div>
          <div className="bg-background p-3 rounded border border-border">
            <span className="text-xs text-muted-foreground block mb-1">IA Provider</span>
            <span className="font-medium capitalize">{formData.aiProvider}</span>
          </div>
          <div className="bg-background p-3 rounded border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Moeda & Tema</span>
            <span className="font-medium">{formData.currency} • {formData.theme}</span>
          </div>
          <div className="bg-background p-3 rounded border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Horário</span>
            <span className="font-medium">{formData.workStart} - {formData.workEnd}</span>
          </div>
        </div>
      </Card>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Ao clicar abaixo, o sistema será configurado e iniciado.
        </p>
      </div>
    </div>
  );
}
