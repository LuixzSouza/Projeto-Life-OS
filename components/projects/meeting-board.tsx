"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, CalendarClock, Sparkles, Loader2, FileText, Search, Users, Paperclip, Tag, X, Gavel, ListChecks, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createMeeting } from "@/app/(dashboard)/projects/actions";
import { parseActionItems } from "@/lib/meeting-summary";
import { useRecording } from "@/components/providers/recording-provider";
import { MeetingEditor, type MeetingData } from "./meeting-editor";

interface MeetingBoardProps {
  meetings: MeetingData[];
  projectId: string | null; // null = Inbox
}

type QuickFilter = "all" | "summarized" | "attachments";

export function MeetingBoard({ meetings, projectId }: MeetingBoardProps) {
  const router = useRouter();
  const rec = useRecording();
  const [selected, setSelected] = useState<MeetingData | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<QuickFilter>("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  // Conjunto de tags existentes (para o seletor rápido).
  const allTags = useMemo(() => {
    const set = new Set<string>();
    meetings.forEach((m) => m.tags?.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [meetings]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return meetings.filter((m) => {
      if (filter === "summarized" && !m.summary) return false;
      if (filter === "attachments" && (m.images?.length ?? 0) === 0) return false;
      if (activeTag && !m.tags?.includes(activeTag)) return false;
      if (!q) return true;
      const haystack = [
        m.title, m.rawNotes, m.summary ?? "",
        ...(m.tags ?? []), ...(m.participants ?? []),
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [meetings, query, filter, activeTag]);

  const handleNew = async () => {
    setCreating(true);
    const now = new Date();
    const title = `Reunião ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    const res = await createMeeting({ title, projectId });
    setCreating(false);
    if (res.success && res.meetingId) {
      router.refresh();
      setSelected({ id: res.meetingId, title, rawNotes: "", summary: null, images: [], participants: [], tags: [], decisions: [], createdAt: now.toISOString() });
    } else {
      toast.error(res.message);
    }
  };

  const hasFilters = query.trim() !== "" || filter !== "all" || activeTag !== null;
  const clearFilters = () => { setQuery(""); setFilter("all"); setActiveTag(null); };

  const filterBtn = (key: QuickFilter, label: string) => (
    <button
      onClick={() => setFilter(key)}
      className={cn(
        "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors whitespace-nowrap",
        filter === key ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:bg-muted",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-widest">
              Reuniões
              {meetings.length > 0 && (
                <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] font-bold normal-case tracking-normal text-muted-foreground tabular-nums">
                  {meetings.length} · {meetings.filter((m) => m.summary).length} resumida{meetings.filter((m) => m.summary).length === 1 ? "" : "s"}
                </span>
              )}
            </h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Anote rápido e deixe a IA virar checklist</p>
          </div>
        </div>
        <Button onClick={handleNew} disabled={creating} className="gap-2 rounded-xl font-bold shadow-lg shadow-primary/20">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Nova Reunião
        </Button>
      </div>

      {/* Busca + filtros (só aparece quando há reuniões) */}
      {meetings.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por título, notas, tags ou participantes…"
                className="pl-9 rounded-xl bg-muted/20 border-border/40"
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              {filterBtn("all", "Todas")}
              {filterBtn("summarized", "Resumidas")}
              {filterBtn("attachments", "Com anexos")}
              {hasFilters && (
                <button onClick={clearFilters} className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:text-foreground whitespace-nowrap">
                  <X className="h-3.5 w-3.5" /> Limpar
                </button>
              )}
            </div>
          </div>

          {allTags.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
              <Tag className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
              {allTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveTag((cur) => (cur === t ? null : t))}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap",
                    activeTag === t ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary hover:bg-primary/20",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/10 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <h4 className="font-bold text-foreground">Nenhuma reunião ainda</h4>
          <p className="text-sm text-muted-foreground max-w-xs mt-1">Crie uma, anote os pontos durante a call e gere o checklist com IA.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/10 text-center">
          <Search className="h-7 w-7 text-muted-foreground/30 mb-3" />
          <h4 className="font-bold text-foreground">Nenhuma reunião encontrada</h4>
          <p className="text-sm text-muted-foreground mt-1">Ajuste a busca ou os filtros.</p>
          <button onClick={clearFilters} className="mt-3 text-xs font-bold text-primary hover:underline">Limpar filtros</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((m) => {
            const isLive = rec.isRecording && rec.activeMeetingId === m.id;
            const actionCount = parseActionItems(m.summary).length;
            return (
              <button
                key={m.id}
                onClick={() => setSelected(m)}
                className={cn(
                  "text-left rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md",
                  isLive ? "border-rose-500/40 ring-1 ring-rose-500/20" : "border-border/50 hover:border-primary/30",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-bold text-sm line-clamp-2">{m.title}</h4>
                  {isLive ? (
                    <Badge variant="secondary" className="shrink-0 gap-1 border-none bg-rose-500/10 text-[9px] text-rose-500">
                      <Mic className="h-2.5 w-2.5 animate-pulse" /> Gravando
                    </Badge>
                  ) : m.summary ? (
                    <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border-none text-[9px] gap-1">
                      <Sparkles className="h-2.5 w-2.5" /> Resumida
                    </Badge>
                  ) : null}
                </div>

                {/* Preview: o RESUMO conta a história melhor que as notas cruas */}
                <p className="text-xs text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">
                  {m.summary || m.rawNotes || <span className="italic opacity-60">Sem notas ainda.</span>}
                </p>

                {m.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2.5">
                    {m.tags.slice(0, 4).map((t) => (
                      <span key={t} className="rounded-md bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-medium">{t}</span>
                    ))}
                    {m.tags.length > 4 && <span className="text-[9px] text-muted-foreground/60 px-1 py-0.5">+{m.tags.length - 4}</span>}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3 mt-3 text-[10px] text-muted-foreground/60 font-medium">
                  <span className="capitalize">
                    {new Date(m.createdAt).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}
                    {" · "}
                    {new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {m.participants?.length > 0 && (
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {m.participants.length}</span>
                  )}
                  {(m.decisions?.length ?? 0) > 0 && (
                    <span className="flex items-center gap-1 text-amber-600/80" title={`${m.decisions.length} decisão(ões) registrada(s)`}>
                      <Gavel className="h-3 w-3" /> {m.decisions.length}
                    </span>
                  )}
                  {actionCount > 0 && (
                    <span className="flex items-center gap-1 text-primary/70" title={`${actionCount} item(ns) de ação no resumo`}>
                      <ListChecks className="h-3 w-3" /> {actionCount}
                    </span>
                  )}
                  {m.images?.length > 0 && (
                    <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> {m.images.length}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); router.refresh(); } }}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-[2rem] shadow-2xl gap-0">
          {selected && <MeetingEditor key={selected.id} meeting={selected} onClose={() => setSelected(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
