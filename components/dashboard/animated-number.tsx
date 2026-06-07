"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

type NumberFormat = "currency" | "int" | "percent";

interface AnimatedNumberProps {
  value: number;
  format?: NumberFormat;
  currency?: string;
  /** Duração da contagem em ms. */
  durationMs?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * Número que "sobe" de 0 até o valor real ao entrar na tela.
 * Respeita prefers-reduced-motion (mostra o valor final direto).
 */
export function AnimatedNumber({
  value,
  format = "int",
  currency = "BRL",
  durationMs = 900,
  decimals = 0,
  prefix = "",
  suffix = "",
  className,
}: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-20px" });
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    // Com movimento reduzido não animamos — o valor real é renderizado direto
    // (sem setState no efeito, evitando renders em cascata).
    if (reduce || !inView) return;
    const controls = animate(0, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [inView, value, durationMs, reduce]);

  const current = reduce ? value : display;
  let text: string;
  if (format === "currency") text = formatCurrency(current, { currency });
  else if (format === "percent") text = `${current.toFixed(decimals)}%`;
  else text = Math.round(current).toLocaleString("pt-BR");

  return (
    <span ref={ref} className={className}>
      {prefix}
      {text}
      {suffix}
    </span>
  );
}
