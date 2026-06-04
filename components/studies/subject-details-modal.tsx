"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

import { getSubjectDetails, deleteSession } from "@/app/(dashboard)/studies/actions";

import {
  Dialog, DialogContent, DialogHeader, DialogBody,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import {
  Clock, Calendar, Gauge, Target, Trash2, AlertTriangle, Loader2,
  Layers, BarChart3, History, GraduationCap, CheckCircle2, BookOpen,
} from "lucide-react";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EntityTags } from "@/components/connect/entity-tags";
import { EntityAttachments } from "@/components/connect/entity-attachments";
import { EntityLinks } from "@/components/connect/entity-links";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                      */
/* -------------------------------------------------------------------------- */

type StudyNote = {
  id: string; title: string; content: string; tags: string | null; summary: string | null;
  createdAt: Date; updatedAt: Date; subjectId: string | null; contentId: string | null;
  sessionId: string | null; lastReviewed: Date | null; reviewCount: number; isFavorite: boolean;
};

type SessionDetail = {
  id: string;
  durationMinutes: number;
  notesRaw: string | null;
  date: string | Date;
  focusLevel: number;
  notes: StudyNote[];
};

type SubTopic = { id: string; title: string; icon?: string | null; color?: string | null };
type ParentTopic = { id: string; title: string };

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
      date: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      time: d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
  } catch {
    return { date: "—", time: "—" };
  }
};

const FOCUS_MAP = {
  1: { text: "Baixo", className: "bg-muted text-muted-foreground" },
  2: { text: "Médio-baixo", className: "bg-muted text-muted-foreground" },
  3: { text: "Médio", className: "bg-muted text-muted-foreground" },
  4: { text: "Alto", className: "bg-primary/10 text-primary" },
  5: { text: "Intenso", className: "bg-primary/15 text-primary" },
} as const;

/* -------------------------------------------------------------------------- */
/* STAT                                                                       */
/* -------------------------------------------------------------------------- */

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 p-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
      <p className="text-base font-bold leading-none text-foreground">{value}</p>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SESSION ITEM                                                               */
/* -------------------------------------------------------------------------- */

