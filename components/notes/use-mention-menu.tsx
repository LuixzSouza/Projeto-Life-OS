"use client";

import { useCallback, useMemo, useState, type RefObject } from "react";
import { Briefcase, FileText, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCaretCoordinates } from "@/components/projects/notes-caret";

/**
 * Menu de menção "@" reutilizável para qualquer <textarea> de Markdown.
 *
 * A inserção do link é DELEGADA via `onPick(markdown, from, to)` porque cada
 * editor edita de um jeito diferente (controlado vs. execCommand/surgicalEdit).
 * O hook só cuida da detecção do "@", filtragem, navegação por teclado e do popover.
 */

export interface Mentionables {
  notes: { id: string; title: string }[];
  projects: { id: string; title: string; slug: string }[];
  tasks?: { id: string; title: string; projectSlug: string }[];
}

interface MentionItem {
  kind: "note" | "project" | "task";
  label: string;
  href: string;
}

interface MentionState {
  pos: number;   // índice do "@" no texto
  query: string; // termo digitado após o "@"
  index: number; // item selecionado no menu
  top: number;
  left: number;
}

export function useMentionMenu({
  textareaRef,
  mentionables,
  onPick,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  mentionables?: Mentionables;
  /** Substitui o intervalo [from, to) do texto pelo markdown do link escolhido. */
  onPick: (markdown: string, from: number, to: number) => void;
}) {
  const [state, setState] = useState<MentionState | null>(null);

  const items = useMemo<MentionItem[]>(() => {
    if (!state || !mentionables) return [];
    const q = state.query.toLowerCase();
    const projects = mentionables.projects.map((p) => ({ kind: "project" as const, label: p.title, href: `/projects/${p.slug}` }));
    const notes = mentionables.notes.map((n) => ({ kind: "note" as const, label: n.title, href: `/notes/${n.id}` }));
    const tasks = (mentionables.tasks ?? []).map((t) => ({ kind: "task" as const, label: t.title, href: `/projects/${t.projectSlug}?task=${t.id}` }));
    const all = [...projects, ...notes, ...tasks];
    const filtered = q ? all.filter((i) => i.label.toLowerCase().includes(q)) : all;
    return filtered.slice(0, 8);
  }, [state, mentionables]);

  const close = useCallback(() => setState(null), []);

  /** Detecta um "@" (início ou após espaço) com o cursor logo após e abre o menu. */
  const detect = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta || !mentionables) { setState(null); return; }
    const pos = ta.selectionStart;
    if (pos !== ta.selectionEnd) { setState(null); return; }
    const before = ta.value.slice(0, pos);
    const m = before.match(/(?:^|\s)@([\p{L}\p{N}_]*)$/u);
    if (!m) { setState(null); return; }
    const query = m[1];
    const atPos = pos - query.length - 1;
    const c = getCaretCoordinates(ta, atPos);
    setState((prev) =>
      prev && prev.pos === atPos && prev.query === query
        ? prev
        : { pos: atPos, query, index: 0, top: c.top - ta.scrollTop + c.height + 4, left: c.left - ta.scrollLeft },
    );
  }, [mentionables, textareaRef]);

  const pick = useCallback((item: MentionItem) => {
    const ta = textareaRef.current;
    if (!ta || !state) return;
    onPick(`[${item.label}](${item.href}) `, state.pos, ta.selectionStart);
    setState(null);
  }, [state, onPick, textareaRef]);

  /** Encaminhe o keydown do textarea aqui; devolve true se o menu consumiu a tecla. */
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>): boolean => {
    if (!state || items.length === 0) return false;
    if (e.key === "ArrowDown") { e.preventDefault(); setState((m) => (m ? { ...m, index: (m.index + 1) % items.length } : m)); return true; }
    if (e.key === "ArrowUp") { e.preventDefault(); setState((m) => (m ? { ...m, index: (m.index - 1 + items.length) % items.length } : m)); return true; }
    if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(items[state.index]); return true; }
    if (e.key === "Escape") { e.preventDefault(); setState(null); return true; }
    return false;
  }, [state, items, pick]);

  const menu = state && items.length > 0 ? (
    <div
      className="absolute z-50 max-h-64 w-64 overflow-y-auto rounded-lg border border-border/60 bg-popover p-1 shadow-lg"
      style={{ top: state.top, left: state.left }}
      onMouseDown={(e) => e.preventDefault()}
    >
      <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
        Vincular a…
      </p>
      {items.map((it, i) => (
        <button
          key={`${it.kind}-${it.href}`}
          type="button"
          onClick={() => pick(it)}
          onMouseEnter={() => setState((m) => (m ? { ...m, index: i } : m))}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
            i === state.index ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50",
          )}
        >
          {it.kind === "project"
            ? <Briefcase className="h-4 w-4 shrink-0 text-muted-foreground" />
            : it.kind === "task"
              ? <ListTodo className="h-4 w-4 shrink-0 text-muted-foreground" />
              : <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />}
          <span className="truncate">{it.label}</span>
          <span className="ml-auto shrink-0 text-[10px] text-muted-foreground/60">
            {it.kind === "project" ? "projeto" : it.kind === "task" ? "tarefa" : "nota"}
          </span>
        </button>
      ))}
    </div>
  ) : null;

  return { menu, detect, onKeyDown, close, isOpen: !!state };
}
