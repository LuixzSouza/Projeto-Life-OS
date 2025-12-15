"use client";

import { deleteSession } from "@/app/(dashboard)/studies/actions";
import { Zap, Trash2, Calendar, Clock, AlertTriangle, ChevronDown, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type SessionWithSubject = {
    id: string;
    date: Date;
    durationMinutes: number;
    notes: string | null;
    subject: {
        title: string;
        color?: string | null;
    };
};

export function StudySessionList({ sessions }: { sessions: SessionWithSubject[] }) {
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const handleDelete = async (id: string) => {
        setIsDeleting(id);
        const toastId = toast.loading("Removendo registro...");

        try {
            const result = await deleteSession(id);
            if (result?.success) {
                toast.success(result.message, { id: toastId });
            } else {
                toast.error(result.message || "Erro ao remover.", { id: toastId });
            }
        } catch (error) {
            toast.error("Erro de conexão.", { id: toastId });
        } finally {
            setIsDeleting(null);
        }
    };

    return (
        <div className="space-y-0 relative pl-2">
            {/* Linha Vertical Contínua */}
            {sessions.length > 0 && (
                <div className="absolute left-[19px] top-4 bottom-4 w-px bg-zinc-800" />
            )}

            {sessions.map((session) => {
                const isExpanded = expandedId === session.id;
                
                // Cor padrão se não tiver definida
                const subjectColor = session.subject.color || "#6366f1"; // Indigo-500 default

                return (
                    <div key={session.id} className="flex gap-4 items-start relative pb-8 last:pb-0 group">
                        
                        {/* Ícone da Timeline */}
                        <div 
                            className="relative z-10 h-10 w-10 rounded-full flex items-center justify-center shrink-0 border-4 border-zinc-950 shadow-md transition-transform group-hover:scale-110"
                            style={{ backgroundColor: subjectColor }}
                        >
                            <BookOpen className="h-4 w-4 text-white" />
                        </div>

                        {/* Card do Conteúdo */}
                        <div 
                            className={cn(
                                "flex-1 p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden",
                                isExpanded 
                                    ? "bg-zinc-800/80 border-zinc-700 shadow-lg" 
                                    : "bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800/50 hover:border-zinc-700"
                            )}
                            onClick={() => setExpandedId(isExpanded ? null : session.id)}
                        >
                            {/* Efeito de brilho na borda ao expandir */}
                            {isExpanded && <div className="absolute inset-0 border border-indigo-500/20 rounded-xl pointer-events-none" />}

                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-base text-zinc-100 truncate">
                                        {session.subject.title}
                                    </h4>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-500">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" /> 
                                            {new Date(session.date).toLocaleDateString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> 
                                            {new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                        </span>
                                    </div>
                                </div>

                                {/* Ações */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-red-500/10 -mt-1 -mr-2"
                                            disabled={isDeleting === session.id}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {isDeleting === session.id ? (
                                                <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                                                <AlertTriangle className="h-5 w-5" /> Excluir Sessão?
                                            </AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Você está prestes a apagar <strong>{session.durationMinutes} minutos</strong> de estudo de {session.subject.title}. 
                                                <br/><br/>
                                                Isso reduzirá seu XP total.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={() => handleDelete(session.id)}
                                                className="bg-red-600 hover:bg-red-700 text-white"
                                            >
                                                Confirmar Exclusão
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>

                            {/* Footer do Card */}
                            <div className="mt-4 flex justify-between items-center">
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 border border-zinc-700/50 text-xs font-medium text-zinc-300">
                                    <Zap className="h-3 w-3 text-yellow-500" />
                                    {session.durationMinutes} min
                                </div>

                                {session.notes && (
                                    <div className="flex items-center gap-1 text-xs text-zinc-500 font-medium group-hover:text-zinc-400 transition-colors">
                                        {isExpanded ? "Ocultar notas" : "Ver notas"}
                                        <ChevronDown className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-180")} />
                                    </div>
                                )}
                            </div>

                            {/* Notas Expandidas */}
                            <div 
                                className={cn(
                                    "grid transition-all duration-300 ease-in-out",
                                    isExpanded ? "grid-rows-[1fr] opacity-100 mt-3 pt-3 border-t border-zinc-800" : "grid-rows-[0fr] opacity-0"
                                )}
                            >
                                <div className="overflow-hidden text-sm text-zinc-400 italic leading-relaxed">
                                    &quot;{session.notes}&quot;
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}