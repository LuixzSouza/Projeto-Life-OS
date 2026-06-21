"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, addMonths, addDays, parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, LayoutList, ArrowLeft, CalendarRange, Pencil, CalendarPlus, Trash2, Loader2, Plus, Search, X, Download, Repeat, CalendarOff } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { onActivate } from "@/lib/a11y";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteEvent, skipEventOccurrence, detachEventOccurrence } from "@/app/(dashboard)/agenda/actions";
import { downloadIcs } from "./ics";
import { AgendaItemIcon } from "./agenda-item-icon";
import { EventForm } from "./event-form";
import { EventDeleteButton } from "./event-delete-button";
import { CATEGORY_META, SOURCE_ORDER, agendaUrl, type AgendaItem, type AgendaSource } from "./agenda-shared";
import { type ThemedDayData } from "@/app/(dashboard)/agenda/themed-days-actions";

/** Evento completo (serializado) para editar/excluir direto do calendário. */
export interface EditableAgendaEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string; // ISO
  endTime: string | null; // ISO
  location: string | null;
  color: string | null;
  isAllDay: boolean;
  frequency: string | null;       // WEEKLY | MONTHLY | ... (lib/recurrence.ts)
  recurrenceEnd: string | null;   // ISO
  emailAlert: boolean;            // lembrete local (#12)
}

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Filtros de categoria persistem entre visitas (D5 do AGENDA_ROADMAP). */
const HIDDEN_KEY = "lifeos:agenda:hidden-sources";

