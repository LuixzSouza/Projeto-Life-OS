"use client";

// Modo "Hoje" (#6 do AGENDA_ROADMAP): o agora como centro de gravidade.
// Linha do tempo vertical do dia com o que já passou esmaecido, o divisor
// "agora" e o PRÓXIMO item destacado com atalho ▶ Foco. Mobile-first: é a
// visão que se abre no celular sem precisar do mês inteiro.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Play, Sunrise, ArrowRight, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { requestFocusStart } from "@/components/focus/focus-core";
import { AgendaItemIcon } from "./agenda-item-icon";
import { CATEGORY_META, agendaUrl, type AgendaItem } from "./agenda-shared";

const FOCUS_DEFAULT_MIN = 25;

/** Minutos desde 00:00 a partir de "HH:mm". */
function toMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function TodayPanel({ items, inRange }: { items: AgendaItem[]; inRange: boolean }) {
  const router = useRouter();

  // Relógio vivo: o divisor "agora" acompanha o minuto sem precisar de refresh.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const { allDay, past, upcoming } = useMemo(() => {
    const allDay = items.filter((i) => !i.time);
    const timed = items
      .filter((i): i is AgendaItem & { time: string } => !!i.time)
      .sort((a, b) => toMin(a.time) - toMin(b.time));
    return {
      allDay,
      past: timed.filter((i) => toMin(i.time) <= nowMin),
      upcoming: timed.filter((i) => toMin(i.time) > nowMin),
    };
  }, [items, nowMin]);

  const next = upcoming[0];

  const startFocus = (item: AgendaItem) => {
    // Só eventos reais carregam o vínculo (ocorrência virtual "-r-" fica sem id).
    const rawId = item.source === "event" ? item.id.slice("event-".length) : "";
    const eventId = rawId && !rawId.includes("-r-") ? rawId : undefined;
    requestFocusStart({ label: item.title, eventId, focusMin: FOCUS_DEFAULT_MIN });
    toast.success(`Foco iniciado: ${item.title}`, { description: `${FOCUS_DEFAULT_MIN} min — veja o timer no canto.` });
  };

  if (!inRange) {
    // O usuário está navegando outro mês: o dia de hoje não veio na janela carregada.
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
        <div className="mb-3 rounded-full bg-muted p-4">
          <Sunrise className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="font-semibold text-foreground">Você está vendo outro mês</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">Volte para o dia de hoje para ver sua linha do tempo ao vivo.</p>
        <Button className="mt-4 rounded-xl" onClick={() => router.push(agendaUrl(format(new Date(), "yyyy-MM-dd")))}>
          Ir para hoje <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
        <div className="mb-3 rounded-full bg-muted p-4">
          <CalendarRange className="h-7 w-7 text-muted-foreground/40" />
        </div>
        <p className="font-semibold text-foreground">Nada registrado hoje (ainda)</p>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Tudo que você registrar com a data de hoje — blocos, refeições, treinos — aparece aqui na hora.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 min-h-0">
      <div className="mx-auto w-full max-w-2xl space-y-4 p-4 sm:p-6">
        {/* Cabeçalho do dia */}
        <div className="flex items-center justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-primary">
              <Sunrise className="h-3.5 w-3.5" /> Hoje
            </p>
            <h2 className="text-lg font-black capitalize tracking-tight">
              {format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </h2>
          </div>
          <span className="rounded-xl border border-border/40 bg-muted/30 px-3 py-1.5 font-mono text-sm font-bold tabular-nums">
            {format(now, "HH:mm")}
          </span>
        </div>

        {/* Dia inteiro */}
        {allDay.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allDay.map((it) => (
              <span
                key={it.id}
                className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                style={{ backgroundColor: `${it.color}14`, borderColor: `${it.color}33`, color: it.color }}
              >
                <AgendaItemIcon icon={CATEGORY_META[it.source].icon} className="h-3 w-3" />
                {it.title}
              </span>
            ))}
          </div>
        )}

        {/* O que já passou (esmaecido) */}
        {past.length > 0 && (
          <div className="space-y-2 opacity-60">
            {past.map((it) => <TodayRow key={it.id} item={it} />)}
          </div>
        )}

        {/* Divisor "agora" */}
        <div className="flex items-center gap-2" aria-label="Agora">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          <span className="h-px flex-1 bg-rose-500/60" />
          <span className="font-mono text-[10px] font-black uppercase tracking-widest text-rose-500">agora</span>
        </div>

        {/* O que vem (próximo destacado) */}
        {upcoming.length > 0 ? (
          <div className="space-y-2">
            {upcoming.map((it) => (
              <TodayRow
                key={it.id}
                item={it}
                highlight={it === next}
                onFocus={it === next ? () => startFocus(it) : undefined}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border/40 bg-muted/20 py-4 text-center text-xs font-medium text-muted-foreground">
            Sem mais horários hoje. Bom descanso. 🌙
          </p>
        )}
      </div>
    </ScrollArea>
  );
}

function TodayRow({ item, highlight, onFocus }: { item: AgendaItem; highlight?: boolean; onFocus?: () => void }) {
  const meta = CATEGORY_META[item.source];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-all",
        highlight ? "border-primary/40 ring-1 ring-primary/20" : "border-border/40"
      )}
    >
      <span className="w-12 shrink-0 text-center font-mono text-xs font-bold tabular-nums text-foreground">{item.time}</span>
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${item.color}1a`, color: item.color }}
      >
        <AgendaItemIcon icon={meta.icon} className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {item.title}
          {highlight && <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-primary">próximo</span>}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          <span className="font-medium" style={{ color: item.color }}>{meta.label}</span>
          {item.subtitle ? ` · ${item.subtitle}` : ""}
        </p>
      </div>
      {item.meta && <span className="shrink-0 text-[11px] font-bold text-muted-foreground">{item.meta}</span>}
      {onFocus && (
        <Button
          size="sm"
          onClick={onFocus}
          className="h-8 shrink-0 rounded-lg bg-primary px-2.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground"
        >
          <Play className="mr-1 h-3 w-3" /> Foco
        </Button>
      )}
    </div>
  );
}
