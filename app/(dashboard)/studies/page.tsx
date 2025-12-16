import { prisma } from "@/lib/prisma";
import { StudyTimer } from "@/components/studies/study-timer";
import { StudySessionList } from "@/components/studies/study-session-list";
import { SubjectGrid } from "@/components/studies/subject-grid";
import {
  Trophy,
  History,
  Zap,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { StudySubject, Prisma } from "@prisma/client";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ================================
   METADATA
================================ */
export const metadata: Metadata = {
  title: "Estudos | Life OS",
  description: "Gerencie seu tempo de estudo e acompanhe sua evolução.",
};

/* ================================
   TIPOS
================================ */
export interface SubjectWithStats extends StudySubject {
  totalMinutes: number;
}

type StudySessionWithSubject =
  Prisma.StudySessionGetPayload<{
    include: { subject: true };
  }>;

/* ================================
   TEMA DINÂMICO POR NÍVEL
================================ */
const getLevelTheme = (level: number) => {
  if (level >= 50) {
    return {
      bg: "bg-primary",
      border: "border-primary",
      text: "text-primary",
      glow: "bg-primary/25",
    };
  }
  if (level >= 30) {
    return {
      bg: "bg-primary/80",
      border: "border-primary/80",
      text: "text-primary",
      glow: "bg-primary/20",
    };
  }
  if (level >= 20) {
    return {
      bg: "bg-primary/70",
      border: "border-primary/70",
      text: "text-primary",
      glow: "bg-primary/15",
    };
  }
  if (level >= 10) {
    return {
      bg: "bg-primary/60",
      border: "border-primary/60",
      text: "text-primary",
      glow: "bg-primary/10",
    };
  }
  return {
    bg: "bg-primary/50",
    border: "border-primary/50",
    text: "text-primary",
    glow: "bg-primary/5",
  };
};

export default async function StudiesPage() {
  /* ================================
     ESTADO INICIAL
  ================================ */
  let subjects: StudySubject[] = [];
  let recentSessions: StudySessionWithSubject[] = [];
  let totalMinutes = 0;
  let totalSessions = 0;
  let currentLevel = 1;
  let totalXP = 0;
  let xpCurrentLevel = 0;
  let xpNextLevel = 600;
  let progressPercentage = 0;
  let totalHours = "0.0";
  let hasActivity = false;
  let subjectsWithStats: SubjectWithStats[] = [];
  let hasError = false;

  /* ================================
     BUSCA DE DADOS
  ================================ */
  try {
    const [
      subjectsData,
      recentSessionsData,
      statsData,
      aggregatedTimeData,
    ] = await Promise.all([
      prisma.studySubject.findMany({ orderBy: { title: "asc" } }),
      prisma.studySession.findMany({
        take: 5,
        orderBy: { date: "desc" },
        include: { subject: true },
      }),
      prisma.studySession.aggregate({
        _sum: { durationMinutes: true },
        _count: { id: true },
      }),
      prisma.studySession.groupBy({
        by: ["subjectId"],
        _sum: { durationMinutes: true },
      }),
    ]);

    subjects = subjectsData;
    recentSessions = recentSessionsData;
    totalMinutes = statsData._sum.durationMinutes ?? 0;
    totalSessions = statsData._count.id;

    const XP_PER_LEVEL = 600;
    totalXP = totalMinutes;
    currentLevel = Math.floor(totalXP / XP_PER_LEVEL) + 1;
    xpCurrentLevel = totalXP % XP_PER_LEVEL;
    xpNextLevel = XP_PER_LEVEL;
    progressPercentage = (xpCurrentLevel / xpNextLevel) * 100;
    totalHours = (totalMinutes / 60).toFixed(1);
    hasActivity = totalSessions > 0;

    const timeMap = new Map(
      aggregatedTimeData.map(item => [
        item.subjectId,
        item._sum.durationMinutes ?? 0,
      ])
    );

    subjectsWithStats = subjects.map(subject => ({
      ...subject,
      totalMinutes: timeMap.get(subject.id) ?? 0,
    }));
  } catch (error) {
    console.error("Erro ao carregar estudos:", error);
    hasError = true;
  }

  /* ================================
     ERRO GLOBAL
  ================================ */
  if (hasError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">
          Erro ao carregar dados
        </h2>
        <Link href="/dashboard">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    );
  }

  const theme = getLevelTheme(currentLevel);

  /* ================================
     RENDER
  ================================ */
  return (
    <div className="space-y-8 max-w-6xl mx-auto p-6 pb-24 animate-in fade-in duration-500">

      {/* ================= HERO ================= */}
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl p-8 shadow-xl border",
          "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent",
          "border-border"
        )}
      >
        {/* Glow */}
        <div
          className={cn(
            "absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20",
            theme.glow
          )}
        />
        <div
          className={cn(
            "absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-10",
            theme.glow
          )}
        />

        <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase border",
                "bg-secondary",
                theme.border,
                theme.text
              )}
            >
              <Trophy className="h-3 w-3" />
              Nível {currentLevel}
            </div>

            <h1 className="text-4xl font-black">
              Mestre do Foco
            </h1>

            <p className="text-muted-foreground max-w-md text-sm">
              Você acumulou{" "}
              <span className="font-bold text-foreground">
                {totalXP} XP
              </span>
              . Continue evoluindo.
            </p>
          </div>

          <div className="rounded-2xl p-6 border bg-secondary/50 shadow-sm">
            <div className="flex justify-between mb-2">
              <span className="text-xs font-bold uppercase text-muted-foreground">
                Próximo nível
              </span>
              <span className="text-xs text-muted-foreground">
                {xpCurrentLevel} / {xpNextLevel} XP
              </span>
            </div>

            <Progress
              value={progressPercentage}
              className="h-2.5 bg-muted"
              indicatorClassName={cn(theme.bg)}
            />

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
              <div>
                <div className="text-2xl font-bold">
                  {totalHours}h
                </div>
                <div className="text-xs uppercase font-bold text-muted-foreground">
                  Tempo Total
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {totalSessions}
                </div>
                <div className="text-xs uppercase font-bold text-muted-foreground">
                  Sessões
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= LAYOUT ================= */}
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {subjects.length === 0 ? (
            <div className="border-2 border-dashed rounded-2xl p-12 text-center bg-secondary">
              <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg font-semibold">
                Comece sua jornada
              </h3>
              <p className="text-muted-foreground">
                Cadastre sua primeira matéria.
              </p>
            </div>
          ) : (
            <StudyTimer subjects={subjects} />
          )}

          <SubjectGrid subjects={subjectsWithStats} />
        </div>

        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader className="border-b pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase">
                <History className={cn("h-4 w-4", theme.text)} />
                Histórico Recente
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-4 px-2">
              {hasActivity ? (
                <StudySessionList sessions={recentSessions} />
              ) : (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="bg-muted p-3 rounded-full mb-3">
                    <Zap className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm">
                    Sem histórico
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Use o timer para começar.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
