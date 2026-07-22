"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, Star, History, Save, Loader2, Trash2, Check, Briefcase,
  FileDown, FileText, MoreVertical, Search, ExternalLink, Link2, Sparkles, Atom, Layers, BrainCircuit, ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { NoteEditor } from "@/components/notes/note-editor";
import { NoteHistoryDialog } from "@/components/notes/note-history-dialog";
import { EntityConnections } from "@/components/connect/entity-connections";
import { updateNote, deleteNote, uploadNoteImage, inlineNoteImages, generateNoteFlashcards, generateNoteQuestions, type NoteData, type NoteSubject, type NoteProject } from "@/app/(dashboard)/notes/actions";
import { assessAtomicity, isAtomicityExempt } from "@/lib/note-atomicity";
import type { NotebookData } from "@/app/(dashboard)/notes/notebook-actions";

const AUTOSAVE_DELAY = 1500; // ms de ociosidade antes de salvar sozinho.

export function NoteFullEditor({
  note,
  notebooks,
  subjects,
  projects,
  mentionNotes,
  mentionTasks,
  backlinks,
  related = [],
  relatedDecks = [],
}: {
  note: NoteData;
  notebooks: NotebookData[];
  subjects: NoteSubject[];
  projects: NoteProject[];
  /** Outras notas (id+título) para o menu de menção "@". */
  mentionNotes: { id: string; title: string }[];
  /** Tarefas pendentes (id+título+slug do projeto) para a menção "@". */
  mentionTasks: { id: string; title: string; projectSlug: string }[];
  /** Notas que mencionam/linkam esta (backlinks). */
  backlinks: { id: string; title: string }[];
  /** Serendipidade (#14): notas antigas que se conectam ao tema desta. */
  related?: { id: string; title: string; reason: string }[];
  /** Baralhos da matéria desta nota (ponte ler → revisar). */
  relatedDecks?: { id: string; title: string; total: number; due: number }[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [notebookId, setNotebookId] = useState(note.notebookId ?? "inbox");
  const [subjectId, setSubjectId] = useState(note.subjectId ?? "none");
  const [projectId, setProjectId] = useState(note.projectId ?? "none");
  const [tags, setTags] = useState(note.tags ?? "");
  const [isFavorite, setIsFavorite] = useState(note.isFavorite);
  const [showHistory, setShowHistory] = useState(false);
  const [pending, run] = useTransition();

  // "dirty" é derivado: compara o estado atual com o último snapshot salvo.
  // Isso evita a corrida clássica de autosave (salvar por cima de edição nova).
  const snapshot = useMemo(
    () => JSON.stringify({ title, content, notebookId, subjectId, projectId, tags, isFavorite }),
    [title, content, notebookId, subjectId, projectId, tags, isFavorite],
  );
  const [savedSnapshot, setSavedSnapshot] = useState(snapshot);
  const dirty = snapshot !== savedSnapshot;

  // Projeto atualmente vinculado (para o atalho "Abrir projeto").
  const linkedProject = projectId !== "none" ? projects.find((p) => p.id === projectId) : undefined;

  const save = useCallback((opts?: { silent?: boolean }) => {
    if (!title.trim()) {
      if (!opts?.silent) toast.error("O título é obrigatório.");
      return;
    }
    const snap = snapshot;
    const fd = new FormData();
    fd.set("id", note.id);
    fd.set("title", title);
    fd.set("content", content);
    fd.set("notebookId", notebookId);
    fd.set("subjectId", subjectId);
    fd.set("projectId", projectId);
    fd.set("tags", tags);
    fd.set("isFavorite", String(isFavorite));
    run(async () => {
      const res = await updateNote(fd);
      if (res.success) {
        setSavedSnapshot(snap); // marca exatamente o que foi salvo
        if (!opts?.silent) toast.success("Nota salva.");
      } else if (!opts?.silent) {
        toast.error(res.message);
      }
    });
  }, [note.id, title, content, notebookId, subjectId, projectId, tags, isFavorite, snapshot]);

  // Autosave: salva sozinho após AUTOSAVE_DELAY parado, quando há mudanças.
  useEffect(() => {
    if (!dirty || pending || !title.trim()) return;
    const t = setTimeout(() => save({ silent: true }), AUTOSAVE_DELAY);
    return () => clearTimeout(t);
  }, [dirty, pending, title, save]);

  // Ctrl/Cmd+S salva na hora (com toast).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save]);

  const handleDelete = () => {
    run(async () => {
      const res = await deleteNote(note.id);
      if (res.success) {
        toast.success(res.message);
        router.push("/notes");
      } else {
        toast.error(res.message);
      }
    });
  };

  const [exporting, setExporting] = useState(false);
  const exportMarkdown = async () => {
    setExporting(true);
    try {
      // Reincorpora as imagens como base64 para o .md funcionar fora do app.
      const inlined = await inlineNoteImages(content);
      const body = `# ${title}\n\n${inlined}`;
      const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = title.trim().replace(/[^\p{L}\p{N}\- ]/gu, "").slice(0, 60) || "nota";
      a.href = url;
      a.download = `${safe}.md`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  const [exportingPdf, setExportingPdf] = useState(false);
  const exportPdf = async () => {
    setExportingPdf(true);
    try {
      const inlined = await inlineNoteImages(content);
      const generatedAt = new Date().toLocaleString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
      });
      // Lazy-load: a lib de PDF só entra no bundle ao exportar.
      const [{ pdf: renderPdf }, { NoteDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/pdf/note-document"),
      ]);
      const blob = await renderPdf(
        <NoteDocument
          title={title}
          generatedAt={generatedAt}
          content={inlined}
          notebook={notebooks.find((n) => n.id === notebookId)?.name ?? null}
          project={projects.find((p) => p.id === projectId)?.title ?? null}
          tags={tags.split(",").map((t) => t.trim()).filter(Boolean)}
        />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const safe = title.trim().replace(/[^\p{L}\p{N}\- ]/gu, "").slice(0, 60) || "nota";
      a.href = url;
      a.download = `${safe}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      toast.success("PDF gerado.");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Não foi possível gerar o PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  // Gera flashcards desta nota com a IA. Salva antes se houver edição pendente,
  // para os cards refletirem o texto que está na tela (a action lê do banco).
  // A IA lê a nota do BANCO, não da tela: sem este flush, gerar cards/questões
  // logo depois de digitar usaria a versão antiga do texto.
  const flushPendingEdits = async () => {
    if (!dirty || !title.trim()) return;
    const snap = snapshot;
    const fd = new FormData();
    fd.set("id", note.id);
    fd.set("title", title);
    fd.set("content", content);
    fd.set("notebookId", notebookId);
    fd.set("subjectId", subjectId);
    fd.set("projectId", projectId);
    fd.set("tags", tags);
    fd.set("isFavorite", String(isFavorite));
    const saved = await updateNote(fd);
    if (saved.success) setSavedSnapshot(snap);
  };

  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const generateQuestionsFromNote = async () => {
    setGeneratingQuestions(true);
    try {
      await flushPendingEdits();
      const res = await generateNoteQuestions(note.id);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message, {
        action: { label: "Ver no banco", onClick: () => router.push("/studies/questoes") },
        duration: 8000,
      });
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const [generatingCards, setGeneratingCards] = useState(false);
  const generateCards = async () => {
    setGeneratingCards(true);
    try {
      await flushPendingEdits();
      const res = await generateNoteFlashcards(note.id);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      toast.success(res.message, res.deckId ? {
        action: { label: "Estudar agora", onClick: () => router.push(`/flashcards/${res.deckId}/study`) },
        duration: 8000,
      } : undefined);
    } finally {
      setGeneratingCards(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header fixo */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-8">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <Link
            href="/notes"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50 transition-all hover:bg-primary/10 hover:text-primary"
            title="Voltar para Notas"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>

          {/* Contexto estático: o título editável grande vive no corpo (estilo Notion). */}
          <span
            className="flex-1 truncate px-1 text-sm font-semibold text-muted-foreground"
            title={title || "Sem título"}
          >
            {title || "Sem título"}
          </span>

          {/* Indicador de status do autosave */}
          <span className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
            {pending ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…</>
            ) : dirty ? (
              <span className="text-amber-600">Não salvo</span>
            ) : (
              <><Check className="h-3.5 w-3.5 text-emerald-500" /> Salvo</>
            )}
          </span>

          <button
            type="button"
            onClick={() => setIsFavorite((v) => !v)}
            className="shrink-0 text-muted-foreground transition-colors hover:text-amber-500"
            title={isFavorite ? "Desfavoritar" : "Favoritar"}
          >
            <Star className={cn("h-5 w-5", isFavorite && "fill-amber-400 text-amber-400")} />
          </button>

          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            title="Buscar / navegar (⌘K)"
          >
            <Search className="h-4 w-4" /> <span className="hidden lg:inline">Ir para</span>
          </Button>

          <Button variant="ghost" size="sm" className="shrink-0 gap-1.5" onClick={() => setShowHistory(true)}>
            <History className="h-4 w-4" /> <span className="hidden md:inline">Histórico</span>
          </Button>

          <Button onClick={() => save()} disabled={pending || !dirty} size="sm" className="shrink-0 gap-1.5">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">Salvar</span>
          </Button>

          {/* Menu: exportar / excluir */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Mais ações" className="h-9 w-9 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); void generateCards(); }}
                disabled={generatingCards}
                className="gap-2"
              >
                {generatingCards ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />} Gerar flashcards (IA)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); void generateQuestionsFromNote(); }}
                disabled={generatingQuestions}
                className="gap-2"
              >
                {generatingQuestions ? <Loader2 className="h-4 w-4 animate-spin" /> : <ListChecks className="h-4 w-4" />} Gerar questões (IA)
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => router.push(`/ai?q=${encodeURIComponent(`Leia minha nota "${title}" e resuma os pontos-chave; depois me faça 3 perguntas de revisão sobre ela.`)}`)}
                className="gap-2"
              >
                <BrainCircuit className="h-4 w-4" /> Perguntar à IA
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); void exportMarkdown(); }}
                disabled={exporting}
                className="gap-2"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Baixar Markdown
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => { e.preventDefault(); void exportPdf(); }}
                disabled={exportingPdf}
                className="gap-2"
              >
                {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />} Baixar PDF
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 text-destructive focus:text-destructive">
                    <Trash2 className="h-4 w-4" /> Mover para a lixeira
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Mover para a lixeira?</AlertDialogTitle>
                    <AlertDialogDescription>
                      &quot;{title}&quot; vai para a lixeira. Você pode restaurar depois em /trash.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Mover para a lixeira
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-4 py-6 md:px-8">
        {/* Título grande do documento (editável, estilo Notion/Obsidian). */}
        <input
          suppressHydrationWarning
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sem título"
          aria-label="Título da nota"
          className="w-full border-none bg-transparent px-1 text-3xl font-bold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted-foreground/40 sm:text-4xl"
        />

        {/* Editor */}
        <NoteEditor
          value={content}
          onChange={setContent}
          onUploadImage={async (dataUrl) => {
            const res = await uploadNoteImage(dataUrl, note.id);
            return res.success && res.url ? res.url : null;
          }}
          mentionables={{
            notes: mentionNotes,
            projects: projects.map((p) => ({ id: p.id, title: p.title, slug: p.slug })),
            tasks: mentionTasks,
          }}
        />

        {/* Metadados */}
        <div className="grid grid-cols-1 gap-3 rounded-xl border border-border/40 bg-card p-4 shadow-sm sm:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Caderno</label>
            <Select value={notebookId} onValueChange={setNotebookId}>
              <SelectTrigger><SelectValue placeholder="Entrada" /></SelectTrigger>
              <SelectContent>
                {notebooks.map((nb) => (
                  <SelectItem key={nb.id} value={nb.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: nb.color ?? "#6366f1" }} />
                      {nb.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Briefcase className="h-3 w-3" /> Projeto
              </label>
              {linkedProject && (
                <Link
                  href={`/projects/${linkedProject.slug}`}
                  className="inline-flex items-center gap-1 text-[10px] font-medium text-primary hover:underline"
                  title={`Abrir ${linkedProject.title}`}
                >
                  Abrir <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color ?? "#6366f1" }} />
                      {p.title}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Matéria</label>
              {subjectId !== "none" && (
                <Link
                  href={`/studies?subject=${subjectId}`}
                  className="inline-flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-primary hover:underline"
                  title="Abrir esta matéria no módulo Estudos"
                >
                  Abrir em Estudos <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Nenhuma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-3">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tags rápidas (vírgula)</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ex: revisão, ideia" />
          </div>
        </div>

        {/* Notas Atômicas (#9): nudge Zettelkasten — 1 ideia por nota, título descritivo. */}
        <AtomicityHint title={title} content={content} />

        {/* Tecido conectivo (card recolhível) */}
        <EntityConnections entityType="note" entityId={note.id} />

        {/* Backlinks: outras notas que mencionam esta */}
        {backlinks.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border/40 bg-card p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Link2 className="h-3.5 w-3.5" /> Mencionada em ({backlinks.length})
            </p>
            <div className="flex flex-col">
              {backlinks.map((b) => (
                <Link
                  key={b.id}
                  href={`/notes/${b.id}`}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/40"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{b.title}</span>
                  <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-opacity opacity-0 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Ponte ler → revisar: baralhos da matéria desta nota, com vencidos. */}
        {relatedDecks.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border/40 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <Layers className="h-3.5 w-3.5 text-primary" /> Flashcards da matéria
              </p>
              {subjectId !== "none" && (
                <Link href={`/flashcards/review?subject=${subjectId}`} className="shrink-0 text-[11px] font-semibold text-primary hover:underline">
                  Revisar tudo
                </Link>
              )}
            </div>
            <div className="flex flex-col">
              {relatedDecks.map((d) => (
                <Link
                  key={d.id}
                  href={d.due > 0 ? `/flashcards/${d.id}/study?mode=smart` : `/flashcards/${d.id}/edit`}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/40"
                >
                  <Layers className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{d.title}</span>
                  <span className="ml-auto shrink-0">
                    {d.due > 0 ? (
                      <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">{d.due} a revisar</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground/60">{d.total} {d.total === 1 ? "cartão" : "cartões"}</span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Serendipidade Ativa (#14): redescoberta — notas antigas do mesmo tema
            que NÃO estão linkadas (as linkadas aparecem nos backlinks acima). */}
        {related.length > 0 && (
          <div className="space-y-2 rounded-xl border border-border/40 bg-card p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Conexões esquecidas ({related.length})
            </p>
            <div className="flex flex-col">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/notes/${r.id}`}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-foreground transition-colors hover:bg-muted/40"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{r.title}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">{r.reason}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-opacity opacity-0 group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <NoteHistoryDialog
        noteId={note.id}
        currentContent={content}
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onRestored={({ title: t, content: c }) => {
          // A restauração já persistiu no banco: alinha o estado e o snapshot salvo.
          setTitle(t);
          setContent(c);
          setSavedSnapshot(JSON.stringify({ title: t, content: c, notebookId, subjectId, projectId, tags, isFavorite }));
          router.refresh();
        }}
      />
    </div>
  );
}

// Nudge de atomicidade (#9): avaliação heurística local (sem servidor) do
// princípio "1 ideia por nota". Some quando está tudo bem ou a nota é isenta
// (Diário e Mapas de Conteúdo são longos por design).
function AtomicityHint({ title, content }: { title: string; content: string }) {
  const report = useMemo(() => assessAtomicity(title, content), [title, content]);
  if (isAtomicityExempt(title) || report.hints.length === 0) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border p-3",
        report.level === "dense"
          ? "border-amber-500/30 bg-amber-500/5"
          : "border-border/40 bg-muted/20",
      )}
    >
      <Atom className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", report.level === "dense" ? "text-amber-500" : "text-muted-foreground")} />
      <div className="space-y-0.5">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Nota atômica · 1 ideia por nota
        </p>
        {report.hints.map((h) => (
          <p key={h} className="text-[11px] leading-relaxed text-muted-foreground">{h}</p>
        ))}
      </div>
    </div>
  );
}
