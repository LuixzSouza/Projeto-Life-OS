"use client";

import { useState, useCallback, useMemo } from "react";
import { Prisma } from "@prisma/client";
import { deleteSession } from "@/app/(dashboard)/studies/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import {
  Trash2,
  Calendar,
  Clock,
  AlertTriangle,
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

// --- TYPES ---
type StudySessionWithSubject = Prisma.StudySessionGetPayload<{
  include: { subject: true };
}>;

interface StudySessionListProps {
  sessions: StudySessionWithSubject[];
}

// --- CONFIGURATION ---
const FOCUS_MAP = {
  1: { 
    text: "Baixo", 
    variant: "outline" as const,
    className: "bg-muted text-muted-foreground border-border"
  },
  2: { 
    text: "Médio-Baixo", 
    variant: "outline" as const,
    className: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200"
  },
  3: { 
    text: "Médio", 
    variant: "outline" as const,
    className: "bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
  },
  4: { 
    text: "Alto", 
    variant: "outline" as const,
    className: "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
  },
  5: { 
    text: "Intenso", 
    variant: "primary" as const,
    className: "bg-primary text-primary-foreground hover:bg-primary/90 border-transparent shadow-sm"
  },
};

// --- HELPERS ---
const formatDuration = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}min`;
};

const formatRelativeDate = (date: Date): string => {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

// --- COMPONENT ---
export function StudySessionList({ sessions }: StudySessionListProps) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAllNotes, setShowAllNotes] = useState(false);

  const handleDelete = useCallback(async (id: string) => {
    setIsDeleting(id);
    const toastId = toast.loading("Removendo sessão...");

    try {
      const result = await deleteSession(id);
      
      if (result?.success) {
        toast.success("Sessão removida", { id: toastId });
      } else {
        toast.error(result?.message || "Erro ao remover", { id: toastId });
      }
    } catch {
      toast.error("Erro de conexão", { id: toastId });
    } finally {
      setIsDeleting(null);
    }
  }, []);

  // Stats rápidos do histórico atual
  const totalStudyTime = useMemo(() => 
    sessions.reduce((acc, session) => acc + session.durationMinutes, 0), 
    [sessions]
  );

  const averageFocus = useMemo(() => {
    if (sessions.length === 0) return 0;
    const sum = sessions.reduce((acc, session) => acc + session.focusLevel, 0);
    return (sum / sessions.length).toFixed(1);
  }, [sessions]);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center border border-dashed border-border/60 rounded-xl bg-muted/5">
        <div className="bg-muted p-3 rounded-full mb-3">
          <BookOpen className="h-6 w-6 text-muted-foreground/60" />
        </div>
        <h3 className="font-medium text-foreground mb-1">Sem histórico recente</h3>
        <p className="text-xs text-muted-foreground max-w-[200px]">
          Suas sessões finalizadas aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Mini Dashboard Header */}
      <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-card border border-border/60 shadow-sm">
        <div className="text-center p-2">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Total</div>
          <div className="text-lg font-bold text-foreground">{sessions.length}</div>
        </div>
        <div className="text-center p-2 border-l border-r border-border/40">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Tempo</div>
          <div className="text-lg font-bold text-foreground">{formatDuration(totalStudyTime)}</div>
        </div>
        <div className="text-center p-2">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Foco Médio</div>
          <div className="text-lg font-bold text-primary">{averageFocus}</div>
        </div>
      </div>

      {/* Timeline Layout */}
      <div className="relative pl-4">
        {/* Linha Vertical Conectora */}
        <div className="absolute left-[23px] top-2 bottom-4 w-px bg-gradient-to-b from-primary/30 via-border to-transparent" />
        
        <div className="space-y-4">
          {sessions.map((session) => {
            const isExpanded = expandedId === session.id;
            const focusInfo = FOCUS_MAP[session.focusLevel as keyof typeof FOCUS_MAP] || FOCUS_MAP[3];
            const sessionDate = new Date(session.date);

            return (
              <div key={session.id} className="relative group">
                
                {/* Dot da Timeline */}
                <div className="absolute left-[23px] top-6 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className={cn(
                    "h-3 w-3 rounded-full border-2 border-background shadow-sm transition-all duration-300",
                    isExpanded 
                      ? "bg-primary scale-125 ring-4 ring-primary/10" 
                      : "bg-muted-foreground/30 group-hover:bg-primary/60"
                  )} />
                </div>

                {/* Card da Sessão */}
                <div className={cn(
                  "ml-10 rounded-xl border transition-all duration-300 overflow-hidden",
                  isExpanded 
                    ? "bg-card border-primary/30 shadow-md ring-1 ring-primary/5" 
                    : "bg-card/50 border-border/60 hover:border-primary/20 hover:bg-card hover:shadow-sm"
                )}>
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : session.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      
                      {/* Conteúdo Principal */}
                      <div className="flex-1 min-w-0">
                        
                        {/* Título e Data */}
                        <div className="flex flex-col gap-1 mb-2">
                          <div className="flex items-center justify-between">
                            <h4 className={cn(
                              "font-semibold truncate text-sm transition-colors",
                              isExpanded ? "text-primary" : "text-foreground"
                            )}>
                              {session.subject.title}
                            </h4>
                            <span className="text-[10px] text-muted-foreground font-medium shrink-0">
                              {formatRelativeDate(sessionDate)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Badges Info */}
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="h-5 px-2 text-[10px] font-medium bg-muted/60 text-muted-foreground border-transparent">
                            <Clock className="h-3 w-3 mr-1" />
                            {formatDuration(session.durationMinutes)}
                          </Badge>
                          
                          <Badge 
                            variant={focusInfo.variant} 
                            className={cn("h-5 px-2 text-[10px] font-medium", focusInfo.className)}
                          >
                            <Gauge className="h-3 w-3 mr-1" />
                            {focusInfo.text}
                          </Badge>
                        </div>
                      </div>

                      {/* Dropdown de Ações */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 -mr-2 text-muted-foreground/50 hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setExpandedId(session.id)}>
                            <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {/* Item que abre o AlertDialog */}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 w-full">
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                              </div>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir sessão?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Você perderá <strong>{session.durationMinutes} minutos</strong> de estatísticas. Essa ação é irreversível.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  className="bg-destructive hover:bg-destructive/90"
                                  onClick={(e) => {
                                    e.preventDefault(); // Importante para não fechar o dropdown antes da hora
                                    handleDelete(session.id);
                                  }}
                                >
                                  {isDeleting === session.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : "Excluir"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Preview de Notas (Se não expandido) */}
                    {session.notesRaw && !isExpanded && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground/70">
                        <MessageSquareQuote className="h-3 w-3" />
                        <span className="truncate italic max-w-[200px]">{session.notesRaw}</span>
                      </div>
                    )}
                  </div>

                  {/* Área Expandida (Notas Completas) */}
                  <div className={cn(
                    "grid transition-all duration-300 ease-in-out bg-muted/30 border-t border-border/40",
                    isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  )}>
                    <div className="overflow-hidden">
                      {session.notesRaw ? (
                        <div className="p-4 pt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                              <MessageSquareQuote className="h-3 w-3" /> Anotações
                            </span>
                            {session.notesRaw.length > 150 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-5 text-[10px] px-2"
                                onClick={() => setShowAllNotes(!showAllNotes)}
                              >
                                {showAllNotes ? <EyeOff className="h-3 w-3 mr-1"/> : <Eye className="h-3 w-3 mr-1"/>}
                                {showAllNotes ? "Resumir" : "Expandir"}
                              </Button>
                            )}
                          </div>
                          
                          <div className={cn(
                            "text-sm text-foreground/80 leading-relaxed italic bg-background p-3 rounded-md border border-border/50",
                            !showAllNotes && session.notesRaw.length > 150 ? "line-clamp-3" : ""
                          )}>
                            &quot;{session.notesRaw}&quot;
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">
                          Sem anotações para esta sessão.
                        </div>
                      )}
                      
                      <div className="p-2 flex justify-center border-t border-border/40 bg-background/50">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-full text-xs text-muted-foreground hover:text-primary"
                          onClick={() => setExpandedId(null)}
                        >
                          <ChevronDown className="h-3 w-3 mr-1 rotate-180" /> Recolher
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}