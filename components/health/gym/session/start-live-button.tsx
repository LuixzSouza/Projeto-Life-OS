"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Play, Radio, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadActiveSession } from "./session-storage";

type StartLiveVariant = "compact" | "hero";

/**
 * Botão/CTA que leva ao treino ao vivo; vira "Retomar" se houver sessão em andamento.
 * - `compact` (default): botão pequeno (cabeçalhos/toolbars).
 * - `hero`: cartão-CTA grande e proeminente para o topo da página (ótimo no celular).
 * A detecção de sessão ativa é compartilhada pelas duas variantes.
 */
export function StartLiveButton({
  className,
  variant = "compact",
}: {
  className?: string;
  variant?: StartLiveVariant;
}) {
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

  if (variant === "hero") {
    return (
      <Link
        href="/health/gym/session"
        className={cn(
          "group flex items-center gap-4 rounded-2xl px-5 py-4 shadow-lg transition-transform active:scale-[0.99]",
          hasActive
            ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-emerald-500/20"
            : "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-primary/20",
          className,
        )}
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15">
          {hasActive ? (
            <Radio className="h-6 w-6 animate-pulse" />
          ) : (
            <Play className="h-6 w-6" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold leading-tight">
            {hasActive ? "Retomar treino" : "Treinar agora"}
          </span>
          <span className="block truncate text-xs opacity-90 sm:text-sm">
            {hasActive
              ? "Você tem um treino em andamento — continue de onde parou."
              : "Inicie sua sessão e registre as séries em tempo real."}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 opacity-90 transition-transform group-hover:translate-x-0.5" />
      </Link>
    );
  }

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
