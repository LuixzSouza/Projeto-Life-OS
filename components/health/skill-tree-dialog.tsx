"use client";

// Skill Trees (#22): diálogo de evolução dos hábitos. Cada hábito é uma habilidade
// que sobe de nível pela consistência (XP = dias concluídos). Busca ao abrir.

import { useEffect, useState } from "react";
import { Loader2, Flame, Sparkles, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { getSkillTree, type SkillTree } from "@/app/(dashboard)/health/actions";

export function SkillTreeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [data, setData] = useState<SkillTree | null>(null);

  // Busca ao abrir (refaz a cada abertura — o XP muda conforme você marca hábitos).
  // setState vai num microtask, não no corpo do effect (regra set-state-in-effect).
  useEffect(() => {
    if (!open) return;
    let alive = true;
    void Promise.resolve().then(() => {
      if (!alive) return;
      setData(null);
      getSkillTree().then((d) => { if (alive) setData(d); }).catch(() => {});
    });
    return () => { alive = false; };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" className="p-0">
        <DialogHeader className="border-0 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Árvore de habilidades
          </DialogTitle>
          <DialogDescription>Seus hábitos evoluem com a consistência. Nada some — só cresce.</DialogDescription>
        </DialogHeader>

        <DialogBody className="pt-4">
          {!data ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando seu progresso…
            </div>
          ) : !data.hasHabits ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Crie hábitos para começar a evoluir 🌱</p>
          ) : (
            <div className="space-y-4">
              {/* Nível geral */}
              <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
                <span className="text-4xl">{data.overallEmoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nível geral</p>
                  <p className="text-lg font-black leading-tight text-foreground">
                    Nível {data.overallLevel} · <span className="text-primary">{data.overallTitle}</span>
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground">{data.totalXp} dias de consistência somados</p>
                </div>
              </div>

              {/* Habilidades */}
              <div className="space-y-2">
                {data.nodes.map((n) => {
                  const accent = n.color || "#6366f1";
                  const pct = n.levelSpan ? Math.min(100, Math.round((n.intoLevel / n.levelSpan) * 100)) : 100;
                  return (
                    <div key={n.id} className="rounded-xl border border-border/40 bg-background p-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl" style={{ backgroundColor: `${accent}1a` }}>
                          {n.icon || "✅"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-foreground">{n.name}</p>
                          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
                            <span>{n.emoji} Nv {n.level} · {n.title}</span>
                            {n.streak > 0 && <span className="inline-flex items-center gap-0.5 text-amber-600"><Flame className="h-3 w-3" />{n.streak}</span>}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-black tabular-nums" style={{ color: accent }}>{n.xp}</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">XP</p>
                        </div>
                      </div>

                      {/* Barra de progresso para o próximo nível */}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: accent }} />
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-muted-foreground">
                          {n.toNext != null ? (
                            <span className="inline-flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />{n.toNext} p/ Nv {n.level + 1}</span>
                          ) : (
                            "nível máximo 🏆"
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
