"use client";

import { useState } from "react";
import { Music, X, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { playClick } from "./sfx";

/**
 * Mini atalho de música para a sessão de treino. Um player que CONTROLA o Spotify
 * de dentro da página exigiria login OAuth + Web Playback SDK + conta Premium (uma
 * integração de backend que o app ainda não tem). Enquanto isso, este controle
 * abre o Spotify (app no celular, com fallback web) sem tirar o treino da tela —
 * útil pra trocar a playlist e voltar. Fica recolhido por padrão pra não atrapalhar.
 */
export function MusicButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  const openSpotify = (path: string, webUrl: string) => {
    playClick();
    // Tenta o app nativo; se não abrir em ~1.2s, cai pra versão web.
    const t = window.setTimeout(() => window.open(webUrl, "_blank", "noopener,noreferrer"), 1200);
    try {
      window.location.href = path;
      window.addEventListener("blur", () => window.clearTimeout(t), { once: true });
    } catch {
      window.clearTimeout(t);
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { playClick(); setOpen(true); }}
        className={cn(
          "fixed bottom-4 left-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/25 transition-transform active:scale-95",
          className,
        )}
        aria-label="Música"
      >
        <Music className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40 w-[min(86vw,18rem)] rounded-2xl border border-border/50 bg-card/95 p-3 shadow-xl backdrop-blur">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-bold">
          <Music className="h-4 w-4 text-emerald-500" /> Música
        </span>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>
      <p className="mb-2.5 text-[11px] leading-snug text-muted-foreground">
        Abra o Spotify para escolher sua playlist de treino — o treino continua salvo aqui.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => openSpotify("spotify:playlist:37i9dQZF1DX76Wlfdnj7AP", "https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP")}
          className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
        >
          <Music className="h-4 w-4" /> Playlist Beast Mode
        </button>
        <button
          type="button"
          onClick={() => openSpotify("spotify:", "https://open.spotify.com")}
          className="flex items-center justify-center gap-2 rounded-xl border border-border/60 px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50"
        >
          <ExternalLink className="h-4 w-4" /> Abrir Spotify
        </button>
      </div>
    </div>
  );
}
