"use client";

import { StudySubject } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Clock, Edit, Trash2, Zap, Gauge, ArrowRight, X, Heart } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import React from "react";
import { cn } from "@/lib/utils";

// Tipagem rica
interface RichSubject extends StudySubject {
    totalMinutes: number; 
}

interface SubjectCardProps {
    subject: RichSubject;
    onDetailsClick: (id: string) => void; 
    onEdit: (id: string) => void;
    onDelete: (id: string) => void;
}

// Mapeamento de Dificuldade (Ajustado para Tailwind classes)
const DIFFICULTY_MAP = {
    1: { text: 'Muito Fácil', color: 'text-green-500' },
    2: { text: 'Fácil', color: 'text-yellow-500' },
    3: { text: 'Padrão', color: 'text-orange-500' },
    4: { text: 'Difícil', color: 'text-red-500' },
    5: { text: 'Expert', color: 'text-red-700' },
};

// Função auxiliar para formatar horas e minutos
const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
        return `${h}h ${m}m`;
    }
    return `${m}m`;
}


export function SubjectCard({ subject, onDetailsClick, onEdit, onDelete }: SubjectCardProps) {
    const totalMinutes = subject.totalMinutes || 0;
    // Padrão de 60h (3600min) se goalMinutes não estiver definido
    const goalMinutes = subject.goalMinutes && subject.goalMinutes > 0 ? subject.goalMinutes : 3600; 
    
    const progressToGoal = (totalMinutes / goalMinutes) * 100;
    const currentDifficulty = Math.min(Math.max(subject.difficulty || 3, 1), 5);
    const difficultyInfo = DIFFICULTY_MAP[currentDifficulty as keyof typeof DIFFICULTY_MAP];
    
    // Fallback de ícone
    const SubjectIcon = subject.icon ? Zap : BookOpen; 
    
    // Cor da Matéria (Fallback para Indigo)
    const subjectColor = subject.color || '#4f46e5'; 

    // Handler para capturar o clique no card inteiro (READ)
    const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement;
        // Verifica se o clique não foi em um botão ou em um pai direto de um botão
        const isAction = target.closest('button');

        if (!isAction) {
            onDetailsClick(subject.id);
        }
    };

    return (
        <Card 
            className="bg-zinc-800/60 border border-zinc-700/50 hover:border-indigo-500/50 transition-all duration-300 group relative cursor-pointer"
            onClick={handleCardClick}
        >
            <CardContent className="p-4 space-y-3">
                
                {/* Cabeçalho e Ações */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        {/* Ícone Customizado - Cor Injetada */}
                        <div 
                            className="h-10 w-10 rounded-lg flex items-center justify-center shadow-lg border-2 border-transparent transition-transform group-hover:scale-[1.05]" 
                            style={{ backgroundColor: subjectColor, backgroundImage: `linear-gradient(45deg, ${subjectColor} 50%, rgba(255,255,255,0.1) 100%)` }}
                        >
                            <SubjectIcon className="h-5 w-5 text-white" />
                        </div>
                        
                        <div>
                            <h4 className="font-bold text-lg text-zinc-100">{subject.title}</h4>
                            <p className="text-xs text-zinc-400 flex items-center gap-1">
                                <Gauge className={cn("h-3 w-3", difficultyInfo.color)} />
                                Dificuldade: <span className="font-semibold text-zinc-300">{difficultyInfo.text}</span>
                            </p>
                        </div>
                    </div>
                    
                    {/* Botões de Ação (EDIT/DELETE) */}
                    <div className="flex gap-1 absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-zinc-800/80 rounded-lg border border-transparent group-hover:border-zinc-700 backdrop-blur-sm">
                        
                        {/* Botão de EDITAR */}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-indigo-400" onClick={() => onEdit(subject.id)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                        
                        {/* Botão de DELETAR */}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-500 hover:text-red-500" onClick={() => onDelete(subject.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Métricas e Progresso */}
                <div className="space-y-1 pt-3 border-t border-zinc-700/50 mt-4">
                    <div className="flex justify-between text-xs text-zinc-400">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Foco Total: <span className="font-semibold text-zinc-300">{formatDuration(totalMinutes)}</span>
                        </span>
                        <span className="font-medium text-zinc-300">Meta: {formatDuration(goalMinutes)}</span>
                    </div>

                    <Progress 
                        value={Math.min(progressToGoal, 100)} 
                        className="h-2 bg-zinc-700" 
                        indicatorClassName={progressToGoal >= 100 ? "bg-green-500" : "bg-indigo-500"} 
                    />
                    <div className="text-[10px] text-zinc-500 flex justify-between items-center pt-1">
                        {progressToGoal >= 100 ? 
                            <span className="text-green-500 font-bold flex items-center gap-1">
                                <Heart className="h-3 w-3 fill-green-500" /> Meta Atingida!
                            </span> :
                            <span className="text-zinc-500">{Math.min(progressToGoal, 99.9).toFixed(1)}% Completo</span>
                        }
                        <ArrowRight className="h-4 w-4 text-zinc-500 group-hover:text-indigo-400 transition-all group-hover:translate-x-1" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}