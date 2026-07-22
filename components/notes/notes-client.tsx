"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, Star, Pencil, Trash2, Loader2, NotebookPen, GraduationCap,
  Inbox, Zap, Settings2, Library, Briefcase, LayoutTemplate, ChevronDown,
  Columns3, Baby, BookOpen, Network, ListChecks,
} from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NOTE_TEMPLATES } from "@/components/notes/note-templates";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NotebookDialog } from "@/components/notes/notebook-dialog";
import { cn } from "@/lib/utils";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getNotes, deleteNote, toggleNoteFavorite, quickCaptureNote, createBlankNote,
  type NoteData, type NoteProject,
} from "@/app/(dashboard)/notes/actions";
import { getNotebooks, moveNoteToNotebook, reorderNotebooks, type NotebookData } from "@/app/(dashboard)/notes/notebook-actions";
import { useMentionMenu, type Mentionables } from "@/components/notes/use-mention-menu";

function parseTags(tags: string | null): string[] {
  return tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

// Ícone de cada modelo de nota (resolvido pelo nome guardado no template).
const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  Columns3, Baby, BookOpen, Network, ListChecks,
};

// Filtro ativo: todas, favoritas ou um caderno específico (id).
type ActiveFilter = "all" | "favorites" | string;

export function NotesClient({
  initialNotes,
  initialNotebooks,
  projects,
  initialSubjectId = "all",
}: {
  initialNotes: NoteData[];
  initialNotebooks: NotebookData[];
  projects: NoteProject[];
  /** Pré-seleciona o filtro de Matéria (deep-link /notes?subject=ID vindo de Estudos). */
  initialSubjectId?: string;
}) {
  const router = useRouter();
  const [notes, setNotes] = useState<NoteData[]>(initialNotes);
  const [notebooks, setNotebooks] = useState<NotebookData[]>(initialNotebooks);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<ActiveFilter>("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState(initialSubjectId);
  const [deleting, setDeleting] = useState<NoteData | null>(null);
  const [notebookEdit, setNotebookEdit] = useState<NotebookData | "new" | null>(null);
  const [dragNoteId, setDragNoteId] = useState<string | null>(null);
  const [dragNotebookId, setDragNotebookId] = useState<string | null>(null);
  const [dragOverNb, setDragOverNb] = useState<string | null>(null);
  const [creating, startCreate] = useTransition();
  const [, startTransition] = useTransition();

  const inboxId = useMemo(() => notebooks.find((n) => n.isInbox)?.id ?? null, [notebooks]);

  // Matérias presentes nas notas (para o filtro "por matéria" — ponte com Estudos).
  const subjectOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of notes) {
      if (n.subjectId && n.subjectTitle) map.set(n.subjectId, n.subjectTitle);
    }
    return Array.from(map, ([id, title]) => ({ id, title })).sort((a, b) => a.title.localeCompare(b.title));
  }, [notes]);

  // Itens para o menu "@" da captura rápida (notas existentes + projetos).
  const mentionables = useMemo<Mentionables>(() => ({
    notes: notes.map((n) => ({ id: n.id, title: n.title })),
    projects: projects.map((p) => ({ id: p.id, title: p.title, slug: p.slug })),
  }), [notes, projects]);

  const refreshAll = async () => {
    const [n, nb] = await Promise.all([getNotes(), getNotebooks()]);
    setNotes(n);
    setNotebooks(nb);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (active === "favorites") {
        if (!n.isFavorite) return false;
      } else if (active !== "all") {
        const belongs = n.notebookId === active || (n.notebookId === null && active === inboxId);
        if (!belongs) return false;
      }
      if (projectFilter !== "all" && n.projectId !== projectFilter) return false;
      if (subjectFilter !== "all" && n.subjectId !== subjectFilter) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags?.toLowerCase().includes(q) ?? false) ||
        (n.subjectTitle?.toLowerCase().includes(q) ?? false) ||
        (n.notebookName?.toLowerCase().includes(q) ?? false) ||
        (n.projectTitle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [notes, search, active, projectFilter, subjectFilter, inboxId]);

  const open = (id: string) => router.push(`/notes/${id}`);

  // Caderno padrão para novas notas/capturas: o filtro ativo, se for um caderno real.
  const defaultNotebookId = active !== "all" && active !== "favorites" ? active : (inboxId ?? "inbox");

  const handleNew = (template?: { title: string; content: string }) => {
    startCreate(async () => {
      const res = await createBlankNote({
        notebookId: defaultNotebookId,
        projectId: projectFilter !== "all" ? projectFilter : undefined,
        subjectId: subjectFilter !== "all" ? subjectFilter : undefined,
        title: template?.title,
        content: template?.content,
      });
      if (res.success && res.id) {
        router.push(`/notes/${res.id}`);
      } else {
        toast.error(res.message);
      }
    });
  };

  const handleToggleFav = (note: NoteData) => {
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, isFavorite: !n.isFavorite } : n)));
    startTransition(async () => {
      const res = await toggleNoteFavorite(note.id, note.isFavorite);
      if (!res.success) {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, isFavorite: note.isFavorite } : n)));
        toast.error("Falha ao favoritar.");
      }
    });
  };

  // Drop num chip de caderno: move a nota arrastada OU reordena o caderno arrastado.
  const handleDropOnNotebook = (targetId: string) => {
    if (dragNoteId) {
      const id = dragNoteId;
      setDragNoteId(null);
      setDragOverNb(null);
      const note = notes.find((n) => n.id === id);
      if (note && note.notebookId === targetId) return; // já está nesse caderno
      startTransition(async () => {
        const res = await moveNoteToNotebook(id, targetId);
        if (res.success) { await refreshAll(); toast.success(res.message); }
        else toast.error(res.message);
      });
      return;
    }

    if (dragNotebookId) {
      const sourceId = dragNotebookId;
      setDragNotebookId(null);
      setDragOverNb(null);
      if (sourceId === targetId) return;
      const order = notebooks.filter((n) => !n.isInbox).map((n) => n.id);
      const from = order.indexOf(sourceId);
      const to = order.indexOf(targetId);
      if (from === -1 || to === -1) return;
      order.splice(from, 1);
      order.splice(to, 0, sourceId);
      // Atualização otimista (Entrada sempre primeiro).
      const byId = new Map(notebooks.map((n) => [n.id, n]));
      const inbox = notebooks.filter((n) => n.isInbox);
      setNotebooks([...inbox, ...order.map((id) => byId.get(id)!)]);
      startTransition(async () => {
        const res = await reorderNotebooks(order);
        if (!res.success) { await refreshAll(); toast.error("Falha ao reordenar."); }
      });
    }
  };

  const handleDelete = () => {
    if (!deleting) return;
    const id = deleting.id;
    startTransition(async () => {
      const res = await deleteNote(id);
      if (res.success) {
        await refreshAll();
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
      setDeleting(null);
    });
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, conteúdo, caderno, projeto…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {subjectOptions.length > 0 && (
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="h-9 w-[160px] gap-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Matéria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as matérias</SelectItem>
                {subjectOptions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-9 w-[160px] gap-1.5">
              <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os projetos</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Botão combinado: "Nova nota" (em branco) + seta com MODELOS de estudo. */}
          <div className="flex">
            <Button className="gap-2 rounded-r-none" onClick={() => handleNew()} disabled={creating}>
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Nova nota
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="rounded-l-none border-l border-primary-foreground/20 px-2" disabled={creating} aria-label="Escolher um modelo de nota">
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="flex items-center gap-1.5 text-xs">
                  <LayoutTemplate className="h-3.5 w-3.5" /> Começar de um modelo
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {NOTE_TEMPLATES.map((tpl) => {
                  const Icon = TEMPLATE_ICONS[tpl.icon] ?? NotebookPen;
                  return (
                    <DropdownMenuItem
                      key={tpl.id}
                      onClick={() => handleNew({ title: tpl.title, content: tpl.content })}
                      className="flex items-start gap-2.5 py-2"
                    >
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{tpl.label}</span>
                        <span className="block text-[11px] leading-tight text-muted-foreground">{tpl.description}</span>
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Cadernos (chips com rolagem horizontal) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <FilterChip active={active === "all"} onClick={() => setActive("all")}>
          <Library className="h-3.5 w-3.5" /> Todas
          <span className="opacity-60">{notes.length}</span>
        </FilterChip>
        <FilterChip active={active === "favorites"} onClick={() => setActive("favorites")}>
          <Star className={cn("h-3.5 w-3.5", active === "favorites" && "fill-current")} /> Favoritas
        </FilterChip>

        <span className="mx-0.5 h-5 w-px shrink-0 bg-border" />

        {notebooks.map((nb) => (
          <FilterChip
            key={nb.id}
            active={active === nb.id}
            onClick={() => setActive(nb.id)}
            onEdit={() => setNotebookEdit(nb)}
            draggable={!nb.isInbox}
            onDragStartChip={() => setDragNotebookId(nb.id)}
            onDragEndChip={() => { setDragNotebookId(null); setDragOverNb(null); }}
            droppable={!!dragNoteId || (!!dragNotebookId && !nb.isInbox)}
            dropActive={dragOverNb === nb.id && dragNotebookId !== nb.id}
            onDragOverHere={() => setDragOverNb(nb.id)}
            onDragLeaveHere={() => setDragOverNb((cur) => (cur === nb.id ? null : cur))}
            onDropHere={() => handleDropOnNotebook(nb.id)}
          >
            {nb.isInbox ? <Inbox className="h-3.5 w-3.5" /> : (
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: nb.color ?? "#6366f1" }} />
            )}
            {nb.name}
            <span className="opacity-60">{nb.noteCount}</span>
          </FilterChip>
        ))}

        <button
          type="button"
          onClick={() => setNotebookEdit("new")}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" /> Caderno
        </button>
      </div>

      {/* Captura rápida */}
      <QuickCapture notebookId={defaultNotebookId} onCaptured={refreshAll} mentionables={mentionables} />

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <NotebookPen className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {notes.length === 0 ? "Nenhuma nota ainda. Capture a primeira acima!" : "Nada encontrado para esse filtro."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => {
            const tags = parseTags(note.tags);
            return (
              <div
                key={note.id}
                draggable
                onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragNoteId(note.id); }}
                onDragEnd={() => { setDragNoteId(null); setDragOverNb(null); }}
                className={cn(
                  "group flex cursor-pointer flex-col rounded-xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md",
                  dragNoteId === note.id && "opacity-50",
                )}
                onClick={() => open(note.id)}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="min-w-0 break-all line-clamp-1 font-semibold text-foreground" title={note.title}>{note.title}</h3>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleToggleFav(note); }}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-amber-500"
                    title={note.isFavorite ? "Desfavoritar" : "Favoritar"}
                  >
                    <Star className={cn("h-4 w-4", note.isFavorite && "fill-amber-400 text-amber-400")} />
                  </button>
                </div>

                <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">
                  {note.content || "Sem conteúdo."}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {note.notebookName && (
                    <Badge
                      variant="secondary"
                      className="gap-1 border-none text-[10px]"
                      style={{ backgroundColor: `${note.notebookColor ?? "#6366f1"}1a`, color: note.notebookColor ?? "#6366f1" }}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: note.notebookColor ?? "#6366f1" }} />
                      {note.notebookName}
                    </Badge>
                  )}
                  {note.projectTitle && (
                    <Badge
                      variant="secondary"
                      className="gap-1 border-none text-[10px]"
                      style={{ backgroundColor: `${note.projectColor ?? "#6366f1"}1a`, color: note.projectColor ?? "#6366f1" }}
                    >
                      <Briefcase className="h-3 w-3" /> {note.projectTitle}
                    </Badge>
                  )}
                  {note.subjectTitle && (
                    <Badge
                      variant="secondary"
                      className="gap-1 border-none text-[10px]"
                      style={{ backgroundColor: `${note.subjectColor ?? "#6366f1"}1a`, color: note.subjectColor ?? "#6366f1" }}
                    >
                      <GraduationCap className="h-3 w-3" /> {note.subjectTitle}
                    </Badge>
                  )}
                  {tags.slice(0, 2).map((t) => (
                    <Badge key={t} variant="outline" className="border-border/60 text-[10px] text-muted-foreground">
                      {t}
                    </Badge>
                  ))}
                </div>

                {/* Ações no hover */}
                <div className="mt-3 flex justify-end gap-1 border-t border-border/40 pt-2 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); open(note.id); }} title="Editar" aria-label="Editar nota">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleting(note); }}
                    title="Mover para a lixeira"
                    aria-label="Mover nota para a lixeira"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Criar/editar caderno */}
      <NotebookDialog
        key={notebookEdit === "new" ? "new-nb" : notebookEdit?.id ?? "closed-nb"}
        state={notebookEdit}
        onClose={() => setNotebookEdit(null)}
        onSaved={async () => {
          await refreshAll();
          setNotebookEdit(null);
        }}
      />

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover para a lixeira?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleting?.title}&quot; vai para a lixeira. Você pode restaurar depois em /trash.
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
    </div>
  );
}

