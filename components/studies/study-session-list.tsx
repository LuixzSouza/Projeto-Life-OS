"use client";

import { deleteSession } from "@/app/(dashboard)/studies/actions";
import { Zap, Trash2, Calendar, Clock, AlertTriangle, ChevronDown } from "lucide-react";
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
  const [expandedId, setExpandedId] = useState<string | null>(null); // Estado para expandir notas

  const handleDelete = async (id: string) => {
    setIsDeleting(id);
    const toastId = toast.loading("Removendo registro...");

    try {
      // ✅ Chamada da Server Action
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

  // ❌ REMOVEMOS O EMPTY STATE DAQUI. Ele será tratado no Server Component (StudiesPage) 
  // para que o div principal fique limpo quando hasSessions é true.

  return (
    <div className="space-y-4">
      {sessions.map((session, i) => {
        const isLast = i === sessions.length - 1;
        const isExpanded = expandedId === session.id;

        return (
          <div key={session.id} className="flex gap-4 items-start relative pb-6 last:pb-0 group">
            
            {/* Linha do tempo visual (Timeline) */}
            {/* O ponto de conexão é o circle-marker */}
            {!isLast && (
              <div className="absolute left-[19px] top-8 bottom-0 w-px bg-zinc-700 dark:bg-zinc-800"></div>
            )}

            {/* Ícone da Timeline (Ponto de Conexão) */}
            <div 
              className="relative z-10 h-10 w-10 rounded-full flex items-center justify-center shrink-0 border-2 dark:border-zinc-950"
              style={{ backgroundColor: session.subject.color || '#ccc' }}
            >
              <Zap className="h-4 w-4 text-white" />
            </div>

            {/* Card do Conteúdo */}
            <div 
              className={`flex-1 dark:bg-zinc-900 p-4 rounded-xl border text-sm shadow-sm transition-all cursor-pointer 
                ${isExpanded ? 'bg-zinc-800/80 border-indigo-500/50' : 'bg-zinc-900/70 border-zinc-700/50 hover:border-zinc-600'}`}
              onClick={() => setExpandedId(isExpanded ? null : session.id)}
            >
              
              {/* Nome da Matéria e Data */}
              <div className="flex justify-between items-start">
                <div>
                  <span className="font-bold text-base text-zinc-200 block">
                    {session.subject.title}
                  </span>
                  <span className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" /> {new Date(session.date).toLocaleDateString()}
                      <span className="mx-1 text-zinc-600">•</span>
                      <Clock className="h-3 w-3" /> {new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
                
                {/* Botão de Delete (Integrado na UX) */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 transition-all"
                      disabled={isDeleting === session.id}
                      onClick={(e) => e.stopPropagation()} // Impede que o clique feche o AlertDialog imediatamente
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
                      <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                          <AlertTriangle className="h-5 w-5" /> Excluir Sessão?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        Você está prestes a apagar {session.durationMinutes} minutos de estudo. O XP será perdido.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                          onClick={() => handleDelete(session.id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                      >
                          Sim, excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

              </div>

              {/* Duração e Ação de Expansão */}
              <div className="mt-3 flex justify-between items-center pt-2 border-t border-zinc-700/50">
                  <span className="bg-indigo-900/30 text-indigo-300 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {session.durationMinutes} min de foco
                  </span>
                  
                  {session.notes && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 text-xs text-zinc-500 hover:text-indigo-400"
                    >
                        Ver Notas 
                        <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`} />
                    </Button>
                  )}
              </div>

              {/* Notas (Expandível) */}
              <div 
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-40 mt-3 border-t border-zinc-700/50 pt-3' : 'max-h-0'}`}
              >
                  {session.notes && (
                      <p className="text-sm italic text-zinc-400">
                          &quot;{session.notes}&quot;
                      </p>
                  )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}