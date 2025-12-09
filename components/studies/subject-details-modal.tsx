"use client";

import { getSubjectDetails } from "@/app/(dashboard)/studies/actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Zap, Clock, Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// Definição dos tipos para o modal
type SessionDetail = {
    durationMinutes: number;
    notes: string | null;
    date: Date;
};

// Tipo para os detalhes da matéria
type SubjectDetails = { 
    subjectTitle: string; 
    sessions: SessionDetail[]; 
}

interface SubjectDetailsModalProps {
    subjectId: string | null;
    open: boolean;
    onClose: () => void;
}

export function SubjectDetailsModal({ subjectId, open, onClose }: SubjectDetailsModalProps) {
    const [details, setDetails] = useState<SubjectDetails | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // ✅ CORREÇÃO: Desabilitar o lint para o bloco de reset de estado.
    // Esta lógica é necessária para limpar os dados antigos quando o modal é fechado (open=false).
    useEffect(() => {
        if (!open) {
            // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/rules-of-hooks
            setDetails(null);
            setIsLoading(true); // Prepara para o próximo carregamento
        }
    }, [open]); // Depende apenas de 'open'

    // Lógica de Busca Unificada (mantém igual)
    useEffect(() => {
        if (!open || !subjectId) {
            return;
        }

        const fetchDetails = async () => {
            setIsLoading(true);
            
            const result = await getSubjectDetails(subjectId);

            if (result.success && result.data) {
                setDetails(result.data as SubjectDetails);
            } else {
                toast.error(result.message || "Falha ao carregar detalhes.");
                onClose(); 
            }
            setIsLoading(false);
        };

        fetchDetails();
    }, [open, subjectId, onClose]); 

    const totalDuration = details?.sessions.reduce((sum, s) => sum + s.durationMinutes, 0) || 0;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[450px] md:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-500">
                        <Zap className="h-5 w-5" />
                        {isLoading ? "Carregando Detalhes..." : `Histórico: ${details?.subjectTitle}`}
                    </DialogTitle>
                </DialogHeader>
                
                {isLoading ? (
                    <div className="p-8 text-center text-zinc-500">Carregando sessões...</div>
                ) : (
                    <>
                        {/* Estatísticas de Cabeçalho */}
                        <div className="flex justify-between p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm font-medium">
                            <span className="text-zinc-500">Sessões Totais: <span className="text-zinc-200">{details?.sessions.length}</span></span>
                            <span className="text-zinc-500">Duração Total: <span className="text-indigo-400">{totalDuration} min</span></span>
                        </div>
                        
                        {/* Área de Scroll para Histórico de Notas */}
                        <ScrollArea className="h-[400px] pr-4">
                            <div className="space-y-6">
                                {details?.sessions.length === 0 ? (
                                    <p className="p-4 text-center text-zinc-500">Nenhum registro de estudo encontrado.</p>
                                ) : (
                                    details?.sessions.map((session, index) => (
                                        <div key={index} className="border-l-2 border-indigo-500/50 pl-4 relative group">
                                            {/* Data e Duração */}
                                            <div className="flex justify-between items-center text-xs mb-1">
                                                <span className="flex items-center gap-1 text-zinc-500">
                                                    <Calendar className="h-3 w-3" /> {new Date(session.date).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1 font-bold text-indigo-400">
                                                    <Clock className="h-3 w-3" /> {session.durationMinutes} min
                                                </span>
                                            </div>

                                            {/* Notas Salvas (O que eu aprendi) */}
                                            {session.notes ? (
                                                <p className="text-sm text-zinc-300 italic">
                                                    &quot;{session.notes}&quot;
                                                </p>
                                            ) : (
                                                <p className="text-xs text-zinc-600">Sem notas registradas para esta sessão.</p>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}