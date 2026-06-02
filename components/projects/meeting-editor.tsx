"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, ListChecks, Trash2, Loader2, Save, X, Mic, Square, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useRecording } from "@/components/providers/recording-provider";
import {
  updateMeeting, deleteMeeting, summarizeMeeting, createTasksFromMeeting, getMeetingNotes,
} from "@/app/(dashboard)/projects/actions";

export interface MeetingData {
  id: string;
  title: string;
  rawNotes: string;
  summary: string | null;
  image: string | null;
  createdAt: string;
}

const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export function MeetingEditor({ meeting, onClose }: { meeting: MeetingData; onClose: () => void }) {
  const router = useRouter();
  const rec = useRecording();

  const [title, setTitle] = useState(meeting.title);
  const [notes, setNotes] = useState(meeting.rawNotes);
  const [image, setImage] = useState<string | null>(meeting.image);
  const [summary, setSummary] = useState<string | null>(meeting.summary);
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const notesRef = useRef(notes);
  useEffect(() => { notesRef.current = notes; }, [notes]);

  const { subscribe } = rec;
  const isRecordingThis = rec.isRecording && rec.activeMeetingId === meeting.id;
  const otherRecording = rec.isRecording && rec.activeMeetingId !== meeting.id;

  // Ao abrir: carrega as notas mais recentes do servidor (pode ter transcrição
  // adicionada com o modal fechado) e assina os trechos transcritos ao vivo.
  useEffect(() => {
    let mounted = true;
    getMeetingNotes(meeting.id).then((r) => {
      if (!mounted || !r.success) return;
      setNotes(r.rawNotes ?? "");
      notesRef.current = r.rawNotes ?? "";
      setSummary(r.summary ?? null);
      if (r.image) setImage(r.image);
    });

    const unsub = subscribe(meeting.id, (text) => {
      const updated = (notesRef.current ? notesRef.current + "\n" : "") + text;
      notesRef.current = updated;
      setNotes(updated);
      void updateMeeting({ id: meeting.id, rawNotes: updated }); // autosave
    });
    return () => { mounted = false; unsub(); };
  }, [meeting.id, subscribe]);

  // Cola um print direto nas notas (Ctrl+V).
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.includes("image")) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = () => { setImage(reader.result as string); toast.success("Print colado!"); };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  const persist = async () => updateMeeting({ id: meeting.id, title, rawNotes: notes, image });

  const handleSave = async () => {
    setSaving(true);
    const res = await persist();
    setSaving(false);
    if (res.success) { toast.success(res.message); router.refresh(); }
    else toast.error(res.message);
  };

  const handleSummarize = async () => {
    setSummarizing(true);
    const saved = await persist();
    if (!saved.success) { setSummarizing(false); toast.error(saved.message); return; }
    const res = await summarizeMeeting(meeting.id);
    setSummarizing(false);
    if (res.success && res.summary) { setSummary(res.summary); toast.success(res.message); router.refresh(); }
    else toast.error(res.message);
  };

  const handleGenerateTasks = async () => {
    setGenerating(true);
    const res = await createTasksFromMeeting(meeting.id);
    setGenerating(false);
    if (res.success) { toast.success(res.message); router.refresh(); }
    else toast.error(res.message);
  };

  const handleDelete = async () => {
    if (isRecordingThis) { toast.error("Pare a gravação antes de excluir."); return; }
    const res = await deleteMeeting(meeting.id);
    if (res.success) { toast.success(res.message); router.refresh(); onClose(); }
    else toast.error(res.message);
  };

  return (
    <div className="flex flex-col max-h-[88vh]">
      {/* HEADER */}
      <div className="p-5 border-b border-border/40 bg-muted/10">
        <DialogHeader className="text-left">
          <DialogTitle className="sr-only">Editar reunião</DialogTitle>
          <DialogDescription className="sr-only">Notas, gravação com transcrição, resumo e tarefas.</DialogDescription>
        </DialogHeader>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título da reunião"
          className="text-xl font-bold border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 h-auto"
        />
        <p className="text-xs text-muted-foreground mt-0.5">
          {new Date(meeting.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* BODY (rolável — aguenta transcrições longas) */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">

        {/* Gravação */}
        <div className={cn("rounded-xl border p-3 transition-colors", isRecordingThis ? "border-rose-500/40 bg-rose-500/[0.04]" : "border-border/40 bg-muted/20")}>
          <div className="flex flex-wrap items-center gap-2">
            {isRecordingThis ? (
              <>
                <Button onClick={rec.stopSession} size="sm" className="gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white">
                  <Square className="h-3.5 w-3.5 fill-current" /> Parar · {fmtTime(rec.elapsed)}
                </Button>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {rec.transcribing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> transcrevendo trecho...</> : "gravando e transcrevendo a cada ~45s"}
                </span>
              </>
            ) : (
              <Button
                onClick={() => rec.startSession(meeting.id, title)}
                disabled={otherRecording}
                variant="outline"
                size="sm"
                className="gap-2 rounded-lg"
              >
                <Mic className="h-4 w-4 text-rose-500" /> Gravar reunião
              </Button>
            )}
            <span className="text-[11px] text-muted-foreground">Sua voz + áudio do computador → vira texto nas notas</span>
          </div>

          {isRecordingThis && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
              Pode fechar este modal e navegar pelo site — a gravação continua e a transcrição segue entrando aqui.
            </p>
          )}
          {otherRecording && (
            <p className="mt-2 text-[11px] text-amber-600">Há outra reunião sendo gravada no momento.</p>
          )}
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Notas (cole prints com Ctrl+V)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onPaste={handlePaste}
            placeholder="Anote pontos, decisões, próximos passos... A transcrição da gravação aparece aqui."
            className="min-h-[240px] rounded-xl bg-muted/20 border-border/40 resize-y p-3 text-sm leading-relaxed"
          />
          <p className="text-[10px] text-muted-foreground/70 text-right">{notes.length} caracteres</p>
        </div>

        {image && (
          <div className="relative w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="anexo" className="max-h-40 rounded-xl border border-border/40" />
            <button
              onClick={() => setImage(null)}
              className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 shadow hover:bg-rose-500 hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Resumo IA */}
        {summary && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-[10px] uppercase font-bold tracking-wider text-primary flex items-center gap-1.5 mb-2">
              <Sparkles className="h-3 w-3" /> Resumo da IA
            </p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed text-foreground/90">{summary}</p>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="p-4 border-t border-border/40 bg-muted/5 flex flex-wrap items-center gap-2">
        <Button onClick={handleSummarize} disabled={summarizing} className="gap-2 rounded-xl bg-primary shadow-lg shadow-primary/20">
          {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Resumir com IA
        </Button>
        <Button onClick={handleGenerateTasks} disabled={generating || !summary} variant="secondary" className="gap-2 rounded-xl">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
          Gerar checklist
        </Button>
        <Button onClick={handleSave} disabled={saving} variant="outline" className="gap-2 rounded-xl">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
        <Button onClick={handleDelete} variant="ghost" size="icon" className="ml-auto rounded-xl text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
