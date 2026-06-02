"use client";

import { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus, MessageSquare, Trash2, X, PanelLeft, Loader2,
  Cloud, Zap, Sparkles, Brain, Wind, HardDrive, type LucideIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { clearChat } from "@/app/(dashboard)/ai/actions";
import { providerMeta } from "@/lib/ai-help";
import { cn } from "@/lib/utils";

export interface ChatSummary {
  id: string;
  title: string;
  createdAt: Date | string;
  count: number;
  provider?: string | null;
}

interface Props {
  chats: ChatSummary[];
  activeId?: string;
  activeTitle?: string;
}

// Ícone por IA (provedor).
const PROVIDER_ICON: Record<string, LucideIcon> = {
  openai: Cloud, groq: Zap, google: Sparkles, deepseek: Brain, mistral: Wind, ollama: HardDrive,
};
// Ordem de exibição dos grupos.
const PROVIDER_ORDER = ["openai", "groq", "google", "deepseek", "mistral", "ollama"];

interface Group { key: string; label: string; Icon: LucideIcon; items: ChatSummary[]; }

function groupByProvider(chats: ChatSummary[]): Group[] {
  const map = new Map<string, ChatSummary[]>();
  for (const c of chats) {
    const key = c.provider ?? "outros";
    (map.get(key) ?? map.set(key, []).get(key)!).push(c);
  }
  const order = [...PROVIDER_ORDER, "outros"];
  return [...map.keys()]
    .sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    })
    .map((key) => ({
      key,
      label: key === "outros" ? "Sem provedor" : providerMeta(key).label,
      Icon: PROVIDER_ICON[key] ?? MessageSquare,
      items: map.get(key)!,
    }));
}

export function ConversationSidebar({ chats, activeId, activeTitle }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false); // painel deslizante
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Trava o scroll do body enquanto o painel está aberto.
  // (open só fica true após clique no client, então o portal nunca roda no SSR.)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const handleDelete = (id: string) => {
    setDeletingId(id);
    startTransition(async () => {
      await clearChat(id);
      // Apagou a ativa → vai para a conversa mais recente; senão só atualiza a lista.
      if (id === activeId) router.push("/ai");
      else router.refresh();
      setDeletingId(null);
    });
  };

  const groups = groupByProvider(chats);

  const list = (
    <div className="flex h-full flex-col">
      {/* Cabeçalho do painel */}
      <div className="flex shrink-0 items-center justify-between border-b border-border/40 px-3 py-2.5">
        <span className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Conversas</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Fechar"
          className="rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nova conversa */}
      <div className="shrink-0 border-b border-border/40 p-3">
        <Link
          href="/ai?new=1"
          onClick={() => setOpen(false)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-bold uppercase tracking-widest text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nova conversa
        </Link>
      </div>

      {/* Histórico agrupado por IA */}
      <div className="min-h-0 flex-1 overflow-y-auto p-2 scrollbar-hide">
        {chats.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground/60">
            Nenhuma conversa ainda.<br />Comece uma nova acima.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="mb-3">
              <div className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/70">
                <g.Icon className="h-3 w-3" />
                {g.label}
                <span className="ml-auto rounded-full bg-muted/60 px-1.5 text-[9px] font-bold text-muted-foreground/70">{g.items.length}</span>
              </div>
              <div className="space-y-1">
                {g.items.map((c) => {
                  const isActive = c.id === activeId;
                  return (
                    <Link
                      key={c.id}
                      href={`/ai?id=${c.id}`}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "group flex items-center gap-2 rounded-xl border px-2.5 py-2 transition-all",
                        isActive ? "border-primary/30 bg-primary/10 shadow-sm" : "border-transparent hover:border-border/50 hover:bg-accent/40"
                      )}
                    >
                      <MessageSquare className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground/50")} />
                      <div className="min-w-0 flex-1">
                        <p className={cn("truncate text-xs font-semibold", isActive ? "text-primary" : "text-foreground/90")}>
                          {c.title?.replace(/\.\.\.$/, "") || "Conversa"}
                        </p>
                        <p className="truncate text-[10px] text-muted-foreground/60">
                          {c.count} msg · {formatDistanceToNow(new Date(c.createdAt), { locale: ptBR, addSuffix: true })}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Apagar conversa"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(c.id); }}
                        className="shrink-0 rounded-md p-1 text-muted-foreground/40 opacity-0 transition group-hover:opacity-100 hover:bg-rose-500/10 hover:text-rose-500"
                      >
                        {deletingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Gatilho no header: mostra a conversa atual e abre o histórico */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Ver histórico de conversas"
        className="flex max-w-[220px] items-center gap-2 rounded-xl border border-border/50 bg-background/60 px-3 py-2 text-left shadow-sm transition hover:border-primary/40 hover:bg-accent/40"
      >
        <PanelLeft className="h-4 w-4 shrink-0 text-primary" />
        <span className="truncate text-xs font-bold text-foreground">
          {activeTitle?.replace(/\.\.\.$/, "") || "Nova conversa"}
        </span>
        {chats.length > 0 && (
          <span className="ml-auto shrink-0 rounded-full bg-muted/70 px-1.5 text-[10px] font-bold text-muted-foreground">{chats.length}</span>
        )}
      </button>

      {/* Painel deslizante via portal no body (escapa de overflow/clipping da página) */}
      {open && createPortal(
        <div className="fixed inset-0 z-[100]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] border-r border-border/40 bg-card shadow-2xl animate-in slide-in-from-left duration-300">
            {list}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
