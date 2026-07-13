"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, Plus, Tag as TagIcon, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ConnectSectionHeader } from "./connect-section-header";
import {
  getEntityTagsAction,
  listUserTags,
  addTagToEntity,
  removeTagFromEntity,
  type SimpleTag,
} from "@/app/(dashboard)/connect/actions";

/**
 * Editor de tags reutilizável para QUALQUER entidade (referência polimórfica).
 * Carrega as próprias tags ao montar; adicionar/remover usa server actions.
 * Basta soltar `<EntityTags entityType="link" entityId={id} />` em qualquer módulo.
 */
export function EntityTags({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [tags, setTags] = useState<SimpleTag[]>([]);
  const [suggestions, setSuggestions] = useState<SimpleTag[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    Promise.all([getEntityTagsAction(entityType, entityId), listUserTags()])
      .then(([current, all]) => {
        if (!active) return;
        setTags(current);
        setSuggestions(all);
      })
      .catch(() => active && toast.error("Falha ao carregar tags."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [entityType, entityId]);

  const add = (name: string) => {
    const clean = name.trim();
    if (!clean || tags.some((t) => t.name.toLowerCase() === clean.toLowerCase())) {
      setInput("");
      return;
    }
    startTransition(async () => {
      try {
        const next = await addTagToEntity(entityType, entityId, clean);
        setTags(next);
        setInput("");
        // Atualiza sugestões caso seja uma tag nova.
        if (!suggestions.some((s) => s.name.toLowerCase() === clean.toLowerCase())) {
          setSuggestions(await listUserTags());
        }
        inputRef.current?.focus();
      } catch {
        toast.error("Não consegui adicionar a tag.");
      }
    });
  };

  const remove = (tagId: string) => {
    startTransition(async () => {
      try {
        setTags(await removeTagFromEntity(entityType, entityId, tagId));
      } catch {
        toast.error("Não consegui remover a tag.");
      }
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      add(input);
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      remove(tags[tags.length - 1].id);
    }
  };

  // Sugestões ainda não aplicadas que casam com o texto digitado.
  const matches = suggestions
    .filter((s) => !tags.some((t) => t.id === s.id))
    .filter((s) => (input ? s.name.toLowerCase().includes(input.trim().toLowerCase()) : true))
    .slice(0, 6);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando tags…
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <ConnectSectionHeader
        icon={TagIcon}
        title="Tags"
        hint="Rótulos pra achar e agrupar itens depois. Ex: urgente, ideia, cliente-x."
      />
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.length === 0 && (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TagIcon className="h-3.5 w-3.5" /> Nenhuma tag ainda — digite e Enter (ex.: urgente, viagem, cliente-x).
          </span>
        )}
        {tags.map((t) => (
          <span
            key={t.id}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: `${t.color ?? "#6366f1"}1a`,
              color: t.color ?? "#6366f1",
            }}
          >
            {t.name}
            <button
              type="button"
              disabled={pending}
              onClick={() => remove(t.id)}
              className="opacity-60 transition-opacity hover:opacity-100"
              aria-label={`Remover ${t.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      <div className="relative">
        <Input
          ref={inputRef}
          value={input}
          disabled={pending}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Adicionar tag e Enter…"
          className="h-8 text-sm"
        />
        {input && (
          <button
            type="button"
            disabled={pending}
            onClick={() => add(input)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
            aria-label="Adicionar tag"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {matches.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matches.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={pending}
              onClick={() => add(s.name)}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color ?? "#6366f1" }} />
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
