"use client";

import { useState, type ReactNode, type KeyboardEvent } from "react";
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
}

export function MeetingTokenField({
  label, icon, values, onChange, placeholder, hint, block = false, max = 50,
}: MeetingTokenFieldProps) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (values.some((x) => x.toLowerCase() === v.toLowerCase())) { setDraft(""); return; }
    if (values.length >= max) return;
    onChange([...values, v]);
    setDraft("");
  };

  const remove = (idx: number) => onChange(values.filter((_, i) => i !== idx));

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || (!block && e.key === ",")) { e.preventDefault(); add(); }
    else if (e.key === "Backspace" && !draft && values.length) remove(values.length - 1);
  };

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

      <Input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
        placeholder={placeholder}
        className="h-8 rounded-lg border-border/40 bg-muted/20 px-2.5 text-[13px]"
      />
    </div>
  );
}
