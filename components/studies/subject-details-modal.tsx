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
import { Badge } from "@/components/ui/badge";

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
  FolderTree,
  CornerDownRight,
  ChevronRight,
} from "lucide-react";

import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* TYPES                                   */
/* -------------------------------------------------------------------------- */

type StudyNote = {
  id: string;
  content: string;
  tags?: string[];
};

type SessionDetail = {
  id: string;
  durationMinutes: number;
  notesRaw: string | null; // Atualizado para notesRaw
  date: string | Date;
  focusLevel: number;
  // type: string; // Removido pois não existe mais no schema, usamos tags ou inferência
  // tags: string | null; // Removido pois tags agora estão em StudyNote, mas vamos manter compatibilidade visual se possível
  notes: StudyNote[]; // Array de StudyNote
};

type SubTopic = {
    id: string;
    title: string;
    icon: string | null;
    color: string | null;
}

type ParentTopic = {
    id: string;
    title: string;
}

type SubjectDetails = {
  subjectTitle: string;
  goalMinutes: number;
  difficulty: number;
  icon: string | null;
  totalDuration: number;
  sessions: SessionDetail[];
  subTopics?: SubTopic[]; // Novo
  parentTopic?: ParentTopic | null; // Novo
};

interface SubjectDetailsModalProps {
  subjectId: string | null;
  open: boolean;
  onClose: () => void;
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                   */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* COMPONENT                                   */
/* -------------------------------------------------------------------------- */

export function SubjectDetailsModal({
  subjectId,
  open,
  onClose,
}: SubjectDetailsModalProps) {
  const [details, setDetails] = useState<SubjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  /* ------------------------------------------------------------------------ */
  /* RESET AO FECHAR                             */
  /* ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!open) {
      setDetails(null);
      setIsLoading(false);
      setIsDeletingId(null);
      setRefreshKey(0);
    }
  }, [open]);

  /* ------------------------------------------------------------------------ */
  /* FETCH DOS DADOS                             */
  /* ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!open || !subjectId) return;

    const fetchDetails = async () => {
      setIsLoading(true);

      try {
        const result = await getSubjectDetails(subjectId);

        if (result?.success && result.data) {
          // Pequena adaptação de tipagem se necessário, mas o retorno da action deve bater
          setDetails(result.data as unknown as SubjectDetails);
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

  /* ------------------------------------------------------------------------ */
  /* DELETE DE SESSÃO                             */
  /* ------------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------------ */
  /* DERIVADOS                                 */
  /* ------------------------------------------------------------------------ */
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

  /* ------------------------------------------------------------------------ */
  /* RENDER                                    */
  /* ------------------------------------------------------------------------ */

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border shadow-lg shadow-primary/20 max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1 text-primary">
            {/* Breadcrumb do Pai */}
            {details?.parentTopic && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground font-normal mb-1">
                    <FolderTree className="w-3 h-3" />
                    <span>{details.parentTopic.title}</span>
                    <ChevronRight className="w-3 h-3" />
                </div>
            )}
            
            <div className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                {isLoading
                ? "Carregando..."
                : `Mapa de Foco: ${details?.subjectTitle}`}
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
            Carregando sessões...
          </div>
        ) : (
          <div className="space-y-6 overflow-y-auto pr-2">
            
            {/* SUBTÓPICOS (SE HOUVER) */}
            {details?.subTopics && details.subTopics.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                        <CornerDownRight className="w-3 h-3" /> Subtópicos
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {details.subTopics.map(sub => (
                            <Badge key={sub.id} variant="secondary" className="px-3 py-1.5 gap-2 cursor-default hover:bg-secondary/80">
                                {sub.icon && <span>{sub.icon}</span>}
                                {sub.title}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* RESUMO DE PROGRESSO */}
            <div className="space-y-3 bg-secondary/20 p-4 rounded-xl border border-border/50">
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

              <Progress value={progressToGoal} className="h-3 bg-background" />

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
            <div>
                <div className="border-t border-border pt-4 pb-2 text-sm font-semibold text-muted-foreground sticky top-0 bg-card z-10">
                Histórico ({sortedSessions.length})
                </div>

                <div className="space-y-4">
                {sortedSessions.length === 0 && (
                    <p className="p-4 text-center text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                    Nenhum registro de estudo encontrado para este tópico.
                    </p>
                )}

                {sortedSessions.map((session) => {
                    const focus =
                    FOCUS_MAP[
                        session.focusLevel as keyof typeof FOCUS_MAP
                    ] ?? FOCUS_MAP[3];

                    // Tenta extrair tags das notas se existirem (estrutura nova)
                    // No novo schema, tags podem estar em session.notes[0].tags (se populado)
                    // Para simplificar a visualização rápida, vamos focar nos dados básicos
                    
                    return (
                    <div
                        key={session.id}
                        className="relative border-l-2 border-primary/40 pl-4 p-3 rounded-r-lg hover:bg-muted/50 transition group"
                    >
                        <div className="absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card" />

                        <div className="flex justify-between items-start mb-1">
                            <div className="flex flex-col">
                                <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(session.date).toLocaleDateString()}
                                    <span className="text-border mx-1">|</span>
                                    {new Date(session.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1 text-muted-foreground hover:text-destructive"
                                    disabled={isDeletingId === session.id}
                                >
                                    {isDeletingId === session.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    ) : (
                                    <Trash2 className="h-3 w-3" />
                                    )}
                                </Button>
                                </AlertDialogTrigger>

                                <AlertDialogContent className="bg-card border-border">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                                    <AlertTriangle className="h-5 w-5" />
                                    Excluir registro?
                                    </AlertDialogTitle>
                                    <AlertDialogDescription className="text-muted-foreground">
                                    Esta ação removerá o tempo contabilizado desta sessão.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>

                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                    onClick={() => handleDeleteSession(session.id)}
                                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                    >
                                    Confirmar Exclusão
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs mt-2">
                            <Badge variant="outline" className="font-semibold text-primary border-primary/20 bg-primary/5">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatDuration(session.durationMinutes)}
                            </Badge>

                            <Badge variant="secondary" className={cn("border-0", focus.className)}>
                                <Gauge className="h-3 w-3 mr-1" />
                                {focus.text}
                            </Badge>
                        </div>

                        {session.notesRaw && (
                        <div className="mt-3 text-sm italic text-muted-foreground/90 bg-muted/30 p-2 rounded border border-border/50">
                            “{session.notesRaw}”
                        </div>
                        )}
                    </div>
                    );
                })}
                </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}