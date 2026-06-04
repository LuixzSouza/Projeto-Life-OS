"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Plus, Search, Star, Pencil, Trash2, BookOpen, Loader2, NotebookPen, GraduationCap,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EntityTags } from "@/components/connect/entity-tags";
import { EntityAttachments } from "@/components/connect/entity-attachments";
import { EntityLinks } from "@/components/connect/entity-links";
import {
  getNotes, createNote, updateNote, deleteNote, toggleNoteFavorite,
  type NoteData, type NoteSubject,
} from "@/app/(dashboard)/notes/actions";

function parseTags(tags: string | null): string[] {
  return tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
}

export function NotesClient({ initialNotes, subjects }: { initialNotes: NoteData[]; subjects: NoteSubject[] }) {
  const [notes, setNotes] = useState<NoteData[]>(initialNotes);
  const [search, setSearch] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [editing, setEditing] = useState<NoteData | "new" | null>(null);
  const [deleting, setDeleting] = useState<NoteData | null>(null);
  const [, startTransition] = useTransition();

  const refresh = async () => setNotes(await getNotes());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return notes.filter((n) => {
      if (favOnly && !n.isFavorite) return false;
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        (n.tags?.toLowerCase().includes(q) ?? false) ||
        (n.subjectTitle?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [notes, search, favOnly]);

  const handleToggleFav = (note: NoteData) => {
    // Atualização otimista
    setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, isFavorite: !n.isFavorite } : n)));
    startTransition(async () => {
      const res = await toggleNoteFavorite(note.id, note.isFavorite);
      if (!res.success) {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? { ...n, isFavorite: note.isFavorite } : n)));
        toast.error("Falha ao favoritar.");
      }
    });
  };

  const handleDelete = () => {
    if (!deleting) return;
    const id = deleting.id;
    startTransition(async () => {
      const res = await deleteNote(id);
      if (res.success) {
        await refresh();
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
      setDeleting(null);
    });
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, conteúdo, matéria…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={favOnly ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => setFavOnly((v) => !v)}
          >
            <Star className={cn("h-4 w-4", favOnly && "fill-current")} /> Favoritas
          </Button>
          <Button className="gap-2" onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" /> Nova anotação
          </Button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border/60 py-20 text-center">
          <NotebookPen className="h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {notes.length === 0 ? "Nenhuma anotação ainda. Crie a primeira!" : "Nada encontrado para esse filtro."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => {
            const tags = parseTags(note.tags);
            return (
              <div
                key={note.id}
                className="group flex cursor-pointer flex-col rounded-xl border border-border/40 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                onClick={() => setEditing(note)}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="line-clamp-1 font-semibold text-foreground">{note.title}</h3>
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
                  {note.subjectTitle && (
                    <Badge
                      variant="secondary"
                      className="gap-1 border-none text-[10px]"
                      style={{ backgroundColor: `${note.subjectColor ?? "#6366f1"}1a`, color: note.subjectColor ?? "#6366f1" }}
                    >
                      <GraduationCap className="h-3 w-3" /> {note.subjectTitle}
                    </Badge>
                  )}
                  {tags.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline" className="border-border/60 text-[10px] text-muted-foreground">
                      {t}
                    </Badge>
                  ))}
                </div>

                {/* Ações no hover */}
                <div className="mt-3 flex justify-end gap-1 border-t border-border/40 pt-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setEditing(note); }} title="Editar">
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeleting(note); }}
                    title="Mover para a lixeira"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar/editar (único, global) */}
      <NoteDialog
        key={editing === "new" ? "new" : editing?.id ?? "closed"}
        state={editing}
        subjects={subjects}
        onClose={() => setEditing(null)}
        onSaved={async () => { await refresh(); setEditing(null); }}
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

function NoteDialog({
  state, subjects, onClose, onSaved,
}: {
  state: NoteData | "new" | null;
  subjects: NoteSubject[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const isEdit = state !== null && state !== "new";
  const note = isEdit ? (state as NoteData) : null;

  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");
  const [subjectId, setSubjectId] = useState(note?.subjectId ?? "none");
  const [tags, setTags] = useState(note?.tags ?? "");
  const [isFavorite, setIsFavorite] = useState(note?.isFavorite ?? false);
  const [pending, runTransition] = useTransition();

  const save = () => {
    if (!title.trim()) {
      toast.error("O título é obrigatório.");
      return;
    }
    const fd = new FormData();
    if (note) fd.set("id", note.id);
    fd.set("title", title);
    fd.set("content", content);
    fd.set("subjectId", subjectId);
    fd.set("tags", tags);
    fd.set("isFavorite", String(isFavorite));

    runTransition(async () => {
      const res = note ? await updateNote(fd) : await createNote(fd);
      if (res.success) {
        toast.success(res.message);
        await onSaved();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog open={state !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar anotação" : "Nova anotação"}</DialogTitle>
          <DialogDescription>Capture a ideia e, se quiser, vincule a uma matéria.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título da anotação"
            className="text-base font-semibold"
            autoFocus
          />
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escreva sua anotação…"
            className="min-h-[160px] leading-relaxed"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Matéria</label>
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
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tags rápidas (vírgula)</label>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="ex: revisão, prova" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsFavorite((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
              isFavorite ? "border-amber-400/40 bg-amber-400/10 text-amber-600" : "border-border/60 text-muted-foreground hover:bg-muted/40"
            )}
          >
            <Star className={cn("h-4 w-4", isFavorite && "fill-amber-400 text-amber-400")} />
            {isFavorite ? "Favorita" : "Marcar como favorita"}
          </button>

          {/* Tecido conectivo — só em edição (precisa do id). Editores form-safe. */}
          {note && (
            <div className="space-y-4 border-t border-border/40 pt-4">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" /> Tags, Anexos & Relações
              </p>
              <EntityTags entityType="note" entityId={note.id} />
              <EntityAttachments entityType="note" entityId={note.id} />
              <EntityLinks entityType="note" entityId={note.id} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={pending} className="min-w-[110px]">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