function SessionItem({
  session, onDelete, deletingId,
}: {
  session: SessionDetail;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const parsed = formatDateTime(session.date);
  const focus = FOCUS_MAP[(session.focusLevel as keyof typeof FOCUS_MAP) ?? 3] ?? FOCUS_MAP[3];

  return (
    <div className="group relative rounded-xl border border-border/40 bg-card p-3.5 pl-5 transition-colors hover:border-primary/30">
      <div className="absolute left-0 top-3.5 bottom-3.5 w-1 rounded-full bg-primary/40" />

      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          {parsed.date}
          <span className="text-border">·</span>
          {parsed.time}
        </span>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
              disabled={deletingId === session.id}
            >
              {deletingId === session.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" /> Excluir registro?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação removerá o tempo contabilizado desta sessão.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(session.id)} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="flex items-center gap-2 text-xs">
        <Badge variant="outline" className="gap-1 font-medium">
          <Clock className="h-3 w-3" /> {formatDuration(session.durationMinutes)}
        </Badge>
        <Badge variant="secondary" className={cn("gap-1 border-0", focus.className)}>
          <Gauge className="h-3 w-3" /> {focus.text}
        </Badge>
      </div>

      {session.notesRaw && (
        <p className="mt-3 rounded-lg border border-border/40 bg-muted/30 p-2.5 text-sm italic leading-relaxed text-muted-foreground">
          “{session.notesRaw}”
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* MAIN COMPONENT                                                             */
/* -------------------------------------------------------------------------- */

export function SubjectDetailsModal({ subjectId, open, onClose }: SubjectDetailsModalProps) {
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
  const goalMinutes = details?.goalMinutes && details.goalMinutes > 0 ? details.goalMinutes : 1;
  const progress = useMemo(() => Math.min((totalDuration / goalMinutes) * 100, 100), [totalDuration, goalMinutes]);
  const isCompleted = progress >= 100;

  const sortedSessions = useMemo(() => {
    if (!details?.sessions) return [];
    return [...details.sessions].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [details]);

  const avgFocus = useMemo(() => {
    if (!sortedSessions.length) return 0;
    const sum = sortedSessions.reduce((acc, s) => acc + (s.focusLevel || 0), 0);
    return Math.round((sum / sortedSessions.length) * 10) / 10;
  }, [sortedSessions]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent size="lg" className="p-0 gap-0 max-h-[88vh]">
        <DialogHeader
          icon={details?.icon ? <span className="text-lg leading-none">{details.icon}</span> : <GraduationCap />}
          title={details?.subjectTitle ?? "Carregando…"}
          description={
            details?.parentTopic ? (
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5" /> {details.parentTopic.title}
              </span>
            ) : (
              "Histórico, progresso e evolução da matéria"
            )
          }
        />

        <DialogBody className="space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
              <Loader2 className="mb-3 h-6 w-6 animate-spin" />
              <p className="text-sm">Carregando dados da matéria…</p>
            </div>
          ) : (
            <>
              {/* ESTATÍSTICAS */}
              <div className="grid grid-cols-3 gap-3">
                <Stat icon={Clock} label="Tempo total" value={formatDuration(totalDuration)} />
                <Stat icon={BarChart3} label="Sessões" value={`${sortedSessions.length}`} />
                <Stat icon={Gauge} label="Foco médio" value={avgFocus ? `${avgFocus}/5` : "—"} />
              </div>

              {/* PROGRESSO DA META */}
              <div className="rounded-xl border border-border/40 bg-muted/10 p-4">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Target className="h-4 w-4" /> Meta: {formatDuration(goalMinutes)}
                  </span>
                  <span className={cn("flex items-center gap-1 font-bold", isCompleted ? "text-emerald-600" : "text-foreground")}>
                    {isCompleted && <CheckCircle2 className="h-4 w-4" />}
                    {progress.toFixed(0)}%
                  </span>
                </div>
                <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("absolute left-0 top-0 h-full rounded-full transition-all duration-700", isCompleted ? "bg-emerald-500" : "bg-primary")}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* SUB-TÓPICOS */}
              {details?.subTopics && details.subTopics.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <Layers className="h-3.5 w-3.5" /> Sub-tópicos ({details.subTopics.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {details.subTopics.map((st) => (
                      <span
                        key={st.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-card px-2.5 py-1 text-xs font-medium"
                      >
                        {st.icon ? <span>{st.icon}</span> : <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />}
                        {st.title}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* HISTÓRICO */}
              <div className="space-y-3">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  <History className="h-3.5 w-3.5" /> Histórico de sessões
                </p>

                {sortedSessions.length > 0 ? (
                  <div className="space-y-2.5">
                    {sortedSessions.map((session) => (
                      <SessionItem
                        key={session.id}
                        session={session}
                        onDelete={handleDeleteSession}
                        deletingId={isDeletingId}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/10 py-10 text-center">
                    <History className="mb-2 h-7 w-7 text-muted-foreground/40" />
                    <p className="text-sm font-medium">Nenhuma sessão registrada</p>
                    <p className="mt-1 text-xs text-muted-foreground">Use o timer para registrar seu primeiro foco nesta matéria.</p>
                  </div>
                )}
              </div>

              {/* TAGS, ANEXOS & RELAÇÕES (tecido conectivo cross-módulo) */}
              {subjectId && (
                <div className="space-y-3 border-t border-border/40 pt-4">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" /> Tags, Anexos & Relações
                  </p>
                  <EntityTags entityType="studySubject" entityId={subjectId} />
                  <EntityAttachments entityType="studySubject" entityId={subjectId} />
                  <EntityLinks entityType="studySubject" entityId={subjectId} />
                </div>
              )}
            </>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
