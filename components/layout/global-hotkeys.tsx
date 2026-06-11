"use client";

// Atalhos de teclado globais (#roadmap §5):
//   Ctrl/⌘+K  → busca global (já existia, listado aqui no cheatsheet)
//   Ctrl+J    → Inbox Mágica (já existia)
//   n         → captura rápida (Inbox Mágica: vira tarefa/nota/evento)
//   t         → Modo Foco (timer)
//   g + letra → navegação ("g p" projetos, "g a" agenda, ...)
//   ?         → cheatsheet com todos os atalhos
// Ignora quando o usuário está digitando (input/textarea/contenteditable).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";
import { FOCUS_OPEN_EVENT } from "@/components/focus/focus-core";
import { MAGIC_INBOX_OPEN_EVENT } from "@/components/ai/magic-inbox";

const GO: Record<string, { href: string; label: string }> = {
  d: { href: "/dashboard", label: "Visão Geral" },
  p: { href: "/projects", label: "Projetos" },
  a: { href: "/agenda", label: "Agenda" },
  n: { href: "/notes", label: "Notas" },
  f: { href: "/finance", label: "Financeiro" },
  e: { href: "/studies", label: "Estudos" },
  h: { href: "/health", label: "Saúde" },
  i: { href: "/ai", label: "Assistente IA" },
  c: { href: "/social", label: "Conexões" },
  s: { href: "/settings", label: "Configurações" },
  t: { href: "/timeline", label: "Linha do Tempo" },
};

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function GlobalHotkeys() {
  const router = useRouter();
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  // Modo "g": aguardando a 2ª tecla da sequência de navegação.
  const goMode = useRef<number | null>(null);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e.target)) return;

      const key = e.key.toLowerCase();

      // 2ª tecla da sequência "g + x"
      if (goMode.current !== null) {
        const armedAt = goMode.current;
        goMode.current = null;
        if (Date.now() - armedAt < 1500 && GO[key]) {
          e.preventDefault();
          router.push(GO[key].href);
          return;
        }
      }

      if (key === "g") {
        goMode.current = Date.now();
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setCheatsheetOpen((o) => !o);
        return;
      }
      if (key === "n") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(MAGIC_INBOX_OPEN_EVENT));
        return;
      }
      if (key === "t") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(FOCUS_OPEN_EVENT));
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [router]);

  return (
    <Dialog open={cheatsheetOpen} onOpenChange={setCheatsheetOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-primary" /> Atalhos de teclado
          </DialogTitle>
          <DialogDescription>
            Funciona em qualquer tela (fora de campos de texto).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Globais</p>
            {[
              { keys: ["Ctrl", "K"], label: "Busca global (tudo num lugar só)" },
              { keys: ["Ctrl", "J"], label: "Inbox Mágica (captura por IA)" },
              { keys: ["n"], label: "Captura rápida (nova tarefa/nota)" },
              { keys: ["t"], label: "Modo Foco (Pomodoro)" },
              { keys: ["?"], label: "Este cheatsheet" },
            ].map((s) => (
              <div key={s.label} className="flex items-center justify-between gap-3 py-0.5">
                <span className="text-muted-foreground">{s.label}</span>
                <span className="flex gap-1 shrink-0">
                  {s.keys.map((k) => (
                    <kbd key={k} className="rounded bg-muted px-1.5 py-0.5 text-xs font-sans border border-border/60">{k}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Navegação — pressione <kbd className="rounded bg-muted px-1 text-xs border border-border/60">g</kbd> e depois:
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              {Object.entries(GO).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="text-muted-foreground truncate">{v.label}</span>
                  <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-sans border border-border/60 shrink-0">{k}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
