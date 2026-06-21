"use client";

// "Ver tudo" do Histórico recente: o card lateral mostra só as últimas sessões;
// aqui vive o histórico COMPLETO com busca (matéria/anotações, sem acento) e
// paginação por cursor — escala para anos de estudo sem pesar a página.

import { useMemo, useState, useTransition } from "react";
import { History, Search, X, ChevronDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogBody, DialogTrigger,
} from "@/components/ui/dialog";
import { getSessionHistory } from "@/app/(dashboard)/studies/actions";
import { type StudySessionWithSubject, formatDuration } from "./study-session-utils";
import { StudySessionList } from "./study-session-list";

const PAGE_SIZE = 30;

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function SessionHistoryDialog({ totalSessions }: { totalSessions: number }) {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<StudySessionWithSubject[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  const [isLoading, startLoading] = useTransition();
  const [query, setQuery] = useState("");

  const fetchPage = (beforeISO?: string) => {
    startLoading(async () => {
      try {
        const page = await getSessionHistory(beforeISO, PAGE_SIZE);
        setSessions((prev) => (beforeISO ? [...prev, ...page] : page));
        setLoaded(true);
        if (page.length < PAGE_SIZE) setExhausted(true);
      } catch {
        toast.error("Não consegui carregar o histórico.");
      }
    });
  };

  const onOpenChange = (v: boolean) => {
    setOpen(v);
    if (v && !loaded) fetchPage();
  };

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return sessions;
    return sessions.filter((s) =>
      norm(`${s.subject?.title ?? ""} ${s.notesRaw ?? ""}`).includes(q)
    );
  }, [sessions, query]);

  const totalMinutes = useMemo(
    () => filtered.reduce((acc, s) => acc + s.durationMinutes, 0),
    [filtered]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[11px] font-bold text-muted-foreground hover:text-primary">
          Ver tudo
          {totalSessions > 0 && <span className="tabular-nums opacity-60">({totalSessions})</span>}
        </Button>
      </DialogTrigger>

      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" /> Histórico de sessões
          </DialogTitle>
          <DialogDescription>
            {filtered.length} {filtered.length === 1 ? "sessão" : "sessões"}
            {filtered.length > 0 && ` · ${formatDuration(totalMinutes)} de foco`}
            {query.trim() && " (no filtro atual)"}
          </DialogDescription>

          {/* Busca local sobre o que já foi carregado */}
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por matéria ou anotação…"
              className="h-9 w-full rounded-xl border border-border/50 bg-background pl-9 pr-8 text-sm outline-none transition-colors focus:border-primary/40"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                title="Limpar busca"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground/60 hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </DialogHeader>

        <DialogBody className="custom-scrollbar p-4">
          {!loaded && isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              {query.trim()
                ? "Nada encontrado — o que procura pode estar mais atrás; carregue mais histórico."
                : "Nenhuma sessão registrada ainda."}
            </p>
          ) : (
            <StudySessionList sessions={filtered} />
          )}

          {loaded && !exhausted && (
            <div className="flex justify-center pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
                onClick={() => fetchPage(sessions[sessions.length - 1]?.date.toISOString())}
                className="h-8 gap-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest"
              >
                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Carregar mais
              </Button>
            </div>
          )}
          {loaded && exhausted && sessions.length > 0 && (
            <p className="pt-4 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
              ✦ Primeira sessão registrada ✦
            </p>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
