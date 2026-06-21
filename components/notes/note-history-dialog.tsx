"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { History, RotateCcw, Loader2, Clock, Eye, GitCompare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { CodeBlock } from "@/components/notes/code-block";
import { diffLines, diffStats, type DiffOp } from "@/lib/text-diff";
import {
  getNoteVersions, restoreNoteVersion, type NoteVersionData,
} from "@/app/(dashboard)/notes/actions";

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/** Versão curta e legível de uma linha de diff (esconde Base64 e trunca linhas longas). */
function displayLine(line: string): string {
  if (/!\[[^\]]*\]\(data:image\//.test(line)) return "🖼️ imagem incorporada (Base64)";
  if (line.length > 200) return line.slice(0, 200) + "…";
  return line.length ? line : " ";
}

function DiffView({ ops }: { ops: DiffOp[] }) {
  return (
    <pre className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
      {ops.map((op, idx) => (
        <div
          key={idx}
          className={cn(
            "px-2 -mx-2 rounded",
            op.type === "add" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            op.type === "remove" && "bg-rose-500/10 text-rose-700 dark:text-rose-300",
            op.type === "equal" && "text-muted-foreground",
          )}
        >
          <span className="select-none opacity-60">
            {op.type === "add" ? "+ " : op.type === "remove" ? "- " : "  "}
          </span>
          {displayLine(op.line)}
        </div>
      ))}
    </pre>
  );
}

export function NoteHistoryDialog({
  noteId,
  currentContent,
  open,
  onClose,
  onRestored,
}: {
  noteId: string;
  /** Conteúdo atual da nota, para o modo de comparação. */
  currentContent: string;
  open: boolean;
  onClose: () => void;
  /** Chamado após restaurar, com o conteúdo aplicado, para sincronizar o editor aberto. */
  onRestored: (restored: { title: string; content: string }) => void;
}) {
  const [versions, setVersions] = useState<NoteVersionData[]>([]);
  const [selected, setSelected] = useState<NoteVersionData | null>(null);
  const [view, setView] = useState<"preview" | "diff">("preview");
  // Base da comparação: "current" (conteúdo atual) ou o id de outra versão.
  const [compareBase, setCompareBase] = useState<string>("current");
  const [loading, setLoading] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const rows = await getNoteVersions(noteId);
        if (!active) return;
        setVersions(rows);
        setSelected(rows[0] ?? null);
        setCompareBase("current");
        setView("preview");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [open, noteId]);

  // Conteúdo da base escolhida para comparar.
  const baseContent = useMemo(() => {
    if (compareBase === "current" || compareBase === selected?.id) return currentContent;
    return versions.find((v) => v.id === compareBase)?.content ?? currentContent;
  }, [compareBase, currentContent, versions, selected?.id]);
  const baseLabel = compareBase === "current" || compareBase === selected?.id
    ? "atual"
    : (() => {
        const v = versions.find((x) => x.id === compareBase);
        return v ? formatWhen(v.createdAt) : "atual";
      })();

  // Diff da base (antes) para a versão selecionada (depois).
  const ops = useMemo(
    () => (selected ? diffLines(baseContent, selected.content) : []),
    [selected, baseContent],
  );
  const stats = useMemo(() => diffStats(ops), [ops]);
  const isSame = selected ? selected.content === baseContent : false;

  const handleRestore = () => {
    if (!selected) return;
    const version = selected;
    startTransition(async () => {
      const res = await restoreNoteVersion(noteId, version.id);
      if (res.success) {
        toast.success(res.message);
        onRestored({ title: version.title, content: version.content });
        onClose();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent size="xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-4 w-4" /> Histórico de versões
          </DialogTitle>
          <DialogDescription>
            Cada edição guarda um instantâneo. Restaurar mantém a versão atual no histórico.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-[50vh] items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : versions.length === 0 ? (
          <div className="flex h-[40vh] flex-col items-center justify-center gap-3 text-center">
            <Clock className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              Sem versões anteriores ainda. Edite a anotação para começar o histórico.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] max-h-[60vh]">
            {/* Lista de versões */}
            <div className="overflow-y-auto border-b border-border/40 sm:border-b-0 sm:border-r">
              {versions.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelected(v)}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 border-b border-border/30 px-4 py-3 text-left transition-colors hover:bg-muted/40",
                    selected?.id === v.id && "bg-primary/5",
                  )}
                >
                  <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    {i === 0 && (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                        Mais recente
                      </span>
                    )}
                    <span className="line-clamp-1">{v.title || "(sem título)"}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">{formatWhen(v.createdAt)}</span>
                </button>
              ))}
            </div>

            {/* Painel da versão selecionada: prévia ou comparação */}
            <div className="flex flex-col overflow-hidden">
              {/* Alternância prévia / comparar */}
              <div className="flex items-center justify-between gap-2 border-b border-border/40 px-4 py-2">
                <div className="inline-flex rounded-lg border border-border/60 p-0.5">
                  {([
                    { id: "preview" as const, icon: Eye, label: "Prévia" },
                    { id: "diff" as const, icon: GitCompare, label: "Comparar" },
                  ]).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setView(t.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        view === t.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted/50",
                      )}
                    >
                      <t.icon className="h-3.5 w-3.5" /> {t.label}
                    </button>
                  ))}
                </div>
                {view === "diff" && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] tabular-nums text-muted-foreground">
                      {isSame ? (
                        <span className="text-primary">Iguais</span>
                      ) : (
                        <>
                          <span className="text-emerald-600 dark:text-emerald-400">+{stats.added}</span>{" "}
                          <span className="text-rose-600 dark:text-rose-400">−{stats.removed}</span>
                        </>
                      )}
                    </span>
                    <Select value={compareBase} onValueChange={setCompareBase}>
                      <SelectTrigger className="h-7 w-[150px] text-[11px]">
                        <span className="truncate">vs. {baseLabel}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">vs. versão atual</SelectItem>
                        {versions
                          .filter((v) => v.id !== selected?.id)
                          .map((v) => (
                            <SelectItem key={v.id} value={v.id}>vs. {formatWhen(v.createdAt)}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {selected && view === "preview" ? (
                  selected.content.trim() ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-img:rounded-lg prose-img:border prose-img:border-border/40">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        urlTransform={(u) => u}
                        components={{
                          pre: ({ children }) => <>{children}</>,
                          code: ({ className, children, ...props }) => {
                            const match = /language-(\w+)/.exec(className || "");
                            const text = String(children).replace(/\n$/, "");
                            if (match || text.includes("\n")) return <CodeBlock language={match?.[1]} value={text} />;
                            return <code className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.85em] text-primary" {...props}>{children}</code>;
                          },
                        }}
                      >
                        {selected.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted-foreground">Esta versão estava vazia.</p>
                  )
                ) : selected ? (
                  isSame ? (
                    <p className="text-sm italic text-muted-foreground">
                      Esta versão é idêntica à base selecionada ({baseLabel}).
                    </p>
                  ) : (
                    <DiffView ops={ops} />
                  )
                ) : null}
              </div>

              <div className="flex justify-end border-t border-border/40 p-4">
                <Button onClick={handleRestore} disabled={pending || !selected} className="gap-2">
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Restaurar esta versão
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
