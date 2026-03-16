"use client";

import { useState, useCallback, useMemo } from "react";
import { Prisma } from "@prisma/client";
import { deleteSession } from "@/app/(dashboard)/studies/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  Trash2,
  Clock,
  ChevronDown,
  BookOpen,
  Gauge,
  MessageSquareQuote,
  Loader2,
  MoreVertical,
  Eye,
  EyeOff,
} from "lucide-react";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

/* -------------------------------------------------------
TYPES
------------------------------------------------------- */

type StudySessionWithSubject = Prisma.StudySessionGetPayload<{
  include: { subject: true };
}>;

interface StudySessionListProps {
  sessions: StudySessionWithSubject[];
}

/* -------------------------------------------------------
CONFIG
------------------------------------------------------- */

const FOCUS_MAP = {
  1: {
    text: "Baixo",
    variant: "outline" as const,
    className: "bg-muted text-muted-foreground border-border",
  },
  2: {
    text: "Médio-Baixo",
    variant: "outline" as const,
    className:
      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200",
  },
  3: {
    text: "Médio",
    variant: "outline" as const,
    className:
      "bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-200",
  },
  4: {
    text: "Alto",
    variant: "outline" as const,
    className:
      "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-200",
  },
  5: {
    text: "Intenso",
    variant: "primary" as const,
    className: "bg-primary text-primary-foreground",
  },
};

/* -------------------------------------------------------
HELPERS
------------------------------------------------------- */

const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
};

