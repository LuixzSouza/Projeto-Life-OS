"use client";

import { useEffect, useRef } from "react";

// Mantém a tela acordada enquanto `active` for true (Screen Wake Lock API).
// Reativa sozinho ao voltar para a aba (o lock cai quando a página é ocultada).
// Degrada em silêncio onde a API não existe (ex.: alguns navegadores/iOS antigos).

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
}

export function useWakeLock(active: boolean): void {
  const sentinel = useRef<WakeLockSentinelLike | null>(null);

  useEffect(() => {
    if (!active) return;

    const nav = navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    };
    if (!nav.wakeLock) return;

    let cancelled = false;

    const request = async () => {
      try {
        const s = await nav.wakeLock!.request("screen");
        if (cancelled) { void s.release(); return; }
        sentinel.current = s;
      } catch {
        /* negado/sem suporte — ignora */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && !sentinel.current?.released) void request();
    };

    void request();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      const s = sentinel.current;
      sentinel.current = null;
      if (s && !s.released) void s.release();
    };
  }, [active]);
}
