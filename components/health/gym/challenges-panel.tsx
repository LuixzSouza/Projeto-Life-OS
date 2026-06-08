"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Trophy, Flame, Trash2, Plus, Check, Medal, CalendarCheck, Sparkles, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createChallenge, toggleCheckin, deleteChallenge } from "@/app/(dashboard)/health/actions";
import {
  CHALLENGE_TEMPLATES, CATEGORY_LABELS, ChallengeTemplate,
  CHALLENGE_CATEGORIES, CHALLENGE_COLORS, CHALLENGE_EMOJIS, CHALLENGE_DURATIONS,
} from "./challenge-templates";

export interface SerializedChallenge {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  durationDays: number;
  color: string | null;
  icon: string | null;
  startDate: string;
  completedDays: number[];
}

// Dia atual relativo ao início (0-based). Pode passar do fim quando o período acaba.
function dayOffset(startDateISO: string): number {
  const startMs = new Date(startDateISO).setHours(0, 0, 0, 0);
  const todayMs = new Date().setHours(0, 0, 0, 0);
  return Math.floor((todayMs - startMs) / 86_400_000);
}

// Sequência ATUAL: dias consecutivos terminando hoje (se feito) ou ontem. Zera quando
// o usuário passa um dia inteiro sem check-in.
function currentStreak(completed: Set<number>, currentDay: number): number {
  let i = completed.has(currentDay) ? currentDay : currentDay - 1;
  let streak = 0;
  for (; i >= 0; i--) {
    if (completed.has(i)) streak++;
    else break;
  }
  return streak;
}

// Melhor sequência histórica (maior corrida de dias consecutivos).
function bestStreak(completedDays: number[]): number {
  if (completedDays.length === 0) return 0;
  const set = new Set(completedDays);
  const max = Math.max(...completedDays);
  let best = 0, run = 0;
  for (let i = 0; i <= max; i++) {
    if (set.has(i)) { run++; best = Math.max(best, run); }
    else run = 0;
  }
  return best;
}

