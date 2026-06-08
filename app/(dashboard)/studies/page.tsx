import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

import { StudyTimer } from "@/components/studies/study-timer";
import { StudySessionList } from "@/components/studies/study-session-list";
import { SubjectGrid } from "@/components/studies/subject-grid";
import { GamificationHero } from "@/components/studies/gamification-hero";
import { StudyAnalytics } from "@/components/studies/study-analytics";
import { XP_PER_LEVEL, formatHours, safePercent } from "@/components/studies/studies-helpers";
import { buildDailyActivity, computeStudyStats, type SessionLite, type DailyPoint, type StudyStats } from "@/lib/studies-math";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";

import { History, AlertCircle, BookOpen } from "lucide-react";

// Tipos Prisma corretos
import { StudySubject, Prisma } from "@prisma/client";

export const metadata: Metadata = {
  title: "Estudos | Life OS",
  description: "Gerencie seu tempo de estudo e acompanhe sua evolução.",
};

/* ================================
   TIPOS LOCAIS
================================ */
// Extende StudySubject com estatísticas calculadas
export interface SubjectWithStats extends StudySubject {
  totalMinutes: number;
  sessionCount: number;
  lastStudied: Date | null;
}

// Payload de sessão com subject incluído
type StudySessionWithSubject = Prisma.StudySessionGetPayload<{
  include: { subject: true };
}>;

