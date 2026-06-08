"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Check, Plus, Flame, Trash2, Frown, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHALLENGE_EMOJIS, CHALLENGE_COLORS } from "@/components/health/gym/challenge-templates";
import { SkillTreeDialog } from "@/components/health/skill-tree-dialog";
import {
  getHabits, createHabit, deleteHabit, setHabitLog,
  type SerializedHabit, type HabitLogStatus, type FrictionReason,
} from "@/app/(dashboard)/health/actions";

// Motivos de falha (fricção) — matéria-prima do Vetor de Fricção (#15).
const REASONS: { v: FrictionReason; label: string; emoji: string }[] = [
  { v: "TIME", label: "Sem tempo", emoji: "⏰" },
  { v: "ENERGY", label: "Sem energia", emoji: "🪫" },
  { v: "ENVIRONMENT", label: "Ambiente", emoji: "🧹" },
  { v: "EMERGENCY", label: "Emergência", emoji: "🚨" },
];

function localDay(): string {
  return new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
}
function shiftDay(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}
function streakOf(logs: SerializedHabit["logs"], today: string): number {
  const done = new Set(logs.filter((l) => l.status === "DONE").map((l) => l.date));
  let cursor = done.has(today) ? today : shiftDay(today, -1);
  let streak = 0;
  while (done.has(cursor)) { streak++; cursor = shiftDay(cursor, -1); }
  return streak;
}

