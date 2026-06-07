'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { updateProjectNotes } from '@/app/(dashboard)/projects/actions';
import { toast } from 'sonner';
import {
  Save, Loader2, CheckCircle2, Pencil, Eye, AlertTriangle,
  Bold, Italic, Strikethrough, Code as CodeIcon, Link2,
  Heading1, Heading2, Heading3, CheckSquare, List, ListOrdered, Quote, Code, Minus, Table,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getCaretCoordinates } from './notes-caret';
import { useMentionMenu, type Mentionables } from '@/components/notes/use-mention-menu';

interface ProjectNotesProps {
  projectId: string;
  initialNotes: string;
  /** Notas, projetos e tarefas para o menu de menção "@". */
  mentionables?: Mentionables;
}

interface SlashCommand {
  id: string;
  label: string;
  hint: string;
  icon: typeof Heading1;
  md: string;
  caretBack?: number;
}

const COMMANDS: SlashCommand[] = [
  { id: 'h1', label: 'Título 1', hint: 'Seção grande', icon: Heading1, md: '# ' },
  { id: 'h2', label: 'Título 2', hint: 'Subseção', icon: Heading2, md: '## ' },
  { id: 'h3', label: 'Título 3', hint: 'Subtítulo', icon: Heading3, md: '### ' },
  { id: 'todo', label: 'Tarefa', hint: 'Caixa marcável', icon: CheckSquare, md: '- [ ] ' },
  { id: 'bullet', label: 'Lista', hint: 'Marcadores', icon: List, md: '- ' },
  { id: 'numbered', label: 'Lista numerada', hint: '1. 2. 3.', icon: ListOrdered, md: '1. ' },
  { id: 'quote', label: 'Citação', hint: 'Destaque lateral', icon: Quote, md: '> ' },
  { id: 'code', label: 'Código', hint: 'Bloco monoespaçado', icon: Code, md: '```\n\n```', caretBack: 4 },
  { id: 'table', label: 'Tabela', hint: '2 colunas', icon: Table, md: '\n| Coluna | Coluna |\n| --- | --- |\n|  |  |\n', caretBack: 8 },
  { id: 'divider', label: 'Divisor', hint: 'Linha horizontal', icon: Minus, md: '\n---\n' },
];

interface MenuState {
  open: boolean;
  slashStart: number;
  query: string;
  index: number;
  top: number;
  left: number;
}
const CLOSED: MenuState = { open: false, slashStart: 0, query: '', index: 0, top: 0, left: 0 };

// Renderização base do markdown (não-interativa). Os checkboxes são sobrescritos no preview.
const MD: Components = {
  h1: ({ children }) => <h1 className="mt-6 mb-2 text-3xl font-bold tracking-tight text-foreground first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-5 mb-2 text-2xl font-bold tracking-tight text-foreground first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-4 mb-1.5 text-xl font-semibold text-foreground first:mt-0">{children}</h3>,
  p: ({ children }) => <p className="my-1.5 leading-7 text-foreground/90">{children}</p>,
  ul: ({ className, children }) => (
    <ul className={cn('my-2', className?.includes('contains-task-list') ? 'list-none space-y-1 pl-1' : 'list-disc space-y-1 pl-6')}>{children}</ul>
  ),
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>,
  li: ({ className, children }) => (
    <li className={cn('leading-7 text-foreground/90', className?.includes('task-list-item') && 'flex items-start gap-2 list-none')}>{children}</li>
  ),
  input: ({ checked }) => (
    <input type="checkbox" checked={!!checked} readOnly className="mt-1.5 h-3.5 w-3.5 shrink-0 rounded border-border accent-primary" />
  ),
  blockquote: ({ children }) => <blockquote className="my-3 border-l-4 border-primary/40 pl-4 italic text-muted-foreground">{children}</blockquote>,
  a: ({ href, children }) => {
    // Links internos (menção "@") navegam na mesma aba; externos abrem em nova.
    const internal = href?.startsWith('/');
    return (
      <a
        href={href}
        target={internal ? undefined : '_blank'}
        rel={internal ? undefined : 'noreferrer'}
        className="text-primary underline underline-offset-2 hover:text-primary/80"
      >
        {children}
      </a>
    );
  },
  hr: () => <hr className="my-6 border-border/60" />,
  pre: ({ children }) => <pre className="my-3 overflow-x-auto rounded-xl bg-muted/70 p-4 text-sm leading-relaxed">{children}</pre>,
  code: ({ className, children }) => {
    const isInline = !className && !String(children).includes('\n');
    return isInline
      ? <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground/90">{children}</code>
      : <code className="font-mono">{children}</code>;
  },
  // eslint-disable-next-line @next/next/no-img-element -- base64/local-first por design (sem next/image)
  img: ({ src, alt }) => <img src={typeof src === 'string' ? src : ''} alt={alt ?? ''} className="my-3 max-h-[480px] rounded-xl border border-border/40" />,
  table: ({ children }) => <div className="my-3 overflow-x-auto"><table className="w-full border-collapse text-sm">{children}</table></div>,
  th: ({ children }) => <th className="border border-border/60 bg-muted/40 px-3 py-1.5 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-border/50 px-3 py-1.5">{children}</td>,
};

