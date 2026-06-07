"use client";

import { useMemo, useState } from "react";
import {
  ListTodo, Wallet, BookOpen, Calendar, Users, Briefcase,
  Plus, Pencil, Trash2, CheckCircle2, RotateCcw, Activity,
  TrendingUp, TrendingDown, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ClientActivity } from "@/lib/activity";

type Meta = { label: string; icon: React.ElementType; color: string };

const MODULE_META: Record<string, Meta> = {
  tasks: { label: "Tarefas", icon: ListTodo, color: "#6366f1" },
  finance: { label: "Finanças", icon: Wallet, color: "#10b981" },
  studies: { label: "Estudos", icon: BookOpen, color: "#3b82f6" },
  agenda: { label: "Agenda", icon: Calendar, color: "#f59e0b" },
  social: { label: "Social", icon: Users, color: "#ec4899" },
  projects: { label: "Projetos", icon: Briefcase, color: "#8b5cf6" },
  business: { label: "Negócios", icon: Briefcase, color: "#14b8a6" },
};

function moduleMeta(module: string): Meta {
  return MODULE_META[module] ?? { label: module, icon: Activity, color: "#71717a" };
}

const ACTION_META: Record<string, { icon: React.ElementType; tone: string; verb: string }> = {
  CREATE: { icon: Plus, tone: "bg-emerald-500/10 text-emerald-500", verb: "Criou" },
  UPDATE: { icon: Pencil, tone: "bg-blue-500/10 text-blue-500", verb: "Atualizou" },
  DELETE: { icon: Trash2, tone: "bg-rose-500/10 text-rose-500", verb: "Removeu" },
  COMPLETE: { icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-500", verb: "Concluiu" },
  REOPEN: { icon: RotateCcw, tone: "bg-amber-500/10 text-amber-500", verb: "Reabriu" },
  RESTORE: { icon: RotateCcw, tone: "bg-amber-500/10 text-amber-500", verb: "Restaurou" },
  INCOME: { icon: TrendingUp, tone: "bg-emerald-500/10 text-emerald-500", verb: "Recebeu" },
  EXPENSE: { icon: TrendingDown, tone: "bg-rose-500/10 text-rose-500", verb: "Pagou" },
};

function actionMeta(action: string) {
  return ACTION_META[action] ?? { icon: Activity, tone: "bg-muted text-muted-foreground", verb: action };
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(d); that.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - that.getTime()) / 864e5);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function metaValue(meta: string | null): number | null {
  if (!meta) return null;
  try {
    const obj = JSON.parse(meta) as { value?: unknown };
    return typeof obj?.value === "number" ? obj.value : null;
  } catch {
    return null;
  }
}

function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function groupByDay(items: ClientActivity[]): [string, ClientActivity[]][] {
  const map = new Map<string, ClientActivity[]>();
  for (const it of items) {
    const key = dayLabel(it.createdAt);
    const arr = map.get(key);
    if (arr) arr.push(it);
    else map.set(key, [it]);
  }
  return Array.from(map.entries());
}

export function TimelineFeed({ items }: { items: ClientActivity[] }) {
  // Filtro por módulo: vazio = todos.
  const [active, setActive] = useState<Set<string>>(new Set());

  const presentModules = useMemo(() => {
    const seen = new Set<string>();
    const order: string[] = [];
    for (const it of items) {
      if (!seen.has(it.module)) { seen.add(it.module); order.push(it.module); }
    }
    return order;
  }, [items]);

  const filtered = useMemo(
    () => (active.size === 0 ? items : items.filter((i) => active.has(i.module))),
    [items, active],
  );

  const groups = useMemo(() => groupByDay(filtered), [filtered]);

  const toggle = (m: string) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });

  return (
    <div className="space-y-6">
      {/* FILTROS POR MÓDULO */}
      {presentModules.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">
            <Filter className="h-3.5 w-3.5" /> Filtrar
          </span>
          {active.size > 0 && (
            <button
              onClick={() => setActive(new Set())}
              className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary transition-colors hover:bg-primary/20"
            >
              Todos
            </button>
          )}
          {presentModules.map((m) => {
            const meta = moduleMeta(m);
            const Icon = meta.icon;
            const on = active.size === 0 || active.has(m);
            return (
              <button
                key={m}
                onClick={() => toggle(m)}
                style={on ? { borderColor: `${meta.color}55`, color: meta.color } : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
                  on ? "bg-card" : "border-border/40 bg-transparent text-muted-foreground/50",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {meta.label}
              </button>
            );
          })}
        </div>
      )}

      {/* GRUPOS POR DIA */}
      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-16 text-center text-sm text-muted-foreground">
          Nenhuma atividade para este filtro.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([day, rows]) => (
            <section key={day}>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/70">{day}</h2>
                <span className="rounded-full bg-muted/60 px-1.5 py-px text-[10px] font-bold tabular-nums text-muted-foreground/60">{rows.length}</span>
                <div className="h-px flex-1 bg-border/40" />
              </div>

              <ol className="relative ml-2 space-y-1 border-l border-border/40 pl-6">
                {rows.map((a) => {
                  const am = actionMeta(a.action);
                  const mm = moduleMeta(a.module);
                  const ActionIcon = am.icon;
                  const ModuleIcon = mm.icon;
                  const value = metaValue(a.meta);
                  const isOut = a.action === "EXPENSE";

                  return (
                    <li
                      key={a.id}
                      className="group relative flex items-center gap-3 rounded-xl border border-transparent py-2 pl-2 pr-3 transition-colors hover:border-border/40 hover:bg-muted/40"
                    >
                      {/* Nó na trilha (cor pela ação) */}
                      <span className={cn("absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background", am.tone)}>
                        <ActionIcon className="h-3 w-3" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground/90">
                          {a.summary ?? `${am.verb} em ${mm.label}`}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                            style={{ backgroundColor: `${mm.color}1a`, color: mm.color }}
                          >
                            <ModuleIcon className="h-3 w-3" /> {mm.label}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground/50">{timeLabel(a.createdAt)}</span>
                        </div>
                      </div>

                      {/* Valor (lançamentos financeiros) */}
                      {value !== null && (
                        <span className={cn("shrink-0 rounded-md px-2 py-1 text-xs font-bold tabular-nums", isOut ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500")}>
                          {isOut ? "- " : "+ "}{formatBRL(value)}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
