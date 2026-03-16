"use client";

import { useMemo } from "react";
import { format, addDays, startOfWeek, differenceInMinutes, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Prisma } from "@prisma/client";
import { cn } from "@/lib/utils";

type EventWithProject = Prisma.EventGetPayload<{
  include: { project: { select: { title: true; color: true } } };
}>;

interface AgendaWeekGridProps {
  events: EventWithProject[];
  selectedDate: Date;
}

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_HEIGHT = 60; // Um pouco menor que o diário para caber melhor na tela

export function AgendaWeekGrid({ events, selectedDate }: AgendaWeekGridProps) {
  // Pega o domingo da semana atual
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  
  // Gera os 7 dias da semana
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Gera a régua de horas
  const hours = useMemo(() => {
    const h = [];
    for (let i = START_HOUR; i <= END_HOUR; i++) h.push(i);
    return h;
  }, []);

  const getEventStyles = (event: EventWithProject, dayStart: Date) => {
    const eventStart = new Date(event.startTime);
    const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 60 * 60 * 1000);
    
    const dayRef = new Date(dayStart);
    dayRef.setHours(START_HOUR, 0, 0, 0);

    const minutesFromStart = differenceInMinutes(eventStart, dayRef);
    const durationMinutes = differenceInMinutes(eventEnd, eventStart);

    return {
      top: `${(minutesFromStart / 60) * HOUR_HEIGHT}px`,
      height: `${Math.max((durationMinutes / 60) * HOUR_HEIGHT, 24)}px`, // Min 24px
      backgroundColor: event.color ? `${event.color}20` : "hsl(var(--primary) / 0.2)",
      borderLeftColor: event.color || "hsl(var(--primary))",
    };
  };

  return (
    <div className="flex flex-col h-full bg-background/50 animate-in fade-in duration-500">
      
      {/* HEADER DOS DIAS (Dom, Seg, Ter...) */}
      <div className="flex border-b border-border/40 bg-muted/10 pr-2">
        <div className="w-12 shrink-0 border-r border-border/40" /> {/* Espaço das horas */}
        {weekDays.map(day => {
          const isToday = isSameDay(day, new Date());
          return (
            <div key={day.toISOString()} className={cn("flex-1 flex flex-col items-center py-3 border-r border-border/20 last:border-r-0", isToday && "bg-primary/5")}>
              <span className={cn("text-[9px] font-black uppercase tracking-widest", isToday ? "text-primary" : "text-muted-foreground")}>
                {format(day, "EEE", { locale: ptBR })}
              </span>
              <span className={cn("text-lg font-black mt-1", isToday ? "text-primary" : "text-foreground")}>
                {format(day, "dd")}
              </span>
            </div>
          );
        })}
      </div>

      {/* CORPO DA GRADE (Rolável) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar relative">
        <div className="flex relative" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
          
          {/* Eixo Y (Horas) */}
          <div className="w-12 shrink-0 border-r border-border/40 relative bg-background z-10">
            {hours.map(hour => (
              <div key={`h-${hour}`} className="absolute w-full text-center -mt-2" style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }}>
                <span className="text-[9px] font-bold text-muted-foreground/50">{hour.toString().padStart(2, '0')}</span>
              </div>
            ))}
          </div>

          {/* Colunas dos Dias (Grid) */}
          <div className="flex-1 flex relative">
            {/* Linhas Horizontais de Fundo */}
            {hours.map(hour => (
              <div key={`line-${hour}`} className="absolute w-full border-t border-border/40 border-dashed pointer-events-none" style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px` }} />
            ))}

            {/* Colunas Verticais e Eventos */}
            {weekDays.map(day => {
              // Filtra eventos para esta coluna (este dia)
              const dailyEvents = events.filter(e => isSameDay(new Date(e.startTime), day));
              
              return (
                <div key={`col-${day.toISOString()}`} className="flex-1 relative border-r border-border/20 last:border-r-0">
                  {dailyEvents.map(event => {
                    const styles = getEventStyles(event, day);
                    const isCompact = parseFloat(styles.height) < 40;
                    
                    return (
                      <div
                        key={event.id}
                        className="absolute left-1 right-1 rounded-md border-l-4 p-1.5 overflow-hidden shadow-sm hover:z-20 hover:shadow-md transition-all cursor-pointer group"
                        style={styles}
                        title={event.title}
                      >
                        <p className={cn("font-bold text-[10px] leading-tight truncate text-foreground/90 group-hover:text-foreground", isCompact && "truncate")}>
                          {event.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}