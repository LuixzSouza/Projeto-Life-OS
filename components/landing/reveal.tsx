"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

interface RevealProps {
  children: ReactNode;
  /** Atraso em segundos antes da entrada (escalona seções em sequência). */
  delay?: number;
  /** Deslocamento vertical inicial (px). Default 24. */
  y?: number;
  className?: string;
}

/**
 * Envolve uma seção e a revela com um fade-up suave quando entra na viewport.
 * Anima só uma vez (`once`) e respeita `prefers-reduced-motion`: se o usuário
 * pede menos movimento, renderiza estático (sem transform/opacity animados).
 */
export function Reveal({ children, delay = 0, y = 24, className }: RevealProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}
