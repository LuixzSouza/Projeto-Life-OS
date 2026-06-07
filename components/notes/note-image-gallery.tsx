"use client";

import { useMemo, useTransition } from "react";
import { Trash2, ImageOff, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { deleteNoteImage } from "@/app/(dashboard)/notes/actions";

/* eslint-disable @next/next/no-img-element */

interface EmbeddedImage {
  /** Trecho Markdown completo, ex.: ![alt](data:image/...) ou (/api/note-image/ID). */
  match: string;
  alt: string;
  src: string;
  bytes: number;        // 0 quando a imagem é servida por URL (tamanho desconhecido aqui)
  imageId?: string;     // id do NoteImage, quando for /api/note-image/{id}
}

// Captura imagens Markdown: Base64 (data:) OU URL curta (/api/note-image/{id}).
const IMG_RE = /!\[([^\]]*)\]\((data:image\/[^)]+|\/api\/note-image\/[^)\s]+)\)/g;

function approxBytes(dataUrl: string): number {
  if (!dataUrl.startsWith("data:")) return 0;
  const i = dataUrl.indexOf(",");
  if (i === -1) return dataUrl.length;
  return Math.ceil((dataUrl.length - i - 1) * 3 / 4);
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extractEmbeddedImages(content: string): EmbeddedImage[] {
  const out: EmbeddedImage[] = [];
  for (const m of content.matchAll(IMG_RE)) {
    const src = m[2];
    const idMatch = /\/api\/note-image\/([^)\s]+)/.exec(src);
    out.push({ match: m[0], alt: m[1], src, bytes: approxBytes(src), imageId: idMatch?.[1] });
  }
  return out;
}

/** Conta quantas imagens estão embutidas no conteúdo. */
export function countEmbeddedImages(content: string): number {
  const m = content.match(IMG_RE);
  return m ? m.length : 0;
}

export function NoteImageGallery({
  content,
  onChange,
  className,
  onUploadImage,
}: {
  content: string;
  onChange: (next: string) => void;
  className?: string;
  /** Mesma função do editor; habilita "Otimizar" (mover base64 do texto p/ armazenamento). */
  onUploadImage?: (dataUrl: string) => Promise<string | null>;
}) {
  const images = useMemo(() => extractEmbeddedImages(content), [content]);
  const totalBytes = images.reduce((sum, img) => sum + img.bytes, 0);
  const inlineImages = useMemo(() => images.filter((img) => img.src.startsWith("data:")), [images]);
  const [optimizing, startOptimize] = useTransition();

  const optimize = () => {
    if (!onUploadImage || inlineImages.length === 0) return;
    startOptimize(async () => {
      let next = content;
      let moved = 0;
      for (const img of inlineImages) {
        const url = await onUploadImage(img.src);
        if (url) { next = next.split(img.match).join(`![${img.alt}](${url})`); moved++; }
      }
      if (moved > 0) {
        onChange(next);
        toast.success(`${moved} ${moved === 1 ? "imagem movida" : "imagens movidas"} do texto.`);
      } else {
        toast.error("Não foi possível otimizar as imagens.");
      }
    });
  };

  const removeImage = (target: EmbeddedImage) => {
    // Remove a primeira ocorrência exata do Markdown da imagem (e quebra de linha solta).
    const idx = content.indexOf(target.match);
    if (idx === -1) return;
    const before = content.slice(0, idx);
    let after = content.slice(idx + target.match.length);
    if (after.startsWith("\n")) after = after.slice(1);
    onChange(before + after);
    // Também apaga o registro da imagem (libera espaço), quando for armazenada.
    if (target.imageId) void deleteNoteImage(target.imageId);
  };

  if (images.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 py-10 text-center", className)}>
        <ImageOff className="h-8 w-8 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Nenhuma imagem incorporada nesta anotação.</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">
          {images.length} {images.length === 1 ? "imagem" : "imagens"}
          {totalBytes > 0 ? ` · ${formatSize(totalBytes)} em Base64` : ""} nesta nota
        </p>
        {onUploadImage && inlineImages.length > 0 && (
          <button
            type="button"
            onClick={optimize}
            disabled={optimizing}
            title="Move o Base64 do texto para armazenamento (deixa a nota mais leve)"
            className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-60"
          >
            {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Otimizar {inlineImages.length} no texto
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {images.map((img, i) => (
          <div
            key={`${i}-${img.src.slice(0, 24)}`}
            className="group relative overflow-hidden rounded-lg border border-border/40 bg-muted/30"
          >
            <img
              src={img.src}
              alt={img.alt || `Imagem ${i + 1}`}
              className="aspect-video w-full object-cover"
            />
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
              <span className="text-[10px] font-medium text-white/90">{img.bytes > 0 ? formatSize(img.bytes) : "imagem"}</span>
              <button
                type="button"
                onClick={() => removeImage(img)}
                title="Remover imagem da anotação"
                className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-white/15 text-white opacity-100 transition-opacity hover:bg-destructive md:opacity-0 md:group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
