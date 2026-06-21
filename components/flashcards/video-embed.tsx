"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { VideoEmbed as VideoEmbedData } from "@/lib/media-embed";

/**
 * Player de vídeo do cartão. Privacy-first: YouTube/Vimeo só carregam o iframe
 * APÓS o clique (nada de cookies/scripts antes). Arquivos diretos (.mp4) usam o
 * <video> nativo. `onClick` faz stopPropagation para não virar o cartão.
 */
export function VideoEmbed({ embed, dark = false }: { embed: VideoEmbedData; dark?: boolean }) {
  const [active, setActive] = useState(false);

  if (embed.kind === "file") {
    return (
      <video
        src={embed.url}
        controls
        onClick={(e) => e.stopPropagation()}
        className="mx-auto mt-4 max-h-[40vh] w-full rounded-xl border border-border/50 bg-black"
      />
    );
  }

  if (active) {
    return (
      <div className="mx-auto mt-4 aspect-video w-full overflow-hidden rounded-xl border border-border/50 shadow-sm">
        <iframe
          src={`${embed.embedUrl}?autoplay=1`}
          title="Vídeo do cartão"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setActive(true);
      }}
      title="Carregar e assistir o vídeo"
      className="group relative mx-auto mt-4 flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted shadow-sm"
    >
      {embed.thumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element -- thumbnail do YouTube CDN
        <img src={embed.thumbnail} alt="Pré-visualização do vídeo" className="h-full w-full object-cover" />
      ) : (
        <div className={dark ? "absolute inset-0 bg-slate-900" : "absolute inset-0 bg-muted"} />
      )}
      <span className="relative grid h-14 w-14 place-items-center rounded-full bg-black/60 text-white shadow-lg ring-1 ring-white/20 transition-transform group-hover:scale-110">
        <Play className="h-7 w-7 translate-x-0.5 fill-current" />
      </span>
      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white/90">
        Clique para assistir
      </span>
    </button>
  );
}
