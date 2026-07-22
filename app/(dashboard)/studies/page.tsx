// Conteudo autenticado por-usuario: render por requisicao (nunca prerender no build).
export const dynamic = "force-dynamic";

import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/auth";

import { StudyTimer } from "@/components/studies/study-timer";
import { StudySessionList } from "@/components/studies/study-session-list";
import { SessionHistoryDialog } from "@/components/studies/session-history-dialog";
import { SubjectGrid } from "@/components/studies/subject-grid";
import { GamificationHero } from "@/components/studies/gamification-hero";
import { StudyAnalytics } from "@/components/studies/study-analytics";
import { DailyReviewBanner } from "@/components/studies/daily-review-banner";
import { CreateSubjectButton } from "@/components/studies/create-subject-button";
import { StudyHeatmap } from "@/components/studies/study-heatmap";
import { StudyPlanCard, type PlanSubject } from "@/components/studies/study-plan-card";
import { FocusSounds } from "@/components/studies/focus-sounds";
import { ExamCountdown } from "@/components/studies/exam-countdown";
import { MasteryTracks, type MasteryTrack } from "@/components/studies/mastery-tracks";
import { formatHours } from "@/components/studies/studies-helpers";
import { computeMastery, MATURE_INTERVAL_DAYS } from "@/lib/study-mastery";
import { buildDailyActivity, computeStudyStats, type SessionLite, type DailyPoint, type StudyStats } from "@/lib/studies-math";
import { computeElo, sessionsToDays, type EloResult } from "@/lib/studies-elo";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { PageShell, PageHeader, PageContainer } from "@/components/layout/page-shell";

