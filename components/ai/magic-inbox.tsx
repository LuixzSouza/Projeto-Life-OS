"use client";

// Inbox Mágica global (#19 + #20): Ctrl+J (ou o QuickDock flutuante) abre UMA
// caixa onde você despeja a vida — "50 mercado, dentista sexta 15h, ideia:
// app de receitas" — e a IA classifica em registros com preview confirmável.
// Com microfone (Web Speech API): registrar a vida falando, mãos ocupadas.

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mic, Sparkles, X, Check, Loader2, Wallet, CalendarDays, CheckCircle2, BookOpen, Utensils, Dumbbell, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSpeechInput, formatListenClock } from "@/components/ai/voice";
import { parseMagicCapture, confirmMagicCapture, type MagicItem } from "@/app/(dashboard)/ai/actions/magic-inbox";

/** Abre a Inbox Mágica de qualquer lugar (disparado pelo QuickDock). */
export const MAGIC_INBOX_OPEN_EVENT = "lifeos:magic-inbox:open";

/** Teto de caracteres por captura — manter em sincronia com parseMagicCapture. */
const INBOX_CHAR_LIMIT = 2000;
/** Rascunho resiliente: um ditado longo não se perde ao fechar sem querer. */
const DRAFT_KEY = "lifeos:magic-inbox:draft";

const EXAMPLES = ["50 mercado", "dentista sexta 15h", "ideia: app de receitas", "almoço 650 kcal"];

const MODULE_META: Record<MagicItem["module"], { label: string; icon: typeof Wallet; cls: string }> = {
  FINANCE: { label: "Gasto/Receita", icon: Wallet, cls: "bg-emerald-500/10 text-emerald-600" },
  TASKS: { label: "Tarefa", icon: CheckCircle2, cls: "bg-blue-500/10 text-blue-600" },
  AGENDA: { label: "Evento", icon: CalendarDays, cls: "bg-violet-500/10 text-violet-600" },
  STUDIES: { label: "Nota", icon: BookOpen, cls: "bg-amber-500/10 text-amber-600" },
  NUTRITION: { label: "Refeição", icon: Utensils, cls: "bg-rose-500/10 text-rose-500" },
  HEALTH: { label: "Treino", icon: Dumbbell, cls: "bg-orange-500/10 text-orange-600" },
};