/* ================================
   PAGE (Server Component)
================================ */
export default async function StudiesPage() {
  // dados iniciais
  let subjects: StudySubject[] = [];
  let recentSessions: StudySessionWithSubject[] = [];
  let totalMinutes = 0;
  let totalSessions = 0;

  // gamification
  let totalXP = 0;
  let currentLevel = 1;
  let xpCurrentLevel = 0;
  const xpNextLevel = XP_PER_LEVEL;
  let progressPercentage = 0;

  let totalHours = "0.0";
  let hasActivity = false;

  let subjectsWithStats: SubjectWithStats[] = [];
  let dailyActivity: DailyPoint[] = [];
  let studyStats: StudyStats = {
    todayMinutes: 0, weekMinutes: 0, streak: 0, bestDayMinutes: 0, activeDays: 0, avgFocus: 0,
  };
  let hasError = false;

  try {
    const userId = await getCurrentUserId();

    // Janela de 30 dias para o gráfico de atividade e a sequência (streak).
    const activityWindowStart = new Date();
    activityWindowStart.setDate(activityWindowStart.getDate() - 29);
    activityWindowStart.setHours(0, 0, 0, 0);

    // Carrega em paralelo: matérias, sessões recentes, estatísticas, tempo agrupado e atividade.
    const [subjectsData, recentSessionsData, statsData, aggregatedTimeData, lastStudiedData, activitySessions] =
      await Promise.all([
        prisma.studySubject.findMany({
          where: { userId },
          orderBy: { title: "asc" },
        }),

        prisma.studySession.findMany({
          where: { userId },
          take: 5,
          orderBy: { date: "desc" },
          include: { subject: true },
        }),

        prisma.studySession.aggregate({
          where: { userId },
          _sum: { durationMinutes: true },
          _count: { id: true },
        }),

        // Agrupado por matéria: total de minutos e nº de sessões.
        // OBS: NÃO usar `_max: { date }` aqui — o adapter libSQL (modo réplica/nuvem)
        // não converte agregação de DateTime gravado como inteiro epoch e lança
        // "Inconsistent column data". A última data por matéria vem da query abaixo.
        prisma.studySession.groupBy({
          by: ["subjectId"],
          where: { userId },
          _sum: { durationMinutes: true },
          _count: { id: true },
        }),

        // Última data de estudo por matéria: 1 linha por subjectId (a mais recente).
        // `findMany` decodifica DateTime corretamente (ao contrário do _max em groupBy).
        prisma.studySession.findMany({
          where: { userId },
          distinct: ["subjectId"],
          orderBy: { date: "desc" },
          select: { subjectId: true, date: true },
        }),

        // Sessões recentes (30 dias) para analytics.
        prisma.studySession.findMany({
          where: { userId, date: { gte: activityWindowStart } },
          select: { date: true, durationMinutes: true, focusLevel: true },
        }),
      ]);

    // Mapa subjectId → última data estudada (substitui o _max do groupBy).
    const lastStudiedMap = new Map<string, Date>(
      (lastStudiedData ?? []).map((s) => [s.subjectId, s.date])
    );

    subjects = subjectsData ?? [];
    recentSessions = recentSessionsData ?? [];
    totalMinutes = statsData._sum.durationMinutes ?? 0;
    totalSessions = statsData._count.id ?? 0;

    // XP e nível (10 XP por minuto)
    totalXP = totalMinutes * 10;
    currentLevel = Math.floor(totalXP / XP_PER_LEVEL) + 1;
    xpCurrentLevel = totalXP % XP_PER_LEVEL;
    progressPercentage = safePercent((xpCurrentLevel / XP_PER_LEVEL) * 100);

    totalHours = formatHours(totalMinutes);
    hasActivity = totalSessions > 0;

    // Mapeia estatísticas por matéria (groupBy retorna subjectId)
    const statMap = new Map<string, { minutes: number; count: number; last: Date | null }>();
    for (const g of aggregatedTimeData ?? []) {
      const subjectId = g.subjectId as string;
      statMap.set(subjectId, {
        minutes: g._sum?.durationMinutes ?? 0,
        count: g._count?.id ?? 0,
        last: lastStudiedMap.get(subjectId) ?? null,
      });
    }

    subjectsWithStats = (subjects ?? []).map((s) => {
      const st = statMap.get(s.id);
      return {
        ...s,
        totalMinutes: st?.minutes ?? 0,
        sessionCount: st?.count ?? 0,
        lastStudied: st?.last ?? null,
      };
    });

    // Ordena por tempo (decrescente) para dar prioridade visual às mais estudadas
    subjectsWithStats.sort((a, b) => b.totalMinutes - a.totalMinutes);

    // Analytics (gráfico + KPIs) a partir das sessões recentes
    const lite: SessionLite[] = (activitySessions ?? []).map((s) => ({
      date: s.date,
      durationMinutes: s.durationMinutes,
      focusLevel: s.focusLevel,
    }));
    dailyActivity = buildDailyActivity(lite, 14);
    studyStats = computeStudyStats(lite);
  } catch (err) {
    console.error("[StudiesPage] erro ao carregar dados:", err);
    hasError = true;
  }

  // UI: estado de erro
  if (hasError) {
    return (
      <main className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">Erro ao carregar estudos</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Ocorreu um problema ao buscar seus dados. Tente novamente mais tarde.
        </p>
        <div className="flex gap-2">
          <Link href="/dashboard">
            <Button variant="ghost">Voltar ao dashboard</Button>
          </Link>
        </div>
      </main>
    );
  }

  return (
    <PageShell>
      <PageHeader
        icon={<BookOpen className="h-6 w-6" />}
        title="Estudos"
        description="Entre no foco, registre suas sessões e acompanhe sua evolução."
      />

      <PageContainer className="space-y-8">
        {/* PROGRESSO (enxuto) */}
        <GamificationHero
          currentLevel={currentLevel}
          totalXP={totalXP}
          xpCurrentLevel={xpCurrentLevel}
          xpNextLevel={xpNextLevel}
          progressPercentage={progressPercentage}
          totalHours={totalHours}
          totalSessions={totalSessions}
        />

        {/* ÁREA PRINCIPAL: foco + matérias à esquerda · histórico à direita */}
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* PAINEL DE FOCO (protagonista) — ou onboarding */}
            {subjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-card p-12 text-center shadow-sm">
                <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold">Comece sua jornada</h3>
                <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                  Cadastre sua primeira matéria para abrir o modo foco.
                </p>
                <div className="mt-5 flex justify-center">
                  <Link href="/studies/new">
                    <Button>Criar matéria</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <StudyTimer subjects={subjectsWithStats} />
            )}

            {/* GRADE DE MATÉRIAS (com estatísticas) */}
            <SubjectGrid subjects={subjectsWithStats} />
          </div>

          {/* SIDEBAR: Histórico recente */}
          <Card className="h-fit border-border/50 bg-card shadow-sm lg:sticky lg:top-6">
            <CardHeader className="border-b border-border/40 pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4 text-primary" />
                Histórico recente
              </CardTitle>
            </CardHeader>

            <CardContent className="px-2 pt-4">
              <StudySessionList sessions={recentSessions} />
            </CardContent>
          </Card>
        </section>

        {/* ANÁLISE: KPIs de cadência + gráfico (no fim, sem competir com o foco) */}
        {hasActivity && <StudyAnalytics daily={dailyActivity} stats={studyStats} />}
      </PageContainer>
    </PageShell>
  );
}
