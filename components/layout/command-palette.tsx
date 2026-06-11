"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Calendar, NotebookPen, Briefcase, Wallet, BrainCircuit,
  Plus, FileText, Loader2, Star, Settings, History as HistoryIcon, Users, Sparkles,
  ListTodo, Receipt, Dumbbell, Layers, Link2, UserRound, CalendarRange, Target,
} from "lucide-react";
import { toast } from "sonner";
import {
  CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandShortcut,
} from "@/components/ui/command";
import { getNotes, getNoteProjects, createBlankNote, optimizeAllNoteImages, type NoteData, type NoteProject } from "@/app/(dashboard)/notes/actions";
import { getPaletteTasks, getPaletteExtras, type PaletteTask, type PaletteExtras } from "@/app/(dashboard)/palette-actions";

// Texto pesquisável de uma nota: título + caderno + projeto + tags + um trecho
// limpo do corpo (sem markdown nem base64), pra busca achar por conteúdo também.
function noteSearchValue(note: NoteData): string {
  const snippet = (note.summary ?? note.content ?? "")
    .replace(/data:image\/[^)\s]+/g, " ")   // descarta blobs base64
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")    // descarta imagens markdown
    .replace(/[#*`>\-![\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
  return `nota ${note.title} ${note.notebookName ?? ""} ${note.projectTitle ?? ""} ${note.tags ?? ""} ${snippet}`;
}

// Destinos rápidos de navegação.
const NAV = [
  { label: "Visão Geral", href: "/dashboard", icon: LayoutDashboard },
  { label: "Notas", href: "/notes", icon: NotebookPen },
  { label: "Agenda", href: "/agenda", icon: Calendar },
  { label: "Projetos", href: "/projects", icon: Briefcase },
  { label: "Financeiro", href: "/finance", icon: Wallet },
  { label: "Transações", href: "/finance/transactions", icon: Receipt },
  { label: "Assistente IA", href: "/ai", icon: BrainCircuit },
  { label: "Linha do Tempo", href: "/timeline", icon: HistoryIcon },
  { label: "Retrospectiva", href: "/review", icon: CalendarRange },
  { label: "Metas", href: "/goals", icon: Target },
  { label: "Conexões", href: "/social", icon: Users },
  { label: "Configurações", href: "/settings", icon: Settings },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState<NoteData[] | null>(null);
  const [projects, setProjects] = useState<NoteProject[] | null>(null);
  const [tasks, setTasks] = useState<PaletteTask[] | null>(null);
  const [extras, setExtras] = useState<PaletteExtras | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, startCreate] = useTransition();
  const loadedOnce = useRef(false);

  // Atalho ⌘/Ctrl+K para abrir/fechar.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Abrir via evento custom (botão da sidebar dispara "open-command-palette").
  useEffect(() => {
    const opener = () => setOpen(true);
    window.addEventListener("open-command-palette", opener);
    return () => window.removeEventListener("open-command-palette", opener);
  }, []);

  // Ao abrir: limpa a busca e recarrega os dados (resultados sempre atuais).
  // Só mostra "Carregando…" na primeira vez; nas seguintes atualiza em silêncio.
  useEffect(() => {
    if (!open) return;
    setSearch("");
    let active = true;
    if (!loadedOnce.current) setLoading(true);
    const load = async () => {
      try {
        const [n, p, t, x] = await Promise.all([getNotes(), getNoteProjects(), getPaletteTasks(), getPaletteExtras()]);
        if (active) { setNotes(n); setProjects(p); setTasks(t); setExtras(x); loadedOnce.current = true; }
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [open]);

  const go = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  const newNote = () => {
    startCreate(async () => {
      const res = await createBlankNote();
      if (res.success && res.id) {
        setOpen(false);
        router.push(`/notes/${res.id}`);
      } else {
        toast.error(res.message);
      }
    });
  };

  const optimizeImages = () => {
    startCreate(async () => {
      const res = await optimizeAllNoteImages();
      if (res.success) { setOpen(false); toast.success(res.message); }
      else toast.error(res.message);
    });
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        value={search}
        onValueChange={setSearch}
        placeholder="Buscar notas, projetos, tarefas, ir para…"
      />
      <CommandList className="max-h-[60vh]">
        <CommandEmpty>
          {loading ? (
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </span>
          ) : "Nada encontrado."}
        </CommandEmpty>

        <CommandGroup heading="Ações">
          <CommandItem value="nova nota criar" onSelect={newNote} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
            Nova nota
            <CommandShortcut>↵</CommandShortcut>
          </CommandItem>
          <CommandItem value="otimizar imagens notas base64" onSelect={optimizeImages} disabled={creating}>
            {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Otimizar imagens (todas as notas)
          </CommandItem>
        </CommandGroup>

        <CommandGroup heading="Ir para">
          {NAV.map((n) => (
            <CommandItem key={n.href} value={`ir ${n.label}`} onSelect={() => go(n.href)}>
              <n.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              {n.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {projects && projects.length > 0 && (
          <CommandGroup heading="Projetos">
            {projects.map((p) => (
              <CommandItem
                key={p.id}
                value={`projeto ${p.title}`}
                onSelect={() => go(`/projects/${p.slug}`)}
              >
                <Briefcase className="mr-2 h-4 w-4 shrink-0" style={{ color: p.color ?? undefined }} />
                <span className="truncate">{p.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {tasks && tasks.length > 0 && (
          <CommandGroup heading="Tarefas pendentes">
            {tasks.map((t) => (
              <CommandItem
                key={t.id}
                value={`tarefa ${t.title}`}
                onSelect={() => go(`/projects/${t.projectSlug}`)}
              >
                <ListTodo className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{t.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {extras && extras.contacts.length > 0 && (
          <CommandGroup heading="Contatos">
            {extras.contacts.map((c) => (
              <CommandItem
                key={c.id}
                value={`contato ${c.name} ${c.nickname ?? ""} ${c.company ?? ""}`}
                onSelect={() => go("/social")}
              >
                <UserRound className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{c.name}</span>
                {(c.nickname || c.company) && (
                  <span className="ml-auto shrink-0 truncate pl-2 text-xs text-muted-foreground">
                    {c.nickname ?? c.company}
                  </span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {extras && extras.workoutPlans.length > 0 && (
          <CommandGroup heading="Fichas de treino">
            {extras.workoutPlans.map((w) => (
              <CommandItem
                key={w.id}
                value={`treino ficha ${w.name} ${w.goal}`}
                onSelect={() => go("/health/gym")}
              >
                <Dumbbell className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{w.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {extras && extras.goals.length > 0 && (
          <CommandGroup heading="Metas em aberto">
            {extras.goals.map((g) => (
              <CommandItem
                key={g.id}
                value={`meta ${g.title} ${g.subjectTitle ?? ""}`}
                onSelect={() => go(`/goals?goal=${g.id}`)}
              >
                <Target className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{g.title}</span>
                {g.subjectTitle && (
                  <span className="ml-auto shrink-0 truncate pl-2 text-xs text-muted-foreground">{g.subjectTitle}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {extras && extras.decks.length > 0 && (
          <CommandGroup heading="Flashcards">
            {extras.decks.map((d) => (
              <CommandItem
                key={d.id}
                value={`flashcards deck ${d.title}`}
                onSelect={() => go(`/flashcards/${d.id}/study`)}
              >
                <Layers className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{d.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {extras && extras.links.length > 0 && (
          <CommandGroup heading="Links salvos">
            {extras.links.map((l) => (
              <CommandItem
                key={l.id}
                value={`link ${l.title} ${l.category ?? ""} ${l.url}`}
                onSelect={() => { setOpen(false); window.open(l.url, "_blank", "noopener,noreferrer"); }}
              >
                <Link2 className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{l.title}</span>
                {l.category && (
                  <span className="ml-auto shrink-0 truncate pl-2 text-xs text-muted-foreground">{l.category}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {notes && notes.length > 0 && (
          <CommandGroup heading="Notas">
            {notes.map((note) => (
              <CommandItem
                key={note.id}
                value={noteSearchValue(note)}
                onSelect={() => go(`/notes/${note.id}`)}
              >
                <FileText className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{note.title}</span>
                {note.isFavorite && <Star className="ml-2 h-3 w-3 shrink-0 fill-amber-400 text-amber-400" />}
                {note.notebookName && (
                  <span className="ml-auto shrink-0 truncate pl-2 text-xs text-muted-foreground">{note.notebookName}</span>
                )}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      {/* Rodapé com atalhos de teclado */}
      <div className="flex items-center justify-between border-t border-border/60 px-3 py-2 text-[11px] text-muted-foreground">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-sans">↑</kbd>
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-sans">↓</kbd> navegar
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-sans">↵</kbd> abrir
          </span>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded bg-muted px-1.5 py-0.5 font-sans">esc</kbd> fechar
          </span>
        </span>
        <span className="inline-flex items-center gap-1 font-medium">
          <Sparkles className="h-3 w-3 text-primary" /> Life OS
        </span>
      </div>
    </CommandDialog>
  );
}
