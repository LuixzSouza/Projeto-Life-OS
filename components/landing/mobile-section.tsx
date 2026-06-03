// components/landing/setup-guide.tsx
"use client";

import { Terminal, GitBranch, Shield, Play, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "../ui/button";
import Link from "next/link";

import { STEPS } from "./setup-guide-steps";
import { STEP_ORDER, type SetupStepKey } from "./setup-guide-types";
import { SetupGuideProgress } from "./setup-guide-progress";

export function SetupGuide() {
  const [currentStep, setCurrentStep] = useState<SetupStepKey>('intro');
  const stepData = STEPS[currentStep];
  const currentStepIndex = STEP_ORDER.indexOf(currentStep);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStep(STEP_ORDER[nextIndex]);
    }
  };

  const goToPrevStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex]);
    }
  };

  const goToStep = (step: SetupStepKey) => {
    setCurrentStep(step);
  };

  return (
    <section id="config" className="py-24 md:py-32 px-4 sm:px-6 bg-card border-t border-border relative overflow-hidden">

      {/* Background: grade tática themeable (clareia/escurece com o tema) */}
      <div className="landing-grid absolute inset-0 opacity-50 pointer-events-none [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />

      {/* Gradientes de fundo */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Header Centralizado */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold uppercase tracking-widest mb-6"
          >
            <Terminal className="h-3 w-3 text-primary dark:text-primary" />
            <span className="text-gradient-brand">
              Setup Local Guiado
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight"
          >
            Configure em <span className="text-gradient-brand">5 minutos</span>
            <br />
            <span className="text-xl md:text-2xl text-muted-foreground font-normal">
              Guia interativo com comandos prontos para copiar
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            Siga este guia passo-a-passo para executar o Life OS localmente.
            Cada comando pode ser copiado com um clique.
          </motion.p>
        </div>

        {/* Container Principal */}
        <div className="relative">

          {/* Indicador de Progresso */}
          <SetupGuideProgress
            currentStep={currentStep}
            currentStepIndex={currentStepIndex}
            progressLabel={stepData.progressLabel}
            onGoToStep={goToStep}
          />

          {/* Card do Conteúdo */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="landing-card relative rounded-2xl shadow-2xl shadow-primary/5 overflow-hidden"
          >
            {/* Header do Card */}
            <div className="px-6 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-primary/15 to-primary/15 ring-1 ring-inset ring-primary/10">
                  <stepData.icon className="h-5 w-5 text-primary dark:text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground">{stepData.title}</h3>
                  <p className="text-sm text-muted-foreground">{stepData.subtitle}</p>
                </div>

                {/* Controles de Navegação */}
                <div className="flex items-center gap-2">
                  {currentStepIndex > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPrevStep}
                      className="gap-2 text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                  )}

                  {currentStepIndex < STEP_ORDER.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={goToNextStep}
                      className="gap-2 bg-gradient-brand text-primary-foreground hover:opacity-90"
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => goToStep('intro')}
                      className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600"
                    >
                      <Play className="h-4 w-4" />
                      Reiniciar Guia
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Conteúdo do Passo */}
            <div className="p-6 md:p-8">
              <div className="max-w-3xl mx-auto">
                {stepData.content}
              </div>
            </div>

            {/* Footer do Card */}
            <div className="px-6 py-4 border-t border-border bg-background/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-muted-foreground">
                  {currentStepIndex === STEP_ORDER.length - 1 ? (
                    "✨ Configuração completa! O sistema está pronto para uso."
                  ) : (
                    <>
                      <span className="text-muted-foreground">Próximo:</span>{' '}
                      <span className="text-foreground font-medium">
                        {STEPS[STEP_ORDER[currentStepIndex + 1]].title}
                      </span>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {currentStepIndex > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => goToStep('intro')}
                      className="text-muted-foreground hover:text-foreground border-border"
                    >
                      <Terminal className="h-3 w-3 mr-2" />
                      Início
                    </Button>
                  )}

                  <a
                    href="https://github.com/LuixzSouza/Projeto-Life-OS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted hover:bg-muted/60 hover:border-primary/40 text-foreground text-sm font-medium transition-colors"
                  >
                    <GitBranch className="h-4 w-4" />
                    Ver Repositório
                  </a>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Nota Informativa */}
          <div className="mt-8 max-w-2xl mx-auto">
            <div className="p-4 rounded-xl bg-card/50 border border-border/50">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-foreground text-sm">💡 Dica Importante</h4>
                  <p className="text-sm text-muted-foreground">
                    Encontrou problemas? Consulte a documentação completa no <Link href={"https://github.com/LuixzSouza/Projeto-Life-OS"} target="_blank" className="text-primary underline"> GitHub </Link> ou abra uma issue.
                    Para dúvidas sobre Node.js ou Git, recomendamos os tutoriais oficiais.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Exporta o componente principal
export default SetupGuide;
