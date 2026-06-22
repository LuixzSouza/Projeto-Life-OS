"use client";

// Card "Seu banco" (DATABASE_ROADMAP · UX de status §1): a pessoa precisa VER
// onde os dados estão. Consolida num lugar só o que antes ficava espalhado —
// provedor + modo, endereço mascarado, latência medida agora, tamanho do
// arquivo, último sync (réplica) e último backup.

import { Database, HardDrive, Cloud, RefreshCw, Gauge, Archive, CalendarClock } from "lucide-react";
import { cn, formatTime, formatDate } from "@/lib/utils";

export interface DbOverview {
  mode: "local" | "replica" | "cloud" | null;
  /** Nome amigável do provedor ("SQLite local", "Turso", "Supabase"...). */
  providerLabel: string;
  /** Caminho do arquivo ou host com credencial mascarada. */
  location: string | null;
  /** Latência de um SELECT 1 medido no render da página (ms). */
  latencyMs: number | null;
  /** Tamanho do banco em bytes (arquivo, pg_database_size ou PRAGMA). */
  sizeBytes: number | null;
  /** Cota de storage do plano grátis do provedor (null = sem cota conhecida). */
  sizeLimitBytes: number | null;
  lastSyncAt: number | null;
  lastSyncError: string | null;
  /** ISO do último backup registrado (snapshot ou JSON). */
  lastBackupAt: string | null;
}

const MODE_META: Record<NonNullable<DbOverview["mode"]>, { label: string; icon: typeof Database; accent: string }> = {
  local: { label: "LOCAL", icon: HardDrive, accent: "text-sky-500 bg-sky-500/10" },
  replica: { label: "HÍBRIDO", icon: RefreshCw, accent: "text-cyan-500 bg-cyan-500/10" },
  cloud: { label: "NUVEM", icon: Cloud, accent: "text-emerald-500 bg-emerald-500/10" },
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[unit]}`;
}

function Stat({ icon: Icon, label, value, tone }: { icon: typeof Gauge; label: string; value: string; tone?: string }) {
  return (
    <div className="p-2.5 rounded-lg border border-border/50 bg-background/50 space-y-1 min-w-0">
      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5 uppercase font-semibold">
        <Icon className="h-3 w-3" /> {label}
      </p>
      <p className={cn("text-xs font-bold font-mono truncate", tone)} title={value}>{value}</p>
    </div>
  );
}

export function DbOverviewCard({ overview }: { overview: DbOverview }) {
  const meta = overview.mode ? MODE_META[overview.mode] : null;
  const Icon = meta?.icon ?? Database;

  const latency =
    overview.latencyMs == null ? "—"
    : `${overview.latencyMs}ms${overview.latencyMs > 800 ? " (lento)" : ""}`;
  const latencyTone =
    overview.latencyMs == null ? undefined
    : overview.latencyMs > 800 ? "text-amber-600" : "text-emerald-600";

  const lastSync = overview.lastSyncError
    ? "com erro"
    : overview.lastSyncAt
      ? formatTime(overview.lastSyncAt)
      : overview.mode === "replica" ? "ainda nesta sessão" : "—";

  const lastBackup = overview.lastBackupAt
    ? formatDate(overview.lastBackupAt)
    : "nunca";

  // Uso vs cota do plano grátis (UX §4): aviso proativo a partir de 80%.
  const usagePercent =
    overview.sizeBytes != null && overview.sizeLimitBytes
      ? Math.min(100, (overview.sizeBytes / overview.sizeLimitBytes) * 100)
      : null;
  const usageTone =
    usagePercent == null ? "" : usagePercent >= 95 ? "bg-rose-500" : usagePercent >= 80 ? "bg-amber-500" : "bg-emerald-500";

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-4">
        <div className={cn("p-3 rounded-xl shrink-0", meta?.accent ?? "text-muted-foreground bg-muted")}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <h4 className="font-semibold text-foreground flex items-center gap-2">
            Seu banco: {overview.providerLabel}
            {meta && (
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", meta.accent)}>
                {meta.label}
              </span>
            )}
          </h4>
          {overview.location && (
            <p className="text-[11px] text-muted-foreground font-mono break-all" title={overview.location}>
              {overview.location}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat icon={Gauge} label="Latência" value={latency} tone={latencyTone} />
        <Stat
          icon={HardDrive}
          label="Tamanho"
          value={overview.sizeBytes != null ? formatBytes(overview.sizeBytes) : "—"}
        />
        <Stat
          icon={RefreshCw}
          label="Último sync"
          value={lastSync}
          tone={overview.lastSyncError ? "text-rose-600" : undefined}
        />
        <Stat icon={Archive} label="Último backup" value={lastBackup} tone={overview.lastBackupAt ? undefined : "text-amber-600"} />
      </div>

      {usagePercent != null && overview.sizeLimitBytes != null && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span className="font-semibold uppercase">Uso do plano grátis</span>
            <span className="font-mono">
              {formatBytes(overview.sizeBytes!)} / {formatBytes(overview.sizeLimitBytes)} ({usagePercent.toFixed(0)}%)
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div className={cn("h-full rounded-full transition-all", usageTone)} style={{ width: `${usagePercent}%` }} />
          </div>
          {usagePercent >= 80 && (
            <p className="text-[11px] text-amber-600">
              ⚠️ Acima de 80% da cota grátis — considere um backup completo e, se precisar,
              use &quot;Mudar de banco&quot; (abaixo, em Migração de Dados) para um destino com mais espaço.
            </p>
          )}
        </div>
      )}

      {overview.lastSyncError && (
        <p className="text-[11px] text-rose-600 flex items-start gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span className="font-mono break-all">{overview.lastSyncError}</span>
        </p>
      )}
    </div>
  );
}
