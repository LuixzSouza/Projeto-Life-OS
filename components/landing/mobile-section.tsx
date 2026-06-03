// components/landing/setup-guide.tsx
"use client";

import { Terminal, GitBranch, Lightbulb, Play, ChevronLeft, ChevronRight } from "lucide-react";
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
  const isLastStep = currentStepIndex === STEP_ORDER.length - 1;

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
    <section
      id="config"
      className="relative overflow-hidden border-t border-border/60 px-4 py-24 sm:px-6 md:py-32"
    >
      {/* Background: grade tática themeable (clareia/escurece com o tema) */}
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />

      {/* Glows no accent */}
      <div className="pointer-events-none absolute left-0 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Header centralizado */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest"
          >
            <Terminal className="size-3.5 text-primary" />
            <span className="text-gradient-brand">Setup Local Guiado</span>
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl"
          >
            Configure em <span className="text-gradient-brand">5 minutos</span>
            <br />
            <span className="text-xl font-normal text-muted-foreground md:text-2xl">
              Guia interativo com comandos prontos para copiar
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mx-auto max-w-2xl text-lg text-muted-foreground"
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

          {/* Janela do guia (frame estático estilo console) */}
          <div className="landing-card relative overflow-hidden rounded-2xl shadow-2xl shadow-primary/5">
            {/* Chrome da janela — assina o "console local" sem redundar com os terminais internos */}
            <div className="flex items-center gap-2 border-b border-border/60 bg-background/40 px-4 py-2.5">
              <span className="flex gap-1.5">
                <span className="size-2.5 rounded-full bg-primary/80" />
                <span className="size-2.5 rounded-full bg-primary/40" />
                <span className="size-2.5 rounded-full bg-primary/20" />
              </span>
              <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                ~/life-os — setup guiado
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Local
              </span>
            </div>

            {/* Conteúdo do passo (anima a cada troca) */}
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header do passo */}
              <div className="border-b border-border/60 bg-muted/30 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
                    <stepData.icon className="size-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-foreground">{stepData.title}</h3>
                    <p className="text-sm text-muted-foreground">{stepData.subtitle}</p>
                  </div>

                  {/* Controles de navegação */}
                  <div className="flex items-center gap-2">
                    {currentStepIndex > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={goToPrevStep}
                        className="gap-2 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                      >
                        <ChevronLeft className="size-4" />
                        Voltar
                      </Button>
                    )}

                    {!isLastStep ? (
                      <Button
                        size="sm"
                        onClick={goToNextStep}
                        className="gap-2 bg-gradient-brand text-primary-foreground hover:opacity-90"
                      >
                        Próximo
                        <ChevronRight className="size-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => goToStep('intro')}
                        className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Play className="size-4" />
                        Reiniciar Guia
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Conteúdo do passo */}
              <div className="p-6 md:p-8">
                <div className="mx-auto max-w-3xl">{stepData.content}</div>
              </div>

              {/* Footer do passo */}
              <div className="border-t border-border/60 bg-background/50 px-6 py-4">
                <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
                  <div className="text-sm text-muted-foreground">
                    {isLastStep ? (
                      "✨ Configuração completa! O sistema está pronto para uso."
                    ) : (
                      <>
                        <span className="text-muted-foreground">Próximo:</span>{' '}
                        <span className="font-medium text-foreground">
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
                        className="border-border text-muted-foreground hover:text-foreground"
                      >
                        <Terminal className="mr-2 size-3.5" />
                        Início
                      </Button>
                    )}

                    <a
                      href="https://github.com/LuixzSouza/Projeto-Life-OS"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-muted/60"
                    >
                      <GitBranch className="size-4" />
                      Ver Repositório
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Nota informativa */}
          <div className="mx-auto mt-8 max-w-2xl">
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                  <Lightbulb className="size-4" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-sm font-semibold text-foreground">Dica importante</h4>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Encontrou problemas? Consulte a documentação completa no{" "}
                    <Link
                      href="https://github.com/LuixzSouza/Projeto-Life-OS"
                      target="_blank"
                      className="text-primary underline"
                    >
                      GitHub
                    </Link>{" "}
                    ou abra uma issue. Para dúvidas sobre Node.js ou Git, recomendamos
                    os tutoriais oficiais.
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
