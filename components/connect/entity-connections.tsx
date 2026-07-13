"use client";

import { useEffect, useState } from "react";
import { Network, ChevronDown, Tag as TagIcon, Paperclip, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityTags } from "./entity-tags";
import { EntityAttachments } from "./entity-attachments";
import { EntityLinks } from "./entity-links";
import { getConnectionCounts, type ConnectionCounts } from "@/app/(dashboard)/connect/actions";

/**
 * Card recolhível "Tags, Anexos & Conexões" para QUALQUER entidade.
 * Fica fechado por padrão (não polui a tela); ao abrir mostra as três seções
 * já auto-explicativas. Os editores internos só carregam dados quando abertos.
 *
 * Para o usuário LEMBRAR que existe conteúdo aqui, o cabeçalho (mesmo fechado)
 * mostra badges com a contagem de tags/anexos/conexões — carregadas de leve.
 *
 *   <EntityConnections entityType="task" entityId={task.id} />
 */
export function EntityConnections({
  entityType,
  entityId,
  defaultOpen = false,
  className,
}: {
  entityType: string;
  entityId: string;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [counts, setCounts] = useState<ConnectionCounts | null>(null);

  // Contagens de leve na montagem (badge no cabeçalho fechado).
  useEffect(() => {
    let active = true;
    getConnectionCounts(entityType, entityId)
      .then((c) => active && setCounts(c))
      .catch(() => {/* silencioso: badge é opcional */});
    return () => { active = false; };
  }, [entityType, entityId]);

  // Ao recolher, reconta (o usuário pode ter adicionado/removido itens dentro).
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (!next) {
      getConnectionCounts(entityType, entityId)
        .then(setCounts)
        .catch(() => {/* opcional: badge é opcional */});
    }
  };

  const total = counts ? counts.tags + counts.attachments + counts.links : 0;

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm", className)}>
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Network className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">Tags, Anexos &amp; Conexões</span>
          <span className="block text-xs text-muted-foreground">
            {open
              ? "Organize e ligue este item ao resto do sistema."
              : total > 0
                ? "Toque para ver e editar o que está ligado a este item."
                : "Etiquete, anexe um arquivo/link ou ligue este item a outro (ex.: ao projeto ou à nota que o gerou)."}
          </span>
        </span>

        {/* Badges de contagem (só fechado, só o que existe) — o "isto tem conteúdo". */}
        {!open && total > 0 && (
          <span className="flex shrink-0 items-center gap-1">
            {counts!.tags > 0 && <CountBadge icon={TagIcon} n={counts!.tags} label="tags" />}
            {counts!.attachments > 0 && <CountBadge icon={Paperclip} n={counts!.attachments} label="anexos" />}
            {counts!.links > 0 && <CountBadge icon={GitBranch} n={counts!.links} label="conexões" />}
          </span>
        )}

        <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-5 border-t border-border/40 p-4">
          <EntityTags entityType={entityType} entityId={entityId} />
          <div className="border-t border-border/30" />
          <EntityAttachments entityType={entityType} entityId={entityId} />
          <div className="border-t border-border/30" />
          <EntityLinks entityType={entityType} entityId={entityId} />
        </div>
      )}
    </div>
  );
}

function CountBadge({ icon: Icon, n, label }: { icon: typeof TagIcon; n: number; label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground"
      title={`${n} ${label}`}
    >
      <Icon className="h-2.5 w-2.5" />
      {n}
    </span>
  );
}
