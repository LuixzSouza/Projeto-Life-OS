"use client";

// Feed da Linha do Tempo (v2): busca sem acento, filtros por módulo/ação/
// período com contagem, hora relativa, chip do módulo levando ao módulo e
// paginação por cursor ("Carregar mais"). Os metadados visuais vivem em
// timeline-meta.ts (compartilhados com o painel de insights).

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Filter, Search, X, ChevronDown, Loader2, Activity } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { ClientActivity } from "@/lib/activity";
import { loadOlderActivity } from "@/app/(dashboard)/timeline/actions";
import { moduleMeta, actionMeta } from "./timeline-meta";

const PAGE_SIZE = 120;

/** Busca sem acento/caixa ("reuniao" acha "Reunião") — padrão do projeto. */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

type Period = "all" | "today" | "7d" | "30d";

const PERIODS: { id: Period; label: string }[] = [
  { id: "all", label: "Tudo" },
  { id: "today", label: "Hoje" },
  { id: "7d", label: "7 dias" },
  { id: "30d", label: "30 dias" },
];

function periodStart(p: Period): number {
  if (p === "all") return 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (p === "7d") d.setDate(d.getDate() - 6);
  if (p === "30d") d.setDate(d.getDate() - 29);
  return d.getTime();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const that = new Date(d); that.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - that.getTime()) / 864e5);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
}

/** "agora" / "há 5 min" / "há 3 h" para o dia atual; HH:mm para o resto. */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60_000);
  if (diffMin >= 0 && diffMin < 1) return "agora";
  if (diffMin > 0 && diffMin < 60) return `há ${diffMin} min`;
  if (diffMin > 0 && diffMin < 6 * 60) return `há ${Math.floor(diffMin / 60)} h`;
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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

