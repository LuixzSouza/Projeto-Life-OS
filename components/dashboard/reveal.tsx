"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Atraso em segundos — use incrementos p/ efeito cascata. */
  delay?: number;
  /** Deslocamento vertical inicial (px). */
  y?: number;
  className?: string;
}

/**
 * Entrada suave (fade + slide-up) ao montar. Usado para escalonar
 * cards do dashboard. Respeita prefers-reduced-motion.
 */
export function Reveal({ children, delay = 0, y = 14, className }: RevealProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
