import { Database } from "lucide-react";
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
      ? (formData.storagePath.toLowerCase().endsWith(".db")
          ? formData.storagePath
          : `${formData.storagePath}\\life_os.db`)
      : formData.dbProvider === "replica"
        ? `Híbrido • ${formData.storagePath}\\life_os.db ⇄ ${formData.tursoUrl || "Turso"}`
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
      {/* Nota de instância: este é o banco DESTA instalação (Modelo A). */}
      <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-3">
        <Database className="h-4 w-4 text-primary shrink-0 mt-0.5" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Este é o banco <span className="font-semibold text-foreground">desta instância</span>.
          Todo mundo que usar esta instalação compartilha este mesmo banco (com os dados
          isolados por usuário). Para que cada pessoa tenha o seu próprio banco, cada uma
          deve rodar a sua própria instância e apontar o Turso dela aqui no setup.
        </p>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Ao clicar abaixo, o sistema será configurado e iniciado.
        </p>
      </div>
    </div>
  );
}
