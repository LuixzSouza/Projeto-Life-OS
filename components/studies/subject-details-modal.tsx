"use client";

import { useEffect, useState, useMemo } from "react";

import {
  getSubjectDetails,
  deleteSession,
} from "@/app/(dashboard)/studies/actions";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

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

import {
  Zap,
  Clock,
  Calendar,
  Gauge,
  CheckCircle,
  Target,
  Tag,
  Activity,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";

import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* =========================
   TIPOS
========================= */

type SessionDetail = {
  id: string;
  durationMinutes: number;
  notes: string | null;
  date: string | Date;
  focusLevel: number;
  type: string;
  tags: string | null;
};

type SubjectDetails = {
  subjectTitle: string;
  goalMinutes: number;
  difficulty: number;
  icon: string | null;
  totalDuration: number;
  sessions: SessionDetail[];
};

interface SubjectDetailsModalProps {
  subjectId: string | null;
  open: boolean;
  onClose: () => void;
}

/* =========================
   HELPERS
========================= */

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const FOCUS_MAP = {
  1: { text: "Baixo", className: "bg-muted text-muted-foreground" },
  2: { text: "Médio-Baixo", className: "bg-muted text-muted-foreground" },
  3: { text: "Médio", className: "bg-muted text-muted-foreground" },
  4: { text: "Alto", className: "bg-primary/10 text-primary" },
  5: { text: "Intenso", className: "bg-primary/20 text-primary" },
};

/* =========================
   COMPONENTE
========================= */

export function SubjectDetailsModal({
  subjectId,
  open,
  onClose,
}: SubjectDetailsModalProps) {
  const [details, setDetails] = useState<SubjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  /* -------------------------
     RESET AO FECHAR
  -------------------------- */
  useEffect(() => {
    if (!open) {
      setDetails(null);
      setIsLoading(false);
      setIsDeletingId(null);
      setRefreshKey(0);
    }
  }, [open]);

  /* -------------------------
     FETCH DOS DADOS
  -------------------------- */
  useEffect(() => {
    if (!open || !subjectId) return;

    const fetchDetails = async () => {
      setIsLoading(true);

      try {
        const result = await getSubjectDetails(subjectId);

        if (result?.success && result.data) {
          setDetails(result.data);
        } else {
          toast.error(result?.message || "Erro ao carregar detalhes.");
          onClose();
        }
      } catch {
        toast.error("Erro de conexão.");
        onClose();
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [open, subjectId, refreshKey, onClose]);

  /* -------------------------
     DELETE DE SESSÃO
  -------------------------- */
  const handleDeleteSession = async (sessionId: string) => {
    setIsDeletingId(sessionId);
    const toastId = toast.loading("Excluindo registro...");

    try {
      const result = await deleteSession(sessionId);

      toast.dismiss(toastId);

      if (result?.success) {
        toast.success(result.message || "Registro excluído.");
        setRefreshKey((prev) => prev + 1);
      } else {
        toast.error(result?.message || "Erro ao excluir.");
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setIsDeletingId(null);
    }
  };

  /* -------------------------
     DERIVADOS
  -------------------------- */
  const totalDuration = details?.totalDuration ?? 0;
  const goalMinutes = details?.goalMinutes ?? 1;

  const progressToGoal = Math.min(
    (totalDuration / goalMinutes) * 100,
    100
  );

  const sortedSessions = useMemo(() => {
    if (!details?.sessions) return [];
    return [...details.sessions].sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [details?.sessions]);

  /* =========================
     RENDER
  ========================= */

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border shadow-lg shadow-primary/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <Zap className="h-5 w-5" />
            {isLoading
              ? "Carregando..."
              : `Mapa de Foco: ${details?.subjectTitle}`}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
            Carregando sessões...
          </div>
        ) : (
          <>
            {/* RESUMO */}
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Meta:
                  <strong className="ml-1 text-foreground">
                    {formatDuration(goalMinutes)}
                  </strong>
                </span>

                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Total:
                  <strong className="ml-1 text-primary">
                    {formatDuration(totalDuration)}
                  </strong>
                </span>
              </div>

              <Progress value={progressToGoal} className="h-3 bg-muted" />

              <p className="text-xs text-muted-foreground text-right">
                {progressToGoal >= 100 ? (
                  <span className="flex items-center justify-end gap-1 text-primary font-semibold">
                    <CheckCircle className="h-3 w-3" />
                    Meta atingida!
                  </span>
                ) : (
                  `${progressToGoal.toFixed(1)}% da meta`
                )}
              </p>
            </div>

            {/* HISTÓRICO */}
            <div className="mt-6 border-t border-border pt-4 text-sm font-semibold text-muted-foreground">
              Histórico ({sortedSessions.length})
            </div>

            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-5">
                {sortedSessions.length === 0 && (
                  <p className="p-4 text-center text-muted-foreground">
                    Nenhum registro encontrado.
                  </p>
                )}

                {sortedSessions.map((session) => {
                  const focus =
                    FOCUS_MAP[
                      session.focusLevel as keyof typeof FOCUS_MAP
                    ] ?? FOCUS_MAP[3];

                  let tags: string[] = [];
                  if (session.tags) {
                    try {
                      const parsed = JSON.parse(session.tags);
                      if (Array.isArray(parsed)) tags = parsed;
                    } catch {}
                  }

                  return (
                    <div
                      key={session.id}
                      className="relative border-l-2 border-primary/40 pl-4 p-3 rounded-r-lg hover:bg-muted transition"
                    >
                      <div className="absolute -left-[10px] top-3 h-5 w-5 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                        <Zap className="h-3 w-3 text-primary" />
                      </div>

                      <div className="flex justify-between items-center text-xs mb-1 text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(session.date).toLocaleDateString()}
                        </span>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              disabled={isDeletingId === session.id}
                            >
                              {isDeletingId === session.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>

                          <AlertDialogContent className="bg-card border-border">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2 text-primary">
                                <AlertTriangle className="h-5 w-5" />
                                Excluir registro?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-muted-foreground">
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>

                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                Cancelar
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  handleDeleteSession(session.id)
                                }
                                className="hover:bg-primary/90"
                              >
                                Confirmar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      <div className="flex flex-wrap gap-3 text-xs mb-2">
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <Clock className="h-3 w-3" />
                          {formatDuration(session.durationMinutes)}
                        </span>

                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Activity className="h-3 w-3" />
                          {session.type}
                        </span>

                        <span
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold",
                            focus.className
                          )}
                        >
                          <Gauge className="h-3 w-3" />
                          {focus.text}
                        </span>
                      </div>

                      {session.notes && (
                        <p className="text-sm italic text-muted-foreground border-l-2 border-border pl-3 mb-2 whitespace-pre-wrap">
                          “{session.notes}”
                        </p>
                      )}

                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.map((tag, i) => (
                            <span
                              key={`${session.id}-${i}`}
                              className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex items-center gap-1 uppercase"
                            >
                              <Tag className="h-2 w-2" />
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