export function HabitsCard() {
  const [habits, setHabits] = useState<SerializedHabit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failFor, setFailFor] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);
  const today = localDay();

  useEffect(() => {
    let alive = true;
    getHabits().then((h) => { if (alive) { setHabits(h); setLoaded(true); } });
    return () => { alive = false; };
  }, []);

  const reload = () => getHabits().then(setHabits);

  // Atualiza o log de HOJE de um hábito localmente (otimista) + persiste.
  const applyLog = async (habitId: string, status: HabitLogStatus | null, reason?: FrictionReason) => {
    if (busy) return;
    setBusy(true);
    setHabits((prev) => prev.map((h) => {
      if (h.id !== habitId) return h;
      const rest = h.logs.filter((l) => l.date !== today);
      return status === null ? { ...h, logs: rest } : { ...h, logs: [{ date: today, status, reason: reason ?? null }, ...rest] };
    }));
    const res = await setHabitLog(habitId, today, status, reason ?? null);
    setBusy(false);
    setFailFor(null);
    if (!res.success) { toast.error(res.message); reload(); }
  };

  const remove = async (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
    const res = await deleteHabit(id);
    if (res.success) toast.success("Hábito removido."); else { toast.error(res.message); reload(); }
  };

  const doneToday = habits.filter((h) => h.logs.find((l) => l.date === today)?.status === "DONE").length;

  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold leading-tight">Hábitos de hoje</h3>
          <p className="text-[11px] text-muted-foreground">
            {habits.length > 0 ? `${doneToday}/${habits.length} concluídos` : "Crie hábitos pra construir consistência"}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {habits.length > 0 && (
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 rounded-lg px-2.5 text-muted-foreground hover:text-primary" onClick={() => setSkillOpen(true)} title="Ver evolução dos hábitos">
              <Sparkles className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Evolução</span>
            </Button>
          )}
          <Button size="sm" variant="outline" className="h-8 gap-1.5 rounded-lg" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Novo
          </Button>
        </div>
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : habits.length === 0 ? (
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-8 text-center transition-colors hover:border-primary/40"
        >
          <span className="text-2xl">🌱</span>
          <span className="text-sm font-medium">Criar meu primeiro hábito</span>
          <span className="text-[11px] text-muted-foreground">Beber água · meditar · ler 10 min…</span>
        </button>
      ) : (
        <div className="space-y-1.5">
          {habits.map((h) => {
            const todayLog = h.logs.find((l) => l.date === today);
            const done = todayLog?.status === "DONE";
            const failed = todayLog?.status === "FAILED";
            const streak = streakOf(h.logs, today);
            const accent = h.color || "#6366f1";
            return (
              <div key={h.id} className={cn("rounded-xl border p-2 transition-colors", done ? "border-emerald-500/30 bg-emerald-500/5" : failed ? "border-amber-400/30 bg-amber-400/5" : "border-border/40")}>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg" style={{ backgroundColor: `${accent}1a` }}>
                    {h.icon || "✅"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{h.name}</p>
                    {streak > 0 && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600">
                        <Flame className="h-3 w-3" /> {streak} {streak === 1 ? "dia" : "dias"}
                      </span>
                    )}
                  </div>

                  {/* Falhei (abre motivos) */}
                  <button
                    type="button"
                    onClick={() => setFailFor((f) => (f === h.id ? null : h.id))}
                    className={cn("flex h-9 w-9 items-center justify-center rounded-lg border transition-colors", failed ? "border-amber-400/60 bg-amber-400/10 text-amber-600" : "border-border/50 text-muted-foreground/60 hover:border-amber-400/50 hover:text-amber-600")}
                    aria-label="Marcar falha (com motivo)"
                  >
                    <Frown className="h-4 w-4" />
                  </button>

                  {/* Feito */}
                  <button
                    type="button"
                    onClick={() => applyLog(h.id, done ? null : "DONE")}
                    className={cn("flex h-9 w-9 items-center justify-center rounded-lg border transition-all", done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border/50 text-muted-foreground hover:border-emerald-500/60 hover:text-emerald-600")}
                    aria-label={done ? "Desmarcar feito" : "Marcar como feito"}
                  >
                    <Check className="h-5 w-5" />
                  </button>

                  <button type="button" onClick={() => remove(h.id)} className="text-muted-foreground/40 transition-colors hover:text-destructive" aria-label="Remover hábito">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Motivos da falha (fricção) */}
                <AnimatePresence>
                  {failFor === h.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2">
                        <span className="text-[11px] font-medium text-muted-foreground">Por quê?</span>
                        {REASONS.map((r) => {
                          const active = failed && todayLog?.reason === r.v;
                          return (
                            <button
                              key={r.v}
                              type="button"
                              onClick={() => applyLog(h.id, "FAILED", r.v)}
                              className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition-colors", active ? "border-amber-400/60 bg-amber-400/15 text-amber-600" : "border-border/50 text-muted-foreground hover:border-amber-400/50")}
                            >
                              <span>{r.emoji}</span> {r.label}
                            </button>
                          );
                        })}
                        <button type="button" onClick={() => setFailFor(null)} className="ml-auto text-muted-foreground/60 hover:text-foreground" aria-label="Fechar">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}

      <AddHabitDialog open={addOpen} onOpenChange={setAddOpen} onCreated={() => { setAddOpen(false); reload(); }} />
      <SkillTreeDialog open={skillOpen} onOpenChange={setSkillOpen} />
    </section>
  );
}

function AddHabitDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(CHALLENGE_EMOJIS[0]);
  const [color, setColor] = useState(CHALLENGE_COLORS[4]);
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(""); setIcon(CHALLENGE_EMOJIS[0]); setColor(CHALLENGE_COLORS[4]); };

  const submit = async () => {
    if (!name.trim()) { toast.error("Dê um nome ao hábito."); return; }
    setSaving(true);
    const res = await createHabit(name, icon, color);
    setSaving(false);
    if (res.success) { toast.success("Hábito criado 🌱"); reset(); onCreated(); }
    else toast.error(res.message);
  };

  const preview = useMemo(() => name.trim() || "Nome do hábito", [name]);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Novo hábito</DialogTitle>
          <DialogDescription>Algo que você quer repetir todo dia.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 p-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: `${color}1a` }}>{icon}</span>
            <p className="truncate text-sm font-bold">{preview}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="habit-name">Nome</Label>
            <Input id="habit-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Beber 2L de água" maxLength={60} autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }} />
          </div>
          <div className="space-y-1.5">
            <Label>Emoji</Label>
            <div className="flex flex-wrap gap-1.5">
              {CHALLENGE_EMOJIS.map((e) => (
                <button key={e} type="button" onClick={() => setIcon(e)} className={cn("h-9 w-9 rounded-lg border text-lg transition-colors", e === icon ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40")}>{e}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {CHALLENGE_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)} aria-label={`Cor ${c}`}
                  className={cn("h-8 w-8 rounded-full border-2 transition-transform active:scale-95", c === color ? "border-foreground scale-110" : "border-transparent")} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={submit} disabled={saving || !name.trim()} className="rounded-xl gap-1.5">
            <Plus className="h-4 w-4" /> {saving ? "Criando..." : "Criar hábito"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
