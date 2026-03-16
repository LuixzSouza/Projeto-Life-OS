"use client";

import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Prisma } from "@prisma/client";
import { cn } from "@/lib/utils";

type EventWithProject = Prisma.EventGetPayload<{
  include: { project: { select: { title: true; color: true } } };
}>;

interface AgendaMonthGridProps {
  events: EventWithProject[];
  selectedDate: Date;
}

export function AgendaMonthGrid({ events, selectedDate }: AgendaMonthGridProps) {
  
  const days = useMemo(() => {
    const monthStart = startOfMonth(selectedDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [selectedDate]);

  const weekDaysHeader = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div className="flex flex-col h-full bg-background/50 animate-in fade-in duration-500">
      
      {/* HEADER DA SEMANA */}
      <div className="grid grid-cols-7 border-b border-border/40 bg-muted/10 shrink-0">
        {weekDaysHeader.map(day => (
          <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground border-r border-border/20 last:border-r-0">
            {day}
          </div>
        ))}
      </div>

      {/* CORPO DO MÊS */}
      <div className="flex-1 grid grid-cols-7 grid-rows-5 overflow-hidden">
        {days.map((day, idx) => {
          const isCurrentMonth = isSameMonth(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          const dailyEvents = events.filter(e => isSameDay(new Date(e.startTime), day));

          return (
            <div 
              key={day.toISOString()} 
              className={cn(
                "border-r border-b border-border/20 p-1 sm:p-2 overflow-hidden flex flex-col transition-colors hover:bg-muted/10",
                !isCurrentMonth && "bg-muted/5 opacity-50",
                isToday && "bg-primary/5"
              )}
            >
              {/* Dia Numérico */}
              <div className="flex justify-between items-start mb-1">
                <span className={cn(
                  "h-6 w-6 sm:h-7 sm:w-7 flex items-center justify-center rounded-full text-[10px] sm:text-xs font-black tabular-nums",
                  isToday ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                )}>
                  {format(day, "d")}
                </span>
              </div>

              {/* Lista de Eventos no Dia */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-1">
                {dailyEvents.map(event => (
                  <div 
                    key={event.id}
                    className="px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-bold truncate transition-all cursor-pointer hover:opacity-80"
                    style={{
                      backgroundColor: event.color ? `${event.color}20` : "hsl(var(--primary) / 0.2)",
                      color: event.color || "hsl(var(--primary))",
                      borderLeft: `2px solid ${event.color || "hsl(var(--primary))"}`
                    }}
                    title={event.title}
                  >
                    {format(new Date(event.startTime), "HH:mm")} {event.title}
                  </div>
                ))}
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
}