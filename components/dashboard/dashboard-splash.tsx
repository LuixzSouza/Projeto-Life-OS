"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Brain, Wallet, CheckSquare, Calendar, BookOpen, Check } from "lucide-react";

const STEPS = [
  { icon: Wallet, label: "Carregando finanças" },
  { icon: CheckSquare, label: "Organizando tarefas" },
  { icon: Calendar, label: "Sincronizando agenda" },
  { icon: BookOpen, label: "Reunindo seus estudos" },
];

/**
 * Splash exibido enquanto o dashboard carrega seus dados (via loading.tsx).
 * Some sozinho quando a página real fica pronta — a sequência é decorativa.
 */
export function DashboardSplash() {
  const reduce = useReducedMotion();

  return (
    <div className="flex min-h-[70vh] w-full flex-col items-center justify-center gap-8 px-6">
      {/* Logo com halo pulsante */}
      <div className="relative flex items-center justify-center">
        {!reduce && (
          <motion.div
            className="absolute h-24 w-24 rounded-3xl bg-primary/30 blur-2xl"
            animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <motion.div
          className="relative grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground shadow-lg shadow-primary/30"
          initial={reduce ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <Brain className="h-10 w-10" />
        </motion.div>
      </div>

      {/* Wordmark */}
      <motion.div
        className="text-center"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h1 className="text-2xl font-bold tracking-tight">Life OS</h1>
        <p className="text-sm text-muted-foreground">Preparando seu segundo cérebro…</p>
      </motion.div>

      {/* Checklist em cascata */}
      <div className="flex flex-col gap-2.5">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.label}
            className="flex items-center gap-3 text-sm text-muted-foreground"
            initial={reduce ? false : { opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.18 }}
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-muted">
              <step.icon className="h-3.5 w-3.5" />
            </span>
            <span className="flex-1">{step.label}</span>
            <motion.span
              initial={reduce ? false : { scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.18 + 0.35, type: "spring", stiffness: 400, damping: 15 }}
            >
              <Check className="h-4 w-4 text-emerald-500" />
            </motion.span>
          </motion.div>
        ))}
      </div>

      {/* Barra de progresso indeterminada */}
      {!reduce && (
        <div className="h-1 w-48 overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full w-1/2 rounded-full bg-primary"
            animate={{ x: ["-100%", "200%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      )}
    </div>
  );
}
