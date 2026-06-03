"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  motion, useMotionValue, useMotionTemplate, useSpring, useReducedMotion,
} from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CtaButtonProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Botão CTA "assinatura" do Life OS. Reúne quatro efeitos que conversam com a
 * identidade do sistema (o "CORE reator" do hero), todos dirigidos pelo accent:
 *  1. Magnético  — o botão é puxado de leve em direção ao cursor.
 *  2. Sheen      — um brilho radial segue o mouse por dentro do botão.
 *  3. Shine      — uma faixa de luz diagonal varre o botão no hover.
 *  4. Halo conic — um anel conic-gradient gira ao redor (eco do núcleo).
 * Tudo respeita prefers-reduced-motion.
 */
export function CtaButton({ href, children, className }: CtaButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const reduceMotion = useReducedMotion();

  // Posição do cursor dentro do botão (para o sheen) — em %.
  const sx = useMotionValue(50);
  const sy = useMotionValue(50);
  const sheen = useMotionTemplate`radial-gradient(140px circle at ${sx}% ${sy}%, color-mix(in oklch, #fff 40%, transparent), transparent 70%)`;

  // Deslocamento magnético (amortecido por springs).
  const pullX = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });
  const pullY = useSpring(useMotionValue(0), { stiffness: 220, damping: 16, mass: 0.4 });

  const handleMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (reduceMotion) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    sx.set((x / rect.width) * 100);
    sy.set((y / rect.height) * 100);
    pullX.set((x / rect.width - 0.5) * 18);
    pullY.set((y / rect.height - 0.5) * 14);
  };

  const handleLeave = () => {
    sx.set(50);
    sy.set(50);
    pullX.set(0);
    pullY.set(0);
  };

  return (
    <motion.div
      style={reduceMotion ? undefined : { x: pullX, y: pullY }}
      className={cn("relative w-full sm:w-auto group", className)}
    >
      <Link
        ref={ref}
        href={href}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="relative inline-flex h-14 w-full sm:w-auto items-center justify-center gap-2 overflow-hidden rounded-full bg-primary px-8 text-lg font-bold text-primary-foreground shadow-lg shadow-primary/30 transition-shadow duration-300 hover:shadow-[0_0_45px_-8px_var(--color-primary)] active:scale-95"
      >
        {/* Sheen que segue o cursor */}
        {!reduceMotion && (
          <motion.span
            aria-hidden
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{ background: sheen }}
          />
        )}

        {/* Faixa de luz diagonal varrendo no hover */}
        <span
          aria-hidden
          className="absolute inset-0 -translate-x-[150%] skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[150%]"
        />

        <span className="relative z-10 flex items-center gap-2">
          {children}
          <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
        </span>
      </Link>
    </motion.div>
  );
}
