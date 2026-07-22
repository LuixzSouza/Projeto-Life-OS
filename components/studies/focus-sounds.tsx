"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CloudRain, Waves, Wind, AudioLines, AudioWaveform, Radio,
  Headphones, Volume2, VolumeX, Square,
} from "lucide-react";
import { FocusSoundEngine, FOCUS_SOUNDS, type FocusSoundId } from "@/lib/focus-sounds";

const ICONS: Record<FocusSoundId, React.ElementType> = {
  rain: CloudRain, ocean: Waves, wind: Wind,
  white: AudioLines, pink: AudioWaveform, brown: Radio,
};

const STORAGE_KEY = "lifeos.focusSounds.v1";

interface Persisted {
  volumes: Partial<Record<FocusSoundId, number>>;
  master: number;
}

/**
 * Mixer de sons ambiente para estudar (offline, sintetizado — ver
 * lib/focus-sounds.ts). Cada som liga/desliga e tem volume próprio; o volume dos
 * sliders é lembrado no localStorage. O áudio só começa após um clique (regra
 * dos navegadores), então nada toca sozinho ao abrir a página.
 */
// Lê as preferências salvas (volumes + volume-mestre). Roda no initializer do
// useState — no servidor `localStorage` não existe e o try/catch cai no padrão.
function readPersisted(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Persisted;
      return { volumes: p.volumes ?? {}, master: typeof p.master === "number" ? p.master : 0.7 };
    }
  } catch {
    /* localStorage indisponível/inválido */
  }
  return { volumes: {}, master: 0.7 };
}

export function FocusSounds({ compact = false }: { compact?: boolean }) {
  const engineRef = useRef<FocusSoundEngine | null>(null);
  const [active, setActive] = useState<Set<FocusSoundId>>(new Set());
  const [volumes, setVolumes] = useState<Record<string, number>>(() => readPersisted().volumes as Record<string, number>);
  const [master, setMaster] = useState(() => readPersisted().master);

  // Só o cleanup: o áudio exige gesto do usuário, então nada toca ao montar.
  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
      engineRef.current = null;
    };
  }, []);

  const persist = (vols: Record<string, number>, m: number) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ volumes: vols, master: m }));
    } catch {
      /* ignora falha de persistência */
    }
  };

  const engine = () => {
    if (!engineRef.current) {
      engineRef.current = new FocusSoundEngine();
      engineRef.current.setMasterVolume(master);
    }
    return engineRef.current;
  };

  const toggleSound = (id: FocusSoundId) => {
    const eng = engine();
    const vol = volumes[id] ?? 0.6;
    eng.setVolume(id, vol); // garante o volume antes de tocar
    const playing = eng.toggle(id);
    setActive((prev) => {
      const next = new Set(prev);
      if (playing) next.add(id);
      else next.delete(id);
      return next;
    });
    if (volumes[id] == null) {
      const nv = { ...volumes, [id]: vol };
      setVolumes(nv);
      persist(nv, master);
    }
  };

  const changeVolume = (id: FocusSoundId, v: number) => {
    const vol = v / 100;
    engine().setVolume(id, vol);
    const nv = { ...volumes, [id]: vol };
    setVolumes(nv);
    persist(nv, master);
  };

  const changeMaster = (v: number) => {
    const m = v / 100;
    setMaster(m);
    engineRef.current?.setMasterVolume(m);
    persist(volumes, m);
  };

  const stopAll = () => {
    engineRef.current?.pauseAll();
    setActive(new Set());
  };

  const anyActive = active.size > 0;

  return (
    <Card className="border-border/50 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <div className={cn("rounded-lg p-1.5", anyActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
            <Headphones className="h-4 w-4" />
          </div>
          Ambiente sonoro
          {anyActive && (
            <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> tocando
            </span>
          )}
        </CardTitle>
        {anyActive && (
          <Button variant="ghost" size="sm" onClick={stopAll} className="h-8 gap-1.5 rounded-lg text-xs text-muted-foreground">
            <Square className="h-3 w-3" /> Parar
          </Button>
        )}
      </CardHeader>

      <CardContent className="space-y-4 pt-5">
        <p className="text-xs text-muted-foreground">
          Sons gerados no seu aparelho (funcionam offline). Misture camadas e ajuste cada volume.
        </p>

        <div className={cn("grid gap-2.5", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
          {FOCUS_SOUNDS.map((s) => {
            const Icon = ICONS[s.id];
            const on = active.has(s.id);
            const vol = Math.round((volumes[s.id] ?? 0.6) * 100);
            return (
              <div
                key={s.id}
                className={cn(
                  "rounded-xl border p-3 transition-colors",
                  on ? "border-primary/40 bg-primary/[0.06]" : "border-border/40 bg-muted/20",
                )}
              >
                <button
                  type="button"
                  onClick={() => toggleSound(s.id)}
                  title={s.hint}
                  aria-pressed={on}
                  className="flex w-full items-center gap-2 text-left"
                >
                  <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg", on ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-semibold">{s.label}</span>
                    <span className={cn("block text-[10px]", on ? "text-primary" : "text-muted-foreground")}>{on ? "tocando" : "desligado"}</span>
                  </span>
                </button>
                {on && (
                  <div className="mt-2.5 flex items-center gap-2">
                    <Volume2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <Slider
                      value={[vol]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={(vals) => changeVolume(s.id, vals[0])}
                      aria-label={`Volume de ${s.label}`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Volume mestre */}
        <div className="flex items-center gap-3 border-t border-border/40 pt-4">
          {master === 0 ? <VolumeX className="h-4 w-4 shrink-0 text-muted-foreground" /> : <Volume2 className="h-4 w-4 shrink-0 text-primary" />}
          <div className="flex-1">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Volume geral</p>
            <Slider value={[Math.round(master * 100)]} min={0} max={100} step={1} onValueChange={(vals) => changeMaster(vals[0])} aria-label="Volume geral" />
          </div>
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">{Math.round(master * 100)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
