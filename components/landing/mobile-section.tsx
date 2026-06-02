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
    <section id="config" className="py-24 md:py-32 px-4 sm:px-6 bg-[#050505] border-t border-white/5 relative overflow-hidden">

      {/* Background: Grid Tático com gradiente */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-10 pointer-events-none" />

      {/* Gradientes de fundo */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />

      <div className="max-w-6xl mx-auto relative z-10">

        {/* Header Centralizado */}
        <div className="text-center mb-16 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-800/30 text-zinc-300 text-xs font-semibold uppercase tracking-widest mb-6"
          >
            <Terminal className="h-3 w-3 text-indigo-400" />
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Setup Local Guiado
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 tracking-tight"
          >
            Configure em <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">5 minutos</span>
            <br />
            <span className="text-xl md:text-2xl text-zinc-400 font-normal">
              Guia interativo com comandos prontos para copiar
            </span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-zinc-400 max-w-2xl mx-auto"
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
            className="relative bg-gradient-to-b from-zinc-900/90 to-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/5 overflow-hidden"
          >
            {/* Header do Card */}
            <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-black/50 to-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-r from-indigo-500/20 to-purple-500/20">
                  <stepData.icon className="h-5 w-5 text-indigo-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white">{stepData.title}</h3>
                  <p className="text-sm text-zinc-400">{stepData.subtitle}</p>
                </div>

                {/* Controles de Navegação */}
                <div className="flex items-center gap-2">
                  {currentStepIndex > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToPrevStep}
                      className="gap-2 text-zinc-400 hover:text-white hover:bg-white/5"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Voltar
                    </Button>
                  )}

                  {currentStepIndex < STEP_ORDER.length - 1 ? (
                    <Button
                      size="sm"
                      onClick={goToNextStep}
                      className="gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
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
            <div className="px-6 py-4 border-t border-white/10 bg-black/50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-sm text-zinc-500">
                  {currentStepIndex === STEP_ORDER.length - 1 ? (
                    "✨ Configuração completa! O sistema está pronto para uso."
                  ) : (
                    <>
                      <span className="text-zinc-400">Próximo:</span>{' '}
                      <span className="text-white font-medium">
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
                      className="text-zinc-400 hover:text-white border-zinc-700"
                    >
                      <Terminal className="h-3 w-3 mr-2" />
                      Início
                    </Button>
                  )}

                  <a
                    href="https://github.com/LuixzSouza/Projeto-Life-OS"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-medium transition-colors"
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
            <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/50">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="font-semibold text-white text-sm">💡 Dica Importante</h4>
                  <p className="text-sm text-zinc-400">
                    Encontrou problemas? Consulte a documentação completa no <Link href={"https://github.com/LuixzSouza/Projeto-Life-OS"} target="_blank" className="text-indigo-400 underline"> GitHub </Link> ou abra uma issue.
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
