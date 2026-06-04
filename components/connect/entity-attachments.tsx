"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Paperclip, Upload, Link2, Trash2, Loader2, FileText, Image as ImageIcon, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getEntityAttachments,
  addEntityAttachment,
  removeEntityAttachment,
  type EntityAttachment,
} from "@/app/(dashboard)/connect/actions";

const MAX_BYTES = 4 * 1024 * 1024; // ~4MB (base64 cresce ~33%; o action limita o blob)

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

/**
 * Editor de anexos reutilizável para QUALQUER entidade (referência polimórfica).
 * Sobe arquivos como base64 (portável, sem bucket) ou referencia um link.
 * `<EntityAttachments entityType="event" entityId={id} />`
 */
export function EntityAttachments({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [items, setItems] = useState<EntityAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    getEntityAttachments(entityType, entityId)
      .then((rows) => active && setItems(rows))
      .catch(() => active && toast.error("Falha ao carregar anexos."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [entityType, entityId]);

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Arquivo muito grande (máx. 4MB).");
      return;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      const isImage = file.type.startsWith("image/");
      startTransition(async () => {
        try {
          setItems(
            await addEntityAttachment(entityType, entityId, {
              name: file.name,
              blob: dataUrl,
              mimeType: file.type || "application/octet-stream",
              sizeBytes: file.size,
              kind: isImage ? "IMAGE" : "FILE",
            })
          );
          toast.success("Anexo adicionado.");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Falha ao anexar.");
        }
      });
    } catch {
      toast.error("Não consegui ler o arquivo.");
    }
  };

  const addLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    startTransition(async () => {
      try {
        setItems(
          await addEntityAttachment(entityType, entityId, {
            url,
            name: url.replace(/^https?:\/\//, "").slice(0, 60),
            kind: "LINK",
          })
        );
        setLinkUrl("");
        setLinkMode(false);
        toast.success("Link anexado.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Falha ao anexar link.");
      }
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      try {
        setItems(await removeEntityAttachment(entityType, entityId, id));
      } catch {
        toast.error("Falha ao remover.");
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando anexos…
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input ref={fileRef} type="file" className="hidden" onChange={onPickFile} />
        <Button type="button" variant="outline" size="sm" className="gap-2" disabled={pending} onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" /> Arquivo
        </Button>
        <Button type="button" variant="outline" size="sm" className="gap-2" disabled={pending} onClick={() => setLinkMode((v) => !v)}>
          <Link2 className="h-4 w-4" /> Link
        </Button>
        {pending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {linkMode && (
        <div className="flex items-center gap-2">
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
            placeholder="https://…"
            className="h-8 text-sm"
            autoFocus
          />
          <Button type="button" size="sm" className="h-8" disabled={pending || !linkUrl.trim()} onClick={addLink}>
            Anexar
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setLinkMode(false); setLinkUrl(""); }}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="flex items-center gap-1.5 py-2 text-xs text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" /> Nenhum anexo ainda.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((a) => {
            const isImage = a.kind === "IMAGE";
            const Icon = a.kind === "LINK" ? Link2 : isImage ? ImageIcon : FileText;
            return (
              <li key={a.id} className="flex items-center gap-2 rounded-lg border border-border/40 bg-card px-2.5 py-1.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground">
                  {isImage && a.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.name ?? "anexo"} className="h-full w-full object-cover" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm" title={a.name ?? undefined}>{a.name || a.kind}</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {formatSize(a.sizeBytes)}{a.mimeType ? ` · ${a.mimeType}` : ""}
                  </p>
                </div>
                {a.url && (
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary" title="Abrir">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(a.id)}
                  className="text-muted-foreground transition-colors hover:text-destructive"
                  title="Remover"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
