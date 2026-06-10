"use client";

import { useEffect, useRef, useState } from "react";
import { Music, X, ExternalLink, SkipBack, SkipForward, Play, Pause, Link2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { playClick } from "./sfx";
import {
  isSpotifyConfigured, isSpotifyConnected, beginSpotifyAuth, disconnectSpotify,
  getNowPlaying, spotifyControl, type NowPlaying, type SpotifyAction,
} from "./spotify";

/**
 * Música na sessão de treino. Com NEXT_PUBLIC_SPOTIFY_CLIENT_ID configurado e a
 * conta conectada (OAuth PKCE), vira um mini-player de verdade: mostra a faixa
 * tocando em QUALQUER aparelho (app do celular/desktop) com voltar/pausar/pular.
 * Sem configuração, mantém o atalho que abre o Spotify sem perder o treino.
 */
export function MusicButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [now, setNow] = useState<NowPlaying | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Estado de conexão só no cliente (evita mismatch de hidratação).
  useEffect(() => { setConnected(isSpotifyConnected()); }, []);

  // Conectado e aberto → consulta a faixa atual a cada 5s (para ao fechar).
  useEffect(() => {
    if (!open || !connected) {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      return;
    }
    let active = true;
    const tick = async () => {
      const np = await getNowPlaying();
      if (active) setNow(np);
    };
    void tick();
    pollRef.current = setInterval(tick, 5000);
    return () => {
      active = false;
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [open, connected]);

  const control = async (action: SpotifyAction) => {
    playClick();
    if (busy) return;
    setBusy(true);
    try {
      await spotifyControl(action);
      // Reflexo otimista + leitura logo em seguida (a API demora a propagar).
      if (action === "pause") setNow((n) => (n ? { ...n, isPlaying: false } : n));
      if (action === "play") setNow((n) => (n ? { ...n, isPlaying: true } : n));
      setTimeout(async () => setNow(await getNowPlaying()), 600);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao controlar o Spotify.");
    } finally {
      setBusy(false);
    }
  };

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

      {connected ? (
        <>
          {/* Agora tocando (em qualquer aparelho da conta) */}
          <div className="mb-2.5 min-h-[2.25rem]">
            {now ? (
              <>
                <p className="truncate text-sm font-semibold">{now.track}</p>
                <p className="truncate text-[11px] text-muted-foreground">{now.artist}</p>
              </>
            ) : (
              <p className="text-[11px] leading-snug text-muted-foreground">
                Nada tocando agora — dê o play no app do Spotify que a faixa aparece aqui.
              </p>
            )}
          </div>
          <div className="mb-2 flex items-center justify-center gap-2">
            <button type="button" disabled={busy} onClick={() => control("previous")} className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50" aria-label="Faixa anterior">
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => control(now?.isPlaying ? "pause" : "play")}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow transition-transform active:scale-95 disabled:opacity-50"
              aria-label={now?.isPlaying ? "Pausar" : "Tocar"}
            >
              {now?.isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 pl-0.5" />}
            </button>
            <button type="button" disabled={busy} onClick={() => control("next")} className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 text-foreground transition-colors hover:bg-muted/50 disabled:opacity-50" aria-label="Próxima faixa">
              <SkipForward className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => { disconnectSpotify(); setConnected(false); setNow(null); }}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
          >
            <Unlink className="h-3 w-3" /> Desconectar Spotify
          </button>
        </>
      ) : (
        <>
          <p className="mb-2.5 text-[11px] leading-snug text-muted-foreground">
            {isSpotifyConfigured()
              ? "Conecte sua conta para ver a faixa tocando e pular/pausar sem sair do treino."
              : "Abra o Spotify para escolher sua playlist de treino — o treino continua salvo aqui."}
          </p>
          <div className="flex flex-col gap-2">
            {isSpotifyConfigured() && (
              <button
                type="button"
                onClick={() => { playClick(); void beginSpotifyAuth(); }}
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
              >
                <Link2 className="h-4 w-4" /> Conectar Spotify
              </button>
            )}
            <button
              type="button"
              onClick={() => openSpotify("spotify:playlist:37i9dQZF1DX76Wlfdnj7AP", "https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP")}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                isSpotifyConfigured()
                  ? "border border-border/60 text-foreground hover:bg-muted/50"
                  : "bg-emerald-500 text-white hover:bg-emerald-600",
              )}
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
        </>
      )}
    </div>
  );
}
