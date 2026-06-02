"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, CalendarClock, Sparkles, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createMeeting } from "@/app/(dashboard)/projects/actions";
import { MeetingEditor, type MeetingData } from "./meeting-editor";

interface MeetingBoardProps {
  meetings: MeetingData[];
  projectId: string | null; // null = Inbox
}

export function MeetingBoard({ meetings, projectId }: MeetingBoardProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<MeetingData | null>(null);
  const [creating, setCreating] = useState(false);

  const handleNew = async () => {
    setCreating(true);
    const now = new Date();
    const title = `Reunião ${now.toLocaleDateString("pt-BR")} ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
    const res = await createMeeting({ title, projectId });
    setCreating(false);
    if (res.success && res.meetingId) {
      router.refresh();
      setSelected({ id: res.meetingId, title, rawNotes: "", summary: null, image: null, createdAt: now.toISOString() });
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest">Reuniões</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Anote rápido e deixe a IA virar checklist</p>
          </div>
        </div>
        <Button onClick={handleNew} disabled={creating} className="gap-2 rounded-xl font-bold shadow-lg shadow-primary/20">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Nova Reunião
        </Button>
      </div>

      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/10 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <h4 className="font-bold text-foreground">Nenhuma reunião ainda</h4>
          <p className="text-sm text-muted-foreground max-w-xs mt-1">Crie uma, anote os pontos durante a call e gere o checklist com IA.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="text-left rounded-2xl border border-border/50 bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-bold text-sm line-clamp-2">{m.title}</h4>
                {m.summary && (
                  <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border-none text-[9px] gap-1">
                    <Sparkles className="h-2.5 w-2.5" /> Resumida
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2 line-clamp-3 whitespace-pre-wrap">
                {m.rawNotes || <span className="italic opacity-60">Sem notas ainda.</span>}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-3 font-medium">
                {new Date(m.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </button>
          ))}
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
