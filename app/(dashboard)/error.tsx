"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RotateCcw, LayoutDashboard, AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("💥 [DASHBOARD ERROR]", error);
  }, [error]);

  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="flex max-w-md flex-col items-center gap-6 text-center animate-fade-in">
        <div className="flex size-16 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive shadow-sm">
          <AlertTriangle className="size-8" />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-extrabold tracking-tight text-foreground">
            Não foi possível carregar este módulo
          </h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Ocorreu um erro ao processar esta página. Seus dados continuam
            seguros — tente recarregar o conteúdo.
          </p>
          {error?.digest && (
            <code className="mx-auto mt-1 rounded-md border border-border/50 bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
              ID: {error.digest}
            </code>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <Button onClick={reset} variant="primary" className="w-full sm:w-auto">
            <RotateCcw className="size-4" />
            Tentar novamente
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/dashboard">
              <LayoutDashboard className="size-4" />
              Ir para o início
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