/** Chip de filtro reutilizável (editar caderno + arrastar p/ reordenar + alvo de drop). */
function FilterChip({
  active, onClick, onEdit, children,
  draggable, onDragStartChip, onDragEndChip,
  droppable, dropActive, onDropHere, onDragOverHere, onDragLeaveHere,
}: {
  active: boolean;
  onClick: () => void;
  onEdit?: () => void;
  children: React.ReactNode;
  draggable?: boolean;
  onDragStartChip?: () => void;
  onDragEndChip?: () => void;
  droppable?: boolean;
  dropActive?: boolean;
  onDropHere?: () => void;
  onDragOverHere?: () => void;
  onDragLeaveHere?: () => void;
}) {
  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? (e) => { e.dataTransfer.effectAllowed = "move"; onDragStartChip?.(); } : undefined}
      onDragEnd={draggable ? () => onDragEndChip?.() : undefined}
      onDragOver={droppable ? (e) => { e.preventDefault(); onDragOverHere?.(); } : undefined}
      onDragLeave={droppable ? () => onDragLeaveHere?.() : undefined}
      onDrop={droppable ? (e) => { e.preventDefault(); onDropHere?.(); } : undefined}
      className={cn(
        "group/chip inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active ? "border-transparent bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground hover:bg-muted/50",
        draggable && "cursor-grab active:cursor-grabbing",
        dropActive && "ring-2 ring-primary ring-offset-1 ring-offset-background",
      )}
    >
      <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5">
        {children}
      </button>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          title="Editar caderno"
          className={cn(
            "ml-0.5 inline-flex items-center transition-opacity",
            active ? "opacity-80 hover:opacity-100" : "opacity-0 group-hover/chip:opacity-100",
          )}
        >
          <Settings2 className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/** Caixa de captura rápida: vira nota na hora, no caderno ativo (ou Entrada). */
