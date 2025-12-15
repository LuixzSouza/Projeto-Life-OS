"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Pencil, CalendarX2 } from "lucide-react";
import { format } from "date-fns";
import { EventForm } from "@/components/agenda/event-form";
import { EventDeleteButton } from "@/components/agenda/event-delete-button";
import { Prisma } from "@prisma/client";

// Tipo auxiliar para tipagem segura
type EventWithProject = Prisma.EventGetPayload<{
    include: { project: { select: { title: true, color: true } } }
}>;

interface EventListProps {
  groupedEvents: Record<string, EventWithProject[]>;
  sortedKeys: string[];
}

export function EventList({ groupedEvents, sortedKeys }: EventListProps) {
  if (sortedKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
        <div className="h-16 w-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
          <CalendarX2 className="h-8 w-8 opacity-50" />
        </div>
        <p className="font-medium text-foreground">Agenda livre.</p>
        <p className="text-sm">Aproveite o tempo livre ou planeje algo novo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {sortedKeys.map(dateKey => (
        <div key={dateKey} className="relative pl-6 border-l-2 border-border space-y-6">
          {/* Bolinha na linha do tempo */}
          <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-4 border-muted-foreground/30"></div>
          
          <div>
            <h3 className="font-bold text-lg capitalize mb-4 leading-none text-foreground transform -translate-y-1">
                {dateKey}
            </h3>
            
            <div className="grid gap-3">
              {groupedEvents[dateKey].map(event => (
                <div key={event.id} className="group relative flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:shadow-md hover:border-primary/20 transition-all duration-300">
                    
                    {/* Barra de Cor */}
                    <div className="w-1.5 h-12 rounded-full shrink-0" style={{ backgroundColor: event.color || 'hsl(var(--primary))' }} />
                    
                    {/* Hora */}
                    <div className="flex flex-col w-16 shrink-0">
                        <span className="text-lg font-bold text-foreground">
                            {format(new Date(event.startTime), 'HH:mm')}
                        </span>
                        {event.endTime && (
                            <span className="text-xs text-muted-foreground">
                                - {format(new Date(event.endTime), 'HH:mm')}
                            </span>
                        )}
                    </div>
                    
                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                            <h4 className="font-semibold text-foreground truncate">{event.title}</h4>
                            {event.project && (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-border text-muted-foreground font-normal">
                                    {event.project.title}
                                </Badge>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            {event.location && (
                                <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" /> {event.location}
                                </span>
                            )}
                            {event.description && (
                                <span className="truncate max-w-[200px] opacity-70">
                                    {event.description}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Ações (Hover) */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Dialog>
                            <DialogTrigger asChild>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10">
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[500px]">
                                <DialogHeader>
                                    <DialogTitle>Editar Compromisso</DialogTitle>
                                    <DialogDescription>Atualize os detalhes.</DialogDescription>
                                </DialogHeader>
                                <EventForm initialData={{
                                    id: event.id,
                                    title: event.title,
                                    startTime: event.startTime,
                                    description: event.description || null,
                                    location: event.location || null,
                                    color: event.color || null
                                }} /> 
                            </DialogContent>
                        </Dialog>
                        <EventDeleteButton eventId={event.id} eventTitle={event.title} />
                    </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}