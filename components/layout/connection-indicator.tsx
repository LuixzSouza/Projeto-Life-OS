"use client";

// Indicador de conexão (rodapé da sidebar): ponto verde/âmbar/vermelho
// alimentado pelo GET /api/health. Feedback passivo — essencial quando o app é
// acessado do celular com os dados no PC (modo réplica/local). O polling vive
// no store compartilhado use-db-health (o banner de erro usa o MESMO fetch).

import { cn } from "@/lib/utils";
import { useDbHealth, levelOf, type DbHealth, type HealthLevel } from "./use-db-health";

const MODE_LABEL: Record<DbHealth["mode"], string> = {
  local: "banco local",
  replica: "híbrido (PC + nuvem)",
  cloud: "nuvem",
  none: "não configurado",
};

const DOT: Record<HealthLevel, string> = {
  ok: "bg-emerald-500",
  slow: "bg-amber-500",
  down: "bg-rose-500",
  unknown: "bg-zinc-400",
};

export function ConnectionIndicator({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const snap = useDbHealth();
  const { health, checkedAt } = snap;

  const level = levelOf(snap);
  // Idade do último sync relativa à checagem (evita relógio correndo no render).
  const syncAgeSec =
    health?.mode === "replica" && health.lastSyncAt && checkedAt
      ? Math.max(0, Math.round((checkedAt - health.lastSyncAt) / 1000))
      : null;

  const label =
    level === "down" ? "Sem conexão com o banco"
    : level === "unknown" ? "Verificando conexão…"
    : `Conectado · ${MODE_LABEL[health!.mode]}`;
  const detail =
    level === "ok" || level === "slow"
      ? [
          health?.latencyMs != null ? `${health.latencyMs}ms` : null,
          syncAgeSec != null ? `sync há ${syncAgeSec}s` : null,
          health?.lastSyncError ? "sync com erro" : null,
        ].filter(Boolean).join(" · ")
      : null;

  if (isCollapsed) {
    return (
      <div className="flex justify-center py-2" title={`${label}${detail ? ` (${detail})` : ""}`}>
        <span className={cn("h-2 w-2 rounded-full", DOT[level])} />
      </div>
    );
  }

  return (
    <div
      className="mx-3 mb-1 flex items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground"
      title={detail ?? undefined}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {level === "ok" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", DOT[level])} />
      </span>
      <span className="truncate">{label}</span>
      {detail && <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground/70">{detail}</span>}
    </div>
  );
}
