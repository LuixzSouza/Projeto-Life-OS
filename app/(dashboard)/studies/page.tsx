import { prisma } from "@/lib/prisma";
import { StudyTimer } from "@/components/studies/study-timer";
import { createSubject } from "./actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, Trophy } from "lucide-react";
// Importar tipos
import { StudySubject, StudySession } from "@prisma/client";

export default async function StudiesPage() {
  // Buscar Matérias e Sessões Recentes
  const subjects: StudySubject[] = await prisma.studySubject.findMany();
  
  // Tipo para o include
  type SessionWithSubject = StudySession & { subject: StudySubject };
  
  const recentSessions: SessionWithSubject[] = await prisma.studySession.findMany({
    take: 5,
    orderBy: { date: 'desc' },
    include: { subject: true }
  });

  // Cálculo rápido de horas totais
  const totalMinutes = await prisma.studySession.aggregate({
    _sum: { durationMinutes: true }
  });
  const totalHours = Math.floor((totalMinutes._sum.durationMinutes || 0) / 60);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Estudos</h1>
        <div className="flex items-center gap-2 bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full font-bold text-sm dark:bg-yellow-900/30 dark:text-yellow-500">
            <Trophy className="h-4 w-4" />
            Nível 1 (Aprendiz)
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        
        {/* Lado Esquerdo: O TIMER */}
        <div className="space-y-6">
            <StudyTimer subjects={subjects} />

            {/* Estatística Rápida */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-zinc-500">Tempo Total Dedicado</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold">{totalHours}h</div>
                    <p className="text-xs text-zinc-400">Desde o início do Life OS</p>
                </CardContent>
            </Card>
        </div>

        {/* Lado Direito: Cadastro de Matérias e Histórico */}
        <div className="space-y-6">
            
            {/* Form de Nova Matéria */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Nova Matéria</CardTitle>
                </CardHeader>
                <CardContent>
                    <form action={createSubject} className="flex gap-2">
                        <Input name="title" placeholder="Nome (ex: React Avançado)" required />
                        <Input name="category" placeholder="Categoria (ex: Dev)" className="w-1/3" />
                        <Button type="submit" size="icon" className="shrink-0">
                            <BookOpen className="h-4 w-4" />
                        </Button>
                    </form>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {subjects.map(sub => (
                            <span key={sub.id} className="text-xs px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded border">
                                {sub.title}
                            </span>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Histórico Recente */}
            <Card>
                <CardHeader>
                    <CardTitle>Sessões Recentes</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentSessions.length === 0 ? (
                            <p className="text-sm text-zinc-500">Nenhuma sessão registrada.</p>
                        ) : recentSessions.map(session => (
                            <div key={session.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                                <div>
                                    <p className="font-medium">{session.subject.title}</p>
                                    <p className="text-xs text-zinc-500">
                                        {new Date(session.date).toLocaleDateString()} • {session.notes ? "Com anotações" : "Sem notas"}
                                    </p>
                                </div>
                                <div className="font-mono text-sm font-bold bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                                    {session.durationMinutes} min
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}