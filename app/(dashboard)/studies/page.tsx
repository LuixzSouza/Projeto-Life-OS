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
// ✅ CORREÇÃO: Importar o tipo correto que existe no Prisma
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
// ✅ CORREÇÃO: Estender StudySubject, não StudyTopic
export interface SubjectWithStats extends StudySubject {
  totalMinutes: number;
}

// ✅ CORREÇÃO: O include deve ser 'subject', pois é o nome da relação no schema
type StudySessionWithSubject = Prisma.StudySessionGetPayload<{
  include: { subject: true };
}>;

/* ================================
   TEMA DINÂMICO POR NÍVEL
================================ */
const getLevelTheme = (level: number) => {
  if (level >= 50) return { bg: "bg-primary", border: "border-primary", text: "text-primary", glow: "bg-primary/25" };
  if (level >= 30) return { bg: "bg-primary/80", border: "border-primary/80", text: "text-primary", glow: "bg-primary/20" };
  if (level >= 20) return { bg: "bg-primary/70", border: "border-primary/70", text: "text-primary", glow: "bg-primary/15" };
  if (level >= 10) return { bg: "bg-primary/60", border: "border-primary/60", text: "text-primary", glow: "bg-primary/10" };
  return { bg: "bg-primary/50", border: "border-primary/50", text: "text-primary", glow: "bg-primary/5" };
};

/* ================================
   PAGE
================================ */
export default async function StudiesPage() {
  // ✅ CORREÇÃO: Usar a tipagem correta
  let subjects: StudySubject[] = [];
  let recentSessions: StudySessionWithSubject[] = [];
  let totalMinutes = 0;
  let totalSessions = 0;
  
  // Gamification Stats
  let currentLevel = 1;
  let totalXP = 0;
  let xpCurrentLevel = 0;
  const xpNextLevel = 600;
  let progressPercentage = 0;
  let totalHours = "0.0";
  let hasActivity = false;
  
  let subjectsWithStats: SubjectWithStats[] = [];
  let hasError = false;

  try {
    const [
      subjectsData,
      recentSessionsData,
      statsData,
      aggregatedTimeData,
    ] = await Promise.all([
      // 1. Busca Matérias (Usando o nome da tabela real)
      prisma.studySubject.findMany({ 
        orderBy: { title: "asc" },
      }),

      // 2. Sessões Recentes (Include subject)
      prisma.studySession.findMany({
        take: 5,
        orderBy: { date: "desc" },
        // ✅ CORREÇÃO: include: { subject: true }
        include: { subject: true },
      }),

      // 3. Stats Gerais
      prisma.studySession.aggregate({
        _sum: { durationMinutes: true },
        _count: { id: true },
      }),

      // 4. Tempo por Matéria (Agrupado por subjectId)
      prisma.studySession.groupBy({
        // ✅ CORREÇÃO: by: ["subjectId"]
        by: ["subjectId"],
        _sum: { durationMinutes: true },
      }),
    ]);

    subjects = subjectsData;
    recentSessions = recentSessionsData;
    totalMinutes = statsData._sum.durationMinutes ?? 0;
    totalSessions = statsData._count.id;

    // Lógica de XP
    const XP_PER_LEVEL = 600;
    totalXP = totalMinutes * 10; 
    currentLevel = Math.floor(totalXP / XP_PER_LEVEL) + 1;
    xpCurrentLevel = totalXP % XP_PER_LEVEL;
    progressPercentage = (xpCurrentLevel / XP_PER_LEVEL) * 100;
    
    totalHours = (totalMinutes / 60).toFixed(1);
    hasActivity = totalSessions > 0;

    // Mapeamento de Tempo por Matéria
    const timeMap = new Map(
      aggregatedTimeData.map((item) => [
        // ✅ CORREÇÃO: item.subjectId
        item.subjectId,
        item._sum.durationMinutes ?? 0,
      ])
    );

    subjectsWithStats = subjects.map((subject) => ({
      ...subject,
      totalMinutes: timeMap.get(subject.id) ?? 0,
    }));

  } catch (error) {
    console.error("Erro ao carregar estudos:", error);
    hasError = true;
  }

  // --- ERROR STATE ---
  if (hasError) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-destructive/10 p-4 rounded-full mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">Erro ao carregar dados</h2>
        <Link href="/dashboard">
          <Button variant="outline">Voltar</Button>
        </Link>
      </div>
    );
  }

  const theme = getLevelTheme(currentLevel);

  return (
    <div className="min-h-screen bg-background pb-24">
      
      {/* ================= HEADER ================= */}
      <header className="border-b border-border/60 bg-gradient-to-b from-primary/5 to-background pt-10 pb-8 px-6 md:px-8">
        <div className="flex flex-col gap-4 animate-in fade-in duration-500">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center bg-primary/10 text-primary shadow-sm">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Estudos</h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Controle seu foco, evolução e desempenho.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ================= CONTENT ================= */}
      <main className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto">
        
        {/* ================= HERO (GAMIFICATION) ================= */}
        <div className={cn(
            "relative overflow-hidden rounded-3xl p-8 border shadow-sm",
            "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent",
            "border-border"
          )}
        >
          <div className={cn("absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl opacity-20", theme.glow)} />
          <div className={cn("absolute -bottom-24 -left-24 w-72 h-72 rounded-full blur-3xl opacity-10", theme.glow)} />

          <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase border",
                  "bg-secondary", theme.border, theme.text
                )}
              >
                <Trophy className="h-3 w-3" />
                Nível {currentLevel}
              </div>

              <h2 className="text-4xl font-black">Mestre do Foco</h2>

              <p className="text-muted-foreground max-w-md text-sm">
                Você acumulou <span className="font-bold text-foreground">{totalXP} XP</span>. Continue evoluindo.
              </p>
            </div>

            <div className="rounded-2xl p-6 border bg-secondary/50">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-bold uppercase text-muted-foreground">Próximo nível</span>
                <span className="text-xs text-muted-foreground">{xpCurrentLevel} / {xpNextLevel} XP</span>
              </div>

              <Progress value={progressPercentage} className="h-2.5 bg-muted" indicatorClassName={cn(theme.bg)} />

              <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t">
                <div>
                  <div className="text-2xl font-bold">{totalHours}h</div>
                  <div className="text-xs uppercase font-bold text-muted-foreground">Tempo Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">{totalSessions}</div>
                  <div className="text-xs uppercase font-bold text-muted-foreground">Sessões</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================= GRID ================= */}
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {subjects.length === 0 ? (
              <div className="border-2 border-dashed rounded-2xl p-12 text-center bg-secondary">
                <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Comece sua jornada</h3>
                <p className="text-muted-foreground">Cadastre sua primeira matéria.</p>
              </div>
            ) : (
              <StudyTimer subjects={subjects} />
            )}

            <SubjectGrid subjects={subjectsWithStats} />
          </div>

          <Card className="sticky top-6 h-fit">
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
                  <p className="font-medium text-sm">Sem histórico</p>
                  <p className="text-xs text-muted-foreground">Use o timer para começar.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}