import { History, AlertCircle, BookOpen, PenLine, LayoutGrid, ListChecks, Timer } from "lucide-react";

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
  dueFlashcards: number;
  noteCount: number;
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
  let elo: EloResult = computeElo([]);

  let totalHours = "0.0";
  let hasActivity = false;

  // Revisão de flashcards (conecta o foco à memória de longo prazo).
  let dueFlashcards = 0;
  let totalFlashcards = 0;
  // Vencidos por matéria (revisão por matéria nos cards de matéria).
  const dueBySubject = new Map<string, number>();
  // Notas por matéria (ponte Estudos -> Notas direto no card da matéria).
  const notesBySubject = new Map<string, number>();

  // Sinais das Trilhas de domínio (D1): cartões maduros e metas por matéria.
  const cardsBySubject = new Map<string, { total: number; mature: number }>();
  const goalsBySubject = new Map<string, { total: number; done: number }>();
  let masteryTracks: MasteryTrack[] = [];

  // Heatmap de constância: minutos por dia (reusa o histórico do ELO).
  const heatmapData: Record<string, number> = {};

  // Plano do dia: matérias a atacar (abaixo da meta, mais esquecidas primeiro).
  let planSuggestions: PlanSubject[] = [];

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
    // "Agora" para a fila de revisão (cartões vencidos = nextReview nula ou no passado).
    const reviewNow = new Date();

    const [subjectsData, recentSessionsData, statsData, aggregatedTimeData, lastStudiedData, activitySessions, eloSessions, dueFlashcardsCount, totalFlashcardsCount, decksWithDueData, notesBySubjectData, goalsBySubjectData] =
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

        // Sessões recentes (30 dias) para analytics E para a constância por matéria
        // (pilar das Trilhas de domínio) — mesma janela, uma query só.
        prisma.studySession.findMany({
          where: { userId, date: { gte: activityWindowStart } },
          select: { date: true, durationMinutes: true, focusLevel: true, subjectId: true },
        }),

        // Histórico COMPLETO (2 campos) p/ o ELO: o decaimento precisa replay
        // da temporada inteira. Escala pessoal: milhares de linhas, ok.
        prisma.studySession.findMany({
          where: { userId },
          select: { date: true, durationMinutes: true },
          orderBy: { date: "asc" },
          take: 20000,
        }),

        // Cartões vencidos hoje (mesma regra do /flashcards/review): nextReview
        // nula (cartão novo) ou no passado. `count` é barato — não carrega o acervo.
        prisma.flashcard.count({
          where: { userId, OR: [{ nextReview: null }, { nextReview: { lte: reviewNow } }] },
        }),

        // Total de cartões — distingue "tudo em dia" de "ainda não tem flashcard".
        prisma.flashcard.count({ where: { userId } }),

        // Cartões POR matéria: baralhos ligados a uma matéria + o mínimo de cada
        // cartão (2 colunas). Serve a DOIS consumidores — os vencidos do card da
        // matéria e a maturidade do pilar "Memória" das Trilhas de domínio — sem
        // pagar duas viagens ao banco.
        prisma.flashcardDeck.findMany({
          where: { userId, studySubjectId: { not: null } },
          select: {
            studySubjectId: true,
            cards: { select: { nextReview: true, interval: true } },
          },
        }),

        // Notas vivas POR matéria: _count é barato e não traz DateTime (seguro no
        // adapter libSQL). Vira o contador de notas no card de cada matéria.
        prisma.studyNote.groupBy({
          by: ["subjectId"],
          where: { userId, deletedAt: null, subjectId: { not: null } },
          _count: { id: true },
        }),

        // Metas por matéria e status: pilar "Objetivos" das Trilhas de domínio.
        // Só _count de id (nenhum DateTime) — seguro no adapter libSQL.
        prisma.learningGoal.groupBy({
          by: ["subjectId", "status"],
          where: { userId, deletedAt: null, subjectId: { not: null } },
          _count: { id: true },
        }),
      ]);

    dueFlashcards = dueFlashcardsCount ?? 0;
    totalFlashcards = totalFlashcardsCount ?? 0;

    // Mapa matéria → cartões vencidos e cartões maduros (uma passada só).
    // Vencido = nextReview nula (novo) ou no passado — mesma regra de /flashcards/review.
    // Maduro = intervalo do SM-2 já longo o bastante para valer memória de verdade.
    for (const d of decksWithDueData ?? []) {
      if (!d.studySubjectId) continue;
      let due = 0;
      let mature = 0;
      for (const c of d.cards) {
        if (c.nextReview === null || c.nextReview <= reviewNow) due++;
        if (c.interval >= MATURE_INTERVAL_DAYS) mature++;
      }
      dueBySubject.set(d.studySubjectId, (dueBySubject.get(d.studySubjectId) ?? 0) + due);
      cardsBySubject.set(d.studySubjectId, {
        total: (cardsBySubject.get(d.studySubjectId)?.total ?? 0) + d.cards.length,
        mature: (cardsBySubject.get(d.studySubjectId)?.mature ?? 0) + mature,
      });
    }

    // Mapa matéria → metas totais/concluídas (pilar "Objetivos").
    for (const g of goalsBySubjectData ?? []) {
      if (!g.subjectId) continue;
      const n = g._count?.id ?? 0;
      const cur = goalsBySubject.get(g.subjectId) ?? { total: 0, done: 0 };
      goalsBySubject.set(g.subjectId, {
        total: cur.total + n,
        done: cur.done + (g.status === "DONE" ? n : 0),
      });
    }

    // Mapa matéria → dias DISTINTOS com sessão nos últimos 30 (pilar "Constância").
    const activeDaysBySubject = new Map<string, Set<string>>();
    for (const s of activitySessions ?? []) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const set = activeDaysBySubject.get(s.subjectId) ?? new Set<string>();
      set.add(key);
      activeDaysBySubject.set(s.subjectId, set);
    }

    // Mapa matéria → nº de notas vinculadas.
    for (const g of notesBySubjectData ?? []) {
      if (!g.subjectId) continue;
      notesBySubject.set(g.subjectId, g._count?.id ?? 0);
    }

    // Mapa subjectId → última data estudada (substitui o _max do groupBy).
    const lastStudiedMap = new Map<string, Date>(
      (lastStudiedData ?? []).map((s) => [s.subjectId, s.date])
    );

    subjects = subjectsData ?? [];
    recentSessions = recentSessionsData ?? [];
    totalMinutes = statsData._sum.durationMinutes ?? 0;
    totalSessions = statsData._count.id ?? 0;

    // XP (10 por minuto) continua como métrica acumulada; a progressão visível
    // agora é o ELO (PDL com decaimento — lib/studies-elo.ts).
    totalXP = totalMinutes * 10;
    elo = computeElo(sessionsToDays(eloSessions ?? []));

    // Minutos por dia para o heatmap (chave ISO local YYYY-MM-DD).
    for (const s of eloSessions ?? []) {
      const d = new Date(s.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      heatmapData[key] = (heatmapData[key] ?? 0) + (s.durationMinutes ?? 0);
    }

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
        dueFlashcards: dueBySubject.get(s.id) ?? 0,
        noteCount: notesBySubject.get(s.id) ?? 0,
      };
    });

    // Ordena por tempo (decrescente) para dar prioridade visual às mais estudadas
    subjectsWithStats.sort((a, b) => b.totalMinutes - a.totalMinutes);

    // TRILHAS DE DOMÍNIO: nota 0-100 por matéria a partir dos sinais acima.
    // Menor domínio primeiro — a trilha existe para mostrar onde falta terreno.
    masteryTracks = subjectsWithStats
      .map((s) => {
        const cards = cardsBySubject.get(s.id) ?? { total: 0, mature: 0 };
        const goals = goalsBySubject.get(s.id) ?? { total: 0, done: 0 };
        return {
          id: s.id,
          title: s.title,
          icon: s.icon,
          color: s.color,
          mastery: computeMastery({
            totalMinutes: s.totalMinutes,
            goalMinutes: s.goalMinutes,
            activeDays30: activeDaysBySubject.get(s.id)?.size ?? 0,
            cardsTotal: cards.total,
            cardsMature: cards.mature,
            goalsTotal: goals.total,
            goalsDone: goals.done,
          }),
        };
      })
      .sort((a, b) => a.mastery.score - b.mastery.score);

    // Sugestões do "Plano de hoje": matérias abaixo da meta, mais esquecidas
    // (menos recentemente estudadas / nunca) primeiro. Até 3.
    planSuggestions = subjectsWithStats
      .map((s) => ({
        id: s.id,
        title: s.title,
        icon: s.icon,
        color: s.color,
        lastStudied: s.lastStudied,
        progress: s.goalMinutes > 0 ? Math.min(100, Math.round((s.totalMinutes / s.goalMinutes) * 100)) : 0,
      }))
      .filter((s) => s.progress < 100)
      .sort((a, b) => {
        const ta = a.lastStudied ? new Date(a.lastStudied).getTime() : 0;
        const tb = b.lastStudied ? new Date(b.lastStudied).getTime() : 0;
        return ta - tb;
      })
      .slice(0, 3);

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
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Quadro de estudo: Para estudar → Estudando → Revisar → Dominado */}
            <Link href="/goals">
              <Button variant="outline" className="gap-2">
                <LayoutGrid className="h-4 w-4" /> Quadro de estudo
              </Button>
            </Link>
            {/* Preparação ENEM: banco de questões → simulado cronometrado */}
            <Link href="/studies/questoes">
              <Button variant="outline" className="gap-2">
                <ListChecks className="h-4 w-4" /> Questões
              </Button>
            </Link>
            <Link href="/studies/simulados">
              <Button variant="outline" className="gap-2">
                <Timer className="h-4 w-4" /> Simulados
              </Button>
            </Link>
            <Link href="/studies/redacao">
              <Button variant="outline" className="gap-2">
                <PenLine className="h-4 w-4" /> Redação ENEM
              </Button>
            </Link>
          </div>
        }
      />

      <PageContainer className="space-y-8">
        {/* REVISÃO DO DIA: gatilho do hábito — cartões vencidos em 1 clique. */}
        <DailyReviewBanner due={dueFlashcards} totalCards={totalFlashcards} />

        {/* CONTAGEM REGRESSIVA: dias até ENEM/vestibular/concurso (localStorage). */}
        <ExamCountdown />

        {/* PLANO DE HOJE: meta diária + ofensiva + matérias a atacar agora. */}
        {subjects.length > 0 && (
          <StudyPlanCard
            todayMinutes={studyStats.todayMinutes}
            streak={studyStats.streak}
            suggestions={planSuggestions}
          />
        )}

        {/* ELO DE ESTUDOS (PDL + decaimento — substitui o antigo Nível) */}
        <GamificationHero
          elo={elo}
          totalXP={totalXP}
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
                  <CreateSubjectButton withIcon />
                </div>
              </div>
            ) : (
              <StudyTimer subjects={subjectsWithStats} />
            )}

            {/* AMBIENTE SONORO: mixer de sons de foco (offline, sintetizado) */}
            <FocusSounds />

            {/* GRADE DE MATÉRIAS (com estatísticas) */}
            <SubjectGrid subjects={subjectsWithStats} />
          </div>

          {/* SIDEBAR: Histórico recente */}
          <Card className="h-fit border-border/50 bg-card shadow-sm lg:sticky lg:top-6">
            <CardHeader className="border-b border-border/40 pb-4">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <History className="h-4 w-4 text-primary" />
                  Histórico recente
                </CardTitle>
                {/* Histórico completo: busca + paginação (escala p/ anos de sessões) */}
                <SessionHistoryDialog totalSessions={totalSessions} />
              </div>
            </CardHeader>

            <CardContent className="px-2 pt-4">
              <StudySessionList sessions={recentSessions} />
            </CardContent>
          </Card>
        </section>

        {/* DOMÍNIO: o quanto cada matéria já é sua (tempo + memória + constância + metas) */}
        <MasteryTracks tracks={masteryTracks} />

        {/* CONSTÂNCIA: heatmap dos últimos meses (regularidade > intensidade) */}
        {hasActivity && <StudyHeatmap data={heatmapData} streak={studyStats.streak} />}

        {/* ANÁLISE: KPIs de cadência + gráfico (no fim, sem competir com o foco) */}
        {hasActivity && <StudyAnalytics daily={dailyActivity} stats={studyStats} />}
      </PageContainer>
    </PageShell>
  );
}
