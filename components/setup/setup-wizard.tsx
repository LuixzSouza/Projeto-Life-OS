"use client";

import { useState } from "react";
import { setupSystem } from "@/app/actions/setup";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { validatePasswordStrength } from "@/lib/password-policy";

import { STEPS, type SetupFormData } from "./wizard-types";
import { WizardSidebar } from "./wizard-sidebar";
import { StepProfile } from "./steps/step-profile";
import { StepSystem } from "./steps/step-system";
import { StepIntelligence } from "./steps/step-intelligence";
import { StepReview } from "./steps/step-review";

export function SetupWizard() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Estado central do formulário
  const [formData, setFormData] = useState<SetupFormData>({
    name: "",
    email: "",
    password: "",
    bio: "",
    currency: "BRL",
    workStart: "09:00",
    workEnd: "18:00",
    aiProvider: "ollama",
    theme: "system",
    storageMode: "local",
    storagePath: "C:\\LifeOS_Data", // Padrão Windows (escapado para JS)
    tursoUrl: "",
    tursoToken: "",
  });

  const nextStep = () => {
    // Validação do Passo 1
    if (step === 1) {
      if (!formData.name || !formData.email || !formData.password) {
        toast.error("Por favor, preencha Nome, Email e Senha.");
        return;
      }
      const check = validatePasswordStrength(formData.password);
      if (!check.valid) {
        toast.error(check.message!);
        return;
      }
    }
    // Validação do Passo 2
    if (step === 2) {
      if (formData.storageMode === "cloud") {
        if (!formData.tursoUrl.trim()) {
          toast.error("Informe a URL do banco na nuvem (Turso).");
          return;
        }
        if (!/^(libsql|https?):\/\//.test(formData.tursoUrl.trim())) {
          toast.error("URL inválida. Use libsql://... ou https://...");
          return;
        }
      } else if (!formData.storagePath) {
        toast.error("O caminho do banco de dados é obrigatório.");
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));
  const goToStep = (s: number) => { if (s < step) setStep(s); };

  // Cálculo de progresso visual
  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full max-w-5xl bg-background rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col md:flex-row min-h-[600px] animate-in fade-in zoom-in-95 duration-500">

      <WizardSidebar step={step} goToStep={goToStep} progress={progress} />

      {/* --- CONTEÚDO DO FORMULÁRIO (Direita) --- */}
      <div className="flex-1 p-6 md:p-10 flex flex-col bg-card">
        <form
          action={setupSystem}
          onSubmit={() => setIsLoading(true)}
          className="flex-1 flex flex-col justify-between h-full"
        >
          {/* INPUTS OCULTOS: passam o state React para o FormData da Server Action */}
          <input type="hidden" name="name" value={formData.name} />
          <input type="hidden" name="email" value={formData.email} />
          <input type="hidden" name="password" value={formData.password} />
          <input type="hidden" name="bio" value={formData.bio} />
          <input type="hidden" name="currency" value={formData.currency} />
          <input type="hidden" name="workStart" value={formData.workStart} />
          <input type="hidden" name="workEnd" value={formData.workEnd} />
          <input type="hidden" name="aiProvider" value={formData.aiProvider} />
          <input type="hidden" name="theme" value={formData.theme} />
          <input type="hidden" name="storageMode" value={formData.storageMode} />
          <input type="hidden" name="storagePath" value={formData.storagePath} />
          <input type="hidden" name="tursoUrl" value={formData.tursoUrl} />
          <input type="hidden" name="tursoToken" value={formData.tursoToken} />

          <div className="space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {step === 1 && "Olá! Crie seu Perfil Admin."}
                {step === 2 && "Localização dos Dados"}
                {step === 3 && "Cérebro Digital (IA)"}
                {step === 4 && "Revisão Final"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {step === 1 && "Configure sua credencial mestre de acesso."}
                {step === 2 && "Defina onde o banco de dados (SQLite) será salvo."}
                {step === 3 && "Escolha o motor de inteligência do sistema."}
                {step === 4 && "Tudo pronto. Vamos inicializar o Life OS."}
              </p>
            </div>

            <div className="min-h-[300px] pt-2">
              {step === 1 && (
                <StepProfile
                  formData={formData}
                  setFormData={setFormData}
                  showPassword={showPassword}
                  setShowPassword={setShowPassword}
                />
              )}
              {step === 2 && <StepSystem formData={formData} setFormData={setFormData} />}
              {step === 3 && <StepIntelligence formData={formData} setFormData={setFormData} />}
              {step === 4 && <StepReview formData={formData} />}
            </div>
          </div>

          {/* BOTÕES DE NAVEGAÇÃO */}
          <div className="flex justify-between pt-6 border-t border-border mt-auto">
            <Button
              type="button"
              variant="ghost"
              onClick={prevStep}
              disabled={step === 1 || isLoading}
            >
              Voltar
            </Button>

            {step < 4 ? (
              <Button type="button" onClick={nextStep}>
                Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[160px] shadow-lg"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
                {isLoading ? "Instalando..." : "Instalar Sistema"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
