"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RotateCcw, Home, AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log para diagnóstico (não expõe stack ao usuário).
    console.error("💥 [APP ERROR]", error);
  }, [error]);

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute left-1/2 top-1/3 h-[40%] w-[60%] -translate-x-1/2 rounded-full bg-destructive/10 blur-[120px]" />
      </div>

      <div className="relative z-10 flex max-w-md flex-col items-center gap-6">
        <div className="flex size-20 items-center justify-center rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive shadow-sm">
          <AlertTriangle className="size-9" />
        </div>

        <div className="flex flex-col gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Algo deu errado
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Encontramos um erro inesperado ao carregar esta seção. Seus dados
            estão seguros — você pode tentar novamente.
          </p>
          {error?.digest && (
            <code className="mx-auto mt-1 rounded-md border border-border/50 bg-muted px-3 py-1 font-mono text-xs text-muted-foreground">
              ID: {error.digest}
            </code>
          )}
        </div>

        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
          <Button onClick={reset} variant="primary" size="lg" className="w-full sm:w-auto">
            <RotateCcw className="size-4" />
            Tentar novamente
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link href="/dashboard">
              <Home className="size-4" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
