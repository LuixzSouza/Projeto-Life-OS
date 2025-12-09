"use client";

import { deleteSession } from "@/app/(dashboard)/studies/actions";
import { Zap, Trash2, Calendar, Clock, AlertTriangle } from "lucide-react";
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

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-zinc-400 border-2 border-dashed rounded-xl border-zinc-200 dark:border-zinc-800">
        <Clock className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-sm">Nenhuma sessão registrada recentemente.</p>
        <p className="text-xs opacity-50">Hora de focar!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session, i) => (
        <div key={session.id} className="flex gap-4 items-start relative pb-6 last:pb-0 group">
          
          {/* Linha do tempo visual (Timeline) */}
          {i !== sessions.length - 1 && (
            <div className="absolute left-[19px] top-8 bottom-0 w-px bg-zinc-200 dark:bg-zinc-800"></div>
          )}

          {/* Ícone da Timeline */}
          <div className="relative z-10 h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border-2 border-white dark:border-zinc-950 shadow-sm">
            <Zap className="h-4 w-4 text-yellow-500" />
          </div>

          {/* Card do Conteúdo */}
          <div className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-xl border text-sm shadow-sm transition-all hover:shadow-md group-hover:border-indigo-200 dark:group-hover:border-indigo-900/50">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-bold text-base text-indigo-600 dark:text-indigo-400 block">
                  {session.subject.title}
                </span>
                <span className="text-xs text-zinc-400 flex items-center gap-1 mt-1">
                   <Calendar className="h-3 w-3" /> {new Date(session.date).toLocaleDateString()}
                   <span className="mx-1 text-zinc-300">•</span>
                   <Clock className="h-3 w-3" /> {new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
              
              {/* Botão de Delete com AlertDialog */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all"
                    disabled={isDeleting === session.id}
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
                      Você está prestes a apagar o registro de <strong>{session.durationMinutes} minutos</strong> de estudo em <strong>{session.subject.title}</strong>. 
                      <br /><br />
                      Essa ação não pode ser desfeita e o XP será perdido.
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

            {/* Badge de Tempo */}
            <div className="mt-3 flex items-center gap-2">
               <span className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 rounded-md text-xs font-bold border border-indigo-100 dark:border-indigo-900 flex items-center gap-1">
                 <Clock className="h-3 w-3" /> {session.durationMinutes} min
               </span>
               <span className="text-xs text-zinc-400">foco registrado</span>
            </div>

            {/* Notas (se houver) */}
            {session.notes && (
              <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <p className="text-xs italic text-zinc-500 dark:text-zinc-400">
                    &quot;{session.notes}&quot;
                  </p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}