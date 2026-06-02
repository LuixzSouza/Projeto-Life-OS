"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  isSameMonth, isToday, addMonths, addDays, parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronLeft, ChevronRight, CalendarDays, LayoutList, ArrowLeft, CalendarRange } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AgendaItemIcon } from "./agenda-item-icon";
import { CATEGORY_META, SOURCE_ORDER, type AgendaItem, type AgendaSource } from "./agenda-shared";

const dayKey = (d: Date) => format(d, "yyyy-MM-dd");
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function UnifiedAgenda({ items, selectedDateISO }: { items: AgendaItem[]; selectedDateISO: string }) {
  const router = useRouter();
  const cursor = useMemo(() => parseISO(selectedDateISO), [selectedDateISO]);

  const [view, setView] = useState<"month" | "day">("month");
  const [day, setDay] = useState<Date>(cursor);
  const [hidden, setHidden] = useState<Set<AgendaSource>>(new Set());

  // Index dos itens por dia (filtrados pelas categorias ativas).
  const { byDay, presentSources } = useMemo(() => {
    const byDay = new Map<string, AgendaItem[]>();
    const present = new Set<AgendaSource>();
    for (const it of items) {
      present.add(it.source);
      if (hidden.has(it.source)) continue;
      const k = dayKey(parseISO(it.date));
      const arr = byDay.get(k);
      if (arr) arr.push(it);
      else byDay.set(k, [it]);
    }
    const presentSources = SOURCE_ORDER.filter((s) => present.has(s));
    return { byDay, presentSources };
  }, [items, hidden]);

  // Grade do mês (6 semanas).
  const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  const goMonth = (dir: number) => router.push(`/agenda?date=${format(addMonths(cursor, dir), "yyyy-MM-dd")}`);
  const goToday = () => router.push(`/agenda?date=${format(new Date(), "yyyy-MM-dd")}`);

  const openDay = (d: Date) => { setDay(d); setView("day"); };

  const goDay = (dir: number) => {
    const next = addDays(day, dir);
    if (next < gridStart || next > gridEnd) {
      router.push(`/agenda?date=${format(next, "yyyy-MM-dd")}`);
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
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goDay(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <h2 className="ml-1 text-base font-bold capitalize">
                {format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </h2>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => goMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <h2 className="ml-1 text-base font-bold capitalize">{format(cursor, "MMMM 'de' yyyy", { locale: ptBR })}</h2>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToday} className="h-8">Hoje</Button>
          <div className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 p-1">
            <button
              onClick={() => setView("month")}
              className={cn("flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-all",
                view === "month" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Mês
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
              </button>
            );
          })}
        </div>
      )}

      {/* CONTEÚDO */}
      {view === "month" ? (
        <MonthGrid days={days} cursor={cursor} byDay={byDay} onOpenDay={openDay} />
      ) : (
        <DayView items={dayItems} day={day} />
      )}
    </div>
  );
}

/* ----------------------------- MONTH GRID ----------------------------- */
function MonthGrid({
  days, cursor, byDay, onOpenDay,
}: {
  days: Date[];
  cursor: Date;
  byDay: Map<string, AgendaItem[]>;
  onOpenDay: (d: Date) => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Cabeçalho dos dias da semana */}
      <div className="grid grid-cols-7 border-b border-border/40 bg-muted/5">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-2 text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{w}</div>
        ))}
      </div>

      <ScrollArea className="flex-1">
        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((d) => {
            const items = byDay.get(dayKey(d)) ?? [];
            const inMonth = isSameMonth(d, cursor);
            const today = isToday(d);
            return (
              <button
                key={d.toISOString()}
                onClick={() => onOpenDay(d)}
                className={cn(
                  "group flex min-h-[96px] flex-col gap-1 border-b border-r border-border/30 p-1.5 text-left transition-colors hover:bg-muted/40",
                  !inMonth && "bg-muted/20"
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
                  {items.length > 0 && (
                    <span className="text-[9px] font-bold text-muted-foreground">{items.length}</span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
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
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

/* ------------------------------ DAY VIEW ------------------------------ */
function DayView({ items, day }: { items: AgendaItem[]; day: Date }) {
  const allDay = items.filter((i) => !i.time);
  const timed = items.filter((i) => i.time);

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
        <div className="mb-3 rounded-full bg-muted p-4">
          <CalendarRange className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="font-semibold text-foreground">Nada registrado neste dia</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Tudo que você anotar no sistema com data — refeições, treinos, gastos, filmes — aparece aqui automaticamente.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-5 p-4 sm:p-6">
        {allDay.length > 0 && (
          <Section title="Dia inteiro" items={allDay} />
        )}
        {timed.length > 0 && (
          <Section title="Ao longo do dia" items={timed} showTime />
        )}
        <p className="pt-2 text-center text-[11px] text-muted-foreground/60">
          {items.length} {items.length === 1 ? "registro" : "registros"} em {format(day, "d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>
    </ScrollArea>
  );
}

function Section({ title, items, showTime }: { title: string; items: AgendaItem[]; showTime?: boolean }) {
  return (
    <div className="space-y-2">
      <h3 className="px-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">{title}</h3>
      <div className="space-y-2">
        {items.map((it) => (
          <AgendaRow key={it.id} item={it} showTime={showTime} />
        ))}
      </div>
    </div>
  );
}

function AgendaRow({ item, showTime }: { item: AgendaItem; showTime?: boolean }) {
  const meta = CATEGORY_META[item.source];
  return (
    <div className="group flex items-center gap-3 rounded-xl border border-border/40 bg-card p-3 shadow-sm transition-all hover:border-primary/20 hover:shadow-md">
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
      <div className="shrink-0 text-right">
        {showTime && item.time && <p className="font-mono text-xs font-semibold text-foreground">{item.time}</p>}
        {item.meta && <p className="text-[11px] font-bold text-muted-foreground">{item.meta}</p>}
      </div>
    </div>
  );
}
