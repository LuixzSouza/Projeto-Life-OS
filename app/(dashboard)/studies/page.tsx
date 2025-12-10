import { prisma } from "@/lib/prisma";
import { StudyTimer } from "@/components/studies/study-timer";
import { StudySessionList } from "@/components/studies/study-session-list";
import { SubjectGrid } from "@/components/studies/subject-grid"; 
import { Trophy, History, Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StudySubject } from "@prisma/client"; // Importa o tipo base

// 1. Definição do tipo enriquecido (para o SubjectGrid)
interface SubjectWithStats extends StudySubject {
    totalMinutes: number;
}

export default async function StudiesPage() {
    // --- 1. Buscando dados ---

    // A consulta aggregate é mais eficiente no MySQL, mas não retorna os títulos.
    // Vamos fazer três buscas e processar a agregação.
    const [subjects, recentSessions, stats, aggregatedTime] = await Promise.all([
        prisma.studySubject.findMany(),
        prisma.studySession.findMany({
            take: 5,
            orderBy: { date: 'desc' },
            include: { subject: true }
        }),
        prisma.studySession.aggregate({
            _sum: { durationMinutes: true },
            _count: { id: true }
        }),
        // ✅ NOVA CONSULTA: Agrega o tempo total por Matéria
        prisma.studySession.groupBy({
            by: ['subjectId'],
            _sum: { durationMinutes: true },
        }),
    ]);

    // 2. Cálculos de Gamificação
    const totalMinutes = stats._sum.durationMinutes || 0;
    
    const totalXP = totalMinutes; 
    const totalHours = Math.floor(totalMinutes / 60);
    
    const XP_PER_LEVEL = 600; 
    const currentLevel = Math.floor(totalXP / XP_PER_LEVEL) + 1;
    
    const xpNeededForNextLevel = XP_PER_LEVEL - (totalXP % XP_PER_LEVEL);
    const progressPercentage = (totalXP % XP_PER_LEVEL) / XP_PER_LEVEL * 100;
    
    const hasSessions = stats._count.id > 0;

    // 3. Processamento de Matérias (Injetando totalMinutes)
    const timeMap = new Map(
        aggregatedTime.map(item => [item.subjectId, item._sum.durationMinutes || 0])
    );

    const subjectsWithStats: SubjectWithStats[] = subjects.map(subject => ({
        ...subject,
        totalMinutes: timeMap.get(subject.id) as number || 0,
    }));


    return (
        <div className="space-y-8 max-w-6xl mx-auto p-4 pb-20">
            
            {/* --- HEADER GAMIFICADO (Mantido) --- */}
            <div className={`text-white rounded-2xl p-6 shadow-xl relative overflow-hidden transition-all duration-500 ${hasSessions ? 'bg-zinc-900 border border-zinc-800' : 'bg-indigo-600 border border-indigo-700'}`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Trophy className="text-yellow-400 h-8 w-8" />
                            Nível {currentLevel}
                        </h1>
                        <p className="text-zinc-400">Mestre do Conhecimento</p>
                    </div>

                    <div className="flex-1 max-w-md w-full space-y-2">
                         <div className="flex justify-between text-sm font-medium">
                            <span className="text-yellow-400">{totalXP} XP Total</span>
                            <span className="text-zinc-500">{xpNeededForNextLevel} XP para o Nível {currentLevel + 1}</span>
                         </div>
                         <Progress 
                            value={progressPercentage} 
                            className="h-3 bg-zinc-800" 
                            indicatorClassName="bg-gradient-to-r from-yellow-500 to-orange-500" 
                         />
                    </div>

                    <div className="flex gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold">{totalHours}h</div>
                            <div className="text-xs text-zinc-500 uppercase tracking-wider">Foco Total</div>
                        </div>
                        <div className="w-px bg-zinc-700"></div>
                        <div className="text-center">
                            <div className="text-2xl font-bold">{stats._count.id}</div>
                            <div className="text-xs text-zinc-500 uppercase tracking-wider">Sessões</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- LAYOUT PRINCIPAL --- */}
            <div className="grid lg:grid-cols-3 gap-8">
                
                {/* COLUNA ESQUERDA (2/3): Timer e Matérias */}
                <div className="lg:col-span-2 space-y-8">
                    {/* O StudyTimer precisa do tipo Subject[] básico */}
                    <StudyTimer subjects={subjects} /> 
                    
                    {/* ✅ Agora o SubjectGrid recebe a lista enriquecida */}
                    <SubjectGrid subjects={subjectsWithStats} />
                </div>

                {/* COLUNA DIREITA (1/3): Histórico */}
                <div className="space-y-6">
                    <Card className="bg-zinc-800/60 border border-zinc-700/50 min-h-[300px]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-zinc-200">
                                <History className="h-5 w-5 text-indigo-400" /> Histórico Recente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="px-0">
                            {hasSessions ? (
                                <div className="px-6 pb-2">
                                    <StudySessionList sessions={recentSessions} />
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 rounded-xl">
                                    <Zap className="h-10 w-10 mb-3 text-zinc-700" />
                                    <p className="font-semibold text-zinc-400">Seu histórico está limpo!</p>
                                    <p className="text-sm text-zinc-600">Inicie um timer para registrar sua primeira sessão.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

            </div>
        </div>
    );
}