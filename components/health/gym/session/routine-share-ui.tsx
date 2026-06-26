"use client";

import { useState } from "react";
import { Share2, Download, X, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { buildShareLink, decodeRoutines } from "./routine-share";
import { decodePlans, type SharedPlan } from "./plan-share";
import { copyToClipboard } from "@/lib/clipboard";
import { playClick } from "./sfx";
import type { Routine } from "./session-types";

/** Botão de compartilhar uma rotina: gera o link e usa Web Share / clipboard. */
export function RoutineShareButton({ routine, className }: { routine: Routine; className?: string }) {
  const share = async (e: React.MouseEvent) => {
    e.stopPropagation();
    playClick();
    const url = buildShareLink([routine]);
    const text = `Treino "${routine.name}" (${routine.exercises.length} exercícios) — abra no Life OS:`;
    try {
      if (typeof navigator !== "undefined" && "share" in navigator) {
        await navigator.share({ title: routine.name, text, url });
        return;
      }
    } catch {
      /* usuário cancelou ou share indisponível — cai pro clipboard */
    }
    if (await copyToClipboard(url)) {
      toast.success("Link da rotina copiado — cole no WhatsApp pro seu amigo!");
    } else {
      toast.error("Não consegui copiar o link.");
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      className={className ?? "text-muted-foreground transition-colors hover:text-primary"}
      aria-label={`Compartilhar rotina ${routine.name}`}
      title="Compartilhar rotina"
    >
      <Share2 className="h-3.5 w-3.5" />
    </button>
  );
}

/** Botão + caixa de colar pra importar rotinas OU fichas de um código/link.
 *  Rotina (?import=, Base64) e ficha (?planimport=, lz-string) têm formatos
 *  diferentes — aqui tentamos os dois, então qualquer código colado funciona. */
export function ImportRoutineButton({
  onImport,
  onImportPlans,
}: {
  onImport: (routines: Routine[]) => void;
  onImportPlans?: (plans: SharedPlan[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");

  const submit = () => {
    const routines = decodeRoutines(value);
    if (routines) {
      onImport(routines);
      toast.success(`${routines.length} rotina${routines.length > 1 ? "s" : ""} importada${routines.length > 1 ? "s" : ""}! 🎉`);
      setValue("");
      setOpen(false);
      return;
    }
    // Não é rotina? Tenta como FICHA (código do construtor de fichas).
    const plans = onImportPlans ? decodePlans(value) : null;
    if (plans) {
      onImportPlans!(plans);
      setValue("");
      setOpen(false);
      return;
    }
    toast.error("Código inválido. Cole o link ou o código completo da rotina/ficha.");
  };

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => { playClick(); setOpen(true); }}>
        <Download className="h-3.5 w-3.5" /> Importar rotina
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-xl border border-border/50 bg-card p-2.5">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold">
          <ClipboardPaste className="h-3.5 w-3.5 text-primary" /> Colar link/código (rotina ou ficha)
        </span>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Fechar">
          <X className="h-4 w-4" />
        </button>
      </div>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cole aqui o link recebido (ou só o código)…"
        className="h-16 w-full resize-none rounded-lg border border-border/50 bg-background px-2.5 py-2 text-xs outline-none focus:border-primary/50"
      />
      <Button type="button" size="sm" className="h-8 w-full gap-1.5 text-xs" onClick={submit} disabled={!value.trim()}>
        <Download className="h-3.5 w-3.5" /> Importar
      </Button>
    </div>
  );
}