/** Busca sem acento/caixa ("reuniao" acha "Reunião"): remove os diacríticos. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export type ThemeByWeekday = Record<number, ThemedDayData | undefined>;

export function UnifiedAgenda({ items, selectedDateISO, themedDays = [], events = [] }: { items: AgendaItem[]; selectedDateISO: string; themedDays?: ThemedDayData[]; events?: EditableAgendaEvent[] }) {
  const themeByWeekday = useMemo<ThemeByWeekday>(() => {
    const map: ThemeByWeekday = {};
    for (const t of themedDays) map[t.weekday] = t;
    return map;
  }, [themedDays]);

  const router = useRouter();
  const cursor = useMemo(() => parseISO(selectedDateISO), [selectedDateISO]);

  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [day, setDay] = useState<Date>(cursor);
  const [hidden, setHidden] = useState<Set<AgendaSource>>(new Set());
  const [query, setQuery] = useState("");
  // Evento em edição/exclusão (diálogos ÚNICOS no topo — nunca um Dialog por linha).
  const [editingEvent, setEditingEvent] = useState<EditableAgendaEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = useState<EditableAgendaEvent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Criar evento a partir do dia que se está olhando (visão Dia ou "+" do mês).
  const [creatingDay, setCreatingDay] = useState<Date | null>(null);
  // Ocorrência recorrente clicada ("só esta ocorrência" vs série).
  const [occurrence, setOccurrence] = useState<{ anchor: EditableAgendaEvent; dateKey: string } | null>(null);
  const [occBusy, setOccBusy] = useState(false);

  // Filtros persistidos: carga ADIADA pós-hidratação (SSR renderiza sem filtro;
  // aplicar no initializer causaria mismatch) e gravação só depois da carga.
  const hiddenLoadedRef = useRef(false);
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(HIDDEN_KEY);
        if (raw) setHidden(new Set(JSON.parse(raw) as AgendaSource[]));
      } catch { /* noop */ }
      hiddenLoadedRef.current = true;
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  useEffect(() => {
    if (!hiddenLoadedRef.current) return;
    try {
      if (hidden.size > 0) window.localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
      else window.localStorage.removeItem(HIDDEN_KEY);
    } catch { /* noop */ }
  }, [hidden]);

  // Abre o diálogo de criação com horário comercial padrão (09:00 do dia).
  const quickAdd = (d: Date) => {
    const at = new Date(d);
    at.setHours(9, 0, 0, 0);
    setCreatingDay(at);
  };

  // Eventos editáveis indexados pelo id real (AgendaItem.id = "event-{id}").
  const eventById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);

  // "Só esta ocorrência": pular (vira exceção) ou desvincular (vira evento próprio).
  const handleSkipOccurrence = async () => {
    if (!occurrence || occBusy) return;
    setOccBusy(true);
    try {
      const res = await skipEventOccurrence(occurrence.anchor.id, occurrence.dateKey);
      if (res.success) toast.success(res.message);
      else toast.error(res.message);
      setOccurrence(null);
      router.refresh();
    } catch {
      toast.error("Falha ao pular a ocorrência.");
    } finally {
      setOccBusy(false);
    }
  };

  const handleDetachOccurrence = async () => {
    if (!occurrence || occBusy) return;
    setOccBusy(true);
    try {
      const res = await detachEventOccurrence(occurrence.anchor.id, occurrence.dateKey);
      if (res.success && res.event) {
        toast.success(res.message);
        setOccurrence(null);
        setEditingEvent(res.event); // abre a edição do evento recém-desvinculado
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Falha ao desvincular a ocorrência.");
    } finally {
      setOccBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingEvent || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteEvent(deletingEvent.id);
      toast.success("Evento removido do calendário.");
      setDeletingEvent(null);
      router.refresh();
    } catch {
      toast.error("Falha ao excluir o evento.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Index dos itens por dia (filtrados pelas categorias ativas e pela busca).
  const { byDay, presentSources, matchCount, sourceCounts } = useMemo(() => {
    const byDay = new Map<string, AgendaItem[]>();
    const present = new Set<AgendaSource>();
    const sourceCounts = new Map<AgendaSource, number>();
    const q = norm(query.trim());
    let matchCount = 0;
    for (const it of items) {
      present.add(it.source);
      sourceCounts.set(it.source, (sourceCounts.get(it.source) ?? 0) + 1);
      if (hidden.has(it.source)) continue;
      if (q && !norm(`${it.title} ${it.subtitle ?? ""}`).includes(q)) continue;
      matchCount++;
      const k = dayKey(parseISO(it.date));
      const arr = byDay.get(k);
      if (arr) arr.push(it);
      else byDay.set(k, [it]);
    }
    const presentSources = SOURCE_ORDER.filter((s) => present.has(s));
    return { byDay, presentSources, matchCount, sourceCounts };
  }, [items, hidden, query]);

  // Grade do mês (6 semanas).
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  const goMonth = (dir: number) => router.push(agendaUrl(format(addMonths(cursor, dir), "yyyy-MM-dd")));
  const goToday = () => router.push(agendaUrl(format(new Date(), "yyyy-MM-dd")));

  const openDay = (d: Date) => { setDay(d); setView("day"); };

  const goDay = (dir: number) => {
    const next = addDays(day, dir);
    if (next < gridStart || next > gridEnd) {
      router.push(agendaUrl(format(next, "yyyy-MM-dd")));
    } else {
      setDay(next);
    }
  };

  // Semana (#4): 7 colunas ancoradas no dia selecionado.
  const weekDays = useMemo(
    () => eachDayOfInterval({ start: startOfWeek(day, { weekStartsOn: 0 }), end: endOfWeek(day, { weekStartsOn: 0 }) }),
    [day],
  );
  const goWeek = (dir: number) => {
    const next = addDays(day, dir * 7);
    if (next < gridStart || next > gridEnd) {
      router.push(agendaUrl(format(next, "yyyy-MM-dd")));
    } else {
      setDay(next);
    }
  };

  const toggle = (s: AgendaSource) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const dayItems = byDay.get(dayKey(day)) ?? [];

  // Atalhos de teclado (G18): T hoje · ←/→ navega · N novo evento · / busca · Esc limpa.
  const searchRef = useRef<HTMLInputElement>(null);
  const dialogOpen = !!editingEvent || !!deletingEvent || !!creatingDay;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (dialogOpen || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing) {
        if (e.key === "Escape" && t === searchRef.current) { setQuery(""); searchRef.current?.blur(); }
        return;
      }
      switch (e.key) {
        case "t": case "T": e.preventDefault(); goToday(); break;
        case "ArrowLeft": e.preventDefault(); (view === "day" ? goDay : view === "week" ? goWeek : goMonth)(-1); break;
        case "ArrowRight": e.preventDefault(); (view === "day" ? goDay : view === "week" ? goWeek : goMonth)(1); break;
        case "n": case "N": e.preventDefault(); quickAdd(view === "day" ? day : new Date()); break;
        case "/": e.preventDefault(); searchRef.current?.focus(); break;
        case "Escape": if (query) setQuery(""); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialogOpen, view, day, cursor, query]);

  return (
    <div className="flex h-full flex-col">
      {/* TOOLBAR */}
      <div className="flex flex-col gap-3 border-b border-border/40 bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {view === "day" ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setView("month")} className="gap-1.5 -ml-2">
                <ArrowLeft className="h-4 w-4" /> Mês
              </Button>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" aria-label="Dia anterior" className="h-8 w-8" onClick={() => goDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" aria-label="Próximo dia" className="h-8 w-8" onClick={() => goDay(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <h2 className="ml-1 text-base font-bold capitalize">
                {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
            </>
          ) : view === "week" ? (
            <>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" aria-label="Semana anterior" className="h-8 w-8" onClick={() => goWeek(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" aria-label="Próxima semana" className="h-8 w-8" onClick={() => goWeek(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <h2 className="ml-1 text-base font-bold">
                {format(weekDays[0], "d MMM", { locale: ptBR })} – {format(weekDays[6], "d MMM yyyy", { locale: ptBR })}
              </h2>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" aria-label="Mês anterior" className="h-8 w-8" onClick={() => goMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" aria-label="Próximo mês" className="h-8 w-8" onClick={() => goMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <h2 className="ml-1 text-base font-bold capitalize">{format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}</h2>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Busca local (#9): título/subtítulo, ignora acentos e caixa */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar na agenda…  ( / )"
              className="h-8 w-36 rounded-lg border border-border/50 bg-background pl-8 pr-7 text-xs outline-none transition-all focus:border-primary/40 sm:w-44 sm:focus:w-56"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                title="Limpar busca"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={goToday} className="h-8">Hoje</Button>
          {/* #10: exporta os eventos do mês em .ics (gerado no navegador) */}
          {events.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              title="Exportar os eventos deste mês para Google Calendar/Outlook (.ics)"
              onClick={() => {
                downloadIcs(events, `lifeos-agenda-${format(cursor, "yyyy-MM")}.ics`);
                toast.success(`${events.length} evento${events.length === 1 ? "" : "s"} exportado${events.length === 1 ? "" : "s"} em .ics`);
              }}
            >
              <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">.ics</span>
            </Button>
          )}
          <div className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
            <button
              onClick={() => setView("month")}
              className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all",
                view === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Mês
            </button>
            <button
              onClick={() => setView("week")}
              className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all",
                view === "week" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <CalendarRange className="h-3.5 w-3.5" /> Semana
            </button>
            <button
              onClick={() => setView("day")}
              className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all",
                view === "day" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <LayoutList className="h-3.5 w-3.5" /> Dia
            </button>
          </div>
        </div>
      </div>

      {/* FILTROS DE CATEGORIA */}
      {presentSources.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto border-b border-border/40 px-4 py-2.5 scrollbar-hide">
          {query.trim() && (
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold tabular-nums text-primary">
              {matchCount} resultado{matchCount === 1 ? "" : "s"}
            </span>
          )}
          {hidden.size > 0 && (
            <button
              onClick={() => setHidden(new Set())}
              className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary"
            >
              Limpar filtros
            </button>
          )}
          {presentSources.map((s) => {
            const meta = CATEGORY_META[s];
            const isHidden = hidden.has(s);
            return (
              <button
                key={s}
                onClick={() => toggle(s)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all",
                  isHidden ? "border-border/40 bg-transparent text-muted-foreground/50" : "border-border/50 bg-card text-foreground"
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: isHidden ? "currentColor" : meta.color }} />
                {meta.label}
                <span className="tabular-nums opacity-60">· {sourceCounts.get(s) ?? 0}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* CONTEÚDO */}
      {view === "month" ? (
        <MonthGrid days={days} cursor={cursor} byDay={byDay} onOpenDay={openDay} themeByWeekday={themeByWeekday} onQuickAdd={quickAdd} />
      ) : view === "week" ? (
        <WeekGrid days={weekDays} byDay={byDay} themeByWeekday={themeByWeekday} onOpenDay={openDay} onQuickAdd={quickAdd} />
      ) : (
        <DayView items={dayItems} day={day} theme={themeByWeekday[day.getDay()]} eventById={eventById} onEditEvent={setEditingEvent} onDeleteEvent={setDeletingEvent} onRecurring={(anchor, dateKey) => setOccurrence({ anchor, dateKey })} onQuickAdd={quickAdd} />
      )}

      {/* CONFIRMAÇÃO ÚNICA de exclusão (regra: nunca AlertDialog dentro do .map). */}
      <AlertDialog open={!!deletingEvent} onOpenChange={(o) => { if (!o && !isDeleting) setDeletingEvent(null); }}>
        <AlertDialogContent className="rounded-[2rem]">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este evento?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">&quot;{deletingEvent?.title}&quot;</strong> vai para a Lixeira e some do calendário
              (dá pra restaurar em Lixeira).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmDelete(); }}
              disabled={isDeleting}
              className="rounded-xl bg-rose-500 text-white hover:bg-rose-600"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* DIÁLOGO ÚNICO de edição de evento (mesmo padrão da grade de Blocos). */}
      <Dialog open={!!editingEvent} onOpenChange={(o) => { if (!o) setEditingEvent(null); }}>
        <DialogContent size="md">
          {editingEvent && (
            <>
              <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/40 bg-muted/10 px-5 py-4 pr-14 sm:px-8">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shadow-sm">
                    <CalendarPlus className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <DialogTitle>Editar evento</DialogTitle>
                    <DialogDescription>Atualizar este registro do calendário</DialogDescription>
                  </div>
                </div>
                <EventDeleteButton eventId={editingEvent.id} eventTitle={editingEvent.title} variant="ghost" />
              </div>
              <EventForm
                onClose={() => setEditingEvent(null)}
                initialData={{
                  id: editingEvent.id,
                  title: editingEvent.title,
                  description: editingEvent.description,
                  startTime: new Date(editingEvent.startTime),
                  endTime: editingEvent.endTime ? new Date(editingEvent.endTime) : null,
                  location: editingEvent.location,
                  color: editingEvent.color,
                  isAllDay: editingEvent.isAllDay,
                  frequency: editingEvent.frequency,
                  recurrenceEnd: editingEvent.recurrenceEnd ? new Date(editingEvent.recurrenceEnd) : null,
                  emailAlert: editingEvent.emailAlert,
                }}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* SELETOR "série vs só esta ocorrência" (diálogo único, padrão do arquivo) */}
      <Dialog open={!!occurrence} onOpenChange={(o) => { if (!o && !occBusy) setOccurrence(null); }}>
        <DialogContent size="sm">
          {occurrence && (
            <>
              <div className="flex items-center gap-3">
                <div className="shrink-0 rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shadow-sm">
                  <Repeat className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle>Evento recorrente</DialogTitle>
                  <DialogDescription className="capitalize">
                    &quot;{occurrence.anchor.title}&quot; · {format(parseISO(`${occurrence.dateKey}T12:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </DialogDescription>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  disabled={occBusy}
                  onClick={handleDetachOccurrence}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
                >
                  {occBusy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" /> : <Pencil className="h-4 w-4 shrink-0 text-primary" />}
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-foreground">Editar só esta ocorrência</span>
                    <span className="block text-[11px] text-muted-foreground">Vira um evento próprio neste dia; a série não muda.</span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={occBusy}
                  onClick={handleSkipOccurrence}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:border-amber-500/40 hover:bg-amber-500/5 disabled:opacity-60"
                >
                  <CalendarOff className="h-4 w-4 shrink-0 text-amber-500" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-foreground">Pular só esta ocorrência</span>
                    <span className="block text-[11px] text-muted-foreground">Some deste dia; as outras repetições continuam.</span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={occBusy}
                  onClick={() => { setEditingEvent(occurrence.anchor); setOccurrence(null); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-60"
                >
                  <Repeat className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-foreground">Editar a série inteira</span>
                    <span className="block text-[11px] text-muted-foreground">Muda o evento âncora e todas as repetições.</span>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={occBusy}
                  onClick={() => { setDeletingEvent(occurrence.anchor); setOccurrence(null); }}
                  className="flex w-full items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3 text-left transition-colors hover:border-rose-500/40 hover:bg-rose-500/5 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4 shrink-0 text-rose-500" />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-foreground">Excluir a série inteira</span>
                    <span className="block text-[11px] text-muted-foreground">Manda o evento âncora (e as repetições) para a Lixeira.</span>
                  </span>
                </button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO ÚNICO de criação contextual (#1): nasce no dia que se está vendo. */}
      <Dialog open={!!creatingDay} onOpenChange={(o) => { if (!o) setCreatingDay(null); }}>
        <DialogContent size="md">
          {creatingDay && (
            <>
              <div className="flex shrink-0 items-center gap-3 border-b border-border/40 bg-muted/10 px-5 py-4 pr-14 sm:px-8">
                <div className="shrink-0 rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary shadow-sm">
                  <CalendarPlus className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle>Novo evento</DialogTitle>
                  <DialogDescription className="capitalize">
                    {format(creatingDay, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  </DialogDescription>
                </div>
              </div>
              <EventForm onClose={() => setCreatingDay(null)} defaultStart={creatingDay} />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------------- MONTH GRID ----------------------------- */
function MonthGrid({
  days, cursor, byDay, onOpenDay, themeByWeekday, onQuickAdd,
}: {
  days: Date[];
  cursor: Date;
  byDay: Map<string, AgendaItem[]>;
  onOpenDay: (d: Date) => void;
  themeByWeekday: ThemeByWeekday;
  onQuickAdd: (d: Date) => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden animate-in fade-in slide-in-from-left-2 duration-200">
      {/* Cabeçalho dos dias da semana (com o tema de cada dia, se houver) */}
      <div className="grid grid-cols-7 border-b border-border/40 bg-muted/5">
        {WEEKDAYS.map((w, i) => {
          const theme = themeByWeekday[i];
          return (
            <div key={w} className="flex flex-col items-center gap-0.5 py-2">
              <span className="text-[10px] font-bold uppercase tracking-wider" style={theme ? { color: theme.color } : undefined}>
                {theme?.icon ? `${theme.icon} ` : ""}{w}
              </span>
              {theme && <span className="max-w-full truncate px-1 text-[9px] font-semibold leading-none text-muted-foreground">{theme.name}</span>}
            </div>
          );
        })}
      </div>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((d) => {
            const items = byDay.get(dayKey(d)) ?? [];
            const inMonth = isSameMonth(d, cursor);
            const today = isToday(d);
            const theme = themeByWeekday[d.getDay()];
            return (
              // div com role: a célula abre o Dia E contém o botão "+" (criar aqui);
              // <button> dentro de <button> é HTML inválido.
              <div
                key={d.toISOString()}
                role="button"
                tabIndex={0}
                onClick={() => onOpenDay(d)}
                onKeyDown={onActivate(() => onOpenDay(d))}
                style={inMonth && theme ? { backgroundColor: `${theme.color}0d` } : undefined}
                className={cn(
                  "group flex min-h-[64px] cursor-pointer flex-col gap-1 border-b border-r border-border/30 p-1.5 text-left transition-colors hover:bg-muted/40 sm:min-h-[96px]",
                  !inMonth && "bg-muted/20",
                  today && "bg-primary/[0.03]"
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      today ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground/40"
                    )}
                  >
                    {format(d, "d")}
                  </span>
                  <span className="flex items-center gap-1">
                    {/* Criar evento direto neste dia (padrão Google Calendar) */}
                    <button
                      type="button"
                      title="Novo evento neste dia"
                      onClick={(e) => { e.stopPropagation(); onQuickAdd(d); }}
                      className="hidden h-5 w-5 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover:opacity-100 md:flex"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    {items.length > 0 && (
                      <span className="text-[9px] font-bold text-muted-foreground">{items.length}</span>
                    )}
                  </span>
                </div>

                {/* < sm (G8): chips truncados viram pontinhos — o detalhe fica pro tap → Dia */}
                <div className="flex flex-wrap items-center gap-1 px-0.5 sm:hidden">
                  {items.slice(0, 4).map((it) => (
                    <span key={it.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: it.color }} />
                  ))}
                  {items.length > 4 && <span className="text-[8px] font-bold text-muted-foreground">+{items.length - 4}</span>}
                </div>

                <div className="hidden flex-1 flex-col gap-0.5 overflow-hidden sm:flex">
                  {items.slice(0, 3).map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight"
                      style={{ backgroundColor: `${it.color}1a`, color: it.color }}
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
                      <span className="truncate font-medium">{it.time ? `${it.time} ` : ""}{it.title}</span>
                    </div>
                  ))}
                  {items.length > 3 && (
                    <span className="px-1 text-[9px] font-semibold text-muted-foreground">+{items.length - 3} mais</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ----------------------------- WEEK GRID (#4) -----------------------------
   7 colunas com os itens do agregador — o meio-termo que faltava entre o Mês
   (denso) e o Dia (1 dia). Cabeçalho do dia abre a visão Dia. */
function WeekGrid({
  days, byDay, themeByWeekday, onOpenDay, onQuickAdd,
}: {
  days: Date[];
  byDay: Map<string, AgendaItem[]>;
  themeByWeekday: ThemeByWeekday;
  onOpenDay: (d: Date) => void;
  onQuickAdd: (d: Date) => void;
}) {
  const MAX_VISIBLE = 14;
  return (
    <div className="flex-1 overflow-auto animate-in fade-in duration-200">
      <div className="grid min-w-[840px] grid-cols-7" style={{ minHeight: "100%" }}>
        {days.map((d) => {
          const items = byDay.get(dayKey(d)) ?? [];
          const today = isToday(d);
          const theme = themeByWeekday[d.getDay()];
          const overflow = items.length - MAX_VISIBLE;
          return (
            <div
              key={d.toISOString()}
              className={cn("flex min-h-[420px] flex-col border-r border-border/30 last:border-r-0", today && "bg-primary/[0.03]")}
              style={!today && theme ? { backgroundColor: `${theme.color}08` } : undefined}
            >
              {/* Cabeçalho (div role=button: contém o "+" — button dentro de button é inválido) */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpenDay(d)}
                onKeyDown={onActivate(() => onOpenDay(d))}
                className="group sticky top-0 z-10 flex cursor-pointer items-center justify-between gap-1 border-b border-border/40 bg-background/95 px-2 py-2 backdrop-blur transition-colors hover:bg-muted/40"
              >
                <span className="flex items-center gap-1.5">
                  <span className={cn("text-[10px] font-bold uppercase tracking-wider", today ? "text-primary" : "text-muted-foreground")}>
                    {theme?.icon ? `${theme.icon} ` : ""}{WEEKDAYS[d.getDay()]}
                  </span>
                  <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold", today ? "bg-primary text-primary-foreground" : "text-foreground")}>
                    {format(d, "d")}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Novo evento neste dia"
                    onClick={(e) => { e.stopPropagation(); onQuickAdd(d); }}
                    className="hidden h-5 w-5 items-center justify-center rounded-md text-muted-foreground/60 opacity-0 transition-all hover:bg-primary/10 hover:text-primary group-hover:opacity-100 md:flex"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                  {items.length > 0 && <span className="text-[9px] font-bold text-muted-foreground">{items.length}</span>}
                </span>
              </div>

              {/* Itens do dia */}
              <div className="flex flex-1 flex-col gap-1 p-1.5">
                {items.slice(0, MAX_VISIBLE).map((it) => (
                  <div
                    key={it.id}
                    className="flex items-center gap-1 rounded px-1 py-0.5 text-[10px] leading-tight"
                    style={{ backgroundColor: `${it.color}1a`, color: it.color }}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: it.color }} />
                    <span className="truncate font-medium">{it.time ? `${it.time} ` : ""}{it.title}</span>
                  </div>
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenDay(d)}
                    className="px-1 text-left text-[9px] font-semibold text-muted-foreground transition-colors hover:text-primary"
                  >
                    +{overflow} mais
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------ DAY VIEW ------------------------------ */
interface DayEditProps {
  eventById: Map<string, EditableAgendaEvent>;
  onEditEvent: (e: EditableAgendaEvent) => void;
  onDeleteEvent: (e: EditableAgendaEvent) => void;
  /** Ocorrência virtual de série recorrente: abre o seletor "série vs só esta". */
  onRecurring: (anchor: EditableAgendaEvent, dateKey: string) => void;
}

function DayView({ items, day, theme, eventById, onEditEvent, onDeleteEvent, onRecurring, onQuickAdd }: { items: AgendaItem[]; day: Date; theme?: ThemedDayData; onQuickAdd: (d: Date) => void } & DayEditProps) {
  const allDay = items.filter((i) => !i.time);
  const timed = items.filter((i) => i.time);

  // G12: na visão de HOJE, divisor "agora" entre o que já passou (esmaecido) e o que vem.
  let nowIndex: number | undefined;
  if (isToday(day) && timed.length > 0) {
    const nowStr = format(new Date(), "HH:mm");
    const idx = timed.findIndex((it) => (it.time ?? "") >= nowStr);
    nowIndex = idx === -1 ? timed.length : idx;
  }

  const addHereButton = (
    <button
      type="button"
      onClick={() => onQuickAdd(day)}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border/60 py-2.5 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
    >
      <Plus className="h-3.5 w-3.5" /> Adicionar evento neste dia
    </button>
  );

  const themeBanner = theme ? (
    <div className="mx-4 mt-4 flex items-center gap-2.5 rounded-2xl border border-border/40 p-3 sm:mx-6" style={{ backgroundColor: `${theme.color}12` }}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg" style={{ backgroundColor: `${theme.color}1f`, color: theme.color }}>
        {theme.icon || "✦"}
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-black leading-none" style={{ color: theme.color }}>{theme.name}</p>
        {theme.focus && <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{theme.focus}</p>}
      </div>
    </div>
  ) : null;

  if (items.length === 0) {
    return (
      <>
        {themeBanner}
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center animate-in fade-in slide-in-from-right-2 duration-200">
        <div className="mb-3 rounded-full bg-muted p-4">
          <CalendarRange className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="font-semibold text-foreground">Nada registrado neste dia</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Tudo que você anotar no sistema com data — refeições, treinos, gastos, filmes — aparece aqui automaticamente.
        </p>
        <div className="mt-4 w-full max-w-[260px]">{addHereButton}</div>
      </div>
      </>
    );
  }

  return (
    <>
      {themeBanner}
    <ScrollArea className="flex-1 animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="space-y-5 p-4 sm:p-6">
        {allDay.length > 0 && (
          <Section title="Dia inteiro" items={allDay} eventById={eventById} onEditEvent={onEditEvent} onDeleteEvent={onDeleteEvent} onRecurring={onRecurring} />
        )}
        {timed.length > 0 && (
          <Section title="Ao longo do dia" items={timed} showTime nowIndex={nowIndex} eventById={eventById} onEditEvent={onEditEvent} onDeleteEvent={onDeleteEvent} onRecurring={onRecurring} />
        )}
        {addHereButton}
        <p className="pt-2 text-center text-[11px] text-muted-foreground/60">
          {items.length} {items.length === 1 ? "registro" : "registros"} em {format(day, "d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>
    </ScrollArea>
    </>
  );
}

function Section({ title, items, showTime, nowIndex, eventById, onEditEvent, onDeleteEvent, onRecurring }: { title: string; items: AgendaItem[]; showTime?: boolean; nowIndex?: number } & DayEditProps) {
  return (
    <div className="space-y-2">
      <h3 className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{title}</h3>
      <div className="space-y-2">
        {items.map((it, i) => (
          <Fragment key={it.id}>
            {nowIndex === i && <NowDivider />}
            <AgendaRow
              item={it}
              showTime={showTime}
              dim={nowIndex !== undefined && i < nowIndex}
              eventById={eventById}
              onEditEvent={onEditEvent}
              onDeleteEvent={onDeleteEvent}
              onRecurring={onRecurring}
            />
          </Fragment>
        ))}
        {nowIndex === items.length && <NowDivider />}
      </div>
    </div>
  );
}

/** Linha do "agora" (G12): separa o que já passou do que ainda vem hoje. */
function NowDivider() {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
      <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">agora · {format(new Date(), "HH:mm")}</span>
      <span className="h-px flex-1 bg-rose-500/30" />
    </div>
  );
}

function AgendaRow({ item, showTime, dim, eventById, onEditEvent, onDeleteEvent, onRecurring }: { item: AgendaItem; showTime?: boolean; dim?: boolean } & DayEditProps) {
  const meta = CATEGORY_META[item.source];
  // Eventos do calendário são editáveis aqui mesmo (AgendaItem.id = "event-{id}").
  // Ocorrências virtuais de recorrência têm sufixo "-r-…" (uuid é hex, "-r-" não colide).
  const rawId = item.source === "event" ? item.id.slice("event-".length) : "";
  const isOccurrence = rawId.includes("-r-");
  const editable = item.source === "event" && !isOccurrence ? eventById.get(rawId) : undefined;
  const occurrenceAnchor = isOccurrence ? eventById.get(rawId.split("-r-")[0]) : undefined;

  return (
    <div className={cn(
      "group flex items-center gap-3 rounded-xl border border-border/40 bg-card p-3 shadow-sm transition-all hover:border-primary/20 hover:shadow-md",
      dim && "opacity-70 hover:opacity-100",
    )}>
      <div className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${item.color}1a`, color: item.color }}
      >
        <AgendaItemIcon icon={meta.icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          <span className="font-medium" style={{ color: item.color }}>{meta.label}</span>
          {item.subtitle ? ` · ${item.subtitle}` : ""}
        </p>
      </div>

      {editable && (
        <div className={cn(
          "flex shrink-0 items-center gap-0.5 transition-opacity",
          "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100",
        )}>
          <Button
            variant="ghost"
            size="icon"
            title="Editar evento"
            onClick={() => onEditEvent(editable)}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Excluir evento"
            onClick={() => onDeleteEvent(editable)}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Ocorrência de série recorrente: seletor "série vs só esta" */}
      {occurrenceAnchor && (
        <div className={cn(
          "flex shrink-0 items-center transition-opacity",
          "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100",
        )}>
          <Button
            variant="ghost"
            size="icon"
            title="Evento recorrente — editar/pular esta ocorrência ou a série"
            onClick={() => onRecurring(occurrenceAnchor, format(parseISO(item.date), "yyyy-MM-dd"))}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
          >
            <Repeat className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="shrink-0 text-right">
        {showTime && item.time && <p className="font-mono text-xs font-semibold text-foreground">{item.time}</p>}
        {item.meta && <p className="text-[11px] font-bold text-muted-foreground">{item.meta}</p>}
      </div>
    </div>
  );
}
