// components/landing/bento/bento-atoms.tsx
// Primitivos compartilhados dos cards do bento. Tudo no accent (primary) e
// themeable (claro/escuro) — sem cores cravadas, para acompanhar o tema sorteado.
"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pílula/tag pequena no accent. */
export function Pill({
  children,
  icon: Icon,
  className,
  muted = false,
}: {
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        muted
          ? "border-border/60 bg-muted/60 text-muted-foreground"
          : "border-primary/20 bg-primary/10 text-primary",
        className
      )}
    >
      {Icon && <Icon className="size-2.5" />}
      {children}
    </span>
  );
}

/** Linha de estatística: ícone + label à esquerda, valor à direita. */
export function StatRow({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-3.5" />
      </div>
      <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{label}</p>
      <span className="shrink-0 text-xs font-bold tabular-nums text-foreground">{value}</span>
      {hint && <span className="shrink-0 text-[10px] text-muted-foreground">{hint}</span>}
    </div>
  );
}

/** Barra de progresso no accent. */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const clamped = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-gradient-brand"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/** Item de lista compacto: ícone, título, subtítulo e um slot à direita. */
export function ListItem({
  icon: Icon,
  title,
  subtitle,
  right,
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border/60 bg-card/40 px-2.5 py-2 transition-colors hover:border-primary/30">
      {Icon && (
        <div className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="size-3.5" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-foreground">{title}</p>
        {subtitle && <p className="truncate text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}