function QuickCapture({
  notebookId, onCaptured, mentionables,
}: {
  notebookId: string;
  onCaptured: () => Promise<void>;
  mentionables: Mentionables;
}) {
  const [text, setText] = useState("");
  const [pending, run] = useTransition();
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Menu "@" para linkar notas/projetos já na captura (estilo Notion).
  const mention = useMentionMenu({
    textareaRef: taRef,
    mentionables,
    onPick: (md, from, to) => {
      const ta = taRef.current;
      if (!ta) return;
      const next = ta.value.slice(0, from) + md + ta.value.slice(to);
      setText(next);
      requestAnimationFrame(() => {
        const caret = from + md.length;
        ta.focus();
        ta.setSelectionRange(caret, caret);
      });
    },
  });

  const capture = () => {
    if (!text.trim()) return;
    const payload = text;
    run(async () => {
      const res = await quickCaptureNote(payload, notebookId);
      if (res.success) {
        setText("");
        toast.success(res.message);
        await onCaptured();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <div className="rounded-xl border border-border/40 bg-card p-3 shadow-sm">
      <div className="flex items-start gap-2">
        <Zap className="mt-2 h-4 w-4 shrink-0 text-primary" />
        <div className="relative w-full">
          <textarea
            ref={taRef}
            suppressHydrationWarning
            value={text}
            onChange={(e) => { setText(e.target.value); mention.detect(); }}
            onSelect={mention.detect}
            onKeyDown={(e) => {
              if (mention.onKeyDown(e)) return;
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); capture(); }
            }}
            onBlur={() => setTimeout(mention.close, 150)}
            placeholder="Captura rápida… escreva uma ideia, use @ para linkar e ⌘/Ctrl+Enter"
            className="min-h-[40px] w-full resize-y bg-transparent py-1.5 text-sm leading-relaxed placeholder:text-muted-foreground focus-visible:outline-none"
            rows={1}
          />
          {mention.menu}
        </div>
        <Button size="sm" onClick={capture} disabled={pending || !text.trim()} className="shrink-0 gap-1.5">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Capturar
        </Button>
      </div>
    </div>
  );
}
