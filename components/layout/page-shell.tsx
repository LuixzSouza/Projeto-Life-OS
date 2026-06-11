// components/layout/page-shell.tsx
import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
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
  /** Rota de "voltar": vira um chevron compacto na própria linha do título
      (não gasta uma linha inteira com BackLink — essencial no mobile). */
  backHref?: string;
  /** Rótulo acessível do botão de voltar. */
  backLabel?: string;
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
  backHref,
  backLabel,
  actions,
  children,
  className,
}: PageHeaderProps) {
  // Mobile-first COMPACTO (iPhone SE etc.): paddings/título/ícone menores, a
  // descrição cabe em UMA linha e as ações rolam na horizontal em vez de
  // empilhar — o header não pode comer meia tela de um celular pequeno.
  return (
    <header
      className={cn(
        "sticky top-0 z-30 border-b border-border/40 bg-background/95 backdrop-blur",
        className
      )}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2.5 px-4 py-2.5 sm:gap-4 sm:px-8 sm:py-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex items-center gap-2 min-w-0 sm:gap-3">
            {backHref && (
              <Link
                href={backHref}
                aria-label={backLabel ?? "Voltar"}
                title={backLabel ?? "Voltar"}
                className="-ml-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:size-9"
              >
                <ChevronLeft className="size-4 sm:size-5" />
              </Link>
            )}
            {icon && (
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:size-11 sm:rounded-xl [&_svg]:size-4 sm:[&_svg]:size-5">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="truncate text-base font-bold tracking-tight text-foreground sm:text-2xl">
                {title}
              </h1>
              {description && (
                // Escondida no mobile: em tela pequena a descrição só empurra
                // o conteúdo útil pra baixo — o título já diz onde estamos.
                <p className="hidden text-muted-foreground sm:mt-0.5 sm:line-clamp-2 sm:block sm:text-sm">
                  {description}
                </p>
              )}
            </div>
          </div>
          {actions && (
            // sm+: precisa poder ENCOLHER (sm:shrink + min-w-0) para o
            // flex-wrap agir — com shrink-0 o wrap nunca acontecia e páginas
            // com muitas ações (Financeiro) estouravam para fora do header.
            <div className="flex shrink-0 items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide sm:min-w-0 sm:shrink sm:flex-wrap sm:justify-end sm:overflow-visible sm:pb-0">
              {actions}
            </div>
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
        "mx-auto w-full max-w-7xl px-4 py-6 sm:px-8 sm:py-8 animate-in fade-in duration-500",
        className
      )}
    >
      {children}
    </main>
  );
}
