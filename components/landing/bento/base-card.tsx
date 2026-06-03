// components/landing/bento/base-card.tsx
"use client";

import { cn } from "@/lib/utils";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import { MouseEvent } from "react";

interface BaseCardProps {
  children?: React.ReactNode;
  title: string;
  description?: string;
  icon: React.ElementType;
  className?: string; // (Opcional agora, pois controlamos no grid pai)
  visualClassName?: string;
  onClick?: () => void;
}

export function BaseCard({
  title,
  description,
  icon: Icon,
  children,
  className,
  visualClassName,
  onClick
}: BaseCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      onClick={onClick}
      // MUDANÇA: h-full w-full garante que ele ocupe exatamente o tamanho da div pai do Grid
      className={cn(
        "group relative flex flex-col h-full w-full overflow-hidden rounded-2xl border border-border/60 bg-card hover:border-primary/30 transition-all cursor-pointer shadow-sm hover:shadow-md",
        className
      )}
    >
      {/* Spotlight */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 group-hover:opacity-100 z-10"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              500px circle at ${mouseX}px ${mouseY}px,
              color-mix(in oklch, var(--color-primary) 12%, transparent),
              transparent 80%
            )
          `,
        }}
      />

      {/* Header Compacto */}
      <div className="p-4 z-20 shrink-0 flex items-center gap-3 border-b border-border/60 bg-card">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground group-hover:text-primary group-hover:bg-primary/10 transition-colors">
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h3>
            {description && <span className="text-[10px] text-muted-foreground truncate max-w-[150px]">{description}</span>}
          </div>
      </div>

      {/* Área Visual (MUDANÇA: flex-1 para ocupar TODO o resto do espaço) */}
      <div className={cn(
        "relative flex-1 w-full overflow-hidden flex flex-col", 
        visualClassName
      )}>
        {children}
      </div>
    </div>
  );
}