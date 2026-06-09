"use client";

// Digital Rot / Limpeza Fantasma (Roadmap Fase 4 — #21): tarefas e notas não
// tocadas há semanas aparecem aqui DESBOTANDO com a idade. Duas saídas por item:
// reviver (zera o relógio) ou arquivar (Lixeira, reversível). O botão "Limpeza
// Fantasma" arquiva tudo de uma vez. Sem itens podres, o card nem aparece.

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Ghost, ListTodo, StickyNote, RotateCcw, Archive, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  getRottenItems, reviveRottenItem, archiveRottenItem, archiveAllRotten,
  type RottenItem, type RotKind,
} from "@/app/(dashboard)/dashboard/digital-rot-actions";

// Quanto mais velho, mais apagado (mínimo legível).
function rotOpacity(ageDays: number): number {
  return Math.max(0.45, 1 - ageDays / 365);
}

const KIND_META: Record<RotKind, { label: string; icon: typeof ListTodo }> = {
  task: { label: "tarefa", icon: ListTodo },
  note: { label: "nota", icon: StickyNote },
};

export function DigitalRotCard() {
  const [items, setItems] = useState<RottenItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sweeping, setSweeping] = useState(false);

  useEffect(() => {
    let alive = true;
    getRottenItems().then((r) => { if (alive) { setItems(r); setLoaded(true); } });
    return () => { alive = false; };
  }, []);

  const revive = async (item: RottenItem) => {
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    const res = await reviveRottenItem(item.kind, item.id);
    if (res.success) toast.success(res.message);
    else { toast.error(res.message); getRottenItems().then(setItems); }
  };

  const archive = async (item: RottenItem) => {
    setItems((prev) => prev.filter((x) => x.id !== item.id));
    const res = await archiveRottenItem(item.kind, item.id);
    if (res.success) toast.success(res.message);
    else { toast.error(res.message); getRottenItems().then(setItems); }
  };

  const sweepAll = async () => {
    if (sweeping) return;
    setSweeping(true);
    const res = await archiveAllRotten();
    setSweeping(false);
    if (res.success) { toast.success(res.message); setItems([]); }
    else toast.error(res.message);
  };

  // Sem podridão = sem card (e nada pisca enquanto carrega).
  if (!loaded || items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <Ghost className="h-3.5 w-3.5 text-violet-500" /> Digital rot · {items.length} item(ns) apodrecendo
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={sweepAll}
          disabled={sweeping}
          className="h-7 gap-1.5 rounded-lg px-2 text-[10px] font-black uppercase tracking-wider text-violet-500 hover:bg-violet-500/10 hover:text-violet-500"
        >
          {sweeping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Archive className="h-3 w-3" />}
          Limpeza fantasma
        </Button>
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Sem toque há semanas. Reviva o que ainda importa — o resto vai pra Lixeira (reversível).
      </p>

      <div className="space-y-1">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const meta = KIND_META[item.kind];
            const Icon = meta.icon;
            return (
              <motion.div
                key={`${item.kind}-${item.id}`}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: rotOpacity(item.ageDays), y: 0 }}
                exit={{ opacity: 0, x: 24 }}
                className="group flex items-center gap-2.5 rounded-xl border border-border/30 bg-background px-3 py-2"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-foreground">{item.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {meta.label} · sem toque há <span className="font-bold">{item.ageDays} dias</span>
                  </p>
                </div>
                <div className={cn("flex shrink-0 items-center gap-1 opacity-0 transition-opacity",
                  "group-hover:opacity-100 focus-within:opacity-100 max-sm:opacity-100")}>
                  <Button
                    variant="ghost" size="icon" onClick={() => revive(item)} title="Ainda importa — reviver"
                    className="h-7 w-7 rounded-lg text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" onClick={() => archive(item)} title="Arquivar na Lixeira"
                    className="h-7 w-7 rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
