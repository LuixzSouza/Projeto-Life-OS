"use client";

// TRILHAS DE DOMÍNIO — item D1 do docs/ESTUDOS_ROADMAP.md.
// A pergunta que o card responde não é "quanto tempo estudei?" (isso já é o ELO),
// e sim "o quanto eu DOMINO cada matéria?". Cada linha abre para mostrar os quatro
// pilares por trás da nota — a barra nunca é um número mágico.

import { useState } from "react";
import { ChevronDown, Compass, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requestStudyStart } from "./study-launch";
import type { MasteryResult } from "@/lib/study-mastery";

export interface MasteryTrack {
  id: string;
  title: string;
  icon: string | null;
  color: string | null;
  mastery: MasteryResult;
}

export function MasteryTracks({ tracks }: { tracks: MasteryTrack[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (tracks.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
            <Compass className="h-4 w-4 text-primary" /> Trilhas de domínio
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Tempo, memória, constância e objetivos — o quanto cada matéria já é sua.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {tracks.map((t) => {
          const { mastery } = t;
          const open = expanded === t.id;
          const accent = t.color || "hsl(var(--primary))";
          return (
            <div
              key={t.id}
              className={cn(
                "rounded-xl border bg-background transition-colors",
                open ? "border-primary/30" : "border-border/50 hover:border-primary/20",
              )}
            >
              <button
                type="button"
                onClick={() => setExpanded(open ? null : t.id)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
              >
                <div
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-base"
                  style={{ backgroundColor: `${accent}1f`, color: accent }}
                >
                  {t.icon || t.title.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
                    <span className={cn("shrink-0 text-xs font-bold tabular-nums", mastery.level.accent)}>
                      {mastery.score}%
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", mastery.level.bar)}
                      style={{ width: `${mastery.score}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", mastery.level.soft, mastery.level.accent)}>
                      {mastery.level.label}
                    </span>
                  </div>
                </div>

                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
                />
              </button>

              {open && (
                <div className="space-y-3 border-t border-border/40 px-3 py-3">
                  {/* Pilares: a nota aberta, sem caixa-preta. */}
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {mastery.pillars.map((p) => (
                      <div key={p.key} className={cn("space-y-1", !p.available && "opacity-60")}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-foreground">{p.label}</span>
                          <span className="font-bold tabular-nums text-muted-foreground">
                            {p.available ? `${p.score}%` : "—"}
                          </span>
                        </div>
                        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full rounded-full transition-all", p.available ? "bg-primary/70" : "bg-transparent")}
                            style={{ width: `${p.available ? p.score : 0}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground">{p.detail}</p>
                      </div>
                    ))}
                  </div>

                  {/* Próximo passo: o elo mais fraco vira ação. */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2">
                    <p className="min-w-0 flex-1 text-[11px] font-medium text-muted-foreground">
                      {mastery.nextStep}
                    </p>
                    <Button
                      size="sm"
                      className="h-7 shrink-0 gap-1.5 rounded-lg text-xs font-bold"
                      onClick={() => requestStudyStart(t.id)}
                    >
                      <Play className="h-3 w-3" /> Estudar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/70">
        Pilar sem dado (ex.: matéria sem flashcards) não conta como zero — sai da média.
        E &quot;Dominado&quot; exige todos os pilares firmes: um elo fraco segura o selo em &quot;Avançado&quot;.
      </p>
    </div>
  );
}
