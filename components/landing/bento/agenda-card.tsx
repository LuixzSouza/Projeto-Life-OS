// components/landing/bento/agenda-card.tsx
"use client";

import { Calendar, Clock } from "lucide-react";
import { BaseCard } from "./base-card";
import { cn } from "@/lib/utils";

export function AgendaCard() {
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const currentDay = 14;
  const events = [3, 14, 22, 27]; // dias com eventos (model Event)
  const weekDays = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <BaseCard
      title="Agenda"
      description="Eventos e rotina."
      icon={Calendar}
      className="col-span-1 row-span-1"
    >
      <div className="flex h-full w-full flex-col items-center justify-between p-4">
        {/* Cabeçalho do mês */}
        <div className="mb-2 flex w-full max-w-[200px] items-center justify-between px-1">
          <span className="text-xs font-bold text-foreground">Junho</span>
          <span className="font-mono text-[10px] text-muted-foreground">2026</span>
        </div>

        {/* Grid de dias */}
        <div className="grid w-full max-w-[200px] grid-cols-7 gap-1">
          {weekDays.map((d, i) => (
            <span key={i} className="text-center text-[9px] font-bold text-muted-foreground">
              {d}
            </span>
          ))}

          {days.map((day) => {
            const isToday = day === currentDay;
            const hasEvent = events.includes(day);
            return (
              <div
                key={day}
                className={cn(
                  "relative flex h-6 w-full items-center justify-center rounded-md text-[10px] transition-all",
                  isToday
                    ? "z-10 scale-105 bg-primary font-bold text-primary-foreground shadow-lg"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {day}
                {hasEvent && (
                  <div
                    className={cn(
                      "absolute bottom-0.5 size-1 rounded-full",
                      isToday ? "bg-primary-foreground" : "bg-primary"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Próximo evento */}
        <div className="group mt-3 flex w-full cursor-pointer items-center gap-3 rounded-lg border border-border/60 bg-muted/40 p-2.5 transition-colors hover:border-primary/30">
          <div className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary">
            <Clock className="size-4" />
          </div>
          <div className="flex flex-col">
            <p className="flex items-center gap-1 text-[9px] font-medium text-muted-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" /> Agora
            </p>
            <p className="max-w-[120px] truncate text-[10px] font-semibold text-foreground">
              Reunião de Projeto
            </p>
          </div>
        </div>
      </div>
    </BaseCard>
  );
}
