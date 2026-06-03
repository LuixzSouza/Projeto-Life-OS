import { Card } from "@/components/ui/card";
import { DB_PROVIDERS, AI_PROVIDERS, type SetupFormData } from "../wizard-types";

interface StepReviewProps {
  formData: SetupFormData;
  dbFromEnv?: boolean;
}

export function StepReview({ formData, dbFromEnv }: StepReviewProps) {
  const db = DB_PROVIDERS.find((p) => p.id === formData.dbProvider);
  const ai = AI_PROVIDERS.find((p) => p.id === formData.aiProvider);

  const dbLabel = dbFromEnv
    ? "Turso (nuvem) — via ambiente"
    : formData.dbProvider === "local"
      ? `${formData.storagePath}\\life_os.db`
      : formData.tursoUrl || db?.name || "Turso";

  return (
    <div className="space-y-6 animate-in slide-in-from-right-8 fade-in duration-300">
      <Card className="p-6 bg-muted/20 border-border border-dashed">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl border border-primary/20">
            {formData.name.substring(0, 2).toUpperCase() || "??"}
          </div>
          <div>
            <h3 className="font-bold text-lg">{formData.name || "Sem nome"}</h3>
            <p className="text-sm text-muted-foreground">{formData.email}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="bg-background p-3 rounded border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Banco de Dados</span>
            <code className="text-primary font-mono break-all text-xs">{dbLabel}</code>
          </div>
          <div className="bg-background p-3 rounded border border-border">
            <span className="text-xs text-muted-foreground block mb-1">Inteligência (IA)</span>
            <span className="font-medium">{ai?.name ?? formData.aiProvider}</span>
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
