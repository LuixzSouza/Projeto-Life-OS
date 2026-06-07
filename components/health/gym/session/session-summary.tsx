"use client";

import { useMemo, useRef, useState } from "react";
import { Loader2, Save, Star, Trophy, Timer, Layers, Dumbbell, ChevronLeft, Check, Camera, ImagePlus, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { sessionStats, type LiveSession } from "./session-types";
import { compressToDataUrl } from "./gym-gallery";
import { shareWorkoutCard } from "./gym-share";

const FEELINGS = [
  { value: "GOOD", label: "Bom", emoji: "💪" },
  { value: "TIRED", label: "Cansativo", emoji: "😮‍💨" },
  { value: "HARD", label: "Intenso", emoji: "🔥" },
];

export function SessionSummary({
  session,
  saving,
  onSave,
  onSaveRoutine,
  onBack,
}: {
  session: LiveSession;
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
  // Na fase de resumo, finishedAt sempre existe; startedAt é o fallback seguro.
  const durationMin = Math.max(1, Math.round(((session.finishedAt ?? session.startedAt) - session.startedAt) / 60000));
  const named = session.exercises.filter((e) => e.name.trim()).length;

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

      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
          <Trophy className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-bold leading-tight">Treino concluído!</h1>
          <p className="text-sm text-muted-foreground">{session.title}</p>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3">
        <Metric icon={Timer} label="Duração" value={`${durationMin} min`} />
        <Metric icon={Layers} label="Séries" value={`${stats.doneSets}`} />
        <Metric icon={Dumbbell} label="Volume" value={`${(stats.volume / 1000).toFixed(1)}k kg`} />
      </div>

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
      <div className="sticky bottom-0 -mx-4 border-t border-border/40 bg-background/95 px-4 py-3 backdrop-blur">
        <Button onClick={() => onSave(feeling, notes.trim() || null, photos)} disabled={saving || named === 0} className="h-12 w-full gap-2 text-base font-bold">
          {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          Salvar treino
        </Button>
        {named === 0 && <p className="mt-2 text-center text-xs text-muted-foreground">Dê nome a pelo menos um exercício para salvar.</p>}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl border border-border/40 bg-card p-4 text-center shadow-sm">
      <Icon className="h-5 w-5 text-primary" />
      <span className="text-lg font-bold tabular-nums">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}
