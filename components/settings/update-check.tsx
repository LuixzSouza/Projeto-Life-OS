"use client";

// Aviso discreto de nova versão (DISTRIBUICAO Fase 2) — vive no rodapé do
// card "Status do Ambiente". Checagem manual (opt-in, sem rede automática).

import { useState, useTransition } from "react";
import { ArrowUpCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { checkForUpdates, type UpdateCheckResult } from "@/app/(dashboard)/settings/actions/update";

export function UpdateCheck() {
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = () =>
    startTransition(async () => {
      setResult(await checkForUpdates());
    });

  return (
    <div className="pt-2 border-t border-border/40 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          Atualizações
        </span>
        <button
          type="button"
          onClick={run}
          disabled={pending}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Verificar
        </button>
      </div>

      {result && (
        <p className={cn("text-[11px] leading-relaxed", result.hasUpdate ? "text-foreground" : "text-muted-foreground")}>
          {!result.configured ? (
            <>Canal não configurado. Defina <code className="text-[10px]">LIFE_OS_UPDATE_URL</code> (latest.json ou GitHub Releases) para receber avisos.</>
          ) : result.error ? (
            <>Não foi possível verificar: {result.error}</>
          ) : result.hasUpdate ? (
            <span className="flex items-start gap-1.5">
              <ArrowUpCircle className="h-3.5 w-3.5 shrink-0 text-primary mt-0.5" />
              <span>
                Nova versão <strong>v{result.latest}</strong> disponível (você está na v{result.current}).{" "}
                {result.downloadUrl && (
                  <a href={result.downloadUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">
                    Baixar
                  </a>
                )}
                {" "}· seus dados ficam intactos (pasta data\).
              </span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Você está na versão mais recente (v{result.current}).
            </span>
          )}
        </p>
      )}
    </div>
  );
}
