"use client";

import { useEffect, useMemo, useState } from "react";
import { RoutineItem } from "@prisma/client";
import { Sun, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORIES, CategoryKey } from "./routine-config";
import { EditRoutineDialog } from "./edit-routine-dialog";

// --- ROUTINE GRID (TIMEBLOCKING) ---
const START_HOUR = 5; // 05:00
const END_HOUR = 23; // 23:00
const HOUR_HEIGHT = 80;

function minutesOf(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function blockMinutes(startTime: string, endTime: string): number {
  let d = minutesOf(endTime) - minutesOf(startTime);
  if (d < 0) d += 24 * 60; // bloco que cruza a meia-noite
  return d;
}

function formatDuration(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}min`;
  return m > 0 ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

export function RoutineGrid({ items, isToday = false }: { items: RoutineItem[]; isToday?: boolean }) {
  const hours = useMemo(() => {
    const h = [];
    for (let i = START_HOUR; i <= END_HOUR; i++) h.push(i);
    return h;
  }, []);

  // Resumo do dia: total agendado + categorias presentes (para a legenda).
  const { totalMinutes, usedCategories } = useMemo(() => {
    const used = new Set<CategoryKey>();
    let total = 0;
    for (const item of items) {
      total += blockMinutes(item.startTime, item.endTime);
      const key = item.category && CATEGORIES[item.category as CategoryKey] ? (item.category as CategoryKey) : "study";
      used.add(key);
    }
    return { totalMinutes: total, usedCategories: [...used] };
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20 text-muted-foreground/40 text-center">
        <Sun className="h-16 w-16 mb-4 opacity-50" />
        <h4 className="text-xl font-black uppercase tracking-tighter text-foreground/50">Dia Livre</h4>
        <p className="text-[10px] font-bold uppercase tracking-widest mt-2">Nenhum protocolo para hoje</p>
      </div>
    );
  }

  const getStyle = (start: string, end: string) => {
    const startMins = minutesOf(start) - START_HOUR * 60;
    const durationMins = blockMinutes(start, end);

    return {
      top: `${(startMins / 60) * HOUR_HEIGHT}px`,
      height: `${Math.max((durationMins / 60) * HOUR_HEIGHT, 40)}px`,
    };
  };

  return (
    <div className="flex h-full flex-col">
      {/* RESUMO DO DIA + LEGENDA */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/10 px-4 py-2.5 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground tabular-nums">
            {items.length} {items.length === 1 ? "bloco" : "blocos"}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
            {formatDuration(totalMinutes)} agendadas
          </span>
          {isToday && (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">Hoje</span>
          )}
        </div>

        <div className="hidden items-center gap-2.5 sm:flex">
          {usedCategories.map((key) => {
            const theme = CATEGORIES[key];
            return (
              <span key={key} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", theme.bgClass.replace("/10", "/60"))} />
                <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/70">{theme.label}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* TIMELINE */}
      <div className="relative w-full flex-1 overflow-y-auto custom-scrollbar p-4">
        <div className="relative w-full" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
          {/* Background Régua */}
          {hours.map((hour) => (
            <div key={hour} className="absolute w-full flex items-start" style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
              <div className="w-14 text-right pr-3 shrink-0 -mt-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">{hour.toString().padStart(2, "0")}:00</span>
              </div>
              <div className="flex-1 border-t border-border/40 border-dashed" />
            </div>
          ))}

          {/* Linha do "Agora" (só no dia de hoje) */}
          {isToday && <NowLine startHour={START_HOUR} endHour={END_HOUR} hourHeight={HOUR_HEIGHT} />}

          {/* Blocos de Rotina */}
          <div className="absolute left-14 right-2 top-0 bottom-0">
            {items.map((item) => {
              const styleProps = getStyle(item.startTime, item.endTime);
              const catKey = item.category && CATEGORIES[item.category as CategoryKey] ? (item.category as CategoryKey) : "study";
              const theme = CATEGORIES[catKey];
              const Icon = theme.icon;
              const isCompact = parseFloat(styleProps.height) <= 50;

              return (
                <EditRoutineDialog key={item.id} item={item}>
                  <div
                    className={cn(
                      "absolute left-2 right-2 rounded-xl border p-2.5 shadow-sm transition-all hover:shadow-lg hover:z-10 group cursor-pointer overflow-hidden",
                      theme.bgClass, theme.borderClass,
                    )}
                    style={styleProps}
                  >
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2", theme.bgClass.replace("/10", "/50"))} />

                    <div className="flex justify-between items-start h-full pl-2">
                      <div className="flex flex-col min-w-0 h-full">
                        <div className="flex items-center gap-2">
                          <Icon className={cn("h-3 w-3 shrink-0", theme.colorClass)} />
                          <h4 className="font-bold text-xs truncate text-foreground leading-tight">{item.title}</h4>
                        </div>

                        {!isCompact && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className={cn("text-[9px] font-black uppercase tracking-wider", theme.colorClass)}>{theme.label}</span>
                            <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest tabular-nums border-l border-border pl-2">
                              {item.startTime} - {item.endTime}
                            </span>
                          </div>
                        )}

                        {!isCompact && item.description && (
                          <p className="text-[10px] text-muted-foreground/80 line-clamp-1 mt-1.5 font-medium">{item.description}</p>
                        )}
                      </div>

                      <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-background/50 rounded-md p-1 backdrop-blur-sm">
                        <Edit2 className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                </EditRoutineDialog>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Marcador da hora atual (estilo Google Calendar). Atualiza a cada minuto.
// O primeiro tick vem de um requestAnimationFrame (callback assíncrono), então não
// renderiza no SSR — evita mismatch de hidratação e setState síncrono no efeito.
function NowLine({ startHour, endHour, hourHeight }: { startHour: number; endHour: number; hourHeight: number }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const raf = requestAnimationFrame(tick);
    const id = setInterval(tick, 60_000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  if (!now) return null;
  const h = now.getHours();
  if (h < startHour || h > endHour) return null;

  const minutes = (h - startHour) * 60 + now.getMinutes();
  const top = (minutes / 60) * hourHeight;
  const label = `${String(h).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="pointer-events-none absolute left-0 right-2 z-20 flex items-center" style={{ top: `${top}px` }}>
      <span className="w-14 shrink-0 pr-2 text-right text-[8px] font-black uppercase tracking-widest text-rose-500 tabular-nums">
        {label}
      </span>
      <div className="relative flex-1">
        <div className="h-px w-full bg-rose-500" />
        <div className="absolute -left-1 -top-[3.5px] h-2 w-2 rounded-full bg-rose-500 ring-2 ring-background" />
      </div>
    </div>
  );
}
