"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadActiveSession } from "./session-storage";

/** Botão que leva ao treino ao vivo; vira "Retomar" se houver sessão em andamento. */
export function StartLiveButton({ className }: { className?: string }) {
  const [hasActive, setHasActive] = useState(false);

  useEffect(() => {
    const check = () => {
      const s = loadActiveSession();
      setHasActive(!!s && !s.finishedAt);
    };
    check();
    // Reavalia ao voltar para a aba (pode ter finalizado em outra navegação).
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, []);

  return (
    <Link
      href="/health/gym/session"
      className={cn(
        "inline-flex h-9 items-center gap-2 rounded-lg px-4 text-xs font-semibold shadow-sm transition-colors",
        hasActive
          ? "bg-emerald-500 text-white hover:bg-emerald-600"
          : "bg-primary text-primary-foreground hover:bg-primary/90",
        className,
      )}
    >
      {hasActive ? (
        <>
          <Radio className="h-4 w-4 animate-pulse" /> Retomar treino
        </>
      ) : (
        <>
          <Play className="h-4 w-4" /> Treinar agora
        </>
      )}
    </Link>
  );
}
