"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeartPulse, CheckCircle2 } from "lucide-react";
import { MUSCLE_META } from "./exercise-db";
import type { MuscleRecovery } from "./session/session-types";

// Vermelho (fadigado) → verde (recuperado), via matiz HSL 0→120.
function recoveryColor(r: number): string {
  return `hsl(${Math.round(r * 120)} 70% 45%)`;
}

function statusLabel(m: MuscleRecovery): string {
  if (m.lastTrainedAt === null) return "Sem registro recente";
  if (m.recovery >= 0.999) return "Recuperado";
  const h = m.hoursSince ?? 0;
  const ago = h < 24 ? `há ${h}h` : `há ${Math.round(h / 24)}d`;
  return `${Math.round(m.recovery * 100)}% · treinado ${ago}`;
}

/**
 * Mapa de fadiga muscular: responde "treino esse grupo hoje ou ainda tá recente?".
 * Lista os grupos JÁ treinados ordenados do mais fadigado ao mais recuperado; os
 * grupos sem registro recente entram como "prontos". Dados calculados no servidor
 * (`getMuscleRecovery`) — a cor vai do vermelho (fadigado) ao verde (recuperado).
 */
export function MuscleRecoveryCard({ recovery }: { recovery: MuscleRecovery[] }) {
  const trained = recovery
    .filter((m) => m.lastTrainedAt !== null)
    .sort((a, b) => a.recovery - b.recovery);
  const fresh = recovery.filter((m) => m.lastTrainedAt === null);
  const ready = trained.filter((m) => m.recovery >= 0.9).map((m) => MUSCLE_META[m.group]?.label ?? m.group);

  return (
    <Card className="border-border/40 shadow-sm bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
          <HeartPulse className="h-4 w-4 text-primary" />
          Recuperação muscular
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {trained.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/40 bg-muted/10 px-3 py-6 text-center">
            <p className="text-sm font-medium">Tudo recuperado 💪</p>
            <p className="text-xs text-muted-foreground">Registre treinos para ver a fadiga por grupo.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {trained.map((m) => {
              const color = recoveryColor(m.recovery);
              const label = MUSCLE_META[m.group]?.label ?? m.group;
              return (
                <div key={m.group} className="flex items-center gap-3">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold">{label}</span>
                      <span className="truncate text-[10px] text-muted-foreground">{statusLabel(m)}</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(4, Math.round(m.recovery * 100))}%`, background: color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pronto para treinar (recuperados) + grupos sem registro */}
        {(ready.length > 0 || fresh.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2.5 text-[11px]">
            <span className="flex items-center gap-1 font-semibold text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Pronto:
            </span>
            {[...ready, ...fresh.map((m) => MUSCLE_META[m.group]?.label ?? m.group)].slice(0, 6).map((name) => (
              <span key={name} className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 font-medium text-emerald-600">
                {name}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