export function ChallengesPanel({ challenges }: { challenges: SerializedChallenge[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [creatingKey, setCreatingKey] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  const startTemplate = (tpl: ChallengeTemplate) => {
    setCreatingKey(tpl.key);
    startTransition(async () => {
      const res = await createChallenge({
        title: tpl.title,
        description: tpl.description,
        category: tpl.category,
        durationDays: tpl.durationDays,
        color: tpl.color,
        icon: tpl.emoji,
      });
      setCreatingKey(null);
      if (res.success) { toast.success(res.message); router.refresh(); }
      else toast.error(res.message);
    });
  };

  return (
    <div className="space-y-8">
      {/* Desafios ativos */}
      {challenges.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Trophy className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Seus desafios</h3>
            <span className="text-xs text-muted-foreground">· {challenges.length}</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {challenges.map((ch) => (
              <ChallengeCard key={ch.id} challenge={ch} disabled={isPending} onRefresh={() => router.refresh()} />
            ))}
          </div>
        </div>
      )}

      {/* Galeria de templates + criar do zero */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Iniciar um desafio</h3>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg" onClick={() => setCustomOpen(true)}>
            <Sparkles className="h-3.5 w-3.5" /> Criar do zero
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {CHALLENGE_TEMPLATES.map((tpl) => (
            <Card key={tpl.key} className="group border-border/40 bg-card rounded-2xl shadow-sm hover:shadow-md hover:border-primary/30 transition-all">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-10 w-10 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: `${tpl.color}1a` }}>
                    {tpl.emoji}
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-semibold bg-muted/60 text-muted-foreground border-none">
                    {tpl.durationDays} dias
                  </Badge>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-foreground tracking-tight">{tpl.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{tpl.description}</p>
                </div>
                <Button
                  size="sm"
                  disabled={isPending}
                  onClick={() => startTemplate(tpl)}
                  className="w-full h-9 rounded-lg font-semibold gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> {creatingKey === tpl.key ? "Iniciando..." : "Iniciar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <CustomChallengeDialog
        open={customOpen}
        onOpenChange={setCustomOpen}
        onCreated={() => { setCustomOpen(false); router.refresh(); }}
      />
    </div>
  );
}

function ChallengeCard({ challenge, disabled, onRefresh }: { challenge: SerializedChallenge; disabled: boolean; onRefresh: () => void }) {
  const [pendingDay, setPendingDay] = useState<number | null>(null);
  const completed = new Set(challenge.completedDays);
  const done = challenge.completedDays.length;
  const progress = Math.round((done / challenge.durationDays) * 100);
  const accent = challenge.color || "#6366f1";
  const currentDay = dayOffset(challenge.startDate);
  const streak = currentStreak(completed, currentDay);
  const best = bestStreak(challenge.completedDays);

  const isComplete = done >= challenge.durationDays;
  const periodOver = currentDay >= challenge.durationDays;
  const todayInRange = currentDay >= 0 && currentDay < challenge.durationDays;
  const todayDone = completed.has(currentDay);
  const brokeStreak = todayInRange && !isComplete && streak === 0 && done > 0;

  // Confete só na TRANSIÇÃO para concluído (não a cada carregamento de página).
  const prevComplete = useRef(isComplete);
  const firedRef = useRef(false);
  useEffect(() => {
    if (isComplete && !prevComplete.current && !firedRef.current) {
      firedRef.current = true;
      confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 }, colors: [accent, "#f59e0b", "#10b981"] });
    }
    prevComplete.current = isComplete;
  }, [isComplete, accent]);

  const handleToggle = async (dayIndex: number) => {
    setPendingDay(dayIndex);
    const res = await toggleCheckin(challenge.id, dayIndex);
    setPendingDay(null);
    if (res.success) onRefresh();
    else toast.error(res.message);
  };

  const handleDelete = async () => {
    const res = await deleteChallenge(challenge.id);
    if (res.success) { toast.success(res.message); onRefresh(); }
    else toast.error(res.message);
  };

  return (
    <Card className={cn("border-border/40 bg-card rounded-2xl shadow-sm transition-colors", isComplete && "border-amber-400/50")}>
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
              style={{ backgroundColor: `${accent}1a` }}
            >
              {challenge.icon || "🎯"}
            </span>
            <div className="min-w-0">
              <h4 className="font-bold text-base text-foreground tracking-tight truncate">{challenge.title}</h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                {CATEGORY_LABELS[challenge.category || "HABIT"]} · {challenge.durationDays} dias
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {streak > 0 && (
              <Badge variant="secondary" className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 border-none gap-1">
                <Flame className="h-3 w-3" /> {streak}
              </Badge>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:bg-destructive/15">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="rounded-2xl">
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover desafio?</AlertDialogTitle>
                  <AlertDialogDescription>Todo o progresso de &quot;{challenge.title}&quot; será apagado.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Banner de conclusão */}
        {isComplete && (
          <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-sm font-semibold text-amber-600">
            <Medal className="h-4 w-4 shrink-0" /> Desafio concluído! Mandou bem demais. 🎉
          </div>
        )}

        {/* Aviso de sequência quebrada */}
        {brokeStreak && (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground">
            <Flame className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" /> Sequência zerada — bora recomeçar hoje!
          </div>
        )}

        {/* Progresso + recorde */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium text-muted-foreground">{done}/{challenge.durationDays} dias</span>
            <div className="flex items-center gap-2">
              {best > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold text-muted-foreground" title="Melhor sequência">
                  <Medal className="h-3 w-3 text-amber-500" /> {best}
                </span>
              )}
              <span className="font-bold text-foreground">{progress}%</span>
            </div>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: accent }} />
          </div>
        </div>

        {/* Check-in de hoje (1 toque) */}
        {todayInRange && (
          <Button
            onClick={() => handleToggle(currentDay)}
            disabled={disabled || pendingDay === currentDay}
            variant={todayDone ? "secondary" : "default"}
            className={cn("w-full h-11 rounded-xl gap-2 font-bold", !todayDone && "text-white")}
            style={!todayDone ? { backgroundColor: accent } : undefined}
          >
            {todayDone ? (
              <><Check className="h-4 w-4 text-emerald-500" /> Dia de hoje concluído</>
            ) : (
              <><CalendarCheck className="h-4 w-4" /> Marcar dia de hoje</>
            )}
          </Button>
        )}
        {periodOver && !isComplete && (
          <div className="rounded-xl border border-border/50 bg-muted/20 px-3 py-2 text-center text-xs text-muted-foreground">
            Período encerrado · você completou {done} de {challenge.durationDays} dias
          </div>
        )}

        {/* Grid de dias */}
        <div className="grid grid-cols-10 gap-1.5">
          {Array.from({ length: challenge.durationDays }).map((_, i) => {
            const isDone = completed.has(i);
            const isToday = i === currentDay;
            const isFuture = i > currentDay;
            const isOverdue = !isDone && i < currentDay;
            return (
              <button
                key={i}
                disabled={disabled || pendingDay === i || isFuture}
                onClick={() => handleToggle(i)}
                title={`Dia ${i + 1}${isToday ? " (hoje)" : isFuture ? " (ainda não chegou)" : isOverdue ? " (perdido)" : ""}`}
                className={cn(
                  "aspect-square rounded-md text-[9px] font-bold flex items-center justify-center transition-all border",
                  isDone
                    ? "text-white border-transparent"
                    : isToday
                      ? "border-primary text-primary bg-primary/10 ring-1 ring-primary/30 animate-pulse"
                      : isFuture
                        ? "border-border/40 text-muted-foreground/40 bg-muted/20 cursor-not-allowed"
                        : isOverdue
                          ? "border-amber-400/50 text-amber-600/70 bg-amber-400/5 active:bg-amber-400/15"
                          : "border-border/60 text-muted-foreground bg-muted/30 hover:border-primary/40 active:bg-muted/60",
                )}
                style={isDone ? { backgroundColor: accent } : undefined}
              >
                {isDone ? <Check className="h-3 w-3" /> : isFuture ? <Lock className="h-2.5 w-2.5 opacity-50" /> : i + 1}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---- Construtor de desafio personalizado (Dialog único, controlado por estado) ----
function CustomChallengeDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(30);
  const [category, setCategory] = useState<string>("HABIT");
  const [color, setColor] = useState(CHALLENGE_COLORS[4]);
  const [icon, setIcon] = useState(CHALLENGE_EMOJIS[0]);
  const [saving, startSave] = useTransition();

  const reset = () => { setTitle(""); setDuration(30); setCategory("HABIT"); setColor(CHALLENGE_COLORS[4]); setIcon(CHALLENGE_EMOJIS[0]); };

  const submit = () => {
    if (!title.trim()) { toast.error("Dê um título ao desafio."); return; }
    startSave(async () => {
      const res = await createChallenge({ title, category, durationDays: duration, color, icon });
      if (res.success) { toast.success(res.message); reset(); onCreated(); }
      else toast.error(res.message);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Criar desafio</DialogTitle>
          <DialogDescription>Monte um desafio do seu jeito — hábito, treino, leitura, o que for.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {/* Preview */}
          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-muted/20 p-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: `${color}1a` }}>{icon}</span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{title.trim() || "Nome do desafio"}</p>
              <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[category]} · {duration} dias</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ch-title">Título</Label>
            <Input id="ch-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Beber 3L de água" maxLength={60} autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label>Duração</Label>
            <div className="flex flex-wrap gap-1.5">
              {CHALLENGE_DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={cn("h-9 rounded-lg border px-3 text-sm font-semibold tabular-nums transition-colors", d === duration ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40")}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <div className="flex flex-wrap gap-1.5">
              {CHALLENGE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={cn("h-9 rounded-lg border px-3 text-sm font-semibold transition-colors", c === category ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground hover:border-primary/40")}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {CHALLENGE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={`Cor ${c}`}
                  className={cn("h-8 w-8 rounded-full border-2 transition-transform active:scale-95", c === color ? "border-foreground scale-110" : "border-transparent")}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Emoji</Label>
            <div className="flex flex-wrap gap-1.5">
              {CHALLENGE_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setIcon(e)}
                  className={cn("h-9 w-9 rounded-lg border text-lg transition-colors", e === icon ? "border-primary bg-primary/10" : "border-border/60 hover:border-primary/40")}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">Cancelar</Button>
          <Button onClick={submit} disabled={saving || !title.trim()} className="rounded-xl gap-1.5">
            <Plus className="h-4 w-4" /> {saving ? "Criando..." : "Criar desafio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
