"use client";

import { useMemo, useState, type ReactNode, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MeetingTokenFieldProps {
  label: string;
  icon?: ReactNode;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  /** Texto curto explicando pra que serve o campo. */
  hint?: string;
  /** Decisões: chips em bloco (texto longo, um por linha) em vez de inline. */
  block?: boolean;
  max?: number;
  /** Sugestões de autocomplete (ex.: nomes das Conexões nos Participantes). */
  suggestions?: string[];
}

/** Busca sem acento/caixa ("joao" acha "João"). */
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function MeetingTokenField({
  label, icon, values, onChange, placeholder, hint, block = false, max = 50, suggestions,
}: MeetingTokenFieldProps) {
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  // Sugestões filtradas: casam com o rascunho e ainda não foram adicionadas.
  const matches = useMemo(() => {
    if (!suggestions?.length || !draft.trim()) return [];
    const q = norm(draft.trim());
    const taken = new Set(values.map(norm));
    return suggestions
      .filter((s) => !taken.has(norm(s)) && norm(s).includes(q))
      .slice(0, 6);
  }, [suggestions, draft, values]);

  const add = (value?: string) => {
    const v = (value ?? draft).trim();
    if (!v) return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) { setDraft(""); setActiveIdx(-1); return; }
    if (values.length >= max) return;
    onChange([...values, v]);
    setDraft("");
    setActiveIdx(-1);
  };

  const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (matches.length > 0 && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      e.preventDefault();
      setActiveIdx((i) => {
        const delta = e.key === "ArrowDown" ? 1 : -1;
        return (i + delta + matches.length) % matches.length;
      });
      return;
    }
    if (e.key === "Escape" && matches.length > 0) { setActiveIdx(-1); setDraft(""); return; }
    if (e.key === "Enter" || (!block && e.key === ",")) {
      e.preventDefault();
      // Enter com sugestão navegada (ou única) escolhe ela; senão usa o que digitou.
      if (activeIdx >= 0 && matches[activeIdx]) add(matches[activeIdx]);
      else add();
    } else if (e.key === "Backspace" && !draft && values.length) remove(values.length - 1);
  };

  const showSuggestions = focused && matches.length > 0;

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
        {icon}{label}
        {values.length > 0 && <span className="text-muted-foreground/50">· {values.length}</span>}
      </label>
      {hint && <p className="text-[11px] leading-snug text-muted-foreground/60">{hint}</p>}

      {values.length > 0 && (
        <div className={cn("flex gap-1.5", block ? "flex-col" : "flex-wrap")}>
          {values.map((v, i) => (
            <span
              key={i}
              className={cn(
                "group inline-flex items-center gap-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium",
                block ? "px-2.5 py-1.5 w-full justify-between" : "px-2 py-1",
              )}
            >
              <span className={cn(block ? "flex-1" : "", "break-words")}>{v}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 rounded-full p-0.5 text-primary/60 hover:bg-primary/20 hover:text-primary transition-colors"
                aria-label={`Remover ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setActiveIdx(-1); }}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          // Pequeno atraso no blur: o mousedown da sugestão precisa disparar antes.
          onBlur={() => { setTimeout(() => setFocused(false), 120); add(); }}
          placeholder={placeholder}
          className="h-8 rounded-lg border-border/40 bg-muted/20 px-2.5 text-[13px]"
        />

        {/* Autocomplete (ex.: Conexões nos Participantes) */}
        {showSuggestions && (
          <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border/50 bg-popover shadow-xl animate-in fade-in slide-in-from-top-1 duration-150">
            {matches.map((m, i) => (
              <button
                key={m}
                type="button"
                // mousedown (não click): dispara antes do blur do input.
                onMouseDown={(e) => { e.preventDefault(); add(m); }}
                onMouseEnter={() => setActiveIdx(i)}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-left text-[13px] font-medium transition-colors",
                  i === activeIdx ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/60",
                )}
              >
                {m}
              </button>
            ))}
            <p className="border-t border-border/40 px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-muted-foreground/50">
              das suas Conexões · ↑↓ e Enter
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
