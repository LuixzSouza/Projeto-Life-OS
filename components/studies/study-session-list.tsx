"use client";

import { deleteSession } from "@/app/(dashboard)/studies/actions";
import {
  Zap,
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useCallback } from "react";
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
  notes?: string | null;
  subject: {
    title: string;
    color?: string | null;
  };
};

interface StudySessionListProps {
  sessions: SessionWithSubject[];
}

export function StudySessionList({ sessions }: StudySessionListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = useCallback(async (id: string) => {
    setIsDeleting(id);
    const toastId = toast.loading("Removendo registro...");

    try {
      const result = await deleteSession(id);

      if (result?.success) {
        toast.success(result.message || "Sessão removida.", { id: toastId });
      } else {
        toast.error(result?.message || "Erro ao remover.", { id: toastId });
      }
    } catch {
      toast.error("Erro de conexão.", { id: toastId });
    } finally {
      setIsDeleting(null);
    }
  }, []);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-sm text-muted-foreground">
        <BookOpen className="mb-2 h-8 w-8 opacity-50" />
        Nenhuma sessão registrada ainda
      </div>
    );
  }

  return (
    <div className="relative space-y-0 pl-2">
      {/* Linha da timeline */}
      <div className="absolute left-[19px] top-4 bottom-4 w-px bg-border" />

      {sessions.map((session) => {
        const isExpanded = expandedId === session.id;
        const subjectColor = session.subject.color || "hsl(var(--primary))";

        return (
          <div
            key={session.id}
            className="relative flex items-start gap-4 pb-8 last:pb-0 group"
          >
            {/* Ícone */}
            <div
              className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-background shadow-md transition-transform group-hover:scale-110"
              style={{ backgroundColor: subjectColor }}
            >
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>

            {/* Card */}
            <div
              role="button"
              tabIndex={0}
              onClick={() =>
                setExpandedId(isExpanded ? null : session.id)
              }
              className={cn(
                "relative flex-1 cursor-pointer overflow-hidden rounded-xl border p-4 transition-all",
                isExpanded
                  ? "bg-card border-border shadow-lg shadow-primary/20"
                  : "bg-muted border-border hover:bg-card"
              )}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-base font-semibold text-primary">
                    {session.subject.title}
                  </h4>

                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(session.date).toLocaleDateString()}
                    </span>

                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(session.date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                {/* Excluir */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 -mr-2 -mt-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      disabled={isDeleting === session.id}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isDeleting === session.id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-5 w-5" />
                        Excluir Sessão?
                      </AlertDialogTitle>

                      <AlertDialogDescription>
                        Você está prestes a apagar{" "}
                        <strong>{session.durationMinutes} minutos</strong> de
                        estudo de <strong>{session.subject.title}</strong>.
                        <br />
                        <br />
                        Isso impactará seus dados de progresso.
                      </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(session.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Confirmar Exclusão
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Footer */}
              <div className="mt-4 flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  <Zap className="h-3 w-3 text-primary" />
                  {session.durationMinutes} min
                </div>

                {session.notes && (
                  <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    {isExpanded ? "Ocultar notas" : "Ver notas"}
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </div>
                )}
              </div>

              {/* Notas */}
              {session.notes && (
                <div
                  className={cn(
                    "grid transition-all duration-300 ease-in-out",
                    isExpanded
                      ? "mt-3 grid-rows-[1fr] border-t border-border pt-3 opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  )}
                >
                  <div className="overflow-hidden text-sm italic leading-relaxed text-muted-foreground">
                    “{session.notes}”
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
