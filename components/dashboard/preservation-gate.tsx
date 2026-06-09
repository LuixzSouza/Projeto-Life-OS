"use client";

// Modo de Preservação (Roadmap Fase 4 — #19, Orçamento de Carga Cognitiva):
// com energia 1–2 registrada hoje, a Home esconde as seções pesadas (análises,
// tabs, radares) e mostra só o essencial — menos decisões num dia exausto.
// O usuário pode expandir mesmo assim; a escolha vale só para o dia (localStorage).

import { useEffect, useState, type ReactNode } from "react";
import { BatteryLow, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const STORAGE_KEY = "lifeos.preservation.override";

export function PreservationGate({ lowEnergy, children }: { lowEnergy: boolean; children: ReactNode }) {
  // Antes da hidratação assume "preservar" (não pisca conteúdo pesado à toa).
  const [override, setOverride] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Deferido (microtask): lê o localStorage pós-hidratação sem setState
    // síncrono no corpo do effect (regra do react-compiler).
    let alive = true;
    Promise.resolve().then(() => {
      if (!alive) return;
      setOverride(localStorage.getItem(STORAGE_KEY) === todayKey());
      setHydrated(true);
    });
    return () => { alive = false; };
  }, []);

  if (!lowEnergy) return <>{children}</>;

  if (override && hydrated) {
    return (
      <>
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <BatteryLow className="h-3.5 w-3.5 text-sky-500" /> Modo de preservação desativado por hoje
        </p>
        {children}
      </>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-sky-500/10 p-2 text-sky-500">
            <BatteryLow className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Modo de Preservação ativo</p>
            <p className="mt-0.5 max-w-md text-[11px] leading-relaxed text-muted-foreground">
              Sua energia hoje está baixa — escondi os painéis de análise para poupar decisões.
              Foque no básico: água, um micro-passo de 2 minutos e descanso. Os dados continuam sendo coletados.
            </p>
          </div>
        </div>
        {hydrated && (
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl gap-1.5 border-sky-500/30 text-sky-600 hover:bg-sky-500/10"
            onClick={() => {
              localStorage.setItem(STORAGE_KEY, todayKey());
              setOverride(true);
            }}
          >
            <Eye className="h-3.5 w-3.5" /> Mostrar tudo mesmo assim
          </Button>
        )}
      </div>
    </div>
  );
}
