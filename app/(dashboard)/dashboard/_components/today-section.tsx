// Tela "Hoje" (MELHORIAS §5): a visão de chegada do dashboard — agenda do dia
// + tarefas vencendo/vencidas numa olhada. Reusa o agregador unificado da
// Agenda (toda fonte datada já entra por lá), filtrando para itens de PLANO
// (compromissos/prazos), não registros do passado (refeição comida etc.).

import Link from "next/link";
import { CalendarDays, AlertTriangle, ArrowRight, Sun } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAgendaItems } from "@/lib/agenda-aggregator";
import { PLAN_SOURCES, type AgendaItem, type AgendaSource } from "@/components/agenda/agenda-shared";

const ITEM_HREF: Partial<Record<AgendaSource, string>> = {
  event: "/agenda",
  task: "/projects",
  meeting: "/projects",
  invoice: "/business",
  recurring: "/finance",
  charge: "/finance",
  review: "/flashcards/review",
  goal: "/studies",
  birthday: "/social",
  challenge: "/health",
};

export async function TodaySection({ userId }: { userId: string }) {
  const now = new Date();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [agenda, overdueTasks] = await Promise.all([
    getAgendaItems(dayStart, dayEnd),
    prisma.task.findMany({
      where: { userId, deletedAt: null, isDone: false, dueDate: { lt: dayStart } },
      orderBy: { dueDate: "asc" },
      take: 4,
      select: { id: true, title: true, dueDate: true, project: { select: { slug: true } } },
    }),
  ]);

  const planned: AgendaItem[] = agenda
    .filter((i) => PLAN_SOURCES.has(i.source))
    .sort((a, b) => {
      // Com horário primeiro (ordem cronológica); dia-inteiro depois.
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return a.title.localeCompare(b.title);
    })
    .slice(0, 10);

  if (planned.length === 0 && overdueTasks.length === 0) return null;

  const dateLabel = now.toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long",
  });

  return (
    <section className="rounded-2xl border border-border/40 bg-card shadow-sm overflow-hidden">
      <header className="flex items-center justify-between gap-3 border-b border-border/40 bg-muted/20 px-5 py-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Sun className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-foreground">Hoje</h2>
            <p className="truncate text-[11px] capitalize text-muted-foreground">{dateLabel}</p>
          </div>
        </div>
        <Link
          href="/agenda"
          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
        >
          Agenda completa <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <div className="divide-y divide-border/40">
        {/* Tarefas VENCIDAS primeiro — é o que mais precisa de atenção. */}
        {overdueTasks.length > 0 && (
          <div className="bg-rose-500/[0.04] px-5 py-3 space-y-1.5">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-rose-600">
              <AlertTriangle className="h-3.5 w-3.5" /> Vencidas
            </p>
            {overdueTasks.map((t) => (
              <Link
                key={t.id}
                href={`/projects/${t.project?.slug ?? "inbox"}`}
                className="group flex items-center gap-2 text-sm"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
                <span className="min-w-0 truncate text-foreground group-hover:text-primary transition-colors">
                  {t.title}
                </span>
                {t.dueDate && (
                  <span className="ml-auto shrink-0 text-[11px] text-rose-600/80">
                    {t.dueDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Linha do dia */}
        {planned.length > 0 ? (
          <ul className="px-5 py-3 space-y-1.5">
            {planned.map((item) => (
              <li key={item.id}>
                <Link
                  href={ITEM_HREF[item.source] ?? "/agenda"}
                  className="group flex items-center gap-2.5 text-sm"
                >
                  <span className="w-11 shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                    {item.time ?? "dia"}
                  </span>
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="min-w-0 truncate text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </span>
                  {item.subtitle && (
                    <span className="ml-auto hidden shrink-0 truncate pl-2 text-[11px] text-muted-foreground sm:inline max-w-[40%]">
                      {item.subtitle}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4" /> Nada agendado para hoje — dia livre para o que importa.
          </p>
        )}
      </div>
    </section>
  );
}
