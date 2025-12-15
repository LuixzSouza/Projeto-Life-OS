import { prisma } from "@/lib/prisma";
import { StudyTimer } from "@/components/studies/study-timer";
import { StudySessionList } from "@/components/studies/study-session-list";
import { SubjectGrid } from "@/components/studies/subject-grid"; 
import { Trophy, History, Zap, AlertCircle, BookOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StudySubject } from "@prisma/client";
import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Estudos | Life OS",
  description: "Gerencie seu tempo de estudo e acompanhe sua evolução.",
};

// Interface estendida
export interface SubjectWithStats extends StudySubject {
    totalMinutes: number;
}

// Configuração de cores por nível (Gamificação visual independente do tema)
const getLevelTheme = (level: number) => {
    if (level >= 50) return { bg: "bg-amber-600", border: "border-amber-700", text: "text-amber-500", glow: "bg-amber-500/20" }; // Gold
    if (level >= 30) return { bg: "bg-rose-600", border: "border-rose-700", text: "text-rose-500", glow: "bg-rose-500/20" }; // Red
    if (level >= 20) return { bg: "bg-purple-600", border: "border-purple-700", text: "text-purple-500", glow: "bg-purple-500/20" }; // Purple
    if (level >= 10) return { bg: "bg-emerald-600", border: "border-emerald-700", text: "text-emerald-500", glow: "bg-emerald-500/20" }; // Emerald
    return { bg: "bg-indigo-600", border: "border-indigo-700", text: "text-indigo-500", glow: "bg-indigo-500/20" }; // Blue
};

export default async function StudiesPage() {
    // 1. Inicialização de variáveis (com valores padrão seguros)
    let subjects: StudySubject[] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let recentSessions: any[] = [];
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

    // 2. Busca de Dados (Try/Catch apenas para dados)
    try {
        const [subjectsData, recentSessionsData, statsData, aggregatedTimeData] = await Promise.all([
            prisma.studySubject.findMany({ orderBy: { title: 'asc' } }),
            prisma.studySession.findMany({
                take: 5,
                orderBy: { date: 'desc' },
                include: { subject: true }
            }),
            prisma.studySession.aggregate({
                _sum: { durationMinutes: true },
                _count: { id: true }
            }),
            prisma.studySession.groupBy({
                by: ['subjectId'],
                _sum: { durationMinutes: true },
            }),
        ]);

        // Atribuição
        subjects = subjectsData;
        recentSessions = recentSessionsData;
        totalMinutes = statsData._sum.durationMinutes || 0;
        totalSessions = statsData._count.id;

        // Cálculos
        const XP_PER_LEVEL = 600; 
        totalXP = totalMinutes; 
        currentLevel = Math.floor(totalXP / XP_PER_LEVEL) + 1;
        xpCurrentLevel = totalXP % XP_PER_LEVEL;
        xpNextLevel = XP_PER_LEVEL;
        progressPercentage = (xpCurrentLevel / xpNextLevel) * 100;
        totalHours = (totalMinutes / 60).toFixed(1);
        hasActivity = totalSessions > 0;

        const timeMap = new Map(
            aggregatedTimeData.map(item => [item.subjectId, item._sum.durationMinutes || 0])
        );

        subjectsWithStats = subjects.map(subject => ({
            ...subject,
            totalMinutes: timeMap.get(subject.id) || 0,
        }));

    } catch (error) {
        console.error("Erro crítico ao carregar página de estudos:", error);
        hasError = true;
    }

    // 3. Renderização de Erro (Se houver)
    if (hasError) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-full mb-4">
                    <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Erro ao carregar dados</h2>
                <Link href="/dashboard"><Button variant="outline">Voltar</Button></Link>
            </div>
        );
    }

    // 4. Tema do Nível
    const theme = getLevelTheme(currentLevel);

    // 5. Renderização Principal (Fora do try/catch)
    return (
        <div className="space-y-8 max-w-6xl mx-auto p-6 pb-24 animate-in fade-in duration-500">
            
            {/* HERO GAMIFICADO */}
            <div className={cn("relative overflow-hidden rounded-3xl shadow-2xl p-8 transition-colors duration-500 bg-zinc-900 border border-zinc-800")}>
                
                {/* Efeitos de Fundo Dinâmicos */}
                <div className={cn("absolute top-0 right-0 -mt-20 -mr-20 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none", theme.bg)}></div>
                <div className={cn("absolute bottom-0 left-0 -mb-20 -ml-20 w-72 h-72 rounded-full blur-3xl opacity-10 pointer-events-none", theme.bg)}></div>

                <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-4">
                        <div className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-zinc-950/50 backdrop-blur-md", theme.border, theme.text)}>
                            <Trophy className="h-3 w-3" /> Nível {currentLevel}
                        </div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            Mestre do Foco
                        </h1>
                        <p className="text-zinc-400 max-w-md text-sm leading-relaxed">
                            Você acumulou <span className="text-white font-bold">{totalXP} XP</span>. 
                            Mantenha o ritmo para evoluir.
                        </p>
                    </div>

                    <div className="bg-zinc-950/50 rounded-2xl p-6 border border-zinc-800/50 backdrop-blur-sm shadow-xl">
                        <div className="flex justify-between items-end mb-2">
                            <span className="text-xs font-bold text-zinc-500 uppercase">Próximo Nível</span>
                            <span className="text-xs font-medium text-zinc-300">{xpCurrentLevel} / {xpNextLevel} XP</span>
                        </div>
                        
                        <Progress 
                            value={progressPercentage} 
                            className="h-2.5 bg-zinc-800" 
                            indicatorClassName={cn("transition-all duration-500", theme.bg)} 
                        />
                        
                        <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-zinc-800">
                            <div>
                                <div className="text-2xl font-bold text-white">{totalHours}h</div>
                                <div className="text-xs text-zinc-500 uppercase font-bold">Tempo Total</div>
                            </div>
                            <div>
                                <div className="text-2xl font-bold text-white">{totalSessions}</div>
                                <div className="text-xs text-zinc-500 uppercase font-bold">Sessões</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* LAYOUT PRINCIPAL */}
            <div className="grid lg:grid-cols-3 gap-8">
                
                {/* COLUNA ESQUERDA */}
                <div className="lg:col-span-2 space-y-8">
                    {subjects.length === 0 ? (
                        <div className="bg-zinc-50 dark:bg-zinc-900 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-4">
                            <BookOpen className="h-10 w-10 text-zinc-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Comece sua jornada</h3>
                            <p className="text-zinc-500 max-w-sm mx-auto">Cadastre sua primeira matéria abaixo para liberar o timer.</p>
                        </div>
                    ) : (
                        <StudyTimer subjects={subjects} /> 
                    )}
                    <SubjectGrid subjects={subjectsWithStats} />
                </div>

                {/* COLUNA DIREITA */}
                <div className="space-y-6">
                    <Card className="bg-zinc-900 border-zinc-800 shadow-sm h-fit sticky top-4">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-zinc-800">
                            <CardTitle className="text-sm font-bold text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                                <History className={cn("h-4 w-4", theme.text)} /> Histórico Recente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 px-2">
                            {hasActivity ? (
                                <StudySessionList sessions={recentSessions} />
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                                    <div className="bg-zinc-800 p-3 rounded-full mb-3">
                                        <Zap className="h-6 w-6 text-zinc-500" />
                                    </div>
                                    <p className="font-medium text-zinc-300 text-sm">Sem histórico</p>
                                    <p className="text-xs text-zinc-500 mt-1">Use o timer para começar.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}