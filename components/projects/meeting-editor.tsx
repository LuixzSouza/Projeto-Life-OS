"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Sparkles, ListChecks, Trash2, Loader2, Save, X, Mic, Square, Info, Pause, Play,
  ImagePlus, Copy, Download, ChevronLeft, ChevronRight, GripVertical, Check, CloudOff, FileDown,
  Users, Tag, Gavel, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { compressImage } from "@/lib/image-compress";
import type { MeetingImage } from "@/lib/meeting-images";
import { useRecording, AudioMeter } from "@/components/providers/recording-provider";
import { parseActionItems } from "@/lib/meeting-summary";
import { MeetingTokenField } from "./meeting-token-field";
import {
  updateMeeting, deleteMeeting, summarizeMeeting, createTasksFromMeeting, getMeetingNotes,
  getConnectionNames, polishMeetingTranscript,
} from "@/app/(dashboard)/projects/actions";

export interface MeetingData {
  id: string;
  title: string;
  rawNotes: string;
  summary: string | null;
  images: MeetingImage[];
  participants: string[];
  tags: string[];
  decisions: string[];
  createdAt: string;
}

const MAX_IMAGES = 20;
const fmtTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

type SaveState = "idle" | "saving" | "saved" | "error";

export function MeetingEditor({ meeting, onClose }: { meeting: MeetingData; onClose: () => void }) {
  const router = useRouter();
  const rec = useRecording();

  const [title, setTitle] = useState(meeting.title);
  const [notes, setNotes] = useState(meeting.rawNotes);
  const [images, setImages] = useState<MeetingImage[]>(meeting.images);
  const [summary, setSummary] = useState<string | null>(meeting.summary);
  const [participants, setParticipants] = useState<string[]>(meeting.participants ?? []);
  const [tags, setTags] = useState<string[]>(meeting.tags ?? []);
  const [decisions, setDecisions] = useState<string[]>(meeting.decisions ?? []);
  const [saving, setSaving] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [polishing, setPolishing] = useState(false);
  // Autocomplete dos participantes: nomes das Conexões (CRM social).
  const [connectionNames, setConnectionNames] = useState<string[]>([]);

  const notesRef = useRef(notes);
  const titleRef = useRef(title);
  const imagesRef = useRef(images);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragIndexRef = useRef<number | null>(null);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { titleRef.current = title; }, [title]);
  useEffect(() => { imagesRef.current = images; }, [images]);

  // --- AUTOSAVE SERIALIZADO ---------------------------------------------------
  // Reuniões longas geram muitas escritas (transcrição a cada ~45s + digitação +
  // anexos). Encadeamos TODO updateMeeting numa única fila para que nenhuma
  // requisição chegue fora de ordem ao banco e sobrescreva dados mais novos.
  const saveChainRef = useRef<Promise<unknown>>(Promise.resolve());
  const inflightRef = useRef(0);
  const failedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingEditRef = useRef(false);

  const queueSave = useCallback(
    (patch: { title?: string; rawNotes?: string; images?: MeetingImage[]; participants?: string[]; tags?: string[]; decisions?: string[] }) => {
      inflightRef.current += 1;
      setSaveState("saving");
      const run = saveChainRef.current.then(() => updateMeeting({ id: meeting.id, ...patch }));
      // A cadeia de serialização continua mesmo se este salvamento específico falhar.
      saveChainRef.current = run.then(() => undefined, () => undefined);
      run
        .then(
          (res) => { if (!res?.success) failedRef.current = true; },
          () => { failedRef.current = true; },
        )
        .finally(() => {
          inflightRef.current -= 1;
          if (inflightRef.current === 0) {
            setSaveState(failedRef.current ? "error" : "saved");
            if (!failedRef.current) setSavedAt(new Date());
            failedRef.current = false;
          }
        });
      return run;
    },
    [meeting.id],
  );

  // Edição manual (título/notas): salva com debounce para não inundar o servidor.
  const scheduleSave = useCallback(() => {
    pendingEditRef.current = true;
    setSaveState("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      pendingEditRef.current = false;
      void queueSave({ title: titleRef.current.trim() || "Reunião", rawNotes: notesRef.current });
    }, 800);
  }, [queueSave]);

  const commitImages = (next: MeetingImage[]) => {
    imagesRef.current = next;
    setImages(next);
    void queueSave({ images: next }); // autosave serializado dos anexos
  };

  // Metadados (participantes/tags/decisões): mudanças discretas → autosave imediato.
  const commitParticipants = (next: string[]) => { setParticipants(next); void queueSave({ participants: next }); };
  const commitTags = (next: string[]) => { setTags(next); void queueSave({ tags: next }); };
  const commitDecisions = (next: string[]) => { setDecisions(next); void queueSave({ decisions: next }); };

  const { subscribe } = rec;
  const isRecordingThis = rec.isRecording && rec.activeMeetingId === meeting.id;
  const otherRecording = rec.isRecording && rec.activeMeetingId !== meeting.id;

  // Ao abrir: carrega notas/anexos mais recentes do servidor (pode ter transcrição
  // adicionada com o modal fechado) e assina os trechos transcritos ao vivo.
  useEffect(() => {
    let mounted = true;
    getMeetingNotes(meeting.id).then((r) => {
      if (!mounted || !r.success) return;
      setNotes(r.rawNotes ?? "");
      notesRef.current = r.rawNotes ?? "";
      setSummary(r.summary ?? null);
      if (r.images) { setImages(r.images); imagesRef.current = r.images; }
      if (r.participants) setParticipants(r.participants);
      if (r.tags) setTags(r.tags);
      if (r.decisions) setDecisions(r.decisions);
    });

    const unsub = subscribe(meeting.id, (text) => {
      const updated = (notesRef.current ? notesRef.current + "\n" : "") + text;
      notesRef.current = updated;
      setNotes(updated);
      void queueSave({ rawNotes: updated }); // autosave serializado imediato
    });
    return () => { mounted = false; unsub(); };
  }, [meeting.id, subscribe, queueSave]);

  // Garante que a última edição com debounce pendente seja gravada ao fechar/desmontar.
  useEffect(() => {
    return () => {
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
      if (pendingEditRef.current) {
        pendingEditRef.current = false;
        void queueSave({ title: titleRef.current.trim() || "Reunião", rawNotes: notesRef.current });
      }
    };
  }, [queueSave]);

  // Quando o resumo automático (ao parar a gravação) termina para ESTA reunião,
  // recarrega notas/resumo/anexos para refletir na hora.
  useEffect(() => {
    if (!rec.summaryEvent || rec.summaryEvent.id !== meeting.id) return;
    let mounted = true;
    getMeetingNotes(meeting.id).then((r) => {
      if (!mounted || !r.success) return;
      setNotes(r.rawNotes ?? ""); notesRef.current = r.rawNotes ?? "";
      setSummary(r.summary ?? null);
      if (r.images) { setImages(r.images); imagesRef.current = r.images; }
      if (r.participants) setParticipants(r.participants);
      if (r.tags) setTags(r.tags);
      if (r.decisions) setDecisions(r.decisions);
    });
    return () => { mounted = false; };
  }, [rec.summaryEvent, meeting.id]);

  // Nomes das Conexões para o autocomplete (1 fetch por abertura do editor).
  useEffect(() => {
    let mounted = true;
    getConnectionNames().then((names) => { if (mounted) setConnectionNames(names); });
    return () => { mounted = false; };
  }, []);

  // Navegação por teclado no lightbox.
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      else if (e.key === "ArrowRight") setLightbox((i) => (i === null ? null : (i + 1) % imagesRef.current.length));
      else if (e.key === "ArrowLeft") setLightbox((i) => (i === null ? null : (i - 1 + imagesRef.current.length) % imagesRef.current.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox]);

  // Comprime e adiciona uma ou várias imagens (cola, arrasta ou seleciona).
  const addFiles = async (files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (imgs.length === 0) return;
    const room = MAX_IMAGES - imagesRef.current.length;
    if (room <= 0) { toast.error(`Máximo de ${MAX_IMAGES} imagens por reunião.`); return; }
    const batch = imgs.slice(0, room);
    setCompressing(true);
    try {
      const compressed = await Promise.all(batch.map((f) => compressImage(f)));
      commitImages([...imagesRef.current, ...compressed.map((src) => ({ src }))].slice(0, MAX_IMAGES));
      toast.success(batch.length > 1 ? `${batch.length} imagens anexadas!` : "Imagem anexada!");
      if (imgs.length > room) toast.message(`Só couberam ${room} (limite de ${MAX_IMAGES}).`);
    } catch {
      toast.error("Falha ao processar imagem.");
    } finally {
      setCompressing(false);
    }
  };

  const removeImage = (idx: number) => {
    const next = imagesRef.current.filter((_, i) => i !== idx);
    commitImages(next);
    setLightbox((cur) => (cur === null ? null : next.length === 0 ? null : Math.min(cur, next.length - 1)));
  };

  // Legenda: digita sem salvar a cada tecla; persiste no blur.
  const setCaption = (idx: number, caption: string) => {
    setImages((prev) => {
      const next = prev.map((img, i) => (i === idx ? { ...img, caption } : img));
      imagesRef.current = next;
      return next;
    });
  };
  const saveCaption = () => void queueSave({ images: imagesRef.current });

  // Reordenar anexos arrastando (drag interno; arquivos do SO continuam caindo no body).
  const moveImage = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = [...imagesRef.current];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commitImages(next);
  };

  // Cola prints direto (Ctrl+V) — aceita várias imagens de uma vez.
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.includes("image")) { const f = items[i].getAsFile(); if (f) files.push(f); }
    }
    if (files.length) { e.preventDefault(); void addFiles(files); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) void addFiles(e.dataTransfer.files);
  };

  const copyNotes = () => {
    if (!notes.trim()) return;
    navigator.clipboard.writeText(notes).then(
      () => toast.success("Transcrição copiada!"),
      () => toast.error("Não foi possível copiar."),
    );
  };

  const downloadNotes = () => {
    if (!notes.trim()) return;
    const body = `# ${title}\n\n${notes}${summary ? `\n\n---\nResumo:\n${summary}` : ""}`;
    const url = URL.createObjectURL(new Blob([body], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(title || "reuniao").replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "reuniao"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Descarta debounce pendente e força um salvamento completo pela fila serializada.
  // Exporta a reunião como uma ata em PDF (resumo + itens de ação + notas + anexos).
  // Lazy-load: a lib de PDF só entra no bundle quando o usuário exporta.
  const handleExportPdf = async () => {
    if (!notes.trim() && !summary) { toast.message("Nada para exportar ainda."); return; }
    setExporting(true);
    try {
      const [{ pdf: renderPdf }, { MeetingDocument }, { parseActionItems }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/meeting-document"),
        import("@/lib/meeting-summary"),
      ]);
      const dateLabel = new Date(meeting.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
      const generatedAt = new Date().toLocaleString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
      const blob = await renderPdf(
        <MeetingDocument
          title={title || "Reunião"}
          dateLabel={dateLabel}
          generatedAt={generatedAt}
          notes={notes}
          summary={summary}
          actionItems={parseActionItems(summary)}
          images={images}
          participants={participants}
          tags={tags}
          decisions={decisions}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "reuniao").replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "reuniao"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("PDF gerado! 📄");
    } catch (e) {
      console.error("Erro ao gerar PDF da reunião:", e);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setExporting(false);
    }
  };

  // Descarta debounce pendente e força um salvamento completo pela fila serializada.
  const persist = async () => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
    pendingEditRef.current = false;
    return queueSave({ title: title.trim() || "Reunião", rawNotes: notes, images });
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await persist();
    setSaving(false);
    if (res?.success) { toast.success(res.message); router.refresh(); }
    else toast.error(res?.message ?? "Falha ao salvar.");
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

  // Polimento da transcrição: IA corrige pontuação/erros óbvios preservando os
  // [mm:ss]. Substitui as notas — com "Desfazer" no toast por segurança.
  const handlePolish = async () => {
    if (polishing || !notes.trim()) return;
    if (isRecordingThis) { toast.error("Pare a gravação antes de polir."); return; }
    setPolishing(true);
    try {
      await persist(); // o servidor precisa ter exatamente o texto atual
      const res = await polishMeetingTranscript(meeting.id);
      if (res.success && res.polished) {
        const previous = res.previous ?? notes;
        setNotes(res.polished);
        notesRef.current = res.polished;
        toast.success("Transcrição polida!", {
          duration: 8000,
          action: {
            label: "Desfazer",
            onClick: () => {
              setNotes(previous);
              notesRef.current = previous;
              void queueSave({ rawNotes: previous });
            },
          },
        });
        router.refresh();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Falha ao polir a transcrição.");
    } finally {
      setPolishing(false);
    }
  };

  const copySummary = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary).then(
      () => toast.success("Resumo copiado!"),
      () => toast.error("Não foi possível copiar."),
    );
  };

  // Itens de ação detectados no resumo (bullets) — vira o convite ao checklist.
  const actionCount = parseActionItems(summary).length;

  // Ctrl+S salva (o autosave já cobre, mas o dedo no Ctrl+S é instinto).
  const handleSaveRef = useRef(handleSave);
  useEffect(() => { handleSaveRef.current = handleSave; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleSaveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex flex-col max-h-[88vh]">
      {/* HEADER */}
      <div className="px-6 pt-6 pb-5 border-b border-border/40 bg-muted/10">
        <DialogHeader className="text-left">
          <DialogTitle className="sr-only">Editar reunião</DialogTitle>
          <DialogDescription className="sr-only">Notas, gravação com transcrição, resumo e tarefas.</DialogDescription>
        </DialogHeader>
        <Input
          value={title}
          onChange={(e) => { setTitle(e.target.value); scheduleSave(); }}
          placeholder="Título da reunião"
          className="text-xl font-bold border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 h-auto"
        />
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-xs text-muted-foreground">
            {new Date(meeting.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
          <span className="text-muted-foreground/40">·</span>
          {saveState === "saving" && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</span>
          )}
          {saveState === "saved" && (
            <span className="flex items-center gap-1 text-xs text-emerald-600">
              <Check className="h-3 w-3" /> Salvo{savedAt ? ` ${savedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : ""}
            </span>
          )}
          {saveState === "error" && (
            <button onClick={handleSave} className="flex items-center gap-1 text-xs text-rose-600 hover:underline">
              <CloudOff className="h-3 w-3" /> Erro ao salvar — tentar de novo
            </button>
          )}
          {saveState === "idle" && (
            <span className="text-xs text-muted-foreground/50">Salvamento automático</span>
          )}
        </div>
      </div>

      {/* BODY (rolável — aceita arrastar imagens) */}
      <div
        className="relative flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar"
        onDragOver={(e) => { e.preventDefault(); if (dragIndexRef.current === null) setDragOver(true); }}
        onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
        onDrop={handleDrop}
      >
        {dragOver && (
          <div className="pointer-events-none absolute inset-3 z-20 rounded-2xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-sm flex items-center justify-center">
            <p className="flex items-center gap-2 text-sm font-bold text-primary">
              <ImagePlus className="h-5 w-5" /> Solte as imagens para anexar
            </p>
          </div>
        )}

        {/* Gravação */}
        <div className={cn("rounded-xl border p-3 transition-colors", isRecordingThis ? "border-rose-500/40 bg-rose-500/[0.04]" : "border-border/40 bg-muted/20")}>
          <div className="flex flex-wrap items-center gap-2">
            {isRecordingThis ? (
              <>
                <Button onClick={rec.stopSession} size="sm" className="gap-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white">
                  <Square className="h-3.5 w-3.5 fill-current" /> Parar · {fmtTime(rec.elapsed)}
                </Button>
                {rec.isPaused ? (
                  <Button onClick={rec.resumeSession} size="sm" className="gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                    <Play className="h-3.5 w-3.5 fill-current" /> Retomar
                  </Button>
                ) : (
                  <Button onClick={rec.pauseSession} size="sm" variant="secondary" className="gap-2 rounded-lg">
                    <Pause className="h-3.5 w-3.5 fill-current" /> Pausar
                  </Button>
                )}
                <AudioMeter getLevel={rec.getLevel} active={isRecordingThis && !rec.isPaused} className="w-24" />
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {rec.transcribing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> transcrevendo trecho...</>
                    : rec.pending > 0 ? `${rec.pending} trecho(s) na fila`
                    : rec.isPaused ? "pausado" : "gravando e transcrevendo a cada ~45s"}
                </span>
              </>
            ) : (
              <Button
                onClick={() => {
                  // Vocabulário da reunião → prompt do Whisper: nomes de
                  // participantes, tags e título ajudam a transcrever CERTO
                  // exatamente as palavras que mais erram (nomes próprios/jargão).
                  const vocab = [...participants, ...tags, title.replace(/\d{1,2}[:/h]\d{2}/g, "").trim()]
                    .filter(Boolean)
                    .join(", ");
                  void rec.startSession(meeting.id, title, vocab);
                }}
                disabled={otherRecording}
                variant="outline"
                size="sm"
                className="gap-2 rounded-lg"
              >
                <Mic className="h-4 w-4 text-rose-500" /> Gravar reunião
              </Button>
            )}
            {!isRecordingThis && (
              <span className="text-[11px] text-muted-foreground">
                Sua voz + áudio do computador → vira texto nas notas
                <span className="hidden sm:inline"> · preencha os participantes antes: a transcrição acerta os nomes</span>
              </span>
            )}
          </div>

          {isRecordingThis && (
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <Info className="h-3.5 w-3.5 shrink-0 mt-px" />
              Trechos silenciosos são ignorados e cada bloco recebe o horário ([mm:ss]). Pode fechar o modal e navegar — a gravação continua aqui.
            </p>
          )}
          {otherRecording && (
            <p className="mt-2 text-[11px] text-amber-600">Há outra reunião sendo gravada no momento.</p>
          )}
        </div>

        {/* Participantes & Tags */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MeetingTokenField
            label="Participantes"
            icon={<Users className="h-3 w-3" />}
            values={participants}
            onChange={commitParticipants}
            placeholder="Nome e Enter…"
            hint="Quem esteve na reunião — digite e escolha das suas Conexões. A transcrição usa os nomes para acertar a grafia."
            suggestions={connectionNames}
          />
          <MeetingTokenField
            label="Tags"
            icon={<Tag className="h-3 w-3" />}
            values={tags}
            onChange={commitTags}
            placeholder="Etiqueta e Enter…"
            hint="Rótulos p/ achar e filtrar depois (ex.: Cliente X, Sprint 3, Financeiro)."
          />
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Notas (cole prints com Ctrl+V)</label>
            <div className="flex items-center gap-1">
              <Button
                onClick={handlePolish}
                disabled={polishing || !notes.trim() || isRecordingThis}
                variant="ghost"
                size="sm"
                title="A IA corrige pontuação e erros óbvios de transcrição, preservando os [mm:ss] — dá para desfazer"
                className="h-7 gap-1.5 px-2 text-[11px] text-primary hover:text-primary"
              >
                {polishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Polir
              </Button>
              <Button onClick={copyNotes} disabled={!notes.trim()} variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground">
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
              <Button onClick={downloadNotes} disabled={!notes.trim()} variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground">
                <Download className="h-3.5 w-3.5" /> .txt
              </Button>
            </div>
          </div>
          <Textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); scheduleSave(); }}
            onPaste={handlePaste}
            placeholder="Anote pontos, decisões, próximos passos... A transcrição da gravação aparece aqui."
            className="min-h-[240px] rounded-xl bg-muted/20 border-border/40 resize-y p-4 text-[15px] leading-7"
          />
          <p className="text-[10px] text-muted-foreground/70 text-right">{notes.length} caracteres</p>
        </div>

        {/* Decisões destacadas */}
        <MeetingTokenField
          label="Decisões"
          icon={<Gavel className="h-3 w-3" />}
          values={decisions}
          onChange={commitDecisions}
          placeholder="Registre uma decisão e Enter…"
          hint="O que ficou definido na call. Vira uma seção em destaque na ata em PDF."
          block
        />

        {/* Anexos (galeria) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
              Anexos {images.length > 0 && <span className="text-muted-foreground/60">· {images.length}/{MAX_IMAGES}</span>}
            </label>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={compressing || images.length >= MAX_IMAGES}
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 rounded-lg px-2.5 text-[11px]"
            >
              {compressing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              Anexar
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => { if (e.target.files) void addFiles(e.target.files); e.target.value = ""; }}
            />
          </div>
          <p className="text-[11px] leading-snug text-muted-foreground/60">
            Prints, fotos do quadro e evidências da call. Cole com Ctrl+V, arraste ou clique em Anexar.
          </p>

          {images.length > 0 ? (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {images.map((img, i) => (
                  <div
                    key={i}
                    className="group relative flex flex-col gap-1"
                    onDragOver={(e) => { if (dragIndexRef.current !== null) e.preventDefault(); }}
                    onDrop={(e) => {
                      if (dragIndexRef.current === null) return; // drop de arquivo do SO → body trata
                      e.preventDefault(); e.stopPropagation();
                      moveImage(dragIndexRef.current, i);
                      dragIndexRef.current = null;
                    }}
                  >
                    <div
                      draggable
                      onDragStart={(e) => { dragIndexRef.current = i; e.dataTransfer.effectAllowed = "move"; }}
                      onDragEnd={() => { dragIndexRef.current = null; }}
                      className="relative aspect-square overflow-hidden rounded-xl border border-border/40 bg-muted/20"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.src}
                        alt={img.caption || `anexo ${i + 1}`}
                        onClick={() => setLightbox(i)}
                        className="h-full w-full cursor-zoom-in object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                      <span className="absolute left-1 top-1 cursor-grab rounded-md bg-background/80 p-0.5 text-muted-foreground opacity-0 transition-opacity active:cursor-grabbing group-hover:opacity-100" title="Arraste para reordenar">
                        <GripVertical className="h-3.5 w-3.5" />
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                        className="absolute right-1 top-1 rounded-full border border-border bg-background/90 p-1 opacity-0 shadow transition-all group-hover:opacity-100 hover:bg-rose-500 hover:text-white"
                        aria-label="Remover anexo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Input
                      value={img.caption ?? ""}
                      onChange={(e) => setCaption(i, e.target.value)}
                      onBlur={saveCaption}
                      placeholder="Legenda..."
                      className="h-7 rounded-lg border-border/40 bg-muted/20 px-2 text-[11px]"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground/60">Arraste pela alça para reordenar · clique para ampliar</p>
            </>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-border/40 bg-muted/10 py-7 text-muted-foreground/70 transition-colors hover:border-primary/40 hover:text-primary"
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-xs font-medium">Cole (Ctrl+V), arraste ou clique para anexar prints</span>
            </button>
          )}
        </div>

        {/* Resumo IA */}
        {summary && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                <Sparkles className="h-3 w-3" /> Resumo da IA
                {actionCount > 0 && (
                  <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold normal-case tracking-normal tabular-nums">
                    {actionCount} item{actionCount === 1 ? "" : "s"} de ação
                  </span>
                )}
              </p>
              <Button onClick={copySummary} variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground">
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
            </div>
            <p className="text-[15px] whitespace-pre-wrap leading-7 text-foreground/90">{summary}</p>
            {actionCount > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground/70">
                💡 &quot;Gerar checklist&quot; transforma esses {actionCount} item{actionCount === 1 ? "" : "s"} em tarefas do projeto.
              </p>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-6 py-4 border-t border-border/40 bg-muted/5 flex flex-wrap items-center gap-2">
        <Button
          onClick={handleSummarize}
          disabled={summarizing || !notes.trim()}
          title={!notes.trim() ? "Escreva (ou grave) as notas primeiro" : summary ? "Gera o resumo de novo com as notas atuais" : undefined}
          className="gap-2 rounded-xl bg-primary shadow-lg shadow-primary/20"
        >
          {summarizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {summary ? "Resumir de novo" : "Resumir com IA"}
        </Button>
        <Button
          onClick={handleGenerateTasks}
          disabled={generating || !summary || actionCount === 0}
          title={!summary ? "Gere o resumo primeiro" : actionCount === 0 ? "O resumo não tem itens de ação (bullets)" : `Cria ${actionCount} tarefa(s) no projeto`}
          variant="secondary"
          className="gap-2 rounded-xl"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />}
          Gerar checklist{actionCount > 0 ? ` (${actionCount})` : ""}
        </Button>
        <Button onClick={handleSave} disabled={saving} title="Atalho: Ctrl+S" variant="outline" className="gap-2 rounded-xl">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar
        </Button>
        <Button onClick={handleExportPdf} disabled={exporting} variant="outline" className="gap-2 rounded-xl">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          PDF
        </Button>
        <Button onClick={handleDelete} variant="ghost" size="icon" className="ml-auto rounded-xl text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* LIGHTBOX (overlay único, fora do .map) */}
      {lightbox !== null && images[lightbox] && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? null : (i - 1 + images.length) % images.length)); }}
                className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="Anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? null : (i + 1) % images.length)); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                aria-label="Próxima"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[lightbox].src}
            alt={images[lightbox].caption || `anexo ${lightbox + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[82vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
          />
          <div
            className="absolute bottom-4 left-1/2 flex w-[min(92vw,32rem)] -translate-x-1/2 items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              value={images[lightbox].caption ?? ""}
              onChange={(e) => setCaption(lightbox, e.target.value)}
              onBlur={saveCaption}
              placeholder="Adicionar legenda..."
              className="h-9 flex-1 rounded-lg border-white/20 bg-white/10 px-3 text-sm text-white placeholder:text-white/50 focus-visible:ring-white/40"
            />
            {images.length > 1 && (
              <span className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
                {lightbox + 1} / {images.length}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
