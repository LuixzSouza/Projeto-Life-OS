import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";
import { getRecentActivity, type ClientActivity } from "@/lib/activity";
import {
  History, ListTodo, Wallet, BookOpen, Calendar, Users, Briefcase,
  Plus, Pencil, Trash2, CheckCircle2, RotateCcw, Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const MODULE_ICON: Record<string, React.ElementType> = {
  tasks: ListTodo,
  finance: Wallet,
  studies: BookOpen,
  agenda: Calendar,
  social: Users,
  projects: Briefcase,
};

const ACTION_META: Record<string, { icon: React.ElementType; tone: string; verb: string }> = {
  CREATE: { icon: Plus, tone: "bg-emerald-500/10 text-emerald-500", verb: "Criou" },
  UPDATE: { icon: Pencil, tone: "bg-blue-500/10 text-blue-500", verb: "Atualizou" },
  DELETE: { icon: Trash2, tone: "bg-red-500/10 text-red-500", verb: "Removeu" },
  COMPLETE: { icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-500", verb: "Concluiu" },
  REOPEN: { icon: RotateCcw, tone: "bg-amber-500/10 text-amber-500", verb: "Reabriu" },
};

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

export default async function TimelinePage() {
  const items = await getRecentActivity(80);
  const groups = groupByDay(items);

  return (
    <PageShell>
      <PageHeader
        icon={<History className="h-5 w-5" />}
        title="Linha do Tempo"
        description="Tudo o que aconteceu no seu Life OS, em ordem cronológica."
      />
      <PageContainer>
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-20 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              Nenhuma atividade registrada ainda.<br />
              Conforme você usar o sistema, suas ações aparecem aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map(([day, rows]) => (
              <section key={day}>
                <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">{day}</h2>
                <ol className="relative ml-3 space-y-1 border-l border-border/50 pl-6">
                  {rows.map((a) => {
                    const meta = ACTION_META[a.action] ?? { icon: Activity, tone: "bg-muted text-muted-foreground", verb: a.action };
                    const ModuleIcon = MODULE_ICON[a.module] ?? Activity;
                    const ActionIcon = meta.icon;
                    return (
                      <li key={a.id} className="relative py-1.5">
                        <span className={cn("absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background", meta.tone)}>
                          <ActionIcon className="h-3 w-3" />
                        </span>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm text-foreground">
                            {a.summary ?? `${meta.verb} em ${a.module}`}
                          </p>
                          <span className="shrink-0 text-[11px] font-mono text-muted-foreground/60">{timeLabel(a.createdAt)}</span>
                        </div>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground/50">
                          <ModuleIcon className="h-3 w-3" /> {a.module}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </div>
        )}
      </PageContainer>
    </PageShell>
  );
}
