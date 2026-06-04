"use client";

import { useState, useTransition } from "react";
import {
  Tag as TagIcon, Paperclip, Plus, Trash2, ExternalLink, Loader2,
  FileText, Image as ImageIcon, Link2, GitBranch, ArrowRight, X,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ENTITY_ICON, ENTITY_LABEL, FALLBACK_ICON } from "./entity-meta";
import {
  getTaggedEntities, createTagAction, updateTagAction, deleteTagAction,
  getAttachmentsCenter, removeAttachmentAction,
  removeLinkCenter,
  type TagOverview, type AttachmentRow, type LinkRow,
} from "@/app/(dashboard)/connect/actions";

const KIND_LABEL: Record<string, string> = {
  RELATED: "Relacionado", BLOCKS: "Bloqueia", DERIVED_FROM: "Derivado de", REFERENCES: "Referencia",
};

interface ResolvedEntityLite {
  entityType: string;
  entityId: string;
  title: string;
  actionUrl: string | null;
}

const SWATCHES = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6", "#14b8a6"];

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ConnectCenter({
  initialTags,
  initialAttachments,
  initialLinks,
}: {
  initialTags: TagOverview[];
  initialAttachments: AttachmentRow[];
  initialLinks: LinkRow[];
}) {
  return (
    <Tabs defaultValue="tags" className="space-y-6">
      <TabsList>
        <TabsTrigger value="tags" className="gap-2">
          <TagIcon className="h-4 w-4" /> Tags
        </TabsTrigger>
        <TabsTrigger value="attachments" className="gap-2">
          <Paperclip className="h-4 w-4" /> Anexos
        </TabsTrigger>
        <TabsTrigger value="links" className="gap-2">
          <GitBranch className="h-4 w-4" /> Relações
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tags">
        <TagsTab initialTags={initialTags} />
      </TabsContent>

      <TabsContent value="attachments">
        <AttachmentsTab initial={initialAttachments} />
      </TabsContent>

      <TabsContent value="links">
        <LinksTab initial={initialLinks} />
      </TabsContent>
    </Tabs>
  );
}

// ------------------------------- TAGS --------------------------------------

