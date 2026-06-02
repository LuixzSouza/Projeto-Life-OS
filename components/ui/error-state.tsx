import Link from "next/link";
import { LucideIcon, ShieldAlert, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * ErrorState — bloco padrão de "falha ao carregar" usado nas páginas server.
 * Centraliza o visual que estava duplicado em várias telas (Saúde, Finanças…).
 *
 * Para erros em runtime de client components, prefira o boundary `error.tsx`.
 */
interface ErrorStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  /** Link de "tentar novamente" (geralmente a própria rota). */
  retryHref?: string;
  retryLabel?: string;
  /** Link de "voltar" (ex.: "/health"). */
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function ErrorState({
  title = "Falha ao carregar",
  description = "Não foi possível sincronizar seus dados no momento. Tente novamente em alguns instantes.",
  icon: Icon = ShieldAlert,
  retryHref,
  retryLabel = "Recarregar",
  backHref,
  backLabel = "Voltar",
  className,
}: ErrorStateProps) {
  return (
    <div className={cn("flex min-h-[80vh] w-full flex-col items-center justify-center p-8", className)}>
      <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-border/40 bg-muted/30 p-8 text-center shadow-sm">
        <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
          <Icon className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>

        {(backHref || retryHref) && (
          <div className="mt-4 flex gap-3">
            {backHref && (
              <Link href={backHref}>
                <Button variant="ghost" className="rounded-xl">
                  {backLabel}
                </Button>
              </Link>
            )}
            {retryHref && (
              <Link href={retryHref}>
                <Button variant="outline" className="gap-2 rounded-xl">
                  <RefreshCcw className="h-4 w-4" /> {retryLabel}
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
