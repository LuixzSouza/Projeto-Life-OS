"use client";

import { getSubjectDetails, deleteSession } from "@/app/(dashboard)/studies/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, Clock, Calendar, Gauge, CheckCircle, Target, Tag, Activity, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils"; // Importamos cn

// 1. Definição dos tipos atualizados (incluindo o ID para exclusão)
type SessionDetail = {
    id: string;
    durationMinutes: number;
    notes: string | null;
    date: Date;
    focusLevel: number;
    type: string;
    tags: string | null; // Tags vêm como JSON string do banco
};

// Tipo para os detalhes da matéria
type SubjectDetails = { 
    subjectTitle: string; 
    goalMinutes: number;
    difficulty: number;
    icon: string | null;
    totalDuration: number;
    sessions: SessionDetail[]; 
}

interface SubjectDetailsModalProps {
    subjectId: string | null;
    open: boolean;
    onClose: () => void;
}

// Helper para formatar a duração
const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) {
        return `${h}h ${m}m`;
    }
    return `${m}m`;
}

// Mapeamento de Foco
const FOCUS_MAP = {
    1: { text: 'Baixo', color: 'text-red-400', bg: 'bg-red-900/20' },
    2: { text: 'Médio-Baixo', color: 'text-orange-400', bg: 'bg-orange-900/20' },
    3: { text: 'Médio', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
    4: { text: 'Alto', color: 'text-lime-400', bg: 'bg-lime-900/20' },
    5: { text: 'Intenso', color: 'text-green-400', bg: 'bg-green-900/20' },
};

export function SubjectDetailsModal({ subjectId, open, onClose }: SubjectDetailsModalProps) {
    const [details, setDetails] = useState<SubjectDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    // Efeito para limpar o estado quando o modal é fechado
    useEffect(() => {
        if (!open) {
            setDetails(null);
            setIsLoading(true); 
            setRefreshKey(0);
        }
    }, [open]);

    // Lógica de Busca Unificada (dependente de refreshKey)
    useEffect(() => {
        if (!open || !subjectId) {
            return;
        }

        const fetchDetails = async () => {
            setIsLoading(true);
            
            // Aqui é necessário o casting, pois a Server Action retorna 'unknown' ou Promise<unknown>
            const result = await getSubjectDetails(subjectId); 

            if (result.success && result.data) {
                // Casting seguro após a verificação de sucesso
                setDetails(result.data as SubjectDetails); 
            } else {
                toast.error(result.message || "Falha ao carregar detalhes.");
                onClose(); 
            }
            setIsLoading(false);
        };

        fetchDetails();
    }, [open, subjectId, onClose, refreshKey]);

    // 🎯 NOVO HANDLER: Lógica de Exclusão de Sessão
    const handleDeleteSession = async (sessionId: string) => {
        setIsDeletingId(sessionId);
        const toastId = toast.loading("Excluindo registro...");
        
        try {
            const result = await deleteSession(sessionId);

            toast.dismiss(toastId);
            
            if (result.success) {
                toast.success(result.message);
                // Força a re-execução do useEffect de busca
                setRefreshKey(prev => prev + 1); 
            } else {
                toast.error(result.message || "Erro ao excluir.");
            }
        } catch (error) {
            toast.error("Erro de conexão.");
        } finally {
            setIsDeletingId(null);
        }
    };
    
    // Variáveis Derivadas
    const totalDuration = details?.totalDuration || 0;
    const goalMinutes = details?.goalMinutes || 3600;
    const progressToGoal = (totalDuration / goalMinutes) * 100;
    const sortedSessions = details?.sessions.slice().sort((a, b) => b.date.getTime() - a.date.getTime()) || [];

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] md:max-w-lg bg-zinc-900 border-zinc-800 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-500">
                        <Zap className="h-5 w-5" />
                        {isLoading ? "Carregando Detalhes..." : `Mapa de Foco: ${details?.subjectTitle}`}
                    </DialogTitle>
                </DialogHeader>
                
                {isLoading ? (
                    <div className="p-8 text-center text-zinc-500">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
                        Carregando sessões...
                    </div>
                ) : (
                    <>
                        {/* -------------------- RESUMO E METAS -------------------- */}
                        <div className="space-y-3 p-1">
                            <div className="flex justify-between text-sm text-zinc-400">
                                <span className="flex items-center gap-1">
                                    <Target className="h-4 w-4 text-indigo-400" />
                                    Meta: <span className="text-zinc-300 font-semibold">{formatDuration(goalMinutes)}</span>
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4 text-yellow-400" />
                                    Total: <span className="text-indigo-400 font-semibold">{formatDuration(totalDuration)}</span>
                                </span>
                            </div>
                            
                            <Progress 
                                value={Math.min(progressToGoal, 100)} 
                                className="h-3 bg-zinc-700" 
                                indicatorClassName={progressToGoal >= 100 ? "bg-green-500" : "bg-indigo-500"}
                            />
                            <p className="text-xs text-zinc-500 text-right">
                                {progressToGoal >= 100 ? 
                                    <span className="text-green-500 font-bold flex items-center justify-end gap-1">
                                        <CheckCircle className="h-3 w-3" /> Meta Atingida!
                                    </span> :
                                    `${Math.min(progressToGoal, 99.9).toFixed(1)}% para a Meta`
                                }
                            </p>
                        </div>
                        
                        <div className="text-sm font-semibold text-zinc-400 mt-4 border-t pt-4 border-zinc-700">
                            Histórico Detalhado ({sortedSessions.length} Registros)
                        </div>

                        {/* -------------------- HISTÓRICO DE NOTAS (COM DELETE) -------------------- */}
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-6">
                                {sortedSessions.length === 0 ? (
                                    <p className="p-4 text-center text-zinc-500">Nenhum registro de estudo encontrado. Comece a focar!</p>
                                ) : (
                                    sortedSessions.map((session) => {
                                        const focusInfo = FOCUS_MAP[session.focusLevel as keyof typeof FOCUS_MAP] || FOCUS_MAP[3];
                                        const isDeleting = isDeletingId === session.id;

                                        // ✅ PARSING DE TAGS SEGURO
                                        let tagsArray: string[] = [];
                                        if (session.tags) {
                                            try {
                                                tagsArray = JSON.parse(session.tags);
                                                if (!Array.isArray(tagsArray)) tagsArray = [];
                                            } catch {
                                                tagsArray = [];
                                            }
                                        }

                                        return (
                                            <div key={session.id} className="border-l-2 border-indigo-500/50 pl-4 relative group hover:bg-zinc-800/30 p-3 rounded-r-lg transition-colors -ml-3">
                                                
                                                {/* Círculo da Timeline */}
                                                <div className="absolute left-[-10px] top-0 h-5 w-5 bg-zinc-900 border-2 border-indigo-500 rounded-full flex items-center justify-center">
                                                    <Zap className="h-3 w-3 text-white" />
                                                </div>

                                                {/* Meta-Dados da Sessão */}
                                                <div className="flex justify-between items-center text-xs mb-1">
                                                    <div className="flex items-center gap-2 text-zinc-500">
                                                        <Calendar className="h-3 w-3" /> {new Date(session.date).toLocaleDateString()}
                                                    </div>
                                                    
                                                    {/* ✅ BOTÃO DE DELETE */}
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="icon" 
                                                                className="h-6 w-6 text-zinc-600 hover:text-red-500"
                                                                disabled={isDeleting}
                                                            >
                                                                {isDeleting ? (
                                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                                ) : (
                                                                    <Trash2 className="h-4 w-4" />
                                                                )}
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-zinc-900 border-zinc-700 text-white">
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                                                                    <AlertTriangle className="h-5 w-5" /> Excluir Registro?
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription className="text-zinc-400">
                                                                    Você está prestes a apagar este foco de **{session.durationMinutes} min**. Esta ação não pode ser desfeita.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel className="bg-zinc-700 hover:bg-zinc-600 border-none text-white">Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction 
                                                                    onClick={() => handleDeleteSession(session.id)}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                >
                                                                    Confirmar Exclusão
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                                
                                                {/* Duração, Tipo e Foco */}
                                                <div className="flex flex-wrap gap-3 text-xs mb-2">
                                                    <span className="flex items-center gap-1 font-bold text-indigo-400">
                                                        <Clock className="h-3 w-3" /> {formatDuration(session.durationMinutes)}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-zinc-400">
                                                        <Activity className="h-3 w-3" /> Tipo: <span className="font-semibold text-zinc-300">{session.type}</span>
                                                    </span>
                                                    <span className={cn("flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full", focusInfo.color, focusInfo.bg)}>
                                                        <Gauge className="h-3 w-3" /> Foco: {focusInfo.text}
                                                    </span>
                                                </div>

                                                {/* Notas Salvas */}
                                                {session.notes && (
                                                    <p className="text-sm text-zinc-300 italic border-l-2 pl-3 border-zinc-600/50 mb-2 whitespace-pre-wrap">
                                                        &quot;{session.notes}&quot;
                                                    </p>
                                                )}
                                                
                                                {/* Tags */}
                                                {tagsArray.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-2">
                                                        {tagsArray.map((tag: string, tagIndex: number) => (
                                                            <span 
                                                                key={`${session.id}-${tagIndex}`} 
                                                                className="text-[10px] bg-zinc-700 text-zinc-400 px-2 py-0.5 rounded-full flex items-center gap-1 uppercase"
                                                            >
                                                                <Tag className="h-2 w-2" /> {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </ScrollArea>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}