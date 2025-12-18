"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Pencil,
  CalendarX2,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import { format } from "date-fns";
import { EventForm } from "@/components/agenda/event-form";
import { EventDeleteButton } from "@/components/agenda/event-delete-button";
import { Prisma } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DialogTrigger } from "@radix-ui/react-dialog";

// Tipo auxiliar para tipagem segura
type EventWithProject = Prisma.EventGetPayload<{
  include: { project: { select: { title: true; color: true } } };
}>;

interface EventListProps {
  groupedEvents: Record<string, EventWithProject[]>;
  sortedKeys: string[];
}

export function EventList({ groupedEvents, sortedKeys }: EventListProps) {
  if (sortedKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-border/60 rounded-xl bg-muted/5 animate-in fade-in zoom-in-95 duration-500">
        <div className="h-20 w-20 bg-muted/50 rounded-full flex items-center justify-center mb-6 shadow-sm ring-1 ring-border">
          <CalendarX2 className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h3 className="font-semibold text-lg text-foreground">Agenda Livre</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
          Nenhum compromisso agendado. Aproveite para focar em projetos ou
          descansar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 relative pl-4 md:pl-0">
      {/* Linha do tempo contínua (Mobile) */}
      <div className="absolute left-[19px] top-4 bottom-4 w-px bg-gradient-to-b from-primary/20 via-border to-transparent md:hidden" />

      {sortedKeys.map((dateKey) => (
        <div key={dateKey} className="group/date relative md:pl-0">
          {/* Cabeçalho da Data (Sticky) */}
          <div className="sticky top-20 z-10 mb-6 flex items-center gap-4 bg-background/95 backdrop-blur py-2">
            <div className="hidden md:flex h-3 w-3 rounded-full bg-primary ring-4 ring-primary/10" />
            <h3 className="text-xl font-bold capitalize text-foreground flex items-center gap-2">
              {dateKey}
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border/50">
                {groupedEvents[dateKey].length} eventos
              </span>
            </h3>
          </div>

          <div className="grid gap-4 pl-8 md:pl-7 border-l md:border-l-2 border-border/50 md:border-primary/10 ml-1 md:ml-[5px] space-y-4 md:space-y-0">
            {groupedEvents[dateKey].map((event) => {
              const eventColor = event.color || "hsl(var(--primary))";
              
              return (
                <div
                  key={event.id}
                  className="group relative flex flex-col sm:flex-row gap-0 sm:gap-6 p-0 sm:p-5 rounded-2xl bg-card border border-border/60 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden"
                >
                  {/* Indicador lateral colorido */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary transition-all group-hover:w-2"
                    style={{ backgroundColor: eventColor }}
                  />

                  {/* Coluna de Horário */}
                  <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:gap-1 p-4 sm:p-0 border-b sm:border-0 border-border/40 bg-muted/10 sm:bg-transparent min-w-[5.5rem]">
                    <div className="flex items-center gap-1.5 text-foreground font-bold text-lg sm:text-xl font-mono tracking-tight">
                      <Clock className="h-4 w-4 text-muted-foreground sm:hidden" />
                      {format(new Date(event.startTime), "HH:mm")}
                    </div>
                    {event.endTime && (
                      <span className="text-xs font-medium text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded-md">
                        até {format(new Date(event.endTime), "HH:mm")}
                      </span>
                    )}
                  </div>

                  {/* Conteúdo Principal */}
                  <div className="flex-1 p-4 sm:p-0 flex flex-col justify-center gap-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-bold text-base sm:text-lg text-foreground leading-tight group-hover:text-primary transition-colors">
                            {event.title}
                          </h4>
                          {event.project && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 px-2 border-primary/20 bg-primary/5 text-primary font-medium"
                              style={{
                                borderColor: event.project.color
                                  ? `${event.project.color}40`
                                  : undefined,
                                color: event.project.color || undefined,
                                backgroundColor: event.project.color
                                  ? `${event.project.color}10`
                                  : undefined,
                              }}
                            >
                              {event.project.title}
                            </Badge>
                          )}
                        </div>

                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                            {event.description}
                          </p>
                        )}
                      </div>

                      {/* Ações (Desktop: Hover / Mobile: Always visible via Menu) */}
                      <div className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-start">
                        <Dialog>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
                              >
                                <MoreHorizontal className="h-5 w-5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DialogTrigger asChild>
                                <DropdownMenuItem className="gap-2 cursor-pointer">
                                  <Pencil className="h-4 w-4" /> Editar
                                </DropdownMenuItem>
                              </DialogTrigger>
                              <div className="p-1">
                                {/* CORREÇÃO 2: Removida a prop 'variant' que não existia */}
                                <EventDeleteButton
                                  eventId={event.id}
                                  eventTitle={event.title}
                                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2 text-sm"
                                />
                              </div>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Modal de Edição */}
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle className="flex items-center gap-2">
                                <Pencil className="h-5 w-5 text-primary" />
                                Editar Compromisso
                              </DialogTitle>
                              <DialogDescription>
                                Atualize os detalhes do seu evento abaixo.
                              </DialogDescription>
                            </DialogHeader>
                            {/* CORREÇÃO 1: Removido 'endTime' do initialData */}
                            <EventForm
                              initialData={{
                                id: event.id,
                                title: event.title,
                                startTime: event.startTime,
                                description: event.description || null,
                                location: event.location || null,
                                color: event.color || null,
                                projectId: event.projectId || "none",
                              }}
                            />
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Rodapé do Card (Localização) */}
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3.5 w-3.5 text-primary/70" />
                        <span className="font-medium">{event.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}