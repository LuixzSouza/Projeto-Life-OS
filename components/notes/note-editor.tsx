"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold, Italic, Strikethrough, Heading2, List, Quote, Code, Link2, Eye, Pencil,
  Heading1, Heading3, ListOrdered, CheckSquare, Table, Minus, Image as ImageIcon,
  FileText, Briefcase, ListTodo, ListTree, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NoteImageGallery, countEmbeddedImages } from "@/components/notes/note-image-gallery";
import { CodeBlock } from "@/components/notes/code-block";

/**
 * Editor de notas em Markdown com:
 *  - Barra de formatação FLUTUANTE que surge sobre o texto selecionado.
 *  - Atalhos de teclado (Ctrl/Cmd + B/I/K/E).
 *  - Colar OU arrastar imagem como Base64, comprimida no cliente (portátil, sem bucket).
 *  - Auto-continuação de listas, citações e checkboxes ao pressionar Enter.
 *  - Alternância Editar / Visualizar (react-markdown + remark-gfm).
 *
 * O conteúdo continua sendo uma string simples (Markdown), então nada muda no
 * banco nem nas Server Actions — o textarea é só "incrementado".
 */

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB — base64 vive dentro do conteúdo da nota.
const MAX_IMAGE_DIMENSION = 1400;        // px no maior lado após redimensionar.
const IMAGE_QUALITY = 0.82;              // qualidade JPEG na compressão.

type WrapAction = { kind: "wrap"; before: string; after: string; placeholder: string };
type LineAction = { kind: "line"; prefix: string };
type ToolAction = WrapAction | LineAction;

interface ToolButton {
  icon: typeof Bold;
  label: string;
  action: ToolAction;
}

interface SlashCommand {
  icon: typeof Bold;
  label: string;
  keywords: string;
  insert: string;
  /** Posição do cursor relativa ao início do texto inserido (default: fim). */
  caretOffset?: number;
}

// Comandos de bloco acionados ao digitar "/" no início de uma linha.
const SLASH_COMMANDS: SlashCommand[] = [
  { icon: Heading1, label: "Título 1", keywords: "titulo heading h1", insert: "# " },
  { icon: Heading2, label: "Título 2", keywords: "titulo heading h2 subtitulo", insert: "## " },
  { icon: Heading3, label: "Título 3", keywords: "titulo heading h3", insert: "### " },
  { icon: List, label: "Lista", keywords: "lista bullet marcadores", insert: "- " },
  { icon: ListOrdered, label: "Lista numerada", keywords: "lista numerada ordenada", insert: "1. " },
  { icon: CheckSquare, label: "Tarefa", keywords: "tarefa checkbox todo afazer", insert: "- [ ] " },
  { icon: Quote, label: "Citação", keywords: "citacao quote bloco", insert: "> " },
  { icon: Code, label: "Bloco de código", keywords: "codigo code bloco", insert: "```\n\n```", caretOffset: 4 },
  { icon: Table, label: "Tabela", keywords: "tabela table grade", insert: "| Coluna | Coluna |\n| --- | --- |\n|  |  |\n" },
  { icon: Minus, label: "Divisória", keywords: "divisoria linha separador hr regua", insert: "---\n" },
  { icon: ImageIcon, label: "Imagem (URL)", keywords: "imagem image foto figura", insert: "![](url)", caretOffset: 2 },
];

const TOOLS: ToolButton[] = [
  { icon: Bold, label: "Negrito", action: { kind: "wrap", before: "**", after: "**", placeholder: "negrito" } },
  { icon: Italic, label: "Itálico", action: { kind: "wrap", before: "*", after: "*", placeholder: "itálico" } },
  { icon: Strikethrough, label: "Tachado", action: { kind: "wrap", before: "~~", after: "~~", placeholder: "tachado" } },
  { icon: Code, label: "Código", action: { kind: "wrap", before: "`", after: "`", placeholder: "código" } },
  { icon: Link2, label: "Link", action: { kind: "wrap", before: "[", after: "](https://)", placeholder: "texto" } },
  { icon: Heading2, label: "Título", action: { kind: "line", prefix: "## " } },
  { icon: List, label: "Lista", action: { kind: "line", prefix: "- " } },
  { icon: Quote, label: "Citação", action: { kind: "line", prefix: "> " } },
];

