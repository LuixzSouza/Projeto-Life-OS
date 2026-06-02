"use client";

import { useState, useCallback } from "react";
import { deleteSession } from "@/app/(dashboard)/studies/actions";
import { toast } from "sonner";
import { History } from "lucide-react";

import { type StudySessionListProps } from "./study-session-utils";
import { SessionTimelineItem } from "./session-timeline-item";

export function StudySessionList({ sessions }: StudySessionListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleDelete = useCallback(async (id: string) => {
    setIsDeleting(id);
    const toastId = toast.loading("Removendo sessão...");
    try {
      const result = await deleteSession(id);
      if (result?.success) {
        toast.success("Sessão removida", { id: toastId });
      } else {
        toast.error(result?.message || "Erro ao remover sessão", { id: toastId });
      }
    } catch {
      toast.error("Erro de conexão", { id: toastId });
    } finally {
      setIsDeleting(null);
    }
  }, []);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/50 bg-muted/5 px-4 py-14 text-center">
        <div className="mb-3 rounded-full bg-muted p-3">
          <History className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Sem histórico recente</h3>
        <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
          Suas sessões finalizadas aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Linha vertical da timeline */}
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/30 via-border to-transparent" />

      <div className="space-y-2.5">
        {sessions.map((session) => (
          <SessionTimelineItem
            key={session.id}
            session={session}
            expanded={expandedId === session.id}
            isDeleting={isDeleting === session.id}
            onToggle={() => setExpandedId((id) => (id === session.id ? null : session.id))}
            onDelete={() => handleDelete(session.id)}
          />
        ))}
      </div>
    </div>
  );
}
