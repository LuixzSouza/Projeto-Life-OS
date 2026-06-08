"use client";

import { useState, useEffect, useRef, useActionState } from "react";
import Link from "next/link";
import { setupSystem } from "@/app/actions/setup";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Loader2, RotateCcw, AlertCircle, LogIn } from "lucide-react";
import { toast } from "sonner";
import { validatePasswordStrength } from "@/lib/password-policy";

import { STEPS, type SetupFormData, type DbProviderId } from "./wizard-types";
import { WizardSidebar } from "./wizard-sidebar";
import { StepProfile } from "./steps/step-profile";
import { StepSystem } from "./steps/step-system";
import { StepIntelligence } from "./steps/step-intelligence";
import { StepReview } from "./steps/step-review";

const DRAFT_KEY = "lifeos-setup-draft-v1";

const DEFAULT_FORM: SetupFormData = {
  name: "",
  email: "",
  password: "",
  bio: "",
  currency: "BRL",
  workStart: "09:00",
  workEnd: "18:00",
  aiProvider: "ollama",
  theme: "system",
  dbProvider: "turso",
  storageMode: "cloud",
  storagePath: "C:\\LifeOS_Data",
  tursoUrl: "",
  tursoToken: "",
};

// Campos sensíveis que NÃO são persistidos no localStorage (segredo externo).
const SENSITIVE_KEYS: (keyof SetupFormData)[] = ["tursoToken"];

interface SetupWizardProps {
  /** No deploy serverless (Vercel) o banco já vem das env vars (TURSO_*). */
  dbFromEnv?: boolean;
}

