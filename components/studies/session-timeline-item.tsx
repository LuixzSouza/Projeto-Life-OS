"use client";

import { cn } from "@/lib/utils";
import { Trash2, Clock, Gauge, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FOCUS_MAP, formatDuration, formatRelativeDate, type StudySessionWithSubject } from "./study-session-utils";

interface SessionTimelineItemProps {
  session: StudySessionWithSubject;
  expanded: boolean;
  isDeleting: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export function SessionTimelineItem({
  session, expanded, isDeleting, onToggle, onDelete,
}: SessionTimelineItemProps) {
  const focusInfo = FOCUS_MAP[session.focusLevel as keyof typeof FOCUS_MAP] || FOCUS_MAP[3];
  const accent = session.subject.color || "hsl(var(--primary))";
  const hasNotes = !!session.notesRaw && session.notesRaw.trim().length > 0;

  return (
    <div className="relative pl-6">
      {/* Marcador */}
      <span
        className="absolute left-0 top-3.5 h-3.5 w-3.5 -translate-x-1/2 rounded-full border-2 border-background shadow-sm transition-all"
        style={{ backgroundColor: expanded ? accent : "hsl(var(--muted-foreground) / 0.4)" }}
      />

      <div
        className={cn(
          "group rounded-xl border bg-card transition-all",
          expanded ? "border-primary/30 shadow-sm" : "border-border/40 hover:border-primary/20"
        )}
      >
        {/* Linha principal (clicável) */}
        <button type="button" onClick={onToggle} className="w-full p-3 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
              <h4 className="truncate text-sm font-semibold text-foreground">{session.subject.title}</h4>
            </div>
            <span className="shrink-0 text-[10px] font-medium text-muted-foreground">
              {formatRelativeDate(new Date(session.date))}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              <Clock className="h-3 w-3" /> {formatDuration(session.durationMinutes)}
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium", focusInfo.className)}>
              <Gauge className="h-3 w-3" /> {focusInfo.text}
            </span>
            {hasNotes && (
              <ChevronDown className={cn("ml-auto h-3.5 w-3.5 text-muted-foreground/60 transition-transform", expanded && "rotate-180")} />
            )}
          </div>

          {/* Prévia da nota (recolhido) */}
          {hasNotes && !expanded && (
            <p className="mt-2 truncate text-xs italic text-muted-foreground">“{session.notesRaw}”</p>
          )}
        </button>

        {/* Área expandida */}
        {expanded && (
          <div className="border-t border-border/40 p-3">
            {hasNotes ? (
              <p className="rounded-lg border border-border/40 bg-muted/30 p-2.5 text-xs italic leading-relaxed text-muted-foreground">
                “{session.notesRaw}”
              </p>
            ) : (
              <p className="text-center text-xs italic text-muted-foreground">Sem anotações.</p>
            )}

            <div className="mt-2 flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    disabled={isDeleting}
                  >
                    {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Você perderá <strong>{session.durationMinutes} minutos</strong> de estatísticas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" onClick={onDelete}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
