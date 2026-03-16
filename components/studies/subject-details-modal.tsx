"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

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
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type StudyNote = {
  id: string;
  title: string;
  content: string;
  tags: string | null;
  summary: string | null;
  createdAt: Date;
  updatedAt: Date;
  subjectId: string | null;
  contentId: string | null;
  sessionId: string | null;
  lastReviewed: Date | null;
  reviewCount: number;
  isFavorite: boolean;
};

type SessionDetail = {
  id: string;
  durationMinutes: number;
  notesRaw: string | null;
  date: string | Date;
  focusLevel: number;
  notes: StudyNote[];
};

type SubTopic = {
  id: string;
  title: string;
  icon?: string | null;
  color?: string | null;
};

type ParentTopic = {
  id: string;
  title: string;
};

type SubjectDetails = {
  subjectTitle: string;
  goalMinutes: number;
  difficulty: number;
  icon?: string | null;
  totalDuration: number;
  sessions: SessionDetail[];
  subTopics?: SubTopic[];
  parentTopic?: ParentTopic | null;
};

interface SubjectDetailsModalProps {
  subjectId: string | null;
  open: boolean;
  onClose: () => void;
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

const formatDuration = (minutes = 0) => {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return h > 0 ? `${h}h ${mm}m` : `${mm}m`;
};

const formatDateTime = (iso: string | Date) => {
  try {
    const d = new Date(iso);

    return {
      date: d.toLocaleDateString(),
      time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  } catch {
    return { date: "—", time: "—" };
  }
};

const FOCUS_MAP = {
  1: { text: "Baixo", className: "bg-muted text-muted-foreground" },
  2: { text: "Médio-Baixo", className: "bg-muted text-muted-foreground" },
  3: { text: "Médio", className: "bg-muted text-muted-foreground" },
  4: { text: "Alto", className: "bg-primary/10 text-primary" },
  5: { text: "Intenso", className: "bg-primary/20 text-primary" },
} as const;

/* -------------------------------------------------------------------------- */
/* SESSION ITEM                                                               */
/* -------------------------------------------------------------------------- */

function SessionItem({
  session,
  onDelete,
  deletingId,
}: {
  session: SessionDetail;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const parsed = formatDateTime(session.date);

  const focus =
    FOCUS_MAP[
      (session.focusLevel as keyof typeof FOCUS_MAP) ?? 3
    ] ?? FOCUS_MAP[3];

  return (
    <div className="relative border-l-2 border-primary/40 pl-4 p-3 rounded-r-lg hover:bg-muted/50 transition group">
      <div className="absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-card" />

      <div className="flex justify-between items-start mb-1">
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
          <Calendar className="h-3 w-3" />
          {parsed.date}
          <span className="text-border mx-1">|</span>
          {parsed.time}
        </span>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={deletingId === session.id}
            >
              {deletingId === session.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
            </Button>
          </AlertDialogTrigger>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Excluir registro?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação removerá o tempo contabilizado desta sessão.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(session.id)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex items-center gap-3 text-xs mt-2">
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          {formatDuration(session.durationMinutes)}
        </Badge>

        <Badge variant="secondary" className={cn("border-0", focus.className)}>
          <Gauge className="h-3 w-3 mr-1" />
          {focus.text}
        </Badge>
      </div>

      {session.notesRaw && (
        <div className="mt-3 text-sm italic text-muted-foreground bg-muted/30 p-2 rounded border">
          “{session.notesRaw}”
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export function SubjectDetailsModal({
  subjectId,
  open,
  onClose,
}: SubjectDetailsModalProps) {
  const [details, setDetails] = useState<SubjectDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  useEffect(() => {
    if (!open) {
      setDetails(null);
      setIsDeletingId(null);
      setRefreshCounter(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !subjectId) return;

    const fetchDetails = async () => {
      setIsLoading(true);

      try {
        const result = await getSubjectDetails(subjectId);

        if (result?.success && result.data) {
          setDetails(result.data as unknown as SubjectDetails);
        } else {
          toast.error(result?.message || "Erro ao carregar.");
        }
      } catch {
        toast.error("Erro de conexão.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [open, subjectId, refreshCounter]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    setIsDeletingId(sessionId);

    try {
      const result = await deleteSession(sessionId);

      if (result?.success) {
        toast.success("Sessão excluída.");
        setRefreshCounter((p) => p + 1);
      } else {
        toast.error(result?.message || "Erro ao excluir.");
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setIsDeletingId(null);
    }
  }, []);

  const totalDuration = details?.totalDuration ?? 0;
  const goalMinutes = details?.goalMinutes ?? 1;

  const progress = useMemo(() => {
    return Math.min((totalDuration / goalMinutes) * 100, 100);
  }, [totalDuration, goalMinutes]);

  const sortedSessions = useMemo(() => {
    if (!details?.sessions) return [];
    return [...details.sessions].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [details]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex flex-col gap-1 text-primary">
            {details?.parentTopic && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <FolderTree className="w-3 h-3" />
                {details.parentTopic.title}
                <ChevronRight className="w-3 h-3" />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {details?.subjectTitle ?? "Carregando..."}
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
            Carregando sessões...
          </div>
        ) : (
          <div className="space-y-6 overflow-y-auto pr-2">
            {/* PROGRESSO */}
            <div className="space-y-3 p-4 border rounded-xl">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-1">
                  <Target className="h-4 w-4" />
                  Meta: {formatDuration(goalMinutes)}
                </span>

                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Total: {formatDuration(totalDuration)}
                </span>
              </div>

              <Progress value={progress} />

              <p className="text-xs text-right">
                {progress >= 100 ? "Meta atingida!" : `${progress.toFixed(1)}%`}
              </p>
            </div>

            {/* HISTÓRICO */}
            <div className="space-y-4">
              {sortedSessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  onDelete={handleDeleteSession}
                  deletingId={isDeletingId}
                />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}