const formatRelativeDate = (date: Date) => {
  const now = new Date();

  const diff = now.getTime() - date.getTime();
  const diffDays = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays}d atrás`;

  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
};

/* -------------------------------------------------------
COMPONENT
------------------------------------------------------- */

export function StudySessionList({ sessions }: StudySessionListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<Record<string, boolean>>(
    {}
  );

  /* -------------------------------------------------------
  DELETE
  ------------------------------------------------------- */

  const handleDelete = useCallback(async (id: string) => {
    setIsDeleting(id);

    const toastId = toast.loading("Removendo sessão...");

    try {
      const result = await deleteSession(id);

      if (result?.success) {
        toast.success("Sessão removida", { id: toastId });
      } else {
        toast.error(result?.message || "Erro ao remover sessão", {
          id: toastId,
        });
      }
    } catch {
      toast.error("Erro de conexão", { id: toastId });
    } finally {
      setIsDeleting(null);
    }
  }, []);

  /* -------------------------------------------------------
  STATS
  ------------------------------------------------------- */

  const stats = useMemo(() => {
    const totalTime = sessions.reduce(
      (acc, s) => acc + s.durationMinutes,
      0
    );

    const avgFocus =
      sessions.length > 0
        ? (
            sessions.reduce((acc, s) => acc + s.focusLevel, 0) /
            sessions.length
          ).toFixed(1)
        : "0";

    return {
      totalSessions: sessions.length,
      totalTime,
      avgFocus,
    };
  }, [sessions]);

  /* -------------------------------------------------------
  EMPTY STATE
  ------------------------------------------------------- */

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed rounded-xl bg-muted/5">
        <div className="bg-muted p-3 rounded-full mb-3">
          <BookOpen className="h-6 w-6 text-muted-foreground/60" />
        </div>

        <h3 className="font-medium text-foreground">
          Sem histórico recente
        </h3>

        <p className="text-xs text-muted-foreground max-w-[220px]">
          Suas sessões finalizadas aparecerão aqui.
        </p>
      </div>
    );
  }

  /* -------------------------------------------------------
  UI
  ------------------------------------------------------- */

  return (
    <div className="space-y-6">

      {/* MINI DASHBOARD */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-card border shadow-sm">
        <Stat label="Sessões" value={stats.totalSessions} />

        <Stat
          label="Tempo"
          value={formatDuration(stats.totalTime)}
          bordered
        />

        <Stat label="Foco Médio" value={stats.avgFocus} highlight />
      </div>

      {/* TIMELINE */}
      <div className="relative pl-4">
        <div className="absolute left-[23px] top-2 bottom-4 w-px bg-gradient-to-b from-primary/30 via-border to-transparent" />

        <div className="space-y-4">
          {sessions.map((session) => {
            const expanded = expandedId === session.id;

            const focusInfo =
              FOCUS_MAP[
                session.focusLevel as keyof typeof FOCUS_MAP
              ] || FOCUS_MAP[3];

            const showFullNotes = expandedNotes[session.id];

            return (
              <div key={session.id} className="relative group">

                {/* DOT */}
                <div className="absolute left-[23px] top-6 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full border-2 border-background shadow-sm transition-all",
                      expanded
                        ? "bg-primary scale-125 ring-4 ring-primary/10"
                        : "bg-muted-foreground/30 group-hover:bg-primary/60"
                    )}
                  />
                </div>

                {/* CARD */}
                <div
                  className={cn(
                    "ml-10 rounded-xl border transition-all overflow-hidden",
                    expanded
                      ? "bg-card border-primary/30 shadow-md"
                      : "bg-card/50 hover:bg-card hover:border-primary/20"
                  )}
                >
                  <div
                    className="p-4 cursor-pointer"
                    onClick={() =>
                      setExpandedId(expanded ? null : session.id)
                    }
                  >
                    <div className="flex justify-between gap-3">

                      {/* INFO */}
                      <div className="flex-1">

                        <div className="flex justify-between">
                          <h4 className="font-semibold text-sm truncate">
                            {session.subject.title}
                          </h4>

                          <span className="text-[10px] text-muted-foreground">
                            {formatRelativeDate(
                              new Date(session.date)
                            )}
                          </span>
                        </div>

                        <div className="flex gap-2 mt-2 flex-wrap">

                          <Badge variant="secondary">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(session.durationMinutes)}
                          </Badge>

                          <Badge
                            variant={focusInfo.variant}
                            className={focusInfo.className}
                          >
                            <Gauge className="h-3 w-3 mr-1" />
                            {focusInfo.text}
                          </Badge>
                        </div>
                      </div>

                      {/* ACTION MENU */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end">

                          <DropdownMenuItem
                            onClick={() =>
                              setExpandedId(session.id)
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalhes
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                className="text-red-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </AlertDialogTrigger>

                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Excluir sessão?
                                </AlertDialogTitle>

                                <AlertDialogDescription>
                                  Você perderá{" "}
                                  <strong>
                                    {session.durationMinutes} minutos
                                  </strong>{" "}
                                  de estatísticas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>

                              <AlertDialogFooter>
                                <AlertDialogCancel>
                                  Cancelar
                                </AlertDialogCancel>

                                <AlertDialogAction
                                  className="bg-destructive"
                                  onClick={() =>
                                    handleDelete(session.id)
                                  }
                                >
                                  {isDeleting === session.id ? (
                                    <Loader2 className="animate-spin h-4 w-4" />
                                  ) : (
                                    "Excluir"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* NOTE PREVIEW */}
                    {session.notesRaw && !expanded && (
                      <div className="mt-3 text-xs text-muted-foreground italic truncate">
                        “{session.notesRaw}”
                      </div>
                    )}
                  </div>

                  {/* EXPANDED AREA */}
                  {expanded && (
                    <div className="border-t bg-muted/30 p-4">

                      {session.notesRaw ? (
                        <>
                          <div className="flex justify-between mb-2">
                            <span className="text-xs font-semibold uppercase text-muted-foreground">
                              Anotações
                            </span>

                            {session.notesRaw.length > 150 && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  setExpandedNotes((prev) => ({
                                    ...prev,
                                    [session.id]:
                                      !prev[session.id],
                                  }))
                                }
                              >
                                {showFullNotes ? (
                                  <>
                                    <EyeOff className="h-3 w-3 mr-1" />
                                    Resumir
                                  </>
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3 mr-1" />
                                    Expandir
                                  </>
                                )}
                              </Button>
                            )}
                          </div>

                          <div
                            className={cn(
                              "text-sm bg-background p-3 rounded-md border italic",
                              !showFullNotes &&
                                session.notesRaw.length > 150 &&
                                "line-clamp-3"
                            )}
                          >
                            &quot;{session.notesRaw}&quot;
                          </div>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic text-center">
                          Sem anotações.
                        </p>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-3 w-full text-xs"
                        onClick={() => setExpandedId(null)}
                      >
                        <ChevronDown className="h-3 w-3 mr-1 rotate-180" />
                        Recolher
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------
SMALL UI COMPONENT
------------------------------------------------------- */

function Stat({
  label,
  value,
  bordered,
  highlight,
}: {
  label: string;
  value: string | number;
  bordered?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "text-center p-2",
        bordered && "border-l border-r border-border/40"
      )}
    >
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </div>

      <div
        className={cn(
          "text-lg font-bold",
          highlight ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}