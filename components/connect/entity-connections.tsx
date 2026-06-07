"use client";

import { useState } from "react";
import { Network, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { EntityTags } from "./entity-tags";
import { EntityAttachments } from "./entity-attachments";
import { EntityLinks } from "./entity-links";

/**
 * Card recolhível "Tags, Anexos & Conexões" para QUALQUER entidade.
 * Fica fechado por padrão (não polui a tela); ao abrir mostra as três seções
 * já auto-explicativas. Os editores internos só carregam dados quando abertos.
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

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border/40 bg-card shadow-sm", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
              : "Abrir para adicionar tags, anexos ou conectar a outros itens."}
          </span>
        </span>
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
