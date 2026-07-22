"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Trash2, RotateCcw, X, ListTodo, AlertTriangle, Bookmark, Gift, Film,
  CalendarDays, UserRound, Briefcase, Shirt, Receipt, Layers, NotebookPen,
  Target, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { restoreItem, purgeItem, emptyTrash, type TrashItem } from "@/app/(dashboard)/trash/actions";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ElementType> = {
  task: ListTodo, link: Bookmark, wishlist: Gift, media: Film,
  event: CalendarDays, friend: UserRound, client: Briefcase, wardrobeItem: Shirt,
  transaction: Receipt, project: Layers, note: NotebookPen, goal: Target,
};
const TYPE_LABEL: Record<string, string> = {
  task: "Tarefa", link: "Link", wishlist: "Desejo", media: "Mídia",
  event: "Evento", friend: "Conexão", client: "Cliente", wardrobeItem: "Peça",
  transaction: "Lançamento", project: "Projeto", note: "Anotação", goal: "Meta",
};

/** Data absoluta (tooltip) e relativa ("há 2 dias") a partir do ISO de remoção. */
function absolute(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
function relative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.round(diffMs / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} ${d === 1 ? "dia" : "dias"}`;
  const mo = Math.round(d / 30);
  return `há ${mo} ${mo === 1 ? "mês" : "meses"}`;
}

// Ação destrutiva pendente de confirmação. `null` = nenhum diálogo aberto.
type PendingConfirm =
  | { kind: "purge"; item: TrashItem }
  | { kind: "empty"; count: number };

export function TrashClient({ initial }: { initial: TrashItem[] }) {
  const [items, setItems] = useState<TrashItem[]>(initial);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  const run = (fn: () => Promise<TrashItem[]>, msg: string) =>
    startTransition(async () => {
      try {
        setItems(await fn());
        toast.success(msg);
      } catch {
        toast.error("Algo deu errado.");
      }
    });

  // Contagem por tipo (para as pílulas de filtro) — só tipos que existem na lixeira.
  const typeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const it of items) map.set(it.type, (map.get(it.type) ?? 0) + 1);
    return map;
  }, [items]);

  // Se o tipo filtrado sumiu (esvaziou aquele grupo), volta para "Todos".
  const activeType = typeFilter && typeCounts.has(typeFilter) ? typeFilter : null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (it) =>
        (!activeType || it.type === activeType) &&
        (!q || it.title.toLowerCase().includes(q)),
    );
  }, [items, query, activeType]);

  function confirmAction() {
    if (!confirm) return;
    if (confirm.kind === "empty") {
      run(emptyTrash, "Lixeira esvaziada.");
    } else {
      const { item } = confirm;
      run(() => purgeItem(item.type, item.id), "Excluído em definitivo.");
    }
    setConfirm(null);
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-20 text-center">
        <Trash2 className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">A lixeira está vazia.</p>
        <p className="text-xs text-muted-foreground/70">
          Itens que você remover pelos módulos aparecem aqui antes de sumirem de vez.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aviso + esvaziar */}
      <div className="flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {items.length} {items.length === 1 ? "item pode" : "itens podem"} ser restaurado{items.length === 1 ? "" : "s"}. Excluir em definitivo é irreversível.
        </p>
        <Button
          variant="ghost" size="sm" disabled={pending}
          className="shrink-0 text-destructive hover:bg-destructive/10"
          onClick={() => setConfirm({ kind: "empty", count: items.length })}
        >
          <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Esvaziar lixeira
        </Button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar na lixeira…"
          className="h-10 pl-9"
          aria-label="Buscar na lixeira"
        />
      </div>

      {/* Filtros por tipo (rolam na horizontal no mobile) */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <FilterChip
          active={!activeType}
          label="Todos"
          count={items.length}
          onClick={() => setTypeFilter(null)}
        />
        {[...typeCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => (
            <FilterChip
              key={type}
              active={activeType === type}
              label={TYPE_LABEL[type] ?? type}
              count={count}
              icon={TYPE_ICON[type]}
              onClick={() => setTypeFilter(type)}
            />
          ))}
      </div>

      {/* Lista */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
          Nenhum item corresponde à busca.
        </div>
      ) : (
        <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/50">
          {visible.map((it) => {
            const Icon = TYPE_ICON[it.type] ?? Trash2;
            return (
              <li key={`${it.type}:${it.id}`} className="flex items-center gap-3 bg-card px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.title || <span className="italic text-muted-foreground">Sem título</span>}</p>
                  <p className="text-[11px] text-muted-foreground" title={absolute(it.deletedAt)}>
                    {TYPE_LABEL[it.type] ?? it.type} · removido {relative(it.deletedAt)}
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
                  aria-label={`Excluir "${it.title}" em definitivo`}
                  className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setConfirm({ kind: "purge", item: it })}
                >
                  <X className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Confirmação única (global) — nunca dentro do .map() */}
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "empty" ? "Esvaziar a lixeira?" : "Excluir em definitivo?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "empty" ? (
                <>Isto apaga <strong>{confirm.count} {confirm.count === 1 ? "item" : "itens"}</strong> para sempre. Não dá para desfazer.</>
              ) : (
                <>&ldquo;{confirm?.item.title}&rdquo; será removido para sempre. Não dá para desfazer.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {confirm?.kind === "empty" ? "Esvaziar" : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterChip({
  active, label, count, icon: Icon, onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  icon?: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 h-8 text-xs font-semibold transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/50 bg-muted/20 text-muted-foreground hover:bg-muted/40",
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
      <span className={cn("tabular-nums", active ? "text-primary/70" : "text-muted-foreground/60")}>{count}</span>
    </button>
  );
}
