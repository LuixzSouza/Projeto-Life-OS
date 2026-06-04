"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { GitBranch, Search, X, Loader2, ExternalLink, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ENTITY_ICON, ENTITY_LABEL, FALLBACK_ICON } from "./entity-meta";
import {
  getEntityLinks,
  searchLinkableEntities,
  linkEntityAction,
  unlinkEntityAction,
  type LinkedEntity,
} from "@/app/(dashboard)/connect/actions";

const KIND_LABEL: Record<string, string> = {
  RELATED: "Relacionado",
  BLOCKS: "Bloqueia",
  DERIVED_FROM: "Derivado de",
  REFERENCES: "Referencia",
};
const KINDS = ["RELATED", "BLOCKS", "DERIVED_FROM", "REFERENCES"];

type Hit = { entityType: string; entityId: string; title: string };

/**
 * Editor de relações (EntityLink) reutilizável: busca uma entidade em qualquer
 * módulo e cria um vínculo tipado (Relacionado / Bloqueia / Derivado / Referencia).
 * `<EntityLinks entityType="task" entityId={id} />`
 */
export function EntityLinks({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [links, setLinks] = useState<LinkedEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [kind, setKind] = useState("RELATED");
  const [pending, startTransition] = useTransition();
  const seq = useRef(0);

  useEffect(() => {
    let active = true;
    getEntityLinks(entityType, entityId)
      .then((rows) => active && setLinks(rows))
      .catch(() => active && toast.error("Falha ao carregar relações."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [entityType, entityId]);

  // Busca conforme digita (sem lib de debounce; descarta respostas fora de ordem).
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    const mySeq = ++seq.current;
    setSearching(true);
    searchLinkableEntities(q, entityType, entityId)
      .then((hits) => {
        if (mySeq !== seq.current) return; // resposta obsoleta
        // Esconde entidades já vinculadas.
        const linkedKeys = new Set(links.map((l) => `${l.entityType}:${l.entityId}`));
        setResults(hits.filter((h) => !linkedKeys.has(`${h.entityType}:${h.entityId}`)));
      })
      .catch(() => mySeq === seq.current && setResults([]))
      .finally(() => mySeq === seq.current && setSearching(false));
  }, [query, entityType, entityId, links]);

  const add = (hit: Hit) => {
    startTransition(async () => {
      try {
        setLinks(await linkEntityAction(entityType, entityId, hit.entityType, hit.entityId, kind));
        setQuery("");
        setResults([]);
        toast.success("Relação criada.");
      } catch {
        toast.error("Não consegui criar a relação.");
      }
    });
  };

  const remove = (linkId: string) => {
    startTransition(async () => {
      try {
        setLinks(await unlinkEntityAction(entityType, entityId, linkId));
      } catch {
        toast.error("Não consegui remover a relação.");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando relações…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Buscador + tipo */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="h-8 shrink-0 rounded-md border border-border/60 bg-background px-2 text-xs"
            aria-label="Tipo de relação"
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>{KIND_LABEL[k]}</option>
            ))}
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
              placeholder="Buscar item p/ relacionar…"
              className="h-8 pl-8 text-sm"
            />
            {searching && <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />}
          </div>
        </div>

        {results.length > 0 && (
          <ul className="overflow-hidden rounded-lg border border-border/50 bg-card">
            {results.map((h) => {
              const Icon = ENTITY_ICON[h.entityType] ?? FALLBACK_ICON;
              return (
                <li key={`${h.entityType}:${h.entityId}`}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => add(h)}
                    className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-primary/5"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{h.title}</span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/60">
                      {ENTITY_LABEL[h.entityType] ?? h.entityType}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {query.trim().length >= 2 && !searching && results.length === 0 && (
          <p className="px-1 text-xs text-muted-foreground">Nada encontrado para relacionar.</p>
        )}
      </div>

      {/* Relações existentes */}
      {links.length === 0 ? (
        <p className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5" /> Sem relações ainda.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {links.map((l) => {
            const Icon = ENTITY_ICON[l.entityType] ?? FALLBACK_ICON;
            const DirIcon = l.direction === "out" ? ArrowRight : ArrowLeft;
            return (
              <li key={l.linkId} className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5">
                <DirIcon
                  className={cn("h-3.5 w-3.5 shrink-0", l.direction === "out" ? "text-primary/70" : "text-muted-foreground/60")}
                  aria-label={l.direction === "out" ? "aponta para" : "apontado por"}
                />
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.title}</p>
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground/60">
                    {ENTITY_LABEL[l.entityType] ?? l.entityType} · {KIND_LABEL[l.kind] ?? l.kind}
                  </p>
                </div>
                {l.actionUrl && (
                  <Link href={l.actionUrl} className="text-muted-foreground hover:text-primary" title="Abrir">
                    <ExternalLink className="h-4 w-4" />
                  </Link>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(l.linkId)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  title="Remover relação"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