/** Destaca o que está "entre aspas" no resumo (o NOME do registro). */
function renderSummary(summary: string): React.ReactNode {
  const parts = summary.split(/"([^"]+)"/g);
  if (parts.length === 1) return summary;
  return parts.map((p, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">“{p}”</strong> : p
  );
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

export function TimelineFeed({ initialItems }: { initialItems: ClientActivity[] }) {
  const [items, setItems] = useState<ClientActivity[]>(initialItems);
  const [exhausted, setExhausted] = useState(initialItems.length < PAGE_SIZE);
  const [isLoading, startLoading] = useTransition();

  // Filtros (vazio = todos) — combinam entre si e com a busca.
  const [activeModules, setActiveModules] = useState<Set<string>>(new Set());
  const [activeActions, setActiveActions] = useState<Set<string>>(new Set());
  const [period, setPeriod] = useState<Period>("all");
  const [query, setQuery] = useState("");

  // Módulos/ações presentes nos itens carregados, com contagem (chips informativos).
  const { presentModules, presentActions } = useMemo(() => {
    const mods = new Map<string, number>();
    const acts = new Map<string, number>();
    for (const it of items) {
      mods.set(it.module, (mods.get(it.module) ?? 0) + 1);
      acts.set(it.action, (acts.get(it.action) ?? 0) + 1);
    }
    return {
      presentModules: [...mods.entries()].sort((a, b) => b[1] - a[1]),
      presentActions: [...acts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [items]);

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    const start = periodStart(period);
    return items.filter((i) => {
      if (activeModules.size > 0 && !activeModules.has(i.module)) return false;
      if (activeActions.size > 0 && !activeActions.has(i.action)) return false;
      if (start > 0 && new Date(i.createdAt).getTime() < start) return false;
      if (q && !norm(`${i.summary ?? ""} ${moduleMeta(i.module).label}`).includes(q)) return false;
      return true;
    });
  }, [items, activeModules, activeActions, period, query]);

  const groups = useMemo(() => groupByDay(filtered), [filtered]);
  const isFiltering = query.trim() !== "" || activeModules.size > 0 || activeActions.size > 0 || period !== "all";

  const toggleIn = (set: Set<string>, v: string) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  const loadMore = () => {
    const last = items[items.length - 1];
    if (!last || isLoading) return;
    startLoading(async () => {
      try {
        const older = await loadOlderActivity(last.createdAt, PAGE_SIZE);
        setItems((prev) => [...prev, ...older]);
        if (older.length < PAGE_SIZE) setExhausted(true);
      } catch {
        toast.error("Não consegui carregar o histórico mais antigo.");
      }
    });
  };

  const clearFilters = () => {
    setActiveModules(new Set());
    setActiveActions(new Set());
    setPeriod("all");
    setQuery("");
  };

  return (
    <div className="space-y-5">
      {/* TOOLBAR: busca + período */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar no histórico…"
            className="h-9 w-full rounded-xl border border-border/50 bg-card pl-9 pr-8 text-sm shadow-sm outline-none transition-all focus:border-primary/40 sm:w-64 sm:focus:w-80"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              title="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="inline-flex items-center gap-1 self-start rounded-xl border border-border/50 bg-muted/30 p-1 sm:self-auto">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPeriod(p.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all",
                period === p.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* FILTROS: módulos e ações (com contagem) */}
      <div className="space-y-2">
        {presentModules.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              <Filter className="h-3 w-3" /> Módulo
            </span>
            {presentModules.map(([m, count]) => {
              const meta = moduleMeta(m);
              const Icon = meta.icon;
              const on = activeModules.size === 0 || activeModules.has(m);
              return (
                <button
                  key={m}
                  onClick={() => setActiveModules((prev) => toggleIn(prev, m))}
                  style={on ? { borderColor: `${meta.color}55`, color: meta.color } : undefined}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
                    on ? "bg-card shadow-sm" : "border-border/40 bg-transparent text-muted-foreground/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.label}
                  <span className="tabular-nums opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {presentActions.length > 1 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
              <Activity className="h-3 w-3" /> Ação
            </span>
            {presentActions.map(([a, count]) => {
              const meta = actionMeta(a);
              const Icon = meta.icon;
              const on = activeActions.size === 0 || activeActions.has(a);
              return (
                <button
                  key={a}
                  onClick={() => setActiveActions((prev) => toggleIn(prev, a))}
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all",
                    on ? cn("border-transparent shadow-sm", meta.tone) : "border-border/40 bg-transparent text-muted-foreground/50"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {meta.verb}
                  <span className="tabular-nums opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        {isFiltering && (
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold tabular-nums text-primary">
              {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
            </span>
            <button
              onClick={clearFilters}
              className="text-[11px] font-bold text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* GRUPOS POR DIA */}
      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <Activity className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma atividade para este filtro.</p>
          {!exhausted && (
            <p className="mt-1 text-xs text-muted-foreground/60">O que você procura pode estar mais atrás — carregue mais histórico.</p>
          )}
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map(([day, rows]) => (
            <section key={day}>
              <div className="mb-2.5 flex items-center gap-2">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-foreground/70 first-letter:uppercase">{day}</h2>
                <span className="rounded-full bg-muted/60 px-1.5 py-px text-[10px] font-bold tabular-nums text-muted-foreground/60">{rows.length}</span>
                <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent" />
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
                      className="group relative flex items-center gap-3 rounded-xl border border-transparent py-2 pl-2 pr-3 transition-all hover:border-border/40 hover:bg-card hover:shadow-sm"
                    >
                      {/* Nó na trilha (cor pela ação) */}
                      <span className={cn("absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background transition-transform group-hover:scale-110", am.tone)}>
                        <ActionIcon className="h-3 w-3" />
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground/85">
                          {a.summary ? renderSummary(a.summary) : `${am.verb} em ${mm.label}`}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          {/* Chip do módulo agora NAVEGA até o módulo */}
                          <Link
                            href={mm.href}
                            title={`Abrir ${mm.label}`}
                            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-all hover:brightness-110 hover:shadow-sm"
                            style={{ backgroundColor: `${mm.color}1a`, color: mm.color }}
                          >
                            <ModuleIcon className="h-3 w-3" /> {mm.label}
                          </Link>
                          <span
                            className="font-mono text-[11px] tabular-nums text-muted-foreground/50"
                            title={new Date(a.createdAt).toLocaleString("pt-BR")}
                          >
                            {timeLabel(a.createdAt)}
                          </span>
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

      {/* CARREGAR MAIS (cursor por data) */}
      <div className="flex justify-center pt-2">
        {exhausted ? (
          items.length > 0 && (
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/40">
              ✦ Início da sua história no Life OS ✦
            </p>
          )
        ) : (
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
            className="h-9 gap-1.5 rounded-xl text-[11px] font-black uppercase tracking-widest"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Carregar mais
          </Button>
        )}
      </div>
    </div>
  );
}