/** Calcula as coordenadas (px) de um índice de caractere dentro do textarea via "espelho". */
function getCaretCoordinates(el: HTMLTextAreaElement, position: number) {
  const div = document.createElement("div");
  const style = window.getComputedStyle(el);
  const copy = [
    "boxSizing", "width", "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "fontStyle", "fontVariant", "fontWeight", "fontStretch", "fontSize", "lineHeight", "fontFamily",
    "textAlign", "textTransform", "textIndent", "letterSpacing", "wordSpacing", "tabSize",
  ] as const;
  for (const prop of copy) {
    div.style[prop as never] = style[prop as never];
  }
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordWrap = "break-word";
  div.style.overflow = "hidden";
  document.body.appendChild(div);

  div.textContent = el.value.substring(0, position);
  const span = document.createElement("span");
  span.textContent = el.value.substring(position) || ".";
  div.appendChild(span);

  const coords = {
    top: span.offsetTop,
    left: span.offsetLeft,
    height: parseInt(style.lineHeight) || 18,
  };
  document.body.removeChild(div);
  return coords;
}

// Atalhos: tecla (minúscula) → ação de formatação.
const SHORTCUTS: Record<string, ToolAction> = {
  b: { kind: "wrap", before: "**", after: "**", placeholder: "negrito" },
  i: { kind: "wrap", before: "*", after: "*", placeholder: "itálico" },
  e: { kind: "wrap", before: "`", after: "`", placeholder: "código" },
  k: { kind: "wrap", before: "[", after: "](https://)", placeholder: "texto" },
};

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("decode-failed"));
    img.src = src;
  });
}

/** Estima os bytes reais de um data URL base64 (ignora o cabeçalho). */
function dataUrlBytes(dataUrl: string): number {
  const i = dataUrl.indexOf(",");
  if (i === -1) return dataUrl.length;
  return Math.ceil((dataUrl.length - i - 1) * 3 / 4);
}

/** Redimensiona/comprime a imagem no cliente; devolve um data URL menor quando possível. */
async function compressImage(file: File): Promise<string> {
  const original = await readAsDataURL(file);
  // GIF passaria a perder a animação no canvas — embute como veio.
  if (file.type === "image/gif") return original;

  const img = await loadImage(original);
  const longest = Math.max(img.width, img.height) || 1;
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / longest);
  // Já é pequena o bastante: não recodifica.
  if (scale === 1 && file.size < 300 * 1024) return original;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return original;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // PNG preserva transparência; o resto vira JPEG (bem menor).
  const compressed = file.type === "image/png"
    ? canvas.toDataURL("image/png")
    : canvas.toDataURL("image/jpeg", IMAGE_QUALITY);

  // Só usa o resultado se realmente ficou menor.
  return compressed.length < original.length ? compressed : original;
}

