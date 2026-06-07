"use client";

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Pencil,
  CalendarX2,
  MoreHorizontal,
  CalendarPlus,
  Tag as TagIcon
} from "lucide-react";
import { EntityConnectionsDialog } from "@/components/connect/entity-connections-dialog";
import { format, differenceInMinutes, startOfDay } from "date-fns";
import { EventForm } from "@/components/agenda/event-form";
import { EventDeleteButton } from "@/components/agenda/event-delete-button";
import { Prisma } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// --- TIPAGENS ---
type EventWithProject = Prisma.EventGetPayload<{
  include: { project: { select: { title: true; color: true } } };
}>;

interface EventListProps {
  groupedEvents: Record<string, EventWithProject[]>;
  sortedKeys: string[];
}

// Configurações do Grid
const START_HOUR = 6; // Inicia às 06:00
const END_HOUR = 23; // Termina às 23:00
const HOUR_HEIGHT = 80; // Cada hora ocupa 80 pixels de altura na tela

export function EventList({ groupedEvents, sortedKeys }: EventListProps) {

  // Tags & Anexos: um único diálogo global controlado por estado (sem Dialog no .map()).
  const [conn, setConn] = useState<{ id: string; title: string } | null>(null);

  // ✅ CORREÇÃO: O Hook useMemo agora está no topo, ANTES do 'if'
  const hours = useMemo(() => {
    const h = [];
    for (let i = START_HOUR; i <= END_HOUR; i++) {
      h.push(i);
    }
    return h;
  }, []);

  // Se não houver eventos na data atual, mostra o Empty State
  if (sortedKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/5 animate-in fade-in duration-500">
        <div className="h-20 w-20 bg-muted/30 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner border border-border/40">
          <CalendarX2 className="h-10 w-10 text-muted-foreground/30" />
        </div>
        <h3 className="font-black text-xl text-foreground uppercase tracking-tighter">Linha do Tempo Vazia</h3>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2 max-w-xs leading-relaxed opacity-60">
          Nenhum bloco de tempo alocado. A grade está livre.
        </p>
      </div>
    );
  }

  // Pegamos apenas o primeiro dia (o selecionado) para renderizar a grade
  const targetDateKey = sortedKeys[0];
  const dailyEvents = groupedEvents[targetDateKey];

  // Lógica de Posicionamento Matemático
  const getEventStyles = (event: EventWithProject) => {
    const eventStart = new Date(event.startTime);
    const eventEnd = event.endTime ? new Date(event.endTime) : new Date(eventStart.getTime() + 60 * 60 * 1000); // Default 1h
    
    const startOfDayRef = startOfDay(eventStart);
    startOfDayRef.setHours(START_HOUR, 0, 0, 0);

    // Calcula os minutos desde o início do grid (06:00)
    const minutesFromStart = differenceInMinutes(eventStart, startOfDayRef);
    const durationMinutes = differenceInMinutes(eventEnd, eventStart);

    // Posicionamento Top (em pixels)
    const top = (minutesFromStart / 60) * HOUR_HEIGHT;
    // Altura (em pixels)
    const height = Math.max((durationMinutes / 60) * HOUR_HEIGHT, 30); // Mínimo de 30px para não sumir

    return {
      top: `${top}px`,
      height: `${height}px`,
      backgroundColor: event.color ? `${event.color}15` : "hsl(var(--primary) / 0.1)",
      borderColor: event.color ? `${event.color}40` : "hsl(var(--primary) / 0.3)",
      color: event.color || "hsl(var(--primary))",
    };
  };

  return (
    <>
    <div className="relative w-full h-[800px] overflow-y-auto custom-scrollbar pr-2 animate-in fade-in duration-500">
        
        {/* LINHA DO TEMPO (Régua Vertical) */}
        <div className="relative w-full" style={{ height: `${(END_HOUR - START_HOUR + 1) * HOUR_HEIGHT}px` }}>
            
            {/* Linhas Horizontais (Background Grid) */}
            {hours.map((hour) => (
                <div 
                    key={hour} 
                    className="absolute w-full flex items-start"
                    style={{ top: `${(hour - START_HOUR) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                >
                    {/* Hora no eixo esquerdo */}
                    <div className="w-16 text-right pr-4 shrink-0 -mt-2.5">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">
                            {hour.toString().padStart(2, '0')}:00
                        </span>
                    </div>
                    {/* Divisória da grade */}
                    <div className="flex-1 border-t border-border/40 border-dashed" />
                </div>
            ))}

            {/* EVENTOS (Blocos Flutuantes) */}
            <div className="absolute left-16 right-0 top-0 bottom-0">
                {dailyEvents.map((event) => {
                    const styles = getEventStyles(event);
                    // Checa se o evento é muito pequeno para esconder o descritivo
                    const isCompact = parseFloat(styles.height) < 60; 

                    return (
                        <div
                            key={event.id}
                            className={cn(
                                "absolute left-4 right-4 rounded-xl border-l-4 p-3 shadow-sm transition-all hover:shadow-md hover:brightness-110 group overflow-hidden"
                            )}
                            style={{
                                top: styles.top,
                                height: styles.height,
                                backgroundColor: styles.backgroundColor,
                                borderLeftColor: styles.color,
                                borderTopColor: styles.borderColor,
                                borderRightColor: styles.borderColor,
                                borderBottomColor: styles.borderColor,
                                borderTopWidth: '1px',
                                borderRightWidth: '1px',
                                borderBottomWidth: '1px',
                            }}
                        >
                            {/* Conteúdo do Bloco */}
                            <div className="flex justify-between items-start h-full">
                                
                                <div className="flex flex-col min-w-0 h-full">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-sm truncate" style={{ color: styles.color }}>
                                            {event.title}
                                        </h4>
                                        {!isCompact && event.project && (
                                            <Badge variant="outline" className="text-[8px] h-4 px-1.5 uppercase font-black bg-background/50 hidden sm:flex border-current" style={{ color: styles.color }}>
                                                {event.project.title}
                                            </Badge>
                                        )}
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-[10px] font-bold text-foreground/60 uppercase tracking-widest">
                                            {format(new Date(event.startTime), "HH:mm")} - {event.endTime ? format(new Date(event.endTime), "HH:mm") : '...'}
                                        </span>
                                        {!isCompact && event.location && (
                                            <span className="text-[10px] font-bold text-foreground/50 truncate flex items-center gap-1">
                                                <MapPin className="h-3 w-3" /> {event.location}
                                            </span>
                                        )}
                                    </div>

                                    {!isCompact && event.description && (
                                        <p className="text-xs text-foreground/70 line-clamp-1 mt-2 font-medium">
                                            {event.description}
                                        </p>
                                    )}
                                </div>

                                {/* Menu de Ações (Aparece no Hover) */}
                                <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-lg border border-border/40 shadow-sm shrink-0">
                                    <Dialog>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7 text-foreground hover:text-primary">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-40 rounded-xl border-border/40 shadow-xl">
                                                <DialogTrigger asChild>
                                                    <DropdownMenuItem className="gap-2 cursor-pointer font-bold text-xs uppercase tracking-widest">
                                                        <Pencil className="h-3.5 w-3.5" /> Editar
                                                    </DropdownMenuItem>
                                                </DialogTrigger>
                                                <DropdownMenuItem
                                                    className="gap-2 cursor-pointer font-bold text-xs uppercase tracking-widest"
                                                    onClick={() => setConn({ id: event.id, title: event.title })}
                                                >
                                                    <TagIcon className="h-3.5 w-3.5" /> Tags & Anexos
                                                </DropdownMenuItem>
                                                <div className="p-1">
                                                    <EventDeleteButton
                                                        eventId={event.id}
                                                        eventTitle={event.title}
                                                        className="w-full justify-start text-rose-500 hover:text-white hover:bg-rose-500 h-8 px-2"
                                                    />
                                                </div>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        {/* Modal de Edição */}
                                        <DialogContent size="md">
                                            <DialogHeader
                                                icon={<CalendarPlus className="h-5 w-5" />}
                                                title="Editar Evento"
                                                description="Atualizar linha do tempo"
                                            />
                                            <DialogBody>
                                                <EventForm
                                                    initialData={{
                                                        id: event.id,
                                                        title: event.title,
                                                        startTime: event.startTime,
                                                        endTime: event.endTime,
                                                        description: event.description || null,
                                                        location: event.location || null,
                                                        color: event.color || null,
                                                        projectId: event.projectId || "none",
                                                    }}
                                                />
                                            </DialogBody>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>

    <EntityConnectionsDialog
      entityType="event"
      item={conn}
      onOpenChange={(o) => !o && setConn(null)}
    />
    </>
  );
}