function TagsTab({ initialTags }: { initialTags: TagOverview[] }) {
  const [tags, setTags] = useState<TagOverview[]>(initialTags);
  const [selected, setSelected] = useState<string | null>(null);
  const [entities, setEntities] = useState<ResolvedEntityLite[]>([]);
  const [loadingEntities, setLoadingEntities] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(SWATCHES[0]);
  const [pending, startTransition] = useTransition();

  const selectTag = (id: string) => {
    setSelected(id);
    setLoadingEntities(true);
    getTaggedEntities(id)
      .then(setEntities)
      .catch(() => toast.error("Falha ao carregar itens da tag."))
      .finally(() => setLoadingEntities(false));
  };

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        setTags(await createTagAction(name, newColor));
        setNewName("");
        toast.success("Tag criada.");
      } catch {
        toast.error("Não consegui criar a tag.");
      }
    });
  };

  const recolor = (id: string, color: string) => {
    startTransition(async () => {
      setTags(await updateTagAction(id, { color }));
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      setTags(await deleteTagAction(id));
      if (selected === id) {
        setSelected(null);
        setEntities([]);
      }
      toast.success("Tag excluída.");
    });
  };

  const selectedTag = tags.find((t) => t.id === selected);

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* Coluna esquerda: lista + criar */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-card p-2">
          <span
            className="h-7 w-7 shrink-0 cursor-pointer rounded-md border border-border/40"
            style={{ backgroundColor: newColor }}
            onClick={() => setNewColor(SWATCHES[(SWATCHES.indexOf(newColor) + 1) % SWATCHES.length])}
            title="Clique para mudar a cor"
          />
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            placeholder="Nova tag…"
            className="h-8 border-none shadow-none focus-visible:ring-0"
          />
          <Button size="icon" className="h-8 w-8 shrink-0" disabled={pending || !newName.trim()} onClick={create}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {tags.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 py-12 text-center text-sm text-muted-foreground">
            <TagIcon className="mx-auto mb-2 h-8 w-8 opacity-30" />
            Nenhuma tag ainda. Crie a primeira acima.
          </div>
        ) : (
          <ul className="space-y-1">
            {tags.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => selectTag(t.id)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left transition-colors",
                    selected === t.id ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card hover:border-primary/30"
                  )}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: t.color ?? "#6366f1" }} />
                  <span className="flex-1 truncate text-sm font-medium">{t.name}</span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {t.count}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Coluna direita: itens da tag selecionada */}
      <div className="rounded-xl border border-border/50 bg-card p-5">
        {!selectedTag ? (
          <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
            <TagIcon className="h-10 w-10 opacity-20" />
            Selecione uma tag para ver tudo que ela conecta entre os módulos.
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full" style={{ backgroundColor: selectedTag.color ?? "#6366f1" }} />
                <h3 className="text-lg font-semibold">{selectedTag.name}</h3>
                <span className="text-sm text-muted-foreground">· {selectedTag.count} item(ns)</span>
              </div>
              <div className="flex items-center gap-1">
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => recolor(selectedTag.id, c)}
                    className={cn("h-5 w-5 rounded-full border transition-transform hover:scale-110",
                      selectedTag.color === c ? "border-foreground" : "border-transparent")}
                    style={{ backgroundColor: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
                <Button
                  variant="ghost" size="icon"
                  className="ml-1 h-7 w-7 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  disabled={pending}
                  onClick={() => remove(selectedTag.id)}
                  title="Excluir tag"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {loadingEntities ? (
              <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
              </div>
            ) : entities.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nada com essa tag ainda. Adicione a tag em itens dos módulos.
              </p>
            ) : (
              <ul className="divide-y divide-border/40">
                {entities.map((e) => {
                  const Icon = ENTITY_ICON[e.entityType] ?? Link2;
                  return (
                    <li key={`${e.entityType}:${e.entityId}`} className="flex items-center gap-3 py-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{e.title}</p>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground/60">
                          {ENTITY_LABEL[e.entityType] ?? e.entityType}
                        </p>
                      </div>
                      {e.actionUrl && (
                        <Link
                          href={e.actionUrl}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          Abrir <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ----------------------------- ANEXOS --------------------------------------

function AttachmentsTab({ initial }: { initial: AttachmentRow[] }) {
  const [items, setItems] = useState<AttachmentRow[]>(initial);
  const [pending, startTransition] = useTransition();

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        setItems(await removeAttachmentAction(id));
        toast.success("Anexo removido.");
      } catch {
        toast.error("Falha ao remover o anexo.");
      }
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-20 text-center">
        <Paperclip className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          Nenhum anexo ainda.<br />
          Arquivos e imagens vinculados a qualquer item aparecem aqui.
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((a) => {
        const isImage = a.kind === "IMAGE" && (a.url || a.hasBlob);
        const KindIcon = a.kind === "LINK" ? Link2 : a.kind === "IMAGE" ? ImageIcon : FileText;
        const EntityIcon = a.entity ? ENTITY_ICON[a.entity.entityType] ?? Link2 : Link2;
        return (
          <li key={a.id} className="group relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card">
            <div className="flex h-32 items-center justify-center bg-muted/50">
              {isImage && a.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.name ?? "anexo"} className="h-full w-full object-cover" />
              ) : (
                <KindIcon className="h-10 w-10 text-muted-foreground/30" />
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <p className="truncate text-sm font-medium" title={a.name ?? undefined}>
                {a.name || a.kind}
              </p>
              {a.entity && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <EntityIcon className="h-3 w-3" />
                  {ENTITY_LABEL[a.entity.entityType] ?? a.entity.entityType}: {a.entity.title}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/60">
                {formatSize(a.sizeBytes)}
                {a.mimeType ? ` · ${a.mimeType}` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border/40 px-3 py-1.5">
              {a.url ? (
                <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  Abrir <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <span className="text-xs text-muted-foreground/50">Arquivo embutido</span>
              )}
              <button
                disabled={pending}
                onClick={() => remove(a.id)}
                className="text-muted-foreground transition-colors hover:text-destructive"
                title="Remover anexo"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

// ----------------------------- RELAÇÕES ------------------------------------

function LinkEndpoint({ entity }: { entity: LinkRow["from"] }) {
  if (!entity) {
    return <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground/60 italic">(removido)</span>;
  }
  const Icon = ENTITY_ICON[entity.entityType] ?? FALLBACK_ICON;
  const inner = (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate text-sm font-medium">{entity.title}</span>
      <span className="shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground/60">
        {ENTITY_LABEL[entity.entityType] ?? entity.entityType}
      </span>
    </span>
  );
  return entity.actionUrl ? (
    <Link href={entity.actionUrl} className="min-w-0 hover:underline">{inner}</Link>
  ) : inner;
}

function LinksTab({ initial }: { initial: LinkRow[] }) {
  const [links, setLinks] = useState<LinkRow[]>(initial);
  const [pending, startTransition] = useTransition();

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        setLinks(await removeLinkCenter(id));
        toast.success("Relação removida.");
      } catch {
        toast.error("Falha ao remover a relação.");
      }
    });
  };

  if (links.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 py-20 text-center">
        <GitBranch className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          Nenhuma relação ainda.<br />
          Use a aba <strong>Relações</strong> no menu de qualquer item para ligar entidades entre módulos.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/40 overflow-hidden rounded-xl border border-border/50">
      {links.map((l) => (
        <li key={l.id} className="flex items-center gap-3 bg-card px-4 py-3">
          <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr] items-center gap-3">
            <LinkEndpoint entity={l.from} />
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {KIND_LABEL[l.kind] ?? l.kind} <ArrowRight className="h-3 w-3" />
            </span>
            <LinkEndpoint entity={l.to} />
          </div>
          <button
            disabled={pending}
            onClick={() => remove(l.id)}
            className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
            title="Remover relação"
          >
            <X className="h-4 w-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
