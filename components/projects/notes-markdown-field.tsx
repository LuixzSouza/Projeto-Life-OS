"use client";

// Campo de "Notas e Observações" com Markdown: toolbar (negrito, itálico, título,
// listas, checkbox, link, código) + abas Escrever/Prévia. Controlado (o valor é
// estado do pai) para conviver com o preenchimento automático do formulário, e
// participa do submit via `name` (textarea na aba Escrever; hidden na Prévia).

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Textarea } from "@/components/ui/textarea";
import { Bold, Italic, Heading2, List, ListChecks, Link2, Code, Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface NotesMarkdownFieldProps {
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function NotesMarkdownField({ name, value, onChange, placeholder }: NotesMarkdownFieldProps) {
  // Callback ref guardado em STATE (não useRef): ler state no render/handler é
  // permitido pelo React Compiler; acessar ref.current no render, não.
  const [el, setEl] = useState<HTMLTextAreaElement | null>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");

  // Reposiciona o cursor após o React aplicar o novo valor (próximo frame).
  const restoreCursor = (pos: number) => {
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  // Envolve a seleção com marcadores (negrito/itálico/código/link).
  const wrap = (prefix: string, suffix: string, ph: string) => {
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const sel = value.slice(start, end) || ph;
    onChange(value.slice(0, start) + prefix + sel + suffix + value.slice(end));
    restoreCursor(start + prefix.length + sel.length);
  };

  // Aplica um prefixo no início da linha atual (títulos, listas, checkbox).
  const linePrefix = (prefix: string) => {
    if (!el) return;
    const start = el.selectionStart;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    onChange(value.slice(0, lineStart) + prefix + value.slice(lineStart));
    restoreCursor(start + prefix.length);
  };

  const tools = [
    { icon: Bold, title: "Negrito", run: () => wrap("**", "**", "texto") },
    { icon: Italic, title: "Itálico", run: () => wrap("_", "_", "texto") },
    { icon: Heading2, title: "Título", run: () => linePrefix("## ") },
    { icon: List, title: "Lista", run: () => linePrefix("- ") },
    { icon: ListChecks, title: "Checklist", run: () => linePrefix("- [ ] ") },
    { icon: Link2, title: "Link", run: () => wrap("[", "](url)", "texto") },
    { icon: Code, title: "Código", run: () => wrap("`", "`", "code") },
  ];

  return (
    <div className="rounded-xl border border-border/40 bg-muted/40 overflow-hidden focus-within:ring-1 focus-within:ring-primary/20 focus-within:bg-background transition-colors">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 border-b border-border/40 px-1.5 py-1 bg-background/60">
        {tools.map((t) => (
          <button
            key={t.title}
            type="button"
            title={t.title}
            aria-label={t.title}
            onClick={t.run}
            disabled={tab === "preview"}
            className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            <t.icon className="h-3.5 w-3.5" />
          </button>
        ))}
        <div className="ml-auto flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-all",
                tab === t ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t === "write" ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {t === "write" ? "Escrever" : "Prévia"}
            </button>
          ))}
        </div>
      </div>

      {tab === "write" ? (
        <Textarea
          ref={setEl}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="min-h-[140px] border-0 bg-transparent rounded-none p-3.5 text-sm focus-visible:ring-0 resize-y"
        />
      ) : (
        <>
          <div className="prose prose-sm dark:prose-invert max-w-none p-3.5 min-h-[140px] prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none">
            {value.trim() ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nada para pré-visualizar ainda.</p>
            )}
          </div>
          {/* Mantém o valor no submit mesmo com a textarea desmontada. */}
          <input type="hidden" name={name} value={value} />
        </>
      )}

      <p className="px-3.5 pb-2 pt-0.5 text-[10px] text-muted-foreground">
        Suporta Markdown: **negrito**, listas, - [ ] checklists, links. Usado também pela IA.
      </p>
    </div>
  );
}
