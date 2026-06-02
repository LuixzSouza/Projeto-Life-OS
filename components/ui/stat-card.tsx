import * as React from "react";
import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * StatCard — cartão de métrica/KPI padrão do sistema.
 * Centraliza o visual usado em vários módulos (Social, Projetos, Closet, etc.)
 * para que ajustes de estilo aconteçam em um único lugar.
 *
 * Para os cartões "táticos" de Saúde (com unidade/cor temática), use
 * `components/health/metric-card.tsx`, que é específico daquele módulo.
 */
interface StatCardProps {
  /** Rótulo curto no topo (ex.: "Rede Total"). */
  label: string;
  /** Valor principal — aceita número, string ou nó (ex.: já formatado). */
  value: React.ReactNode;
  /** Ícone Lucide exibido no badge à direita. */
  icon?: LucideIcon;
  /** Texto auxiliar no rodapé. */
  hint?: string;
  /**
   * Classe de cor do badge do ícone (texto + fundo).
   * Ex.: "text-blue-600 bg-blue-500/10". Default usa a cor primária.
   */
  iconClassName?: string;
  /** Selo de tendência opcional no rodapé. */
  trend?: { value: string; positive?: boolean };
  className?: string;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  iconClassName,
  trend,
  className,
}: StatCardProps) {
  const hasFooter = Boolean(hint) || Boolean(trend);

  return (
    <Card
      className={cn(
        "h-full bg-card border-border/40 shadow-sm transition-all hover:shadow-md hover:border-border/80",
        className
      )}
    >
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
          </div>
          {Icon && (
            <div className={cn("shrink-0 rounded-xl p-2.5", iconClassName ?? "bg-primary/10 text-primary")}>
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        {hasFooter && (
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/40 pt-4">
            {hint && <p className="truncate text-xs font-medium text-muted-foreground">{hint}</p>}
            {trend && (
              <span
                className={cn(
                  "shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold",
                  trend.positive
                    ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                    : "border-rose-500/20 bg-rose-500/10 text-rose-600"
                )}
              >
                {trend.value}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
