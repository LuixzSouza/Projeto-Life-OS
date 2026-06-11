// Card "Constância" do dashboard: mini-heatmap das últimas 16 semanas +
// sequência atual de dias ativos. Versão compacta do heatmap da Retrospectiva
// (mesma fonte: lib/activity-days). Server component puro.

import Link from "next/link";
import { Activity, Flame, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import {
  getActivityDays, currentStreak, dayKey, dayTitle, levelOf, totalOf, HEAT_LEVELS, EMPTY_DAY,
} from "@/lib/activity-days";

const WEEKS_SHOWN = 16;

export async function ConsistencyCard({ userId }: { userId: string }) {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  // Janela: da semana atual para trás, 16 colunas cheias (começando no domingo).
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  start.setDate(start.getDate() - start.getDay() - (WEEKS_SHOWN - 1) * 7);

  const days = await getActivityDays(userId, start, end);
  if (days.size === 0) return null; // sem nenhum registro → sem cobrança visual

  const streak = currentStreak(days, now);

  const weeks: Date[][] = [];
  for (let cursor = new Date(start); cursor <= end; ) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return (
    <Card className="border-border/40 bg-card shadow-sm">
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Activity className="h-3.5 w-3.5" />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Constância</p>

          {streak > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[11px] font-bold text-orange-500">
              <Flame className="h-3 w-3" />
              {streak} {streak === 1 ? "dia seguido" : "dias seguidos"}
            </span>
          )}

          <Link
            href="/review"
            className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            Retrospectiva <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex gap-[3px] w-max sm:w-full sm:justify-between">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((d, di) => {
                  if (d > end) return <div key={di} className="h-[11px] w-[11px]" />;
                  const counts = days.get(dayKey(d)) ?? EMPTY_DAY;
                  return (
                    <div
                      key={di}
                      title={dayTitle(d, counts)}
                      className={cn("h-[11px] w-[11px] rounded-[2.5px]", HEAT_LEVELS[levelOf(totalOf(counts))])}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