export function MagicInbox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Restaura o rascunho salvo — só importa quando o diálogo abrir (sem SSR mismatch).
  const [text, setText] = useState(() => {
    if (typeof window === "undefined") return "";
    try { return window.localStorage.getItem(DRAFT_KEY) ?? ""; } catch { return ""; }
  });
  const [items, setItems] = useState<MagicItem[] | null>(null);
  const [source, setSource] = useState<"ai" | "local">("local");
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);

  const dictation = useSpeechInput((spoken) => {
    setText((prev) => (prev ? `${prev.trimEnd()} ${spoken}` : spoken).slice(0, INBOX_CHAR_LIMIT));
  });

  // Persiste o rascunho a cada mudança (e limpa quando esvaziar).
  useEffect(() => {
    try {
      if (text) window.localStorage.setItem(DRAFT_KEY, text);
      else window.localStorage.removeItem(DRAFT_KEY);
    } catch { /* noop */ }
  }, [text]);

  // Atalho global Ctrl/⌘+J (K é da paleta de comandos) + evento do QuickDock.
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const openFromDock = () => setOpen(true);
    window.addEventListener("keydown", down);
    window.addEventListener(MAGIC_INBOX_OPEN_EVENT, openFromDock);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener(MAGIC_INBOX_OPEN_EVENT, openFromDock);
    };
  }, []);

  // Fechar NÃO apaga o texto: o rascunho fica salvo para a próxima abertura.
  const reset = useCallback(() => {
    setItems(null);
    setParsing(false);
    setSaving(false);
    dictation.stop();
  }, [dictation]);

  const close = (v: boolean) => {
    setOpen(v);
    if (!v) reset();
  };

  const classify = async () => {
    if (!text.trim() || parsing) return;
    setParsing(true);
    dictation.stop();
    try {
      const r = await parseMagicCapture(text);
      if (r.success) {
        setItems(r.items);
        setSource(r.source);
      } else {
        toast.error(r.error || "Não consegui classificar.");
      }
    } catch {
      toast.error("Falha ao classificar o texto.");
    } finally {
      setParsing(false);
    }
  };

  const removeItem = (idx: number) => {
    setItems((prev) => (prev ? prev.filter((_, i) => i !== idx) : prev));
  };

  const confirmAll = async () => {
    if (!items?.length || saving) return;
    setSaving(true);
    try {
      const r = await confirmMagicCapture(items);
      if (r.created.length > 0) {
        toast.success(`${r.created.length} registro(s) criado(s): ${r.created.map((c) => c.module).join(", ")}.`);
        router.refresh();
      }
      for (const err of r.errors) toast.error(err);
      if (r.success) {
        setText(""); // captura concluída → rascunho consumido
        close(false);
      }
    } catch {
      toast.error("Falha ao criar os registros.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* O gatilho flutuante vive no QuickDock (components/layout/quick-dock.tsx). */}
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="flex flex-col text-left leading-tight">
                <span className="text-sm font-black uppercase tracking-widest">Inbox Mágica</span>
                <span className="text-[11px] font-medium normal-case tracking-normal text-muted-foreground">
                  Despeje a vida de uma vez — eu separo em registros
                </span>
              </span>
            </DialogTitle>
          </DialogHeader>

          {items === null ? (
            <div className="space-y-3">
              <div className="relative">
                <Textarea
                  value={text}
                  onChange={(e) => setText(e.target.value.slice(0, INBOX_CHAR_LIMIT))}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void classify(); } }}
                  placeholder="Escreva (ou toque no microfone e fale): gastos, compromissos, ideias, refeições..."
                  rows={4}
                  maxLength={INBOX_CHAR_LIMIT}
                  autoFocus
                  className="resize-none rounded-xl border-border/40 bg-muted/20 pr-12 text-sm leading-relaxed focus-visible:ring-primary/30"
                />
                {dictation.supported && (
                  <button
                    type="button"
                    onClick={dictation.toggle}
                    title={dictation.listening ? "Parar o ditado" : "Falar em vez de digitar"}
                    className={cn(
                      "absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full transition-all",
                      dictation.listening ? "bg-rose-500/15 text-rose-500" : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {dictation.listening && <span className="absolute inset-0 animate-ping rounded-full bg-rose-500/20" />}
                    <Mic className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Ditado ao vivo: ponto pulsante + cronômetro + transcrição parcial */}
              {dictation.listening && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/5 px-3 py-2 animate-in fade-in slide-in-from-bottom-1">
                  <span className="relative flex h-2 w-2 shrink-0">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-500/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                  </span>
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-rose-500">
                    Ouvindo · {formatListenClock(dictation.seconds)}
                  </span>
                  <span className="truncate text-xs italic text-muted-foreground">
                    {dictation.interim || "pode falar…"}
                  </span>
                  <button
                    type="button"
                    onClick={dictation.stop}
                    className="ml-auto shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-rose-500 transition hover:bg-rose-500/10"
                  >
                    Parar
                  </button>
                </div>
              )}

              {/* Exemplos clicáveis (só com a caixa vazia — ensinam o formato) */}
              {!text && !dictation.listening && (
                <div className="flex flex-wrap gap-1.5">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setText((prev) => (prev ? `${prev.trimEnd()}, ${ex}` : ex))}
                      className="rounded-full border border-border/40 bg-muted/20 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                  Ctrl+J abre de qualquer tela
                  {text.length >= INBOX_CHAR_LIMIT * 0.6 && (
                    <span className={cn(
                      "tabular-nums tracking-normal",
                      text.length >= INBOX_CHAR_LIMIT ? "text-rose-500"
                        : text.length >= INBOX_CHAR_LIMIT * 0.9 ? "text-amber-500"
                        : "text-muted-foreground/60"
                    )}>
                      {text.length}/{INBOX_CHAR_LIMIT}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-1.5">
                  {text.trim().length > 0 && (
                    <Button variant="ghost" size="sm" onClick={() => setText("")} className="text-xs text-muted-foreground hover:text-rose-500">
                      Limpar
                    </Button>
                  )}
                  <Button onClick={() => void classify()} disabled={parsing || !text.trim()} size="sm" className="gap-1.5">
                    {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    Classificar
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                {source === "ai" ? "Classificado pela sua IA" : "Classificado localmente (IA não conectada)"} — revise e confirme
              </p>
              <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {items.map((item, i) => {
                  const meta = MODULE_META[item.module];
                  const Icon = meta.icon;
                  return (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-background/60 px-3 py-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", meta.cls)}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-foreground/90">{item.title}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                            {meta.label}
                            {item.value != null && ` · ${item.module === "FINANCE" ? `R$ ${item.value.toFixed(2)}` : item.value}`}
                            {item.date && ` · ${item.date.split("-").reverse().join("/")}`}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(i)}
                        title="Descartar este item"
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-rose-500/10 hover:text-rose-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
              {items.length === 0 && (
                <p className="rounded-xl border border-dashed border-border/60 px-4 py-4 text-center text-xs text-muted-foreground">
                  Nada para criar. <button type="button" className="font-bold text-primary" onClick={() => setItems(null)}>Voltar</button>
                </p>
              )}
              <div className="flex items-center justify-between gap-2">
                <Button variant="ghost" size="sm" onClick={() => setItems(null)} className="text-xs">
                  Editar texto
                </Button>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/ai?q=${encodeURIComponent(text)}`}
                    onClick={() => close(false)}
                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
                  >
                    Abrir no chat <ArrowRight className="h-3 w-3" />
                  </Link>
                  <Button onClick={() => void confirmAll()} disabled={saving || items.length === 0} size="sm" className="gap-1.5">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Criar {items.length > 0 ? `(${items.length})` : ""}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
