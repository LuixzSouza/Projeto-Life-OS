"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { syncDatabaseNow } from "@/app/(dashboard)/settings/actions";
import { toast } from "sonner";
import { RefreshCw, Cloud, CheckCircle2, AlertTriangle } from "lucide-react";

interface DbSyncCardProps {
  /** URL do Turso espelho (apenas exibição). */
  syncUrl: string | null;
  databasePath: string | null;
  /** Watchdog do sync: epoch ms do último pull ok / último erro (lib/prisma). */
  lastSyncAt?: number | null;
  lastSyncError?: string | null;
}

/**
 * Cartão de sincronização da réplica embarcada (modo "replica").
 * O sync periódico já roda em background (syncInterval); este botão força um
 * PULL imediato do que mudou em outro dispositivo (ex.: o celular via nuvem).
 */
export function DbSyncCard({ syncUrl, databasePath, lastSyncAt, lastSyncError }: DbSyncCardProps) {
  const [isPending, startTransition] = useTransition();
  const [lastSync, setLastSync] = useState<string | null>(null);

  const handleSync = () => {
    startTransition(async () => {
      const res = await syncDatabaseNow();
      if (res.success) {
        toast.success(res.message);
        // Hora local apenas para feedback visual nesta sessão.
        setLastSync(new Date().toLocaleTimeString());
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-background rounded-xl shadow-sm text-cyan-500 border border-cyan-500/20 shrink-0">
          <RefreshCw className="h-6 w-6" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            Modo Híbrido (Réplica)
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-600">
              SINCRONIZÁVEL
            </span>
          </h4>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
            Seus dados ficam num arquivo local rápido e sincronizam com o Turso na
            nuvem — o que permite acessar do celular. A sincronização roda sozinha;
            use o botão para forçar uma atualização imediata.
          </p>
          {databasePath && (
            <p className="text-[11px] text-muted-foreground font-mono break-all pt-1">
              {databasePath}
            </p>
          )}
          {syncUrl && (
            <p className="text-[11px] text-cyan-600/90 font-mono break-all flex items-center gap-1.5">
              <Cloud className="h-3 w-3 shrink-0" /> {syncUrl}
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleSync}
          disabled={isPending}
          className="bg-cyan-600 text-white hover:bg-cyan-600/90 shadow-sm shrink-0"
        >
          <RefreshCw className={isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          {isPending ? "Sincronizando..." : "Sincronizar agora"}
        </Button>
      </div>
      {(lastSync || lastSyncAt || lastSyncError) && (
        <div className="space-y-1 pt-3 mt-3 border-t border-cyan-500/15">
          {lastSyncError ? (
            <p className="text-[11px] text-rose-600 flex items-start gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>
                Último sync falhou: <span className="font-mono break-all">{lastSyncError}</span>
              </span>
            </p>
          ) : lastSyncAt ? (
            <p className="text-[11px] text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Último sync com o espelho:{" "}
              {new Date(lastSyncAt).toLocaleString()}
            </p>
          ) : null}
          {lastSync && (
            <p className="text-[11px] text-emerald-600 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Última sincronização manual: {lastSync}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
