"use client";

import { useState, useTransition } from "react";
import { Trash2, RotateCcw, X, ListTodo, AlertTriangle, Bookmark, Gift, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { restoreItem, purgeItem, emptyTrash, type TrashItem } from "@/app/(dashboard)/trash/actions";

const TYPE_ICON: Record<string, React.ElementType> = { task: ListTodo, link: Bookmark, wishlist: Gift, media: Film };
const TYPE_LABEL: Record<string, string> = { task: "Tarefa", link: "Link", wishlist: "Desejo", media: "Mídia" };

function ago(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function TrashClient({ initial }: { initial: TrashItem[] }) {
  const [items, setItems] = useState<TrashItem[]>(initial);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<TrashItem[]>, msg: string) =>
    startTransition(async () => {
      try {
        setItems(await fn());
        toast.success(msg);
      } catch {
        toast.error("Algo deu errado.");
      }
    });

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-20 text-center">
        <Trash2 className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">A lixeira está vazia.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
        <p className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4" />
          Itens aqui podem ser restaurados. Excluir em definitivo é irreversível.
        </p>
        <Button
          variant="ghost" size="sm" disabled={pending}
          className="text-destructive hover:bg-destructive/10"
          onClick={() => run(emptyTrash, "Lixeira esvaziada.")}
        >
          Esvaziar lixeira
        </Button>
      </div>

      <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/50">
        {items.map((it) => {
          const Icon = TYPE_ICON[it.type] ?? Trash2;
          return (
            <li key={`${it.type}:${it.id}`} className="flex items-center gap-3 bg-card px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {TYPE_LABEL[it.type] ?? it.type} · removido em {ago(it.deletedAt)}
                </p>
              </div>
              <Button
                variant="outline" size="sm" disabled={pending}
                onClick={() => run(() => restoreItem(it.type, it.id), "Restaurado.")}
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restaurar
              </Button>
              <Button
                variant="ghost" size="icon" disabled={pending}
                title="Excluir em definitivo"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={() => run(() => purgeItem(it.type, it.id), "Excluído em definitivo.")}
              >
                <X className="h-4 w-4" />
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
