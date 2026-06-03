"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { STEPS } from "./setup-guide-steps";
import { STEP_ORDER, type SetupStepKey } from "./setup-guide-types";

interface SetupGuideProgressProps {
  currentStep: SetupStepKey;
  currentStepIndex: number;
  progressLabel?: string;
  onGoToStep: (step: SetupStepKey) => void;
}

export function SetupGuideProgress({ currentStep, currentStepIndex, progressLabel, onGoToStep }: SetupGuideProgressProps) {
  return (
    <div className="mb-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-muted-foreground">
          Passo {currentStepIndex + 1} de {STEP_ORDER.length}
        </div>
        <div className="text-sm font-medium text-foreground">
          {progressLabel}
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${((currentStepIndex + 1) / STEP_ORDER.length) * 100}%` }}
          transition={{ duration: 0.5 }}
          className="h-full bg-gradient-brand rounded-full"
        />
      </div>

      {/* Marcadores dos Passos */}
      <div className="flex justify-between mt-2">
        {STEP_ORDER.map((stepKey, index) => (
          <button
            key={stepKey}
            onClick={() => onGoToStep(stepKey)}
            className={cn(
              "flex flex-col items-center group",
              "transition-all duration-300"
            )}
          >
            <div className={cn(
              "flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold mb-2",
              "transition-all duration-300",
              stepKey === currentStep
                ? "bg-gradient-brand text-primary-foreground scale-110 shadow-lg shadow-primary/20"
                : index < currentStepIndex
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                : "bg-muted text-muted-foreground"
            )}>
              {index + 1}
            </div>
            <span className={cn(
              "text-xs font-medium transition-colors",
              stepKey === currentStep
                ? "text-foreground"
                : index < currentStepIndex
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            )}>
              {STEPS[stepKey].progressLabel}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
