// components/layout/page-shell.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Componentes de layout padrão do Life OS. Centralizam as regras de design
 * (largura máxima, espaçamento, header sticky) para que todas as páginas
 * fiquem consistentes. Ver CLAUDE.md → "Design System".
 */

/* -------------------------------------------------------------------------
 * PageShell — wrapper raiz da página (ocupa a área de conteúdo do dashboard)
 * ------------------------------------------------------------------------- */
export function PageShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>{children}</div>
  );
}

/* -------------------------------------------------------------------------
 * PageHeader — cabeçalho sticky padrão (título + descrição + ações)
 * ------------------------------------------------------------------------- */
interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Ícone opcional exibido à esquerda do título. */
  icon?: React.ReactNode;
  /** Ações à direita (botões, badges). */
  actions?: React.ReactNode;
  /** Conteúdo extra abaixo do título (tabs, filtros). */
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  icon,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur",
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {icon && (
              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </div>
        {children}
      </div>
    </header>
  );
}

/* -------------------------------------------------------------------------
 * PageContainer — área de conteúdo com largura e espaçamento padronizados
 * ------------------------------------------------------------------------- */
export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <main
      className={cn(
        "mx-auto w-full max-w-7xl px-6 py-8 sm:px-8 animate-in fade-in duration-500",
        className
      )}
    >
      {children}
    </main>
  );
}
