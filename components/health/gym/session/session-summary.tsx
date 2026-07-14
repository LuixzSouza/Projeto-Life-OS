"use client";

import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Save, Star, Trophy, Timer, Layers, Dumbbell, ChevronLeft, Check, Camera, ImagePlus, Share2, X, Gauge, MapPin, Repeat2, StickyNote, TrendingDown, Activity } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sessionStats, elapsedSeconds, isExercisePR, isWorkingSet, loadMultiplier, volumeByGroup, averageSetGapSeconds, averageExerciseTransitionSeconds, type LastPerf, type LiveSession } from "./session-types";
import { ExerciseThumb } from "./exercise-thumb";
import { compressToDataUrl } from "./gym-gallery";
import { shareWorkoutCard } from "./gym-share";

const FEELINGS = [
  { value: "GOOD", label: "Bom", emoji: "💪" },
  { value: "TIRED", label: "Cansativo", emoji: "😮‍💨" },
  { value: "HARD", label: "Intenso", emoji: "🔥" },
];

// Partículas de comemoração do hero — posições determinísticas (índice, não
// Math.random) para não causar mismatch de hidratação.
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: (7 + i * 37) % 92,            // % horizontal
  delay: (i % 7) * 0.14,
  size: 4 + (i % 3) * 2,              // px
  drift: i % 2 === 0 ? -14 : 12,      // deriva lateral
  tone: ["bg-white/50", "bg-amber-300/80", "bg-emerald-200/70"][i % 3],
}));

