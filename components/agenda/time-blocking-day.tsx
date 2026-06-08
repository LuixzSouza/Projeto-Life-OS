"use client";

// Grade de Time-Blocking (visão Dia): eixo de horas onde os seus Eventos viram
// blocos posicionados. Clicar num slot vazio cria um bloco já com o horário; cada
// bloco tem ▶ Foco (dispara o Pomodoro vinculado ao bloco). Um único Dialog
// controlado por estado faz criar/editar — sem <Dialog> dentro do .map (CLAUDE.md).

import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  format, addDays, isSameDay, differenceInMinutes, startOfDay,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Prisma } from "@prisma/client";
import {
  ChevronLeft, ChevronRight, Plus, Play, CalendarPlus, MapPin, CalendarRange,
  ListTodo, Check, Clock3, ChevronDown, CalendarPlus2, CheckCircle2, Circle, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { EventForm } from "@/components/agenda/event-form";
import { EventDeleteButton } from "@/components/agenda/event-delete-button";
import { ThemedDays } from "@/components/agenda/themed-days";
import { requestFocusStart } from "@/components/focus/focus-core";
import { type ThemedDayData } from "@/app/(dashboard)/agenda/themed-days-actions";
import { toggleTaskDone } from "@/app/(dashboard)/agenda/actions";
import { cn } from "@/lib/utils";

type EventWithProject = Prisma.EventGetPayload<{
  include: {
    project: { select: { title: true; color: true } };
    task: { select: { isDone: true; title: true } };
  };
}>;

type TaskWithProject = Prisma.TaskGetPayload<{
  include: { project: { select: { title: true; color: true } } };
}>;

const START_HOUR = 6;
const END_HOUR = 23;
const HOUR_HEIGHT = 64; // px por hora
const GRID_HEIGHT = (END_HOUR - START_HOUR + 1) * HOUR_HEIGHT;

interface CreatingState {
  start: Date;
  end: Date;
  taskId?: string;
  taskTitle?: string;
}

interface TimeBlockingDayProps {
  events: EventWithProject[];
  tasks: TaskWithProject[];
  themedDays: ThemedDayData[];
  selectedDateISO: string;
}

export function TimeBlockingDay({ events, tasks, themedDays, selectedDateISO }: TimeBlockingDayProps) {
  const router = useRouter();
  const cursor = useMemo(() => parseISO(selectedDateISO), [selectedDateISO]);
  const [day, setDay] = useState<Date>(cursor);

  // Diálogo único (criar OU editar) controlado por estado.
  const [editing, setEditing] = useState<EventWithProject | null>(null);
  const [creating, setCreating] = useState<CreatingState | null>(null);
  const [showTasks, setShowTasks] = useState(false);
  const [togglingTask, setTogglingTask] = useState<string | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Limites já carregados do servidor (mesma janela do mês da página). Navegar
  // para fora disso recarrega via URL — igual ao calendário unificado.
  const gridStart = useMemo(() => startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }), [cursor]);
  const gridEnd = useMemo(() => endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }), [cursor]);

  const goDay = useCallback((dir: number) => {
    const next = addDays(day, dir);
    if (next < gridStart || next > gridEnd) {
      router.push(`/agenda?date=${format(next, "yyyy-MM-dd")}`);
    } else {
      setDay(next);
    }
  }, [day, gridStart, gridEnd, router]);

  const dailyEvents = useMemo(
    () => events
      .filter((e) => isSameDay(new Date(e.startTime), day))
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime)),
    [events, day]
  );

  // Tarefas que já têm algum bloco na janela carregada (para marcar "agendada").
  const scheduledTaskIds = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) if (e.taskId) set.add(e.taskId);
    return set;
  }, [events]);

  // Pendentes primeiro as ainda não agendadas (foco em planejar o que falta).
  const sortedTasks = useMemo(
    () => [...tasks].sort((a, b) => Number(scheduledTaskIds.has(a.id)) - Number(scheduledTaskIds.has(b.id))),
    [tasks, scheduledTaskIds]
  );

  const hours = useMemo(() => {
    const h: number[] = [];
    for (let i = START_HOUR; i <= END_HOUR; i++) h.push(i);
    return h;
  }, []);

  const isToday = isSameDay(day, new Date());

  // Tema do dia atual (realce visual da grade).
  const theme = useMemo(() => themedDays.find((t) => t.weekday === day.getDay()) ?? null, [themedDays, day]);
  const themeColor = theme?.color ?? null;

  // Conclui/reabre a tarefa vinculada direto do bloco.
  const toggleTask = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTogglingTask(taskId);
    try {
      await toggleTaskDone(taskId);
      router.refresh();
    } finally {
      setTogglingTask(null);
    }
  };

  // Rola para um horário útil ao abrir/trocar de dia (hora atual no hoje, senão 8h).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const focusHour = isToday ? new Date().getHours() : 8;
    el.scrollTop = Math.max(0, (focusHour - START_HOUR) * HOUR_HEIGHT - 80);
  }, [day, isToday]);

  // Posição/altura de um bloco (clampado para nunca escapar da grade).
  const blockStyle = (event: EventWithProject) => {
    const s = new Date(event.startTime);
    const e = event.endTime ? new Date(event.endTime) : new Date(s.getTime() + 3_600_000);
    const ref = startOfDay(s);
    ref.setHours(START_HOUR, 0, 0, 0);
    const fromStart = differenceInMinutes(s, ref);
    const dur = Math.max(15, differenceInMinutes(e, s));
    const rawTop = (fromStart / 60) * HOUR_HEIGHT;
    const top = Math.max(0, rawTop);
    const maxH = GRID_HEIGHT - top;
    const height = Math.min(maxH, Math.max((dur / 60) * HOUR_HEIGHT, 26));
    return { top, height, color: event.color || "#6366f1" };
  };

  // Clique num slot vazio → cria bloco com horário arredondado em 15 min.
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return;
    const rect = gridRef.current.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const totalMin = (y / HOUR_HEIGHT) * 60;
    const snapped = Math.max(0, Math.round(totalMin / 15) * 15);
    const start = startOfDay(day);
    start.setMinutes(START_HOUR * 60 + snapped);
    const end = new Date(start.getTime() + 3_600_000);
    setCreating({ start, end });
  };

  const startFocus = (event: EventWithProject, e: React.MouseEvent) => {
    e.stopPropagation();
    const s = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(s.getTime() + 3_600_000);
    const mins = Math.max(5, differenceInMinutes(end, s));
    // Se o bloco veio de uma tarefa, o foco também credita a tarefa.
    requestFocusStart({ label: event.title, eventId: event.id, taskId: event.taskId ?? undefined, focusMin: mins });
    toast.success(`Foco iniciado: ${event.title}`, { description: `${mins} min — veja o timer no canto.` });
  };

  // Agenda uma tarefa: abre o diálogo de criação com horário/duração sugeridos e
  // o vínculo com a tarefa. Início = próxima hora cheia (hoje) ou 9h; duração =
  // estimativa da tarefa (clampada) ou 60 min.
  const scheduleTask = (task: TaskWithProject) => {
    const start = startOfDay(day);
    if (isToday) {
      const nextHour = Math.min(END_HOUR, Math.max(START_HOUR, new Date().getHours() + 1));
      start.setHours(nextHour, 0, 0, 0);
    } else {
      start.setHours(9, 0, 0, 0);
    }
    const dur = Math.min(240, Math.max(15, task.estimatedTime ?? 60));
    setShowTasks(false);
    setCreating({ start, end: new Date(start.getTime() + dur * 60_000), taskId: task.id, taskTitle: task.title });
  };

  const closeDialog = () => { setEditing(null); setCreating(null); };
  const dialogOpen = !!(editing || creating);

  // Linha do "agora" (só no dia de hoje).
  const nowTop = (() => {
    if (!isToday) return null;
    const now = new Date();
    const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
    if (mins < 0 || mins > (END_HOUR - START_HOUR + 1) * 60) return null;
    return (mins / 60) * HOUR_HEIGHT;
  })();

  return (
    <div className="flex h-full flex-col">
      {/* TOOLBAR */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goDay(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <h2 className="ml-1 text-base font-bold capitalize" style={themeColor ? { color: themeColor } : undefined}>
            {format(day, "EEEE, d 'de' MMM", { locale: ptBR })}
          </h2>
          {isToday && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">Hoje</span>}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTasks((v) => !v)}
            className={cn("h-9 rounded-xl px-3 text-[10px] font-black uppercase tracking-widest", showTasks && "border-primary/40 bg-primary/5 text-primary")}
          >
            <ListTodo className="mr-1.5 h-4 w-4" /> Tarefas
            {tasks.length > 0 && <span className="ml-1.5 rounded-full bg-primary/15 px-1.5 text-[10px] tabular-nums text-primary">{tasks.length}</span>}
            <ChevronDown className={cn("ml-1 h-3.5 w-3.5 transition-transform", showTasks && "rotate-180")} />
          </Button>
          <Button
            onClick={() => {
              const start = startOfDay(day);
              start.setHours(9, 0, 0, 0);
              setCreating({ start, end: new Date(start.getTime() + 3_600_000) });
            }}
            className="h-9 rounded-xl bg-foreground px-4 text-[10px] font-black uppercase tracking-widest text-background hover:bg-primary hover:text-white"
          >
            <Plus className="mr-1.5 h-4 w-4 stroke-[3]" /> Bloco
          </Button>
        </div>
      </div>

      {/* PAINEL: TAREFAS A AGENDAR */}
      {showTasks && (
        <div className="max-h-52 overflow-y-auto border-b border-border/40 bg-muted/10 px-3 py-2.5">
          {sortedTasks.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">Nenhuma tarefa pendente. Tudo em dia! 🎉</p>
          ) : (
            <div className="space-y-1.5">
              {sortedTasks.map((t) => {
                const scheduled = scheduledTaskIds.has(t.id);
                return (
                  <div key={t.id} className="flex items-center gap-2 rounded-xl border border-border/40 bg-card px-3 py-2 shadow-sm">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: t.project?.color ?? "#6366f1" }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{t.title}</p>
                      <p className="flex items-center gap-1.5 truncate text-[10px] text-muted-foreground">
                        {t.project?.title && <span className="truncate">{t.project.title}</span>}
                        {t.estimatedTime ? <span className="inline-flex items-center gap-0.5"><Clock3 className="h-2.5 w-2.5" />{t.estimatedTime} min</span> : null}
                        {scheduled && <span className="inline-flex items-center gap-0.5 font-bold text-emerald-500"><Check className="h-2.5 w-2.5" />agendada</span>}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={scheduled ? "ghost" : "outline"}
                      onClick={() => scheduleTask(t)}
                      className="h-8 shrink-0 rounded-lg px-2.5 text-[10px] font-black uppercase tracking-wider"
                    >
                      <CalendarPlus2 className="mr-1 h-3.5 w-3.5" /> Agendar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BANNER DO DIA TEMÁTICO */}
      <ThemedDays themedDays={themedDays} weekday={day.getDay()} />

      {/* DICA */}
      <div className="flex items-center gap-1.5 border-b border-border/40 px-4 py-1.5 text-[11px] text-muted-foreground/70">
        <CalendarRange className="h-3 w-3" />
        Toque num horário livre para criar um bloco · ▶ inicia o foco
      </div>

      {/* GRADE */}
      <div ref={scrollRef} className="custom-scrollbar flex-1 overflow-y-auto">
        <div className="flex" style={{ height: GRID_HEIGHT }}>
          {/* Eixo de horas */}
          <div className="relative w-14 shrink-0 border-r border-border/40">
            {hours.map((h) => (
              <div key={h} className="absolute -mt-2 w-full pr-2 text-right" style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}>
                <span className="text-[10px] font-bold tabular-nums text-muted-foreground/50">{String(h).padStart(2, "0")}:00</span>
              </div>
            ))}
          </div>

          {/* Coluna do dia (alvo de clique) — leve wash com a cor do tema do dia */}
          <div ref={gridRef} onClick={handleGridClick} className="relative flex-1 cursor-copy" style={themeColor ? { backgroundColor: `${themeColor}0a` } : undefined}>
            {/* Linhas das horas */}
            {hours.map((h) => (
              <div
                key={h}
                className="pointer-events-none absolute w-full border-t border-dashed border-border/40"
                style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
              />
            ))}

            {/* Linha do agora */}
            {nowTop != null && (
              <div className="pointer-events-none absolute left-0 right-0 z-20 flex items-center" style={{ top: nowTop }}>
                <span className="h-2 w-2 rounded-full bg-rose-500 shadow" />
                <span className="h-px flex-1 bg-rose-500/70" />
              </div>
            )}

            {/* Blocos */}
            {dailyEvents.map((event) => {
              const { top, height, color } = blockStyle(event);
              const compact = height < 46;
              const done = !!event.task?.isDone;
              const toggling = togglingTask === event.taskId;
              return (
                <div
                  key={event.id}
                  onClick={(e) => { e.stopPropagation(); setEditing(event); }}
                  className={cn(
                    "group absolute left-1.5 right-2 z-10 cursor-pointer overflow-hidden rounded-lg border border-l-4 p-2 shadow-sm transition-all hover:shadow-md hover:brightness-[1.03]",
                    done && "opacity-60"
                  )}
                  style={{
                    top, height,
                    backgroundColor: `${color}14`,
                    borderColor: `${color}33`,
                    borderLeftColor: color,
                  }}
                >
                  <div className="flex h-full items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className={cn("flex items-center gap-1 truncate text-xs font-bold leading-tight", done && "line-through")} style={{ color }}>
                        {event.taskId && <ListTodo className="h-3 w-3 shrink-0 opacity-80" />}
                        <span className="truncate">{event.title}</span>
                      </p>
                      {!compact && (
                        <p className="mt-0.5 truncate text-[10px] font-semibold text-foreground/55">
                          {format(new Date(event.startTime), "HH:mm")}
                          {event.endTime ? `–${format(new Date(event.endTime), "HH:mm")}` : ""}
                          {event.location ? <span className="ml-1 inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{event.location}</span> : null}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      {/* ✓ Concluir tarefa (só em bloco vindo de tarefa) */}
                      {event.taskId && (
                        <button
                          onClick={(e) => toggleTask(event.taskId!, e)}
                          disabled={toggling}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-md transition-transform hover:scale-110 active:scale-90",
                            done ? "text-emerald-500" : "text-foreground/40 hover:text-emerald-500"
                          )}
                          title={done ? "Reabrir tarefa" : "Concluir tarefa"}
                          aria-label={done ? "Reabrir tarefa" : "Concluir tarefa"}
                        >
                          {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                        </button>
                      )}
                      {/* ▶ Foco */}
                      <button
                        onClick={(e) => startFocus(event, e)}
                        className="flex h-6 w-6 items-center justify-center rounded-md text-background opacity-100 shadow transition-transform hover:scale-110 active:scale-90 md:opacity-0 md:group-hover:opacity-100"
                        style={{ backgroundColor: color }}
                        title="Iniciar foco neste bloco"
                        aria-label="Iniciar foco"
                      >
                        <Play className="ml-0.5 h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Estado vazio sobreposto (não bloqueia o clique para criar) */}
            {dailyEvents.length === 0 && (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center">
                <p className="text-sm font-semibold text-muted-foreground/70">Dia livre</p>
                <p className="mt-1 text-xs text-muted-foreground/50">Toque num horário para reservar seu primeiro bloco.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DIÁLOGO ÚNICO: criar ou editar. O "excluir" fica no cabeçalho da edição
          (não empilha altura abaixo do form, que já tem seu próprio scroll). */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent size="md" className="p-0">
          {editing ? (
            <>
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/40 bg-muted/10 px-5 py-4 pr-14 sm:px-8">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shadow-sm">
                    <CalendarPlus className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle>Editar bloco</DialogTitle>
                    <DialogDescription>Atualizar alocação de tempo</DialogDescription>
                  </div>
                </div>
                <EventDeleteButton eventId={editing.id} eventTitle={editing.title} variant="ghost" />
              </div>
              <EventForm
                onClose={closeDialog}
                initialData={{
                  id: editing.id,
                  title: editing.title,
                  startTime: editing.startTime,
                  endTime: editing.endTime,
                  description: editing.description || null,
                  location: editing.location || null,
                  color: editing.color || null,
                  projectId: editing.projectId || null,
                }}
              />
            </>
          ) : creating ? (
            <>
              <DialogHeader
                icon={<CalendarPlus className="h-5 w-5" />}
                title="Novo bloco"
                description="Reservar um bloco na linha do tempo"
              />
              <EventForm
                onClose={closeDialog}
                defaultStart={creating.start}
                defaultEnd={creating.end}
                taskId={creating.taskId}
                taskTitle={creating.taskTitle}
              />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