export function SetupWizard({ dbFromEnv = false }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [restored, setRestored] = useState(false);

  // Server Action via useActionState: erros voltam como estado (não 500 opaco).
  const [actionState, formAction, isLoading] = useActionState(setupSystem, null);

  const [formData, setFormData] = useState<SetupFormData>({
    ...DEFAULT_FORM,
    dbProvider: dbFromEnv ? "turso" : DEFAULT_FORM.dbProvider,
  });

  // Evita salvar o rascunho antes de restaurar (não sobrescreve com defaults).
  const hydrated = useRef(false);

  // --- 1. RESTAURA o rascunho salvo (não perde dados ao recarregar a página) ---
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<SetupFormData>;
        // Sincroniza com um store externo (localStorage) só na montagem — ler no
        // initializer do useState causaria mismatch de hidratação no SSR. É o uso
        // legítimo de setState em efeito; a regra abaixo é falso-positivo aqui.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setFormData((prev) => ({ ...prev, ...saved }));
        setRestored(true);
      }
    } catch {
      /* localStorage indisponível — segue com defaults */
    }
    hydrated.current = true;
  }, []);

  // --- 2. PERSISTE o rascunho a cada mudança (exceto campos sensíveis) ---
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      const toSave: Partial<SetupFormData> = { ...formData };
      for (const key of SENSITIVE_KEYS) delete toSave[key];
      localStorage.setItem(DRAFT_KEY, JSON.stringify(toSave));
    } catch {
      /* ignore */
    }
  }, [formData]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };

  // Mostra o erro retornado pela Server Action (toast). O draft é preservado
  // para o usuário corrigir e tentar de novo sem redigitar.
  useEffect(() => {
    if (actionState?.error) {
      toast.error(actionState.error, { duration: 8000 });
    }
  }, [actionState]);

  const resetForm = () => {
    clearDraft();
    setFormData({ ...DEFAULT_FORM, dbProvider: dbFromEnv ? "turso" : DEFAULT_FORM.dbProvider });
    setStep(1);
    setRestored(false);
    toast.success("Formulário reiniciado.");
  };

  const setDbProvider = (id: DbProviderId) =>
    setFormData((f) => ({
      ...f,
      dbProvider: id,
      storageMode: id === "local" ? "local" : id === "replica" ? "replica" : "cloud",
    }));

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
    // Validação do Passo 2 (banco)
    if (step === 2 && !dbFromEnv) {
      if (formData.dbProvider === "local") {
        if (!formData.storagePath) {
          toast.error("O caminho do banco de dados é obrigatório.");
          return;
        }
      } else if (formData.dbProvider === "replica") {
        // Réplica exige pasta local E o Turso espelho (url + validação).
        if (!formData.storagePath) {
          toast.error("Informe a pasta local da réplica.");
          return;
        }
        if (!formData.tursoUrl.trim()) {
          toast.error("Informe a URL do Turso espelho.");
          return;
        }
        if (!/^(libsql|https?):\/\//.test(formData.tursoUrl.trim())) {
          toast.error("URL inválida. Use libsql://... ou https://...");
          return;
        }
      } else if (formData.dbProvider === "turso") {
        if (!formData.tursoUrl.trim()) {
          toast.error("Informe a URL do banco na nuvem (Turso).");
          return;
        }
        if (!/^(libsql|https?):\/\//.test(formData.tursoUrl.trim())) {
          toast.error("URL inválida. Use libsql://... ou https://...");
          return;
        }
      }
    }
    setStep((s) => Math.min(s + 1, 4));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));
  const goToStep = (s: number) => { if (s < step) setStep(s); };

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  // storageMode efetivo que a Server Action consome.
  const effectiveStorageMode =
    formData.dbProvider === "local"
      ? "local"
      : formData.dbProvider === "replica"
        ? "replica"
        : "cloud";

  return (
    <div className="w-full max-w-5xl bg-background rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col md:flex-row min-h-[600px] animate-in fade-in zoom-in-95 duration-500">

      <WizardSidebar step={step} goToStep={goToStep} progress={progress} />

      {/* --- CONTEÚDO DO FORMULÁRIO (Direita) --- */}
      <div className="flex-1 p-6 md:p-10 flex flex-col bg-card">
        <form
          action={formAction}
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
          <input type="hidden" name="storageMode" value={effectiveStorageMode} />
          <input type="hidden" name="storagePath" value={formData.storagePath} />
          <input type="hidden" name="tursoUrl" value={formData.tursoUrl} />
          <input type="hidden" name="tursoToken" value={formData.tursoToken} />

          <div className="space-y-8">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  {step === 1 && "Olá! Crie seu Perfil Admin."}
                  {step === 2 && "Onde seus dados vão morar"}
                  {step === 3 && "Cérebro Digital (IA)"}
                  {step === 4 && "Revisão Final"}
                </h2>
                <p className="text-muted-foreground text-sm">
                  {step === 1 && "Configure sua credencial mestre de acesso."}
                  {step === 2 && "Escolha o banco de dados que vai guardar tudo."}
                  {step === 3 && "Escolha o motor de inteligência do sistema."}
                  {step === 4 && "Tudo pronto. Vamos inicializar o Life OS."}
                </p>
              </div>

              {/* Aviso de rascunho restaurado + reiniciar */}
              {restored && step === 1 && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="shrink-0 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 transition-colors"
                  title="Limpar dados salvos e recomeçar"
                >
                  <RotateCcw className="h-3 w-3" /> Recomeçar
                </button>
              )}
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
              {step === 2 && (
                <StepSystem
                  formData={formData}
                  setFormData={setFormData}
                  setDbProvider={setDbProvider}
                  dbFromEnv={dbFromEnv}
                />
              )}
              {step === 3 && <StepIntelligence formData={formData} setFormData={setFormData} />}
              {step === 4 && <StepReview formData={formData} dbFromEnv={dbFromEnv} />}
            </div>
          </div>

          {/* ERRO DA INSTALAÇÃO (mensagem real, não 500 opaco) */}
          {actionState?.error && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm animate-in fade-in slide-in-from-bottom-2">
              <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-destructive font-medium leading-snug">{actionState.error}</p>
                {actionState.existing && (
                  <Link href="/login">
                    <Button type="button" size="sm" variant="outline" className="gap-2">
                      <LogIn className="h-3.5 w-3.5" /> Ir para o login
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          )}

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
