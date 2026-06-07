"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Loader2, NotebookPen, Star, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createBlankNote, type NoteData } from "@/app/(dashboard)/notes/actions";

/**
 * Lista das notas do módulo /notes vinculadas a este projeto.
 * Cada item abre a edição em tela cheia; "Nova nota" cria já vinculada ao projeto.
 */
export function ProjectLinkedNotes({
  projectId,
  notes,
}: {
  projectId: string;
  notes: NoteData[];
}) {
  const router = useRouter();
  const [creating, startCreate] = useTransition();

  const handleNew = () => {
    startCreate(async () => {
      const res = await createBlankNote({ projectId });
      if (res.success && res.id) router.push(`/notes/${res.id}`);
      else toast.error(res.message);
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-foreground">Notas vinculadas</h3>
          <p className="text-xs text-muted-foreground">
            Notas do seu segundo cérebro conectadas a este projeto.
          </p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={handleNew} disabled={creating}>
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Nova nota
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 py-10 text-center">
          <NotebookPen className="h-8 w-8 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            Nenhuma nota vinculada ainda. Crie uma aqui ou vincule pelo seletor de Projeto na nota.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40">
          {notes.map((n) => (
            <Link
              key={n.id}
              href={`/notes/${n.id}`}
              className="group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {n.isFavorite && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                  <span className="truncate text-sm font-medium text-foreground">{n.title}</span>
                  {n.notebookName && (
                    <Badge
                      variant="secondary"
                      className="shrink-0 border-none text-[10px]"
                      style={{ backgroundColor: `${n.notebookColor ?? "#6366f1"}1a`, color: n.notebookColor ?? "#6366f1" }}
                    >
                      {n.notebookName}
                    </Badge>
                  )}
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {n.content?.replace(/[#*`>\-!\[\]()]/g, "").trim() || "Sem conteúdo."}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
