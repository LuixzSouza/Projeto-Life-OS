"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { GitBranch, Search, X, Loader2, ExternalLink, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ENTITY_ICON, ENTITY_LABEL, FALLBACK_ICON } from "./entity-meta";
import { ConnectSectionHeader } from "./connect-section-header";
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

// Tipos de vínculo com uma dica do que significam (mostrados só no modo avançado).
const KIND_OPTIONS: { value: string; label: string; hint: string }[] = [
  { value: "RELATED", label: "Relacionado", hint: "ligação simples" },
  { value: "BLOCKS", label: "Bloqueia", hint: "trava o outro" },
  { value: "DERIVED_FROM", label: "Derivado de", hint: "nasceu do outro" },
  { value: "REFERENCES", label: "Referencia", hint: "só cita/aponta" },
];

// Frase do vínculo do ponto de vista DESTE item (substitui as setas ← →).
const REL_PHRASE: Record<string, { out: string; in: string }> = {
  RELATED: { out: "Relacionado", in: "Relacionado" },
  BLOCKS: { out: "Bloqueia", in: "Bloqueado por" },
  DERIVED_FROM: { out: "Derivado de", in: "Deu origem a" },
  REFERENCES: { out: "Referencia", in: "Referenciado por" },
};

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
  const [showKind, setShowKind] = useState(false); // tipo do vínculo é avançado/opcional
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

  // Busca conforme digita, com debounce de 250ms (menos chamadas ao servidor) e
  // descarte de respostas fora de ordem. Query curta (<2) não dispara busca; o render
  // esconde resultados por tamanho da query. O setState ocorre no callback do timer/
  // promise (assíncrono), não no corpo do efeito.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const handle = setTimeout(() => {
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
    }, 250);
    return () => clearTimeout(handle);
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

  // Resultados/spinner só valem para query >= 2 chars: gatear no render evita ter que
  // zerar `results`/`searching` no efeito (e o aviso react-hooks/set-state-in-effect).
  const trimmedLen = query.trim().length;
  const visibleResults = trimmedLen >= 2 ? results : [];
  const isSearching = trimmedLen >= 2 && searching;

  return (
    <div className="space-y-3">
      <ConnectSectionHeader
        icon={GitBranch}
        title="Conexões"
        hint="Ligue este item a outro do sistema (tarefa, nota, projeto, transação…). Busque abaixo e clique."
      />

      {/* Buscador (em primeiro plano) + tipo do vínculo (avançado/opcional) */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
            placeholder="Conectar a outro item…"
            className="h-9 pl-8 text-sm"
          />
          {isSearching && <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />}
        </div>

        {/* Tipo do vínculo: por padrão "Relacionado". Só aparece se o usuário quiser detalhar. */}
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => setShowKind((v) => !v)}
            className="inline-flex w-fit items-center gap-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Tipo: <span className="text-foreground">{KIND_LABEL[kind]}</span>
            {!showKind && <span className="text-muted-foreground/60">(alterar)</span>}
          </button>
          {showKind && (
            <div className="flex flex-wrap gap-1.5">
              {KIND_OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setKind(o.value)}
                  title={o.hint}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                    kind === o.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {o.label}
                  <span className="text-[10px] text-muted-foreground/60">· {o.hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {visibleResults.length > 0 && (
          <ul className="overflow-hidden rounded-lg border border-border/50 bg-card">
            {visibleResults.map((h) => {
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
        {trimmedLen >= 2 && !isSearching && visibleResults.length === 0 && (
          <p className="px-1 text-xs text-muted-foreground">Nada encontrado para relacionar.</p>
        )}
      </div>

      {/* Conexões existentes */}
      {links.length === 0 ? (
        <p className="flex items-center gap-1.5 py-1 text-xs text-muted-foreground">
          <GitBranch className="h-3.5 w-3.5" /> Nenhuma conexão ainda — busque um item acima pra ligar.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {links.map((l) => {
            const Icon = ENTITY_ICON[l.entityType] ?? FALLBACK_ICON;
            // Em vez de setas, uma frase clara do vínculo a partir deste item.
            const phrase = (REL_PHRASE[l.kind] ?? REL_PHRASE.RELATED)[l.direction === "out" ? "out" : "in"];
            return (
              <li key={l.linkId} className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    <span className="text-muted-foreground/60">{ENTITY_LABEL[l.entityType] ?? l.entityType}</span>
                    {" · "}{phrase}
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