export function SessionSummary({
  session,
  lastPerf = {},
  saving,
  onSave,
  onSaveRoutine,
  onBack,
}: {
  session: LiveSession;
  lastPerf?: Record<string, LastPerf>;
  saving: boolean;
  onSave: (feeling: string | null, notes: string | null, photos: string[]) => void;
  onSaveRoutine: (name: string) => void;
  onBack: () => void;
}) {
  const [feeling, setFeeling] = useState<string | null>("GOOD");
  const [notes, setNotes] = useState("");
  const [routineName, setRoutineName] = useState(session.title);
  const [routineSaved, setRoutineSaved] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => sessionStats(session.exercises), [session.exercises]);
  // Duração HONESTA: desconta as pausas do cronômetro (mesma conta do salvamento).
  const durationMin = Math.max(1, Math.round(elapsedSeconds(session, session.finishedAt ?? session.startedAt) / 60));
  const named = session.exercises.filter((e) => e.name.trim()).length;

  // ---- Destaques da sessão ----
  // Recordes batidos hoje (vs. última execução de cada exercício).
  const prs = useMemo(
    () => session.exercises.filter((ex) => ex.name.trim() && isExercisePR(ex, lastPerf[ex.name.toLowerCase()])).map((ex) => ex.name.trim()),
    [session.exercises, lastPerf],
  );
  // Volume por grupo muscular (onde o trabalho de hoje foi parar).
  const groups = useMemo(() => volumeByGroup(session.exercises), [session.exercises]);
  const maxGroupVolume = groups[0]?.volume ?? 0;
  // Ritmo médio entre séries (carimbos doneAt de quando cada série foi concluída).
  const pace = useMemo(() => averageSetGapSeconds(session.exercises), [session.exercises]);
  // Tempo médio de troca entre exercícios (última série de um → primeira do próximo).
  const transition = useMemo(() => averageExerciseTransitionSeconds(session.exercises), [session.exercises]);
  // Exercícios totalmente concluídos vs. iniciados.
  const completedEx = session.exercises.filter((e) => e.name.trim() && e.sets.length > 0 && e.sets.every((s) => s.done)).length;
  // Densidade do treino: volume movido por minuto. Quanto maior, mais trabalho no
  // mesmo tempo (intensidade real da sessão, não só duração). Só com volume > 0.
  const density = stats.volume > 0 ? Math.round(stats.volume / durationMin) : 0;

  // Recap por exercício: o que você de fato fez (melhor série, volume, recorde,
  // nota e se houve redução de carga). Fecha o ciclo dos dados capturados na sessão.
  const recap = useMemo(() => {
    const num = (v: string) => parseFloat((v || "").replace(",", ".")) || 0;
    return session.exercises
      .filter((e) => e.name.trim() && e.sets.some((s) => s.done))
      .map((ex) => {
        const mult = loadMultiplier(ex.equipment);
        const timed = !!ex.timed; // por tempo: reps = segundos → sem volume/kg
        const working = ex.sets.filter((s) => s.done && isWorkingSet(s));
        let topW = 0, topR = 0, volume = 0;
        for (const s of working) {
          const w = num(s.weight), r = num(s.reps);
          if (!timed) volume += w * mult * r;
          if (w > topW || (w === topW && r > topR)) { topW = w; topR = r; }
        }
        // Esforço médio avaliado nas séries (RPE opcional dos chips do descanso).
        const rpes = working.map((s) => s.rpe).filter((r): r is number => typeof r === "number");
        const avgRpe = rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : 0;
        return {
          id: ex.id,
          name: ex.name.trim(),
          group: ex.group,
          doneCount: ex.sets.filter((s) => s.done).length,
          total: ex.sets.length,
          topW, topR, timed, avgRpe,
          volume: Math.round(volume),
          perHand: ex.equipment === "dumbbell",
          note: ex.note?.trim() || "",
          hasDrop: ex.sets.some((s) => s.type === "drop"),
          pr: isExercisePR(ex, lastPerf[ex.name.toLowerCase()]),
        };
      });
  }, [session.exercises, lastPerf]);

  const saveRoutine = () => {
    const name = routineName.trim();
    if (!name) return;
    onSaveRoutine(name);
    setRoutineSaved(true);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      try {
        const dataUrl = await compressToDataUrl(f);
        setPhotos((p) => [...p, dataUrl]);
      } catch {
        toast.error("Não consegui processar a foto.");
      }
    }
  };

  const share = async () => {
    setSharing(true);
    const res = await shareWorkoutCard({
      title: session.title,
      dateLabel: new Date(session.startedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
      volume: stats.volume,
      durationMin,
      sets: stats.doneSets,
      photoDataUrl: photos[0],
    });
    setSharing(false);
    if (res === "downloaded") toast.success("Card salvo no dispositivo — é só enviar!");
    else if (res === "failed") toast.error("Não foi possível compartilhar.");
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col px-4 py-6">
      <button type="button" onClick={onBack} className="mb-4 inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Voltar ao treino
      </button>

      {/* HERO celebratório: gradiente + troféu com spring + partículas subindo */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", duration: 0.6, bounce: 0.3 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-500/20"
      >
        {/* Partículas de comemoração (sobem e somem, 2 ciclos) */}
        {PARTICLES.map((p, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: [0, 1, 0], y: -64, x: p.drift }}
            transition={{ duration: 1.6, delay: 0.25 + p.delay, repeat: 1, repeatDelay: 0.4, ease: "easeOut" }}
            className={`pointer-events-none absolute bottom-6 rounded-full ${p.tone}`}
            style={{ left: `${p.left}%`, width: p.size, height: p.size }}
          />
        ))}

        <div className="relative flex items-center gap-3">
          <motion.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", delay: 0.15, stiffness: 220, damping: 13 }}
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"
          >
            <Trophy className="h-7 w-7 text-amber-300" />
          </motion.span>
          <div className="min-w-0">
            <h1 className="text-2xl font-black leading-tight tracking-tight">Treino concluído!</h1>
            <p className="truncate text-sm text-white/85">
              {session.title} · {new Date(session.startedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </p>
          </div>
        </div>

        {/* Métricas integradas (tiles de vidro) */}
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <HeroStat icon={Timer} label="Duração" value={`${durationMin} min`} />
          <HeroStat icon={Layers} label="Séries" value={`${stats.doneSets}`} />
          <HeroStat icon={Dumbbell} label="Volume" value={`${(stats.volume / 1000).toFixed(1)}k kg`} />
        </div>
      </motion.div>

      {/* Recordes de hoje — card dourado dedicado (era um chip apagado no meio dos outros) */}
      {prs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-3 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-400/15 via-amber-300/10 to-transparent p-3.5"
        >
          <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-600">
            <Trophy className="h-3.5 w-3.5" /> {prs.length === 1 ? "Recorde batido hoje" : `${prs.length} recordes batidos hoje`} 🎉
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {prs.map((name) => (
              <span key={name} className="inline-flex max-w-full items-center gap-1 rounded-full bg-amber-400/20 px-2.5 py-1 text-xs font-bold text-amber-700 dark:text-amber-400">
                <span className="truncate">{name}</span>
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Destaques: ritmo, exercícios completos e local */}
      {(pace !== null || transition !== null || density > 0 || session.location || named > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {density > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-600" title="Densidade: volume total dividido pela duração — quanto mais trabalho no mesmo tempo, mais intenso o treino">
              <Activity className="h-3 w-3" /> {density.toLocaleString("pt-BR")} kg/min
            </span>
          )}
          {pace !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary" title="Tempo médio entre séries concluídas">
              <Gauge className="h-3 w-3" /> ~{Math.floor(pace / 60)}:{String(pace % 60).padStart(2, "0")} entre séries
            </span>
          )}
          {transition !== null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-600" title="Tempo médio de troca de exercício (última série de um até a primeira do próximo)">
              <Repeat2 className="h-3 w-3" /> ~{Math.floor(transition / 60)}:{String(transition % 60).padStart(2, "0")} trocando de exercício
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">
            <Check className="h-3 w-3 text-emerald-500" /> {completedEx}/{named} exercícios completos
          </span>
          {session.location && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-600">
              <MapPin className="h-3 w-3" /> Local registrado
            </span>
          )}
        </div>
      )}

      {/* Volume por grupo muscular (onde o trabalho foi parar) */}
      {groups.length > 1 && (
        <div className="mt-4 rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Volume por grupo</p>
          <div className="space-y-2">
            {groups.slice(0, 5).map((g) => (
              <div key={g.group} className="flex items-center gap-2.5">
                <span className="w-20 shrink-0 truncate text-xs font-medium">{g.group}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted/50">
                  <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.max(6, Math.round((g.volume / maxGroupVolume) * 100))}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                  {g.volume.toLocaleString("pt-BR")} kg
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recap por exercício — o que você fez, com melhor série, recorde, nota e drop */}
      {recap.length > 0 && (
        <div className="mt-4 rounded-2xl border border-border/40 bg-card p-3.5 shadow-sm">
          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Resumo por exercício</p>
          <ul className="space-y-2">
            {recap.map((r) => (
              <li key={r.id} className="flex items-center gap-2.5">
                <ExerciseThumb name={r.name} group={r.group} showPlay={false} className="h-10 w-10 rounded-lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{r.name}</span>
                    {r.pr && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-500">
                        <Trophy className="h-2.5 w-2.5" /> Recorde
                      </span>
                    )}
                    {r.hasDrop && (
                      <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-orange-500/15 px-1.5 py-0.5 text-[9px] font-bold text-orange-600" title="Houve redução de carga">
                        <TrendingDown className="h-2.5 w-2.5" /> Drop
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {r.doneCount}/{r.total} séries
                    {r.timed
                      ? r.topR > 0 && <> · melhor {r.topR}s{r.topW > 0 ? ` com ${r.topW}kg` : ""}</>
                      : r.topW > 0 && <> · melhor {r.topW}{r.perHand ? "kg/mão" : "kg"} × {r.topR}</>}
                    {r.volume > 0 && <> · {r.volume.toLocaleString("pt-BR")} kg</>}
                    {r.avgRpe > 0 && <> · RPE ~{r.avgRpe}</>}
                  </p>
                  {r.note && (
                    <p className="mt-0.5 flex items-start gap-1 text-[10px] italic leading-snug text-muted-foreground/80">
                      <StickyNote className="mt-px h-2.5 w-2.5 shrink-0 text-amber-500" />
                      <span className="line-clamp-2">{r.note}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 flex-1 space-y-6">
        {/* Fotos do dia + compartilhar */}
        <section className="space-y-2">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Camera className="h-3.5 w-3.5" /> Fotos do treino
          </label>

          <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPick} />
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPick} />

          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((src, i) => (
                <div key={i} className="group relative aspect-square overflow-hidden rounded-xl border border-border/40">
                  {/* eslint-disable-next-line @next/next/no-img-element -- base64 local */}
                  <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotos((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                    aria-label="Remover foto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => camRef.current?.click()}>
              <Camera className="h-4 w-4" /> Tirar foto
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => fileRef.current?.click()}>
              <ImagePlus className="h-4 w-4" /> Galeria
            </Button>
            <Button type="button" size="sm" className="gap-1.5" onClick={share} disabled={sharing}>
              {sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />} Compartilhar
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">As fotos ficam no seu dispositivo (galeria do app). Compartilhar gera um card com suas estatísticas pra mandar pros amigos.</p>
        </section>

        {/* Como foi */}
        <section className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Como foi?</label>
          <div className="flex gap-2">
            {FEELINGS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFeeling(f.value)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 rounded-xl border py-3 transition-all",
                  feeling === f.value ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border/40 hover:border-primary/40",
                )}
              >
                <span className="text-xl">{f.emoji}</span>
                <span className="text-xs font-semibold">{f.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Notas */}
        <section className="space-y-2">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Observações (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Sensações, recordes, ajustes para a próxima…"
            className="min-h-[80px] w-full resize-y rounded-xl border border-border/40 bg-transparent px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </section>

        {/* Salvar como rotina */}
        <section className="space-y-2 rounded-xl border border-border/40 bg-muted/20 p-3">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-amber-400" /> Salvar como rotina (reutilizar depois)
          </label>
          <div className="flex items-center gap-2">
            <Input value={routineName} onChange={(e) => { setRoutineName(e.target.value); setRoutineSaved(false); }} placeholder="Nome da rotina" className="h-9" />
            <Button type="button" variant={routineSaved ? "secondary" : "outline"} size="sm" className="h-9 shrink-0 gap-1.5" onClick={saveRoutine} disabled={!routineName.trim() || routineSaved || named === 0}>
              {routineSaved ? <><Check className="h-4 w-4 text-emerald-500" /> Salva</> : <><Star className="h-4 w-4" /> Salvar rotina</>}
            </Button>
          </div>
        </section>
      </div>

      {/* Rodapé: salvar treino */}
      <div className="sticky bottom-0 -mx-4 border-t border-border/40 bg-background/95 px-4 py-3 pb-safe backdrop-blur">
        <Button onClick={() => onSave(feeling, notes.trim() || null, photos)} disabled={saving || named === 0} className="h-12 w-full gap-2 text-base font-bold">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Salvar treino
        </Button>
        {named === 0 && <p className="mt-2 text-center text-xs text-muted-foreground">Dê nome a pelo menos um exercício para salvar.</p>}
      </div>
    </div>
  );
}

// Tile de métrica dentro do hero (vidro sobre o gradiente).
function HeroStat({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-white/12 px-2 py-2.5 text-center ring-1 ring-white/15 backdrop-blur-sm">
      <Icon className="h-4 w-4 text-white/80" />
      <span className="text-base font-black tabular-nums leading-tight">{value}</span>
      <span className="text-[9px] font-semibold uppercase tracking-wider text-white/70">{label}</span>
    </div>
  );
}
