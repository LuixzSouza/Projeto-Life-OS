"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Plus, Check, X, Zap, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  quickCaptureTask, getInboxTasks, completeInboxTask, deleteInboxTask, type InboxTask,
} from "@/app/(dashboard)/projects/actions/quick-capture";

export function QuickCaptureCard() {
  const [tasks, setTasks] = useState<InboxTask[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [value, setValue] = useState("");
  const [twoMin, setTwoMin] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    getInboxTasks().then((t) => { if (alive) { setTasks(t); setLoaded(true); } });
    return () => { alive = false; };
  }, []);

  const reload = () => getInboxTasks().then(setTasks);

  const add = async () => {
    const t = value.trim();
    if (!t || busy) return;
    setBusy(true);
    setValue("");
    const wasTwoMin = twoMin;
    // Otimista (id temporário até o reload trazer o real).
    const tempId = `tmp-${Date.now()}`;
    setTasks((prev) => [{ id: tempId, title: t, twoMin: wasTwoMin, createdAt: new Date().toISOString() }, ...prev]);
    const res = await quickCaptureTask(t, wasTwoMin);
    setBusy(false);
    if (res.success) reload();
    else { toast.error(res.message); setTasks((prev) => prev.filter((x) => x.id !== tempId)); }
  };

  const complete = async (id: string) => {
    setTasks((prev) => prev.filter((x) => x.id !== id));
    const res = await completeInboxTask(id);
    if (res.success) toast.success("Feito! 💪"); else { toast.error(res.message); reload(); }
  };

  const remove = async (id: string) => {
    setTasks((prev) => prev.filter((x) => x.id !== id));
    const res = await deleteInboxTask(id);
    if (!res.success) { toast.error(res.message); reload(); }
  };

  const twoMinTasks = useMemo(() => tasks.filter((t) => t.twoMin), [tasks]);
  const restTasks = useMemo(() => tasks.filter((t) => !t.twoMin), [tasks]);

  const Row = ({ t }: { t: InboxTask }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 12 }}
      className={cn("group flex items-center gap-2 rounded-lg border p-1.5 pl-2", t.twoMin ? "border-amber-400/40 bg-amber-400/5" : "border-border/40")}
    >
      <button
        type="button"
        onClick={() => complete(t.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-emerald-500/60 hover:text-emerald-600 active:bg-emerald-500/10"
        aria-label="Concluir"
      >
        <Check className="h-4 w-4" />
      </button>
      <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
      {t.twoMin && <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
      <button type="button" onClick={() => remove(t.id)} className="shrink-0 text-muted-foreground/40 transition-colors hover:text-destructive" aria-label="Descartar">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );

  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Inbox className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold leading-tight">Caixa de entrada</h3>
          <p className="text-[11px] text-muted-foreground">Tire da cabeça — capture agora, organize depois</p>
        </div>
      </div>

      {/* Captura */}
      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-1.5 rounded-xl border border-border/50 bg-background px-2.5 focus-within:border-primary/40">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
            placeholder="O que está na sua cabeça?"
            className="h-10 w-full min-w-0 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
          />
          <button
            type="button"
            onClick={() => setTwoMin((v) => !v)}
            title="Regra dos 2 minutos: faça agora"
            className={cn("inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold transition-colors", twoMin ? "border-amber-400/60 bg-amber-400/15 text-amber-600" : "border-border/50 text-muted-foreground hover:border-amber-400/50")}
          >
            <Zap className="h-3 w-3" /> 2 min
          </button>
        </div>
        <Button size="icon" onClick={add} disabled={!value.trim() || busy} className="h-10 w-10 shrink-0 rounded-xl" aria-label="Capturar">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-5 w-5" />}
        </Button>
      </div>

      {/* Lista */}
      {!loaded ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Carregando…</div>
      ) : tasks.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">Caixa vazia. Cabeça leve. 🧘</p>
      ) : (
        <div className="mt-3 space-y-3">
          {twoMinTasks.length > 0 && (
            <div className="space-y-1.5">
              <p className="flex items-center gap-1 px-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                <Zap className="h-3 w-3" /> Faça agora (2 min)
              </p>
              <AnimatePresence initial={false}>
                {twoMinTasks.map((t) => <Row key={t.id} t={t} />)}
              </AnimatePresence>
            </div>
          )}
          {restTasks.length > 0 && (
            <div className="space-y-1.5">
              {twoMinTasks.length > 0 && <p className="px-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Depois</p>}
              <AnimatePresence initial={false}>
                {restTasks.map((t) => <Row key={t.id} t={t} />)}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