// Alterna a n-ésima caixa de tarefa (na ordem do documento) no texto-fonte.
function toggleTaskInSource(src: string, index: number): string {
  let i = -1;
  return src.replace(/([-*] \[)( |x|X)(\])/g, (full, p1: string, c: string, p3: string) => {
    i++;
    if (i !== index) return full;
    return p1 + (c === ' ' ? 'x' : ' ') + p3;
  });
}

function countWords(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

// Converte um arquivo de imagem em data URL base64, redimensionando para caber em
// `maxDim` px (mantém o app portável/local-first sem inflar a nota com originais enormes).
function compressImage(file: File, maxDim = 1280, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Falha ao ler a imagem.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Imagem inválida.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function ProjectNotes({ projectId, initialNotes, mentionables }: ProjectNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [savedValue, setSavedValue] = useState(initialNotes);
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [menu, setMenu] = useState<MenuState>(CLOSED);
  // Toolbar flutuante de formatação (aparece sobre o texto selecionado).
  const [sel, setSel] = useState<{ top: number; left: number } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProgrammatic = useRef(false);
  // Refs com os valores mais recentes — usados pelos flushes de saída (sem fechar sobre estado velho).
  const notesRef = useRef(initialNotes);
  const savedRef = useRef(initialNotes);
  useEffect(() => { notesRef.current = notes; }, [notes]);
  useEffect(() => { savedRef.current = savedValue; }, [savedValue]);

  const handleSave = useCallback(async (value: string) => {
    if (value === savedRef.current) return; // nada mudou desde o último salvo
    setIsSaving(true);
    setSaveError(false);
    const result = await updateProjectNotes(projectId, value);
    if (result?.error) {
      setSaveError(true);
      toast.error('Não foi possível salvar. Tentaremos de novo ao continuar editando.');
    } else {
      setLastSaved(new Date());
      setSavedValue(value);
      savedRef.current = value;
    }
    setIsSaving(false);
  }, [projectId]);

  const scheduleSave = useCallback((value: string) => {
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => handleSave(value), 1200);
  }, [handleSave]);

  // Flush de segurança: salva o rascunho pendente ao trocar de aba ou desmontar,
  // e avisa o navegador se houver mudança não salva (anti-perda de dados).
  useEffect(() => {
    const flush = () => {
      if (typingTimeoutRef.current) { clearTimeout(typingTimeoutRef.current); typingTimeoutRef.current = null; }
      if (notesRef.current !== savedRef.current) handleSave(notesRef.current);
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (notesRef.current !== savedRef.current) { e.preventDefault(); e.returnValue = ''; }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
      flush();
    };
  }, [handleSave]);

  const adjustHeight = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.max(ta.scrollHeight, 460)}px`;
  }, []);

  useEffect(() => { if (mode === 'edit') adjustHeight(); }, [mode, adjustHeight]);

  const filtered = menu.open
    ? COMMANDS.filter((c) => {
        const q = menu.query.toLowerCase();
        return !q || c.label.toLowerCase().includes(q) || c.id.includes(q);
      })
    : [];

  const closeMenu = () => setMenu(CLOSED);

  const openMenuAt = (slashStart: number) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const coords = getCaretCoordinates(ta, slashStart);
    setMenu({ open: true, slashStart, query: '', index: 0, top: coords.top - ta.scrollTop + coords.height + 4, left: coords.left });
  };

  // Edição cirúrgica que PRESERVA o histórico de undo (execCommand), com fallback seguro.
  // Dispara o input nativo → handleChange sincroniza estado/auto-save.
  const surgicalEdit = (start: number, end: number, text: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    isProgrammatic.current = true;
    ta.focus();
    ta.setSelectionRange(start, end);
    let ok = false;
    try {
      ok = text === '' ? document.execCommand('delete') : document.execCommand('insertText', false, text);
    } catch { ok = false; }
    if (!ok) {
      ta.setRangeText(text, start, end, 'end');
      const v = ta.value;
      setNotes(v);
      scheduleSave(v);
      isProgrammatic.current = false;
    }
  };

  // Menu "@" para linkar notas/projetos/tarefas (delega a edição ao surgicalEdit p/ preservar undo).
  const mention = useMentionMenu({
    textareaRef,
    mentionables,
    onPick: (md, from, to) => surgicalEdit(from, to, md),
  });

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const ta = e.target;
    const value = ta.value;
    setNotes(value);
    scheduleSave(value);
    adjustHeight();

    if (isProgrammatic.current) { isProgrammatic.current = false; return; }

    const caret = ta.selectionStart;
    if (menu.open) {
      if (caret < menu.slashStart + 1) { closeMenu(); return; }
      const q = value.slice(menu.slashStart + 1, caret);
      if (/\s/.test(q)) closeMenu();
      else setMenu((m) => ({ ...m, query: q, index: 0 }));
    } else {
      const prev = value[caret - 1];
      const beforePrev = value[caret - 2];
      if (prev === '/' && (caret - 1 === 0 || beforePrev === '\n' || beforePrev === ' ')) openMenuAt(caret - 1);
    }
    mention.detect();
  };

  const applyCommand = (cmd: SlashCommand) => {
    const ta = textareaRef.current;
    if (!ta || !menu.open) return;
    const caret = ta.selectionStart;
    surgicalEdit(menu.slashStart, caret, cmd.md);
    closeMenu();
    if (cmd.caretBack) {
      requestAnimationFrame(() => {
        const pos = ta.selectionStart - cmd.caretBack!;
        ta.focus();
        ta.setSelectionRange(pos, pos);
      });
    }
  };

  // Envolve a seleção com markdown (negrito/itálico/código). Sem seleção, insere o placeholder.
  const wrap = (prefix: string, suffix: string, placeholder: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    setSel(null);
    const s = ta.selectionStart;
    const en = ta.selectionEnd;
    const selected = notes.slice(s, en);
    const inner = selected || placeholder;
    surgicalEdit(s, en, prefix + inner + suffix);
    requestAnimationFrame(() => {
      ta.focus();
      if (selected) { const pos = s + prefix.length + inner.length + suffix.length; ta.setSelectionRange(pos, pos); }
      else { const start = s + prefix.length; ta.setSelectionRange(start, start + inner.length); }
    });
  };

  const insertLink = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    setSel(null);
    const s = ta.selectionStart;
    const en = ta.selectionEnd;
    const selected = notes.slice(s, en) || 'texto';
    const text = `[${selected}](url)`;
    surgicalEdit(s, en, text);
    requestAnimationFrame(() => {
      const urlStart = s + 1 + selected.length + 2; // após "]("
      ta.focus();
      ta.setSelectionRange(urlStart, urlStart + 3); // seleciona "url"
    });
  };

  const indentLine = (outdent: boolean) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const lineStart = notes.lastIndexOf('\n', s - 1) + 1;
    if (outdent) {
      const rest = notes.slice(lineStart);
      const remove = rest.startsWith('  ') ? 2 : rest.startsWith(' ') || rest.startsWith('\t') ? 1 : 0;
      if (!remove) return;
      surgicalEdit(lineStart, lineStart + remove, '');
      requestAnimationFrame(() => { const pos = Math.max(lineStart, s - remove); ta.focus(); ta.setSelectionRange(pos, pos); });
    } else {
      surgicalEdit(lineStart, lineStart, '  ');
      requestAnimationFrame(() => { ta.focus(); ta.setSelectionRange(s + 2, s + 2); });
    }
  };

  // Enter dentro de lista continua o marcador; linha vazia sai da lista.
  const handleListContinue = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current;
    if (!ta || ta.selectionStart !== ta.selectionEnd) return;
    const caret = ta.selectionStart;
    const lineStart = notes.lastIndexOf('\n', caret - 1) + 1;
    const line = notes.slice(lineStart, caret);
    const todo = line.match(/^(\s*)([-*])\s\[[ xX]\]\s(.*)$/);
    const numbered = line.match(/^(\s*)(\d+)\.\s(.*)$/);
    const bullet = line.match(/^(\s*)([-*])\s(.*)$/);

    let marker: string | null = null;
    let content = '';
    if (todo) { marker = `${todo[1]}${todo[2]} [ ] `; content = todo[3]; }
    else if (numbered) { marker = `${numbered[1]}${parseInt(numbered[2], 10) + 1}. `; content = numbered[3]; }
    else if (bullet) { marker = `${bullet[1]}${bullet[2]} `; content = bullet[3]; }
    if (marker === null) return;

    e.preventDefault();
    if (content.trim() === '') { surgicalEdit(lineStart, caret, ''); return; }
    surgicalEdit(caret, caret, '\n' + marker);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention.onKeyDown(e)) return;
    if (menu.open && filtered.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenu((m) => ({ ...m, index: (m.index + 1) % filtered.length })); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenu((m) => ({ ...m, index: (m.index - 1 + filtered.length) % filtered.length })); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); applyCommand(filtered[menu.index]); return; }
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(); return; }
    }

    const mod = e.metaKey || e.ctrlKey;
    if (mod) {
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); handleSave(notes); return; }
      if (k === 'b') { e.preventDefault(); wrap('**', '**', 'negrito'); return; }
      if (k === 'i') { e.preventDefault(); wrap('_', '_', 'itálico'); return; }
      if (k === 'e') { e.preventDefault(); wrap('`', '`', 'código'); return; }
      if (k === 'k') { e.preventDefault(); insertLink(); return; }
    }

    if (e.key === 'Tab') { e.preventDefault(); indentLine(e.shiftKey); return; }
    if (e.key === 'Enter' && !e.shiftKey && !menu.open) handleListContinue(e);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const ta = textareaRef.current;
    if (!ta) return;

    // 1) Imagem na área de transferência → base64 comprimido (local-first, sem upload).
    const imageItem = Array.from(e.clipboardData.items).find((it) => it.type.startsWith('image/'));
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        e.preventDefault();
        const pos = ta.selectionStart;
        const endPos = ta.selectionEnd;
        compressImage(file)
          .then((dataUrl) => { surgicalEdit(pos, endPos, `\n![imagem](${dataUrl})\n`); toast.success('Imagem inserida.'); })
          .catch(() => toast.error('Não consegui inserir a imagem.'));
        return;
      }
    }

    // 2) Colar URL sobre uma seleção → vira link markdown (estilo Notion).
    const text = e.clipboardData.getData('text');
    if (!/^https?:\/\/\S+$/.test(text.trim())) return;
    const s = ta.selectionStart;
    const en = ta.selectionEnd;
    if (s === en) return; // sem seleção: cola normal
    e.preventDefault();
    const selected = notes.slice(s, en);
    surgicalEdit(s, en, `[${selected}](${text.trim()})`);
  };

  // Mostra a toolbar flutuante sobre o trecho selecionado (escondida com o menu "/").
  const handleSelect = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    if (s === e || menu.open) { setSel(null); mention.detect(); return; }
    const coords = getCaretCoordinates(ta, s);
    setSel({ top: coords.top - ta.scrollTop, left: coords.left });
  };

  const onToggleTask = (index: number) => {
    const newValue = toggleTaskInSource(notes, index);
    setNotes(newValue);
    handleSave(newValue);
  };

  const isDirty = notes !== savedValue;
  const words = countWords(notes);

  return (
    <div className="flex flex-col">
      {/* BARRA DE AÇÕES */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-muted/40 p-1">
            <button
              onClick={() => setMode('edit')}
              className={cn('flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all',
                mode === 'edit' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <Pencil className="h-3.5 w-3.5" /> Escrever
            </button>
            <button
              onClick={() => { setMode('preview'); closeMenu(); }}
              className={cn('flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-all',
                mode === 'preview' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            >
              <Eye className="h-3.5 w-3.5" /> Visualizar
            </button>
          </div>

          {mode === 'edit' && (
            <div className="hidden items-center gap-0.5 rounded-xl border border-border/40 bg-muted/40 p-1 sm:flex">
              <button type="button" title="Negrito (Ctrl+B)" onMouseDown={(e) => { e.preventDefault(); wrap('**', '**', 'negrito'); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Itálico (Ctrl+I)" onMouseDown={(e) => { e.preventDefault(); wrap('_', '_', 'itálico'); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Código (Ctrl+E)" onMouseDown={(e) => { e.preventDefault(); wrap('`', '`', 'código'); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
                <CodeIcon className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Link (Ctrl+K)" onMouseDown={(e) => { e.preventDefault(); insertLink(); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
                <Link2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] tabular-nums text-muted-foreground/50 sm:inline">{words} palavra{words === 1 ? '' : 's'}</span>
          {isSaving ? (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Salvando…</span>
          ) : saveError ? (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-500"><AlertTriangle className="h-3 w-3" /> Não salvo</span>
          ) : lastSaved && !isDirty ? (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-500"><CheckCircle2 className="h-3 w-3" /> Salvo</span>
          ) : null}
          <Button onClick={() => handleSave(notes)} disabled={isSaving || !isDirty} size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg text-xs">
            <Save className="h-3.5 w-3.5" /> Salvar
          </Button>
        </div>
      </div>

      {/* EDITOR / PREVIEW */}
      {mode === 'edit' ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={handleChange}
            onKeyDown={onKeyDown}
            onPaste={handlePaste}
            onSelect={handleSelect}
            onBlur={() => setTimeout(() => { closeMenu(); setSel(null); mention.close(); }, 150)}
            spellCheck
            placeholder="Escreva aqui…  digite “/” para inserir blocos, ou selecione um texto e use Ctrl+B/I/K."
            className="min-h-[460px] w-full resize-none overflow-hidden bg-transparent font-[450] text-[16px] leading-8 text-foreground/90 outline-none placeholder:text-muted-foreground/40 selection:bg-primary/20"
          />

          {/* TOOLBAR FLUTUANTE NA SELEÇÃO (bubble menu) */}
          {sel && !menu.open && (
            <div
              className="absolute z-30 flex -translate-y-[calc(100%+6px)] items-center gap-0.5 rounded-lg border border-border/60 bg-popover p-1 shadow-xl"
              style={{ top: sel.top, left: Math.min(sel.left, 220) }}
            >
              <button type="button" title="Negrito (Ctrl+B)" onMouseDown={(e) => { e.preventDefault(); wrap('**', '**', 'negrito'); }} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Bold className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Itálico (Ctrl+I)" onMouseDown={(e) => { e.preventDefault(); wrap('_', '_', 'itálico'); }} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Italic className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Riscado" onMouseDown={(e) => { e.preventDefault(); wrap('~~', '~~', 'riscado'); }} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Strikethrough className="h-3.5 w-3.5" />
              </button>
              <button type="button" title="Código (Ctrl+E)" onMouseDown={(e) => { e.preventDefault(); wrap('`', '`', 'código'); }} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <CodeIcon className="h-3.5 w-3.5" />
              </button>
              <div className="mx-0.5 h-4 w-px bg-border/60" />
              <button type="button" title="Link (Ctrl+K)" onMouseDown={(e) => { e.preventDefault(); insertLink(); }} className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Link2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {menu.open && filtered.length > 0 && (
            <div
              className="absolute z-30 w-64 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-xl"
              style={{ top: menu.top, left: Math.min(menu.left, 240) }}
            >
              <p className="border-b border-border/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Blocos</p>
              <ul className="max-h-72 overflow-y-auto p-1 custom-scrollbar">
                {filtered.map((cmd, i) => {
                  const Icon = cmd.icon;
                  return (
                    <li key={cmd.id}>
                      <button
                        onMouseDown={(e) => { e.preventDefault(); applyCommand(cmd); }}
                        onMouseEnter={() => setMenu((m) => ({ ...m, index: i }))}
                        className={cn('flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left transition-colors',
                          i === menu.index ? 'bg-primary/10' : 'hover:bg-muted/60')}
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/50 bg-background text-muted-foreground">
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-foreground">{cmd.label}</span>
                          <span className="block truncate text-[10px] text-muted-foreground">{cmd.hint}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Menu de menção "@" (linkar notas/projetos/tarefas) */}
          {mention.menu}
        </div>
      ) : (
        <div className="min-h-[460px]">
          {notes.trim() ? <NotesPreview source={notes} onToggle={onToggleTask} /> : (
            <p className="py-20 text-center text-sm text-muted-foreground/50">Nada escrito ainda. Volte para “Escrever”.</p>
          )}
        </div>
      )}
    </div>
  );
}

function NotesPreview({ source, onToggle }: { source: string; onToggle: (index: number) => void }) {
  // Contador local (recriado a cada render): o n-ésimo <input> casa com a n-ésima tarefa.
  // ReactMarkdown renderiza os filhos em ordem do documento, então o índice bate com a fonte.
  let counter = 0;

  const components: Components = {
    ...MD,
    input: ({ checked }) => {
      const i = counter++;
      return (
        <input
          type="checkbox"
          checked={!!checked}
          onChange={() => onToggle(i)}
          className="mt-1.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-border accent-primary"
        />
      );
    },
  };

  return (
    <div className="max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{source}</ReactMarkdown>
    </div>
  );
}
