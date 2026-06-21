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
  ListTodo, Check, Clock3, ChevronDown, CalendarPlus2, CheckCircle2, Circle, Loader2, X,
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
import { toggleTaskDone, moveEvent } from "@/app/(dashboard)/agenda/actions";
import { agendaUrl } from "@/components/agenda/agenda-shared";
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
const TOTAL_MIN = (END_HOUR - START_HOUR + 1) * 60;
const SNAP_MIN = 15;

/** Arraste em andamento (#3 do roadmap): mover o bloco ou redimensionar pelo pé. */
interface DragState {
  id: string;
  mode: "move" | "resize";
  startY: number;       // Y do ponteiro quando o arraste começou
  origStartMin: number; // minutos desde o topo da grade (START_HOUR)
  origDurMin: number;
  deltaMin: number;     // deslocamento atual já com snap
  moved: boolean;       // passou do limiar (diferencia arraste de clique)
}

/** Aplica o delta do arraste com clamps (não escapa da grade, mínimo 15min). */
function appliedDrag(d: DragState): { startMin: number; durMin: number } {
  if (d.mode === "move") {
    const startMin = Math.min(TOTAL_MIN - d.origDurMin, Math.max(0, d.origStartMin + d.deltaMin));
    return { startMin, durMin: d.origDurMin };
  }
  const durMin = Math.min(TOTAL_MIN - d.origStartMin, Math.max(SNAP_MIN, d.origDurMin + d.deltaMin));
  return { startMin: d.origStartMin, durMin };
}

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

  // Arraste (mouse): estado + espelho em ref (os handlers de window leem o ref).
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);
  useEffect(() => { dragRef.current = drag; }, [drag]);
  // Horários otimistas pós-arraste (até o refresh do servidor chegar).
  const [overrides, setOverrides] = useState<Map<string, { start: Date; end: Date }>>(new Map());
  // Depois de um arraste real, o click que o navegador dispara em seguida é ruído.
  const ignoreNextClickRef = useRef(false);

  const gridRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Limites já carregados do servidor (mesma janela do mês da página). Navegar
  // para fora disso recarrega via URL — igual ao calendário unificado.
  const gridStart = useMemo(() => startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 }), [cursor]);
  const gridEnd = useMemo(() => endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 }), [cursor]);

  const goDay = useCallback((dir: number) => {
    const next = addDays(day, dir);
    if (next < gridStart || next > gridEnd) {
      router.push(agendaUrl(format(next, "yyyy-MM-dd")));
    } else {
      setDay(next);
    }
  }, [day, gridStart, gridEnd, router]);

  // Dia inteiro (D2) fica fora da grade de horas — ele não ocupa um horário.
  const dailyEvents = useMemo(
    () => events
      .filter((e) => !e.isAllDay && isSameDay(new Date(e.startTime), day))
      .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime)),
    [events, day]
  );

  const allDayEvents = useMemo(
    () => events.filter((e) => e.isAllDay && isSameDay(new Date(e.startTime), day)),
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

  // Horários efetivos de um bloco: override otimista (pós-arraste) por cima dos
  // dados do servidor; e o delta AO VIVO se este bloco está sendo arrastado.
  const displayTimes = useCallback((event: EventWithProject): { s: Date; e: Date } => {
    const o = overrides.get(event.id);
    let s = o ? o.start : new Date(event.startTime);
    let e = o ? o.end : event.endTime ? new Date(event.endTime) : new Date(s.getTime() + 3_600_000);
    if (drag && drag.id === event.id && drag.moved) {
      const a = appliedDrag(drag);
      s = startOfDay(day);
      s.setMinutes(START_HOUR * 60 + a.startMin);
      e = new Date(s.getTime() + a.durMin * 60_000);
    }
    return { s, e };
  }, [overrides, drag, day]);

  // Dados novos do servidor → os horários otimistas saem de cena (adiado p/ fora
  // do corpo do effect, regra set-state-in-effect).
  useEffect(() => {
    const id = window.setTimeout(() => setOverrides((m) => (m.size > 0 ? new Map() : m)), 0);
    return () => window.clearTimeout(id);
  }, [events]);

  // ---- Sobreposição (#7): blocos que colidem dividem a largura em colunas ----
  // Algoritmo clássico: agrupa intervalos que se tocam (cluster) e, dentro do
  // cluster, cada bloco entra na primeira coluna livre. Usa os horários com
  // override otimista (pós-arraste), mas NÃO o delta ao vivo — relayout só no solto.
  const overlapLayout = useMemo(() => {
    interface Iv { id: string; s: number; e: number }
    const ivs: Iv[] = dailyEvents
      .map((ev) => {
        const o = overrides.get(ev.id);
        const s = o ? o.start : new Date(ev.startTime);
        const en = o ? o.end : ev.endTime ? new Date(ev.endTime) : new Date(s.getTime() + 3_600_000);
        const ref = startOfDay(s);
        ref.setHours(START_HOUR, 0, 0, 0);
        const sm = Math.max(0, differenceInMinutes(s, ref));
        return { id: ev.id, s: sm, e: sm + Math.max(SNAP_MIN, differenceInMinutes(en, s)) };
      })
      .sort((a, b) => a.s - b.s || b.e - a.e);

    const map = new Map<string, { col: number; cols: number }>();
    let cluster: Iv[] = [];
    let clusterEnd = -1;
    const flush = () => {
      if (cluster.length === 0) return;
      const colEnds: number[] = [];
      const colOf = new Map<string, number>();
      for (const iv of cluster) {
        let c = colEnds.findIndex((end) => end <= iv.s);
        if (c === -1) { c = colEnds.length; colEnds.push(iv.e); } else { colEnds[c] = iv.e; }
        colOf.set(iv.id, c);
      }
      for (const iv of cluster) map.set(iv.id, { col: colOf.get(iv.id)!, cols: colEnds.length });
      cluster = [];
    };
    for (const iv of ivs) {
      if (cluster.length > 0 && iv.s >= clusterEnd) flush();
      cluster.push(iv);
      clusterEnd = Math.max(clusterEnd, iv.e);
    }
    flush();
    return map;
  }, [dailyEvents, overrides]);

  // ---- Capacidade do dia (#8): orçamento de tempo da grade (6h–23h) ----
  const allocatedMin = useMemo(() => {
    let total = 0;
    for (const ev of dailyEvents) {
      const o = overrides.get(ev.id);
      const s = o ? o.start : new Date(ev.startTime);
      const en = o ? o.end : ev.endTime ? new Date(ev.endTime) : new Date(s.getTime() + 3_600_000);
      total += Math.max(SNAP_MIN, differenceInMinutes(en, s));
    }
    return total;
  }, [dailyEvents, overrides]);
  const capacityPct = Math.round((allocatedMin / TOTAL_MIN) * 100);
  const fmtHours = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h}h` : h === 0 ? `${m}min` : `${h}h${String(m).padStart(2, "0")}`;
  };

  // Posição/altura de um bloco (clampado para nunca escapar da grade).
  const blockStyle = (event: EventWithProject) => {
    const { s, e } = displayTimes(event);
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

  // ---- Arraste (#3 do roadmap): mover/redimensionar com snap de 15 min ----
  // Mouse: arraste direto. Touch: LONG-PRESS (~450ms) ativa o arraste — mover
  // antes disso é rolagem normal da grade; tap rápido continua sendo "editar".
  const activateDrag = useCallback((event: EventWithProject, mode: "move" | "resize", clientY: number) => {
    const s = new Date(event.startTime);
    const end = event.endTime ? new Date(event.endTime) : new Date(s.getTime() + 3_600_000);
    const ref = startOfDay(s);
    ref.setHours(START_HOUR, 0, 0, 0);
    setDrag({
      id: event.id,
      mode,
      startY: clientY,
      origStartMin: Math.max(0, differenceInMinutes(s, ref)),
      origDurMin: Math.max(SNAP_MIN, differenceInMinutes(end, s)),
      deltaMin: 0,
      moved: false,
    });
  }, []);

  const LONG_PRESS_MS = 450;
  const touchPress = useRef<{ timer: number; startX: number; startY: number } | null>(null);
  const cancelTouchPress = useCallback(() => {
    if (touchPress.current) {
      window.clearTimeout(touchPress.current.timer);
      touchPress.current = null;
    }
  }, []);

  const beginDrag = (event: EventWithProject, mode: "move" | "resize") => (e: React.PointerEvent) => {
    // Pressionar nos botões internos (✓ concluir, ▶ foco) não é arraste.
    if (mode === "move" && (e.target as HTMLElement).closest("button")) return;

    if (e.pointerType === "mouse") {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      activateDrag(event, mode, e.clientY);
      return;
    }

    // Touch/caneta: só "move" (a alça de resize é desktop) e só após long-press.
    if (mode !== "move") return;
    const startX = e.clientX;
    const startY = e.clientY;
    cancelTouchPress();
    const timer = window.setTimeout(() => {
      touchPress.current = null;
      ignoreNextClickRef.current = true; // o "click" do soltar não abre o diálogo
      navigator.vibrate?.(30);           // feedback tátil onde existir
      activateDrag(event, mode, startY);
    }, LONG_PRESS_MS);
    touchPress.current = { timer, startX, startY };
  };

  // Long-press pendente: mover o dedo (> 8px) ou soltar antes do tempo cancela
  // (a rolagem vence). Listeners leves, no-op quando não há press em andamento.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = touchPress.current;
      if (p && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 8) cancelTouchPress();
    };
    const onEnd = () => cancelTouchPress();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onEnd, { passive: true });
    window.addEventListener("pointercancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onEnd);
      window.removeEventListener("pointercancel", onEnd);
    };
  }, [cancelTouchPress]);

  const commitDrag = useCallback(async () => {
    const d = dragRef.current;
    setDrag(null);
    if (!d) return;
    // O click disparado logo após um arraste real não deve abrir diálogo nenhum.
    if (d.moved) ignoreNextClickRef.current = true;
    if (!d.moved || d.deltaMin === 0) return;
    const ev = events.find((x) => x.id === d.id);
    if (!ev) return;
    const a = appliedDrag(d);
    const newStart = startOfDay(day);
    newStart.setMinutes(START_HOUR * 60 + a.startMin);
    const newEnd = new Date(newStart.getTime() + a.durMin * 60_000);
    // Otimista: o bloco fica no lugar novo na hora; o servidor confirma depois.
    setOverrides((m) => new Map(m).set(d.id, { start: newStart, end: newEnd }));
    try {
      await moveEvent(d.id, newStart.toISOString(), newEnd.toISOString());
      toast.success(`"${ev.title}" → ${format(newStart, "HH:mm")}–${format(newEnd, "HH:mm")}`);
      router.refresh();
    } catch {
      setOverrides((m) => { const n = new Map(m); n.delete(d.id); return n; });
      toast.error("Não consegui reagendar o bloco.");
    }
  }, [events, day, router]);

  const isDraggingAny = drag !== null;
  useEffect(() => {
    if (!isDraggingAny) return;
    const onMove = (e: PointerEvent) => {
      setDrag((d) => {
        if (!d) return d;
        const rawDelta = ((e.clientY - d.startY) / HOUR_HEIGHT) * 60;
        const snapped = Math.round(rawDelta / SNAP_MIN) * SNAP_MIN;
        const moved = d.moved || Math.abs(e.clientY - d.startY) > 4;
        if (snapped === d.deltaMin && moved === d.moved) return d;
        return { ...d, deltaMin: snapped, moved };
      });
    };
    const onUp = () => { void commitDrag(); };
    // Touch: enquanto o arraste (long-press) está ativo, o dedo MOVE O BLOCO,
    // não a página — touchmove não-passivo cancela a rolagem. pointercancel
    // (gesto roubado pelo navegador) aborta sem gravar nada.
    const onTouchMove = (e: TouchEvent) => { e.preventDefault(); };
    const onCancel = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("pointercancel", onCancel);
    };
  }, [isDraggingAny, commitDrag]);

  // Clique num slot vazio → cria bloco com horário arredondado em 15 min.
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (ignoreNextClickRef.current) { ignoreNextClickRef.current = false; return; }
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

  // G15: a dica é treinamento, não mobília — depois de aprendida, dá pra dispensar.
  const HINT_KEY = "lifeos:agenda:blocks-hint-dismissed";
  const [hintDismissed, setHintDismissed] = useState(true); // SSR sem dica; aparece pós-hidratação se nunca dispensada
  useEffect(() => {
    try { setHintDismissed(window.localStorage.getItem(HINT_KEY) === "1"); } catch { setHintDismissed(false); }
  }, []);
  const dismissHint = () => {
    setHintDismissed(true);
    try { window.localStorage.setItem(HINT_KEY, "1"); } catch { /* noop */ }
  };

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
            <Button variant="outline" size="icon" aria-label="Dia anterior" className="h-8 w-8" onClick={() => goDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" aria-label="Próximo dia" className="h-8 w-8" onClick={() => goDay(1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <h2 className="ml-1 text-base font-bold capitalize" style={themeColor ? { color: themeColor } : undefined}>
            {format(day, "EEEE, d 'de' MMM", { locale: ptBR })}
          </h2>
          {isToday && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-primary">Hoje</span>}
          {/* #8: orçamento de tempo — dia irreal = frustração */}
          {allocatedMin > 0 && (
            <span
              className={cn(
                "hidden rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums sm:inline",
                capacityPct > 80 ? "bg-rose-500/10 text-rose-500" : capacityPct > 60 ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"
              )}
              title={`${fmtHours(allocatedMin)} alocadas das ${fmtHours(TOTAL_MIN)} úteis da grade (${capacityPct}%)`}
            >
              {fmtHours(allocatedMin)} · {capacityPct}%
            </span>
          )}
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

      {/* DIA INTEIRO (D2): chips acima da grade — não ocupam horário */}
      {allDayEvents.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-4 py-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60">Dia inteiro</span>
          {allDayEvents.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => setEditing(e)}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all hover:shadow-sm"
              style={{ backgroundColor: `${e.color || "#6366f1"}14`, borderColor: `${e.color || "#6366f1"}33`, color: e.color || "#6366f1" }}
            >
              {e.title}
            </button>
          ))}
        </div>
      )}

      {/* DICA (dismissível — G15) */}
      {!hintDismissed && (
        <div className="flex items-center gap-1.5 border-b border-border/40 px-4 py-1.5 text-[11px] text-muted-foreground/70">
          <CalendarRange className="h-3 w-3 shrink-0" />
          <span className="min-w-0 flex-1">
            Toque num horário livre para criar um bloco · ▶ inicia o foco
            <span className="hidden md:inline"> · arraste um bloco para mover (pé do bloco redimensiona)</span>
            <span className="md:hidden"> · segure um bloco para arrastar</span>
          </span>
          <button
            type="button"
            onClick={dismissHint}
            title="Entendi, não mostrar mais"
            className="shrink-0 rounded p-0.5 text-muted-foreground/50 transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

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
            {/* Linhas das horas + meias-horas mais leves (G14) */}
            {hours.map((h) => (
              <div key={h}>
                <div
                  className="pointer-events-none absolute w-full border-t border-dashed border-border/40"
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT }}
                />
                <div
                  className="pointer-events-none absolute w-full border-t border-dotted border-border/20"
                  style={{ top: (h - START_HOUR) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                />
              </div>
            ))}

            {/* O que já passou recua visualmente (G13) */}
            {nowTop != null && (
              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-0 bg-foreground/[0.03]"
                style={{ height: nowTop }}
              />
            )}

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
              const dts = displayTimes(event);
              const compact = height < 46;
              const done = !!event.task?.isDone;
              const toggling = togglingTask === event.taskId;
              const isDragging = drag?.id === event.id && drag.moved;
              // #7: blocos que colidem dividem a largura (colunas paralelas).
              const lay = overlapLayout.get(event.id) ?? { col: 0, cols: 1 };
              const colWidth = `calc((100% - 14px) / ${lay.cols})`;
              return (
                <div
                  key={event.id}
                  onPointerDown={beginDrag(event, "move")}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (ignoreNextClickRef.current) { ignoreNextClickRef.current = false; return; }
                    setEditing(event);
                  }}
                  className={cn(
                    "group absolute z-10 cursor-pointer overflow-hidden rounded-lg border border-l-4 p-2 shadow-sm transition-all hover:shadow-md hover:brightness-[1.03] md:cursor-grab",
                    done && "opacity-60",
                    isDragging && "z-30 cursor-grabbing select-none shadow-lg ring-1 ring-primary/40 transition-none"
                  )}
                  style={{
                    top, height,
                    left: `calc(6px + ${lay.col} * ${colWidth})`,
                    width: `calc(${colWidth} - 4px)`,
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
                          {format(dts.s, "HH:mm")}–{format(dts.e, "HH:mm")}
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
                            "flex h-9 w-9 md:h-6 md:w-6 items-center justify-center rounded-md transition-transform hover:scale-110 active:scale-90",
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
                        className="flex h-9 w-9 md:h-6 md:w-6 items-center justify-center rounded-md text-background opacity-100 shadow transition-transform hover:scale-110 active:scale-90 md:opacity-0 md:group-hover:opacity-100"
                        style={{ backgroundColor: color }}
                        title="Iniciar foco neste bloco"
                        aria-label="Iniciar foco"
                      >
                        <Play className="ml-0.5 h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Alça de redimensionar (pé do bloco, só desktop) */}
                  <div
                    onPointerDown={beginDrag(event, "resize")}
                    className="absolute inset-x-0 bottom-0 hidden h-2.5 cursor-ns-resize md:block"
                    title="Arraste para mudar a duração"
                  >
                    <div
                      className="mx-auto mt-1 h-1 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-50"
                      style={{ backgroundColor: color }}
                    />
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
        <DialogContent size="md">
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
                  isAllDay: editing.isAllDay,
                  frequency: editing.frequency,
                  recurrenceEnd: editing.recurrenceEnd,
                  emailAlert: editing.emailAlert,
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