export function NoteEditor({
  value,
  onChange,
  placeholder = "Escreva sua anotação… (suporta **Markdown**)",
  onUploadImage,
  mentionables,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Se fornecido, a imagem é salva e a nota recebe uma URL curta em vez do Base64. */
  onUploadImage?: (dataUrl: string) => Promise<string | null>;
  /** Notas, projetos e tarefas para o menu de menção "@" (navegação estilo Notion). */
  mentionables?: {
    notes: { id: string; title: string }[];
    projects: { id: string; title: string; slug: string }[];
    tasks?: { id: string; title: string; projectSlug: string }[];
  };
}) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<"edit" | "preview" | "gallery">("edit");
  const [bar, setBar] = useState<{ top: number; left: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  // Menu de slash commands: posição do "/" na linha + texto digitado após ele.
  const [slash, setSlash] = useState<{ pos: number; query: string } | null>(null);
  const [slashCoords, setSlashCoords] = useState<{ top: number; left: number } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  // Menu de menção "@": posição do "@" + texto digitado após ele.
  const [mention, setMention] = useState<{ pos: number; query: string } | null>(null);
  const [mentionCoords, setMentionCoords] = useState<{ top: number; left: number } | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  // Seleção a reaplicar após a próxima atualização controlada do valor.
  const pendingSel = useRef<{ start: number; end: number } | null>(null);

  // Histórico próprio (undo/redo): textarea controlado + inserções programáticas
  // quebram o undo nativo, então mantemos nossa pilha.
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const lastPush = useRef(0);

  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const imageCount = useMemo(() => countEmbeddedImages(value), [value]);
  // Tempo de leitura (~200 ppm) — toque de editor profissional.
  const readingMin = wordCount > 0 ? Math.max(1, Math.ceil(wordCount / 200)) : 0;

  // ESTRUTURA (Obsidian-like): índice dos títulos (#, ##, ###) com clique p/ pular.
  // Ignora títulos dentro de blocos de código. `index` é o offset do início da linha.
  const [showOutline, setShowOutline] = useState(false);
  const outline = useMemo(() => {
    const items: { level: number; text: string; index: number }[] = [];
    let inFence = false;
    let idx = 0;
    for (const line of value.split("\n")) {
      if (/^\s*```/.test(line)) inFence = !inFence;
      else if (!inFence) {
        const m = line.match(/^(#{1,3})\s+(.+?)\s*$/);
        if (m) items.push({ level: m[1].length, text: m[2], index: idx });
      }
      idx += line.length + 1; // +1 do "\n"
    }
    return items;
  }, [value]);

  // Comandos filtrados pelo texto digitado após a "/".
  const slashList = useMemo(() => {
    if (!slash) return [];
    const q = slash.query.toLowerCase();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter((c) => c.label.toLowerCase().includes(q) || c.keywords.includes(q));
  }, [slash]);

  // Itens de menção (projetos + notas) filtrados pelo texto após "@".
  const mentionList = useMemo(() => {
    if (!mention || !mentionables) return [];
    const q = mention.query.toLowerCase();
    const projects = mentionables.projects.map((p) => ({ kind: "project" as const, label: p.title, href: `/projects/${p.slug}` }));
    const notes = mentionables.notes.map((n) => ({ kind: "note" as const, label: n.title, href: `/notes/${n.id}` }));
    const tasks = (mentionables.tasks ?? []).map((t) => ({ kind: "task" as const, label: t.title, href: `/projects/${t.projectSlug}?task=${t.id}` }));
    const all = [...projects, ...notes, ...tasks];
    const filtered = q ? all.filter((i) => i.label.toLowerCase().includes(q)) : all;
    return filtered.slice(0, 8);
  }, [mention, mentionables]);

  // Aplica uma mudança registrando o estado anterior no histórico (com coalescência).
  const commit = useCallback((next: string) => {
    const now = Date.now();
    if (!(now - lastPush.current < 500 && undoStack.current.length)) {
      undoStack.current.push(value);
      if (undoStack.current.length > 200) undoStack.current.shift();
    }
    lastPush.current = now;
    redoStack.current = [];
    onChange(next);
  }, [value, onChange]);

  const undo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const prev = undoStack.current.pop() as string;
    redoStack.current.push(value);
    lastPush.current = 0;
    pendingSel.current = { start: prev.length, end: prev.length };
    onChange(prev);
  }, [value, onChange]);

  const redo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const next = redoStack.current.pop() as string;
    undoStack.current.push(value);
    lastPush.current = 0;
    pendingSel.current = { start: next.length, end: next.length };
    onChange(next);
  }, [value, onChange]);


  /** Leva o cursor a um título e rola a janela até ele (clique no outline). */
  const jumpToHeading = useCallback((index: number) => {
    setShowOutline(false);
    setMode("edit");
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (!ta) return;
      ta.focus();
      const lineEnd = value.indexOf("\n", index);
      const caret = lineEnd === -1 ? value.length : lineEnd;
      ta.setSelectionRange(caret, caret);
      const coords = getCaretCoordinates(ta, index);
      const rect = ta.getBoundingClientRect();
      window.scrollTo({ top: window.scrollY + rect.top + coords.top - 120, behavior: "smooth" });
    });
  }, [value]);

  // Auto-crescimento: a área de escrita acompanha o conteúdo (feel de documento,
  // sem rolagem interna). Piso confortável de ~55vh para a página em branco.
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (!ta || mode !== "edit") return;
    ta.style.height = "auto";
    const floor = Math.round((typeof window !== "undefined" ? window.innerHeight : 800) * 0.55);
    ta.style.height = `${Math.max(ta.scrollHeight, floor)}px`;
  }, [value, mode]);

  /** Reavalia se há seleção e (re)posiciona a barra flutuante. */
  const syncBar = useCallback(() => {
    const ta = taRef.current;
    if (!ta || mode !== "edit") { setBar(null); return; }
    const { selectionStart: s, selectionEnd: e } = ta;
    if (s === e) { setBar(null); return; }

    const start = getCaretCoordinates(ta, s);
    const end = getCaretCoordinates(ta, e);
    const sameLine = Math.abs(start.top - end.top) < start.height / 2;
    const top = start.top - ta.scrollTop - 8; // 8px acima da seleção
    const left = sameLine ? (start.left + end.left) / 2 : start.left;
    setBar({
      top: Math.max(top, 0),
      left: Math.max(left - ta.scrollLeft, 0),
    });
  }, [mode]);

  // Reaplica a seleção depois que o valor controlado é atualizado.
  useLayoutEffect(() => {
    const ta = taRef.current;
    if (ta && pendingSel.current) {
      const { start, end } = pendingSel.current;
      pendingSel.current = null;
      ta.focus();
      ta.setSelectionRange(start, end);
      // rAF evita setState síncrono dentro do effect (cascading renders).
      requestAnimationFrame(syncBar);
    }
  }, [value, syncBar]);

  // Fecha a barra ao rolar a página/textarea ou clicar fora.
  useEffect(() => {
    if (!bar) return;
    const close = () => setBar(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [bar]);

  const applyTool = useCallback((action: ToolAction) => {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e } = ta;
    const selected = value.slice(s, e);

    if (action.kind === "wrap") {
      const inner = selected || action.placeholder;
      const next = value.slice(0, s) + action.before + inner + action.after + value.slice(e);
      pendingSel.current = {
        start: s + action.before.length,
        end: s + action.before.length + inner.length,
      };
      commit(next);
      return;
    }

    // kind === "line": prefixa cada linha tocada pela seleção (ou a linha do cursor).
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const lineEndIdx = value.indexOf("\n", e);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const block = value.slice(lineStart, lineEnd);
    const prefixed = block
      .split("\n")
      .map((ln) => (ln.startsWith(action.prefix) ? ln : action.prefix + ln))
      .join("\n");
    const next = value.slice(0, lineStart) + prefixed + value.slice(lineEnd);
    pendingSel.current = { start: lineStart, end: lineStart + prefixed.length };
    commit(next);
  }, [value, commit]);

  /** Insere texto na posição do cursor (usado pela colagem de imagem). */
  const insertAtCursor = useCallback((text: string) => {
    const ta = taRef.current;
    const s = ta?.selectionStart ?? value.length;
    const e = ta?.selectionEnd ?? value.length;
    const next = value.slice(0, s) + text + value.slice(e);
    pendingSel.current = { start: s + text.length, end: s + text.length };
    commit(next);
  }, [value, commit]);

  /** Comprime e embute uma imagem (usado por colar e arrastar-soltar). */
  const embedImageFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const toastId = toast.loading("Processando imagem…");
    try {
      const dataUrl = await compressImage(file);
      if (dataUrlBytes(dataUrl) > MAX_IMAGE_BYTES) {
        toast.error("Imagem ainda grande após compressão (máx. 2MB).", { id: toastId });
        return;
      }
      // Sobe a imagem (URL curta) para não poluir o texto com Base64; fallback inline.
      let ref = dataUrl;
      if (onUploadImage) {
        const url = await onUploadImage(dataUrl);
        if (url) ref = url;
      }
      insertAtCursor(`\n![imagem](${ref})\n`);
      toast.success("Imagem incorporada.", { id: toastId });
    } catch {
      toast.error("Não foi possível processar a imagem.", { id: toastId });
    }
  }, [insertAtCursor, onUploadImage]);

  /** Detecta uma "/" no início da linha (com cursor logo após) e abre o menu. */
  const detectSlash = useCallback(() => {
    const ta = taRef.current;
    if (!ta || mode !== "edit") { setSlash(null); return; }
    const pos = ta.selectionStart;
    if (pos !== ta.selectionEnd) { setSlash(null); return; }
    const text = ta.value;
    const lineStart = text.lastIndexOf("\n", pos - 1) + 1;
    const before = text.slice(lineStart, pos);
    const m = before.match(/^\/(\w*)$/);
    if (!m) { setSlash(null); return; }
    const query = m[1];
    // Reinicia a seleção do menu só quando o termo/posição muda (não durante navegação).
    if (!slash || slash.query !== query || slash.pos !== lineStart) setSlashIndex(0);
    setSlash((prev) =>
      prev && prev.pos === lineStart && prev.query === query ? prev : { pos: lineStart, query },
    );
    const c = getCaretCoordinates(ta, lineStart);
    setSlashCoords({ top: c.top - ta.scrollTop + c.height + 4, left: c.left - ta.scrollLeft });
  }, [mode, slash]);

  /** Substitui a "/comando" pelo bloco escolhido. */
  const runSlashCommand = useCallback((cmd: SlashCommand) => {
    const ta = taRef.current;
    if (!ta || !slash) return;
    const text = ta.value;
    const from = slash.pos;
    const to = ta.selectionStart;
    const next = text.slice(0, from) + cmd.insert + text.slice(to);
    const caret = from + (cmd.caretOffset ?? cmd.insert.length);
    pendingSel.current = { start: caret, end: caret };
    setSlash(null);
    commit(next);
  }, [slash, commit]);

  /** Detecta "@" (início ou após espaço) e abre o menu de menção. */
  const detectMention = useCallback(() => {
    const ta = taRef.current;
    if (!ta || mode !== "edit" || !mentionables) { setMention(null); return; }
    const pos = ta.selectionStart;
    if (pos !== ta.selectionEnd) { setMention(null); return; }
    const before = ta.value.slice(0, pos);
    const m = before.match(/(?:^|\s)@([\p{L}\p{N}_]*)$/u);
    if (!m) { setMention(null); return; }
    const query = m[1];
    const atPos = pos - query.length - 1;
    if (!mention || mention.query !== query || mention.pos !== atPos) setMentionIndex(0);
    setMention((prev) => (prev && prev.pos === atPos && prev.query === query ? prev : { pos: atPos, query }));
    const c = getCaretCoordinates(ta, atPos);
    setMentionCoords({ top: c.top - ta.scrollTop + c.height + 4, left: c.left - ta.scrollLeft });
  }, [mode, mention, mentionables]);

  /** Insere o link da menção escolhida (texto → [Título](/rota)). */
  const runMention = useCallback((item: { label: string; href: string }) => {
    const ta = taRef.current;
    if (!ta || !mention) return;
    const text = ta.value;
    const from = mention.pos;
    const to = ta.selectionStart;
    const insert = `[${item.label}](${item.href}) `;
    const next = text.slice(0, from) + insert + text.slice(to);
    const caret = from + insert.length;
    pendingSel.current = { start: caret, end: caret };
    setMention(null);
    commit(next);
  }, [mention, commit]);

  const handlePaste = useCallback((ev: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const file = Array.from(ev.clipboardData.items)
      .find((it) => it.kind === "file" && it.type.startsWith("image/"))
      ?.getAsFile();
    if (file) {
      ev.preventDefault();
      void embedImageFile(file);
      return;
    }

    // Link inteligente (estilo Notion): colar uma URL sobre um texto selecionado
    // transforma a seleção em [texto](url), em vez de substituí-la pela URL crua.
    const ta = taRef.current;
    const pasted = ev.clipboardData.getData("text/plain").trim();
    if (ta && pasted && /^https?:\/\/\S+$/.test(pasted) && ta.selectionStart !== ta.selectionEnd) {
      ev.preventDefault();
      const s = ta.selectionStart;
      const e = ta.selectionEnd;
      const sel = value.slice(s, e);
      const insert = `[${sel}](${pasted})`;
      const next = value.slice(0, s) + insert + value.slice(e);
      pendingSel.current = { start: s + insert.length, end: s + insert.length };
      commit(next);
    }
    // Senão: deixa o paste de texto normal seguir.
  }, [embedImageFile, value, commit]);

  const handleDrop = useCallback((ev: React.DragEvent<HTMLTextAreaElement>) => {
    const file = Array.from(ev.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    setDragging(false);
    if (!file) return;
    ev.preventDefault();
    void embedImageFile(file);
  }, [embedImageFile]);

  /** Atalhos de formatação, navegação do slash menu e auto-continuação de listas. */
  const handleKeyDown = useCallback((ev: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Menu de slash commands aberto: setas/Enter/Esc controlam o menu.
    if (slash && slashList.length > 0) {
      if (ev.key === "ArrowDown") {
        ev.preventDefault();
        setSlashIndex((i) => (i + 1) % slashList.length);
        return;
      }
      if (ev.key === "ArrowUp") {
        ev.preventDefault();
        setSlashIndex((i) => (i - 1 + slashList.length) % slashList.length);
        return;
      }
      if (ev.key === "Enter" || ev.key === "Tab") {
        ev.preventDefault();
        const cmd = slashList[slashIndex];
        if (cmd) runSlashCommand(cmd);
        return;
      }
      if (ev.key === "Escape") {
        ev.preventDefault();
        setSlash(null);
        return;
      }
    }

    // Menu de menção "@" aberto: setas/Enter/Esc controlam o menu.
    if (mention && mentionList.length > 0) {
      if (ev.key === "ArrowDown") { ev.preventDefault(); setMentionIndex((i) => (i + 1) % mentionList.length); return; }
      if (ev.key === "ArrowUp") { ev.preventDefault(); setMentionIndex((i) => (i - 1 + mentionList.length) % mentionList.length); return; }
      if (ev.key === "Enter" || ev.key === "Tab") {
        ev.preventDefault();
        const it = mentionList[mentionIndex];
        if (it) runMention(it);
        return;
      }
      if (ev.key === "Escape") { ev.preventDefault(); setMention(null); return; }
    }

    // Tab / Shift+Tab: indenta/desindenta a(s) linha(s) da seleção (listas, outlines).
    if (ev.key === "Tab") {
      ev.preventDefault();
      const ta = ev.currentTarget;
      const s = ta.selectionStart;
      const e = ta.selectionEnd;
      const lineStart = value.lastIndexOf("\n", s - 1) + 1;
      const lineEndIdx = value.indexOf("\n", e);
      const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
      const block = value.slice(lineStart, lineEnd);
      const lines = block.split("\n");
      const INDENT = "  ";
      let deltaStart: number;
      let deltaEnd: number;
      let newBlock: string;
      if (ev.shiftKey) {
        let firstRemoved = 0;
        let totalRemoved = 0;
        newBlock = lines
          .map((ln, i) => {
            const m = ln.match(/^( {1,2}|\t)/);
            if (!m) return ln;
            if (i === 0) firstRemoved = m[0].length;
            totalRemoved += m[0].length;
            return ln.slice(m[0].length);
          })
          .join("\n");
        deltaStart = -firstRemoved;
        deltaEnd = -totalRemoved;
      } else {
        newBlock = lines.map((ln) => INDENT + ln).join("\n");
        deltaStart = INDENT.length;
        deltaEnd = INDENT.length * lines.length;
      }
      const next = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
      pendingSel.current = {
        start: Math.max(lineStart, s + deltaStart),
        end: Math.max(lineStart, e + deltaEnd),
      };
      commit(next);
      return;
    }

    if (ev.metaKey || ev.ctrlKey) {
      const k = ev.key.toLowerCase();
      if (k === "z") { ev.preventDefault(); if (ev.shiftKey) redo(); else undo(); return; }
      if (k === "y") { ev.preventDefault(); redo(); return; }
      const action = SHORTCUTS[k];
      if (action) { ev.preventDefault(); applyTool(action); }
      return;
    }

    if (ev.key !== "Enter" || ev.shiftKey) return;
    const ta = ev.currentTarget;
    if (ta.selectionStart !== ta.selectionEnd) return; // com seleção: comportamento padrão

    const pos = ta.selectionStart;
    const lineStart = value.lastIndexOf("\n", pos - 1) + 1;
    const line = value.slice(lineStart, pos);
    // (indent)(bullet -*+> | n.) (espaço) (checkbox?) (conteúdo)
    const m = line.match(/^(\s*)(?:([-*+>])|(\d+)\.)(\s+)(\[[ xX]\]\s+)?(.*)$/);
    if (!m) return;
    const [, indent, bullet, num, space, checkbox, rest] = m;

    ev.preventDefault();
    // Item vazio → sai da lista removendo o marcador da linha.
    if (rest.trim() === "") {
      const next = value.slice(0, lineStart) + value.slice(pos);
      pendingSel.current = { start: lineStart, end: lineStart };
      commit(next);
      return;
    }

    const box = checkbox ? "[ ] " : "";
    const marker = bullet
      ? `${indent}${bullet}${space}${box}`
      : `${indent}${Number(num) + 1}.${space}${box}`;
    const insert = "\n" + marker;
    const next = value.slice(0, pos) + insert + value.slice(pos);
    pendingSel.current = { start: pos + insert.length, end: pos + insert.length };
    commit(next);
  }, [
    applyTool, value, commit, slash, slashList, slashIndex, runSlashCommand,
    mention, mentionList, mentionIndex, runMention, undo, redo,
  ]);

  return (
    <div className="relative">
      {/* Cabeçalho do editor: Estrutura (outline) · Editar / Visualizar / Imagens */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        {/* ESTRUTURA: índice dos títulos da nota (some quando não há títulos). */}
        <div className="relative">
          {outline.length > 0 ? (
            <button
              type="button"
              onClick={() => setShowOutline((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1 text-xs font-medium transition-colors",
                showOutline ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50",
              )}
              title="Estrutura da nota"
            >
              <ListTree className="h-3.5 w-3.5" /> Estrutura
              <span className="opacity-60">{outline.length}</span>
            </button>
          ) : (
            <span />
          )}

          {showOutline && outline.length > 0 && (
            <>
              {/* Backdrop p/ fechar ao clicar fora. */}
              <button
                type="button"
                aria-hidden
                tabIndex={-1}
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setShowOutline(false)}
              />
              <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-72 overflow-y-auto rounded-lg border border-border/60 bg-popover p-1 shadow-lg">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Estrutura
                </p>
                {outline.map((h, i) => (
                  <button
                    key={`${h.index}-${i}`}
                    type="button"
                    onClick={() => jumpToHeading(h.index)}
                    className="flex w-full items-center gap-2 rounded-md py-1.5 pr-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                    style={{ paddingLeft: 8 + (h.level - 1) * 14 }}
                  >
                    <span className={cn("truncate", h.level === 1 && "font-semibold text-foreground")}>{h.text}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="inline-flex rounded-lg border border-border/60 p-0.5">
          {([
            { id: "edit" as const, icon: Pencil, label: "Editar" },
            { id: "preview" as const, icon: Eye, label: "Visualizar" },
            { id: "gallery" as const, icon: ImageIcon, label: imageCount > 0 ? `Imagens (${imageCount})` : "Imagens" },
          ]).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setMode(t.id); setBar(null); setSlash(null); setMention(null); }}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                mode === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50",
              )}
            >
              <t.icon className="h-3.5 w-3.5" /> {t.label}
            </button>
          ))}
        </div>
      </div>

      {mode === "edit" ? (
        <div className="relative">
          <textarea
            ref={taRef}
            // Extensões (Grammarly etc.) injetam atributos no textarea → evita mismatch de hidratação.
            suppressHydrationWarning
            value={value}
            onChange={(e) => { commit(e.target.value); detectSlash(); detectMention(); }}
            onSelect={() => { syncBar(); detectSlash(); detectMention(); }}
            onMouseUp={() => { syncBar(); detectSlash(); detectMention(); }}
            onKeyUp={syncBar}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => { setBar(null); setSlash(null); setMention(null); }, 150)}
            onPaste={handlePaste}
            onDragOver={(e) => { e.preventDefault(); if (!dragging) setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            placeholder={placeholder}
            className={cn(
              // Superfície de documento: cresce com o conteúdo (sem rolagem interna),
              // tipografia confortável e visual limpo (feel Notion/Obsidian).
              "block w-full resize-none overflow-hidden rounded-2xl border border-border/40 bg-card/40 px-5 py-5 text-[15px] leading-8 shadow-sm transition-colors sm:px-8 sm:py-7",
              "placeholder:text-muted-foreground/50 focus-visible:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/10",
              "disabled:cursor-not-allowed disabled:opacity-50",
              dragging && "border-primary ring-2 ring-primary/20",
            )}
          />

          {/* Aviso de soltar imagem */}
          {dragging && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-md bg-primary/5">
              <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow">
                Solte a imagem para incorporar
              </span>
            </div>
          )}

          {/* Barra de formatação flutuante */}
          {bar && (
            <div
              className="absolute z-50 flex -translate-x-1/2 -translate-y-full items-center gap-0.5 rounded-lg border border-border/60 bg-popover p-1 shadow-lg"
              style={{ top: bar.top, left: bar.left }}
              // Evita perder a seleção do textarea ao clicar nos botões.
              onMouseDown={(e) => e.preventDefault()}
            >
              {TOOLS.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  title={t.label}
                  onClick={() => applyTool(t.action)}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <t.icon className="h-3.5 w-3.5" />
                </button>
              ))}
            </div>
          )}

          {/* Menu de slash commands */}
          {slash && slashCoords && slashList.length > 0 && (
            <div
              className="absolute z-50 max-h-64 w-60 overflow-y-auto rounded-lg border border-border/60 bg-popover p-1 shadow-lg"
              style={{ top: slashCoords.top, left: slashCoords.left }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {slashList.map((cmd, i) => (
                <button
                  key={cmd.label}
                  type="button"
                  onClick={() => runSlashCommand(cmd)}
                  onMouseEnter={() => setSlashIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    i === slashIndex ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50",
                  )}
                >
                  <cmd.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{cmd.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Menu de menção "@" (linkar/navegar para notas e projetos) */}
          {mention && mentionCoords && mentionList.length > 0 && (
            <div
              className="absolute z-50 max-h-64 w-64 overflow-y-auto rounded-lg border border-border/60 bg-popover p-1 shadow-lg"
              style={{ top: mentionCoords.top, left: mentionCoords.left }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                Vincular a…
              </p>
              {mentionList.map((it, i) => (
                <button
                  key={`${it.kind}-${it.href}`}
                  type="button"
                  onClick={() => runMention(it)}
                  onMouseEnter={() => setMentionIndex(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                    i === mentionIndex ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted/50",
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
          )}
        </div>
      ) : mode === "preview" ? (
        <div className="min-h-[55vh] rounded-2xl border border-border/40 bg-card/40 px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          {value.trim() ? (
            <div className="prose prose-base dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-img:rounded-lg prose-img:border prose-img:border-border/40">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                // Por padrão o react-markdown bloqueia data: e URLs "estranhas",
                // o que sumia com as imagens. Aqui liberamos a URL como veio.
                urlTransform={(u) => u}
                components={{
                  a: ({ href, children }) => {
                    const internal = href?.startsWith("/");
                    return (
                      <a
                        href={href}
                        target={internal ? undefined : "_blank"}
                        rel={internal ? undefined : "noopener noreferrer"}
                        className="font-medium text-primary underline underline-offset-2"
                      >
                        {children}
                      </a>
                    );
                  },
                  // Desempacota o <pre> para o nosso bloco não ficar aninhado nele.
                  pre: ({ children }) => <>{children}</>,
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || "");
                    const text = String(children).replace(/\n$/, "");
                    if (match || text.includes("\n")) {
                      return <CodeBlock language={match?.[1]} value={text} />;
                    }
                    return (
                      <code className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.85em] text-primary" {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nada para visualizar ainda.</p>
          )}
        </div>
      ) : (
        <div className="min-h-[40vh] rounded-2xl border border-border/40 bg-card/40 p-4 shadow-sm sm:p-5">
          <NoteImageGallery content={value} onChange={onChange} onUploadImage={onUploadImage} />
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          <kbd className="rounded bg-muted px-1">/</kbd> blocos •{" "}
          <kbd className="rounded bg-muted px-1">@</kbd> linkar •{" "}
          <kbd className="rounded bg-muted px-1">Tab</kbd> indentar •{" "}
          <kbd className="rounded bg-muted px-1">⌘Z</kbd> desfazer • cole/arraste imagens
        </span>
        <span className="flex shrink-0 items-center gap-2 tabular-nums">
          {readingMin > 0 && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" /> {readingMin} min
            </span>
          )}
          <span>{wordCount} palavras · {value.length} caracteres</span>
        </span>
      </div>
    </div>
  );
}
