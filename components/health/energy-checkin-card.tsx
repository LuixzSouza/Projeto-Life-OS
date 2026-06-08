"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, Check, BatteryCharging } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { saveEnergyCheckin, getEnergyCheckins, type SerializedEnergyCheckin } from "@/app/(dashboard)/health/actions";

// Escala 1–5. O "5 = Modo Deus" conversa com o futuro Regulador Adaptativo (#13).
const LEVELS = [
  { v: 1, label: "Exausto", emoji: "🪫", dot: "bg-red-500", ring: "ring-red-500/40", text: "text-red-500" },
  { v: 2, label: "Baixa", emoji: "😮‍💨", dot: "bg-orange-500", ring: "ring-orange-500/40", text: "text-orange-500" },
  { v: 3, label: "Ok", emoji: "😐", dot: "bg-yellow-500", ring: "ring-yellow-500/40", text: "text-yellow-600" },
  { v: 4, label: "Bem", emoji: "🙂", dot: "bg-lime-500", ring: "ring-lime-500/40", text: "text-lime-600" },
  { v: 5, label: "Modo Deus", emoji: "⚡", dot: "bg-emerald-500", ring: "ring-emerald-500/40", text: "text-emerald-500" },
] as const;

function localDay(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  // en-CA formata como YYYY-MM-DD no fuso LOCAL.
  return d.toLocaleDateString("en-CA");
}

const dotFor = (energy?: number) => LEVELS.find((l) => l.v === energy)?.dot;

export function EnergyCheckinCard() {
  const [checkins, setCheckins] = useState<SerializedEnergyCheckin[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = localDay(0);

  useEffect(() => {
    let alive = true;
    getEnergyCheckins(30).then((c) => { if (alive) { setCheckins(c); setLoaded(true); } });
    return () => { alive = false; };
  }, []);

  const byDate = useMemo(() => {
    const m = new Map<string, SerializedEnergyCheckin>();
    for (const c of checkins) m.set(c.date, c);
    return m;
  }, [checkins]);

  const todayEntry = byDate.get(today);

  // Tira dos últimos 14 dias (antigo → hoje), pra um "mini-heatmap" de energia.
  const strip = useMemo(() => {
    const days: { date: string; energy?: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = localDay(i);
      days.push({ date: d, energy: byDate.get(d)?.energy });
    }
    return days;
  }, [byDate]);

  const pick = async (value: number) => {
    if (saving) return;
    setSaving(true);
    // Otimista: reflete na hora.
    setCheckins((prev) => {
      const rest = prev.filter((c) => c.date !== today);
      return [{ date: today, energy: value, mood: null, note: todayEntry?.note ?? null }, ...rest];
    });
    const res = await saveEnergyCheckin(today, value);
    setSaving(false);
    if (res.success) toast.success("Energia de hoje registrada ⚡");
    else { toast.error(res.message); getEnergyCheckins(30).then(setCheckins); }
  };

  return (
    <section className="rounded-2xl border border-border/40 bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BatteryCharging className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-sm font-semibold leading-tight">
              {todayEntry ? "Energia de hoje" : "Como está sua energia hoje?"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {todayEntry ? "Toque para ajustar" : "Um toque — leva 2 segundos"}
            </p>
          </div>
        </div>
        {todayEntry && (
          <span className={cn("inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold", LEVELS.find((l) => l.v === todayEntry.energy)?.text)}>
            <Check className="h-3 w-3" /> registrado
          </span>
        )}
        {saving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {/* Seletor 1–5 */}
      <div className="grid grid-cols-5 gap-2">
        {LEVELS.map((l) => {
          const selected = todayEntry?.energy === l.v;
          return (
            <motion.button
              key={l.v}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => pick(l.v)}
              disabled={saving}
              aria-label={`Energia ${l.v} — ${l.label}`}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border py-2.5 transition-all",
                selected
                  ? cn("border-transparent bg-muted/60 ring-2", l.ring)
                  : "border-border/50 hover:border-primary/40 active:bg-muted/50",
              )}
            >
              <span className="text-xl leading-none">{l.emoji}</span>
              <span className={cn("text-[10px] font-semibold", selected ? l.text : "text-muted-foreground")}>{l.label}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Mini-heatmap dos últimos 14 dias */}
      {loaded && checkins.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            <span>14 dias</span>
            <span>hoje →</span>
          </div>
          <div className="flex items-end gap-1">
            {strip.map((d) => (
              <div
                key={d.date}
                title={`${d.date}${d.energy ? ` · ${d.energy}/5` : " · sem registro"}`}
                className={cn(
                  "h-6 flex-1 rounded-[4px]",
                  d.energy ? dotFor(d.energy) : "bg-muted/40",
                  d.date === today && "ring-2 ring-primary/50 ring-offset-1 ring-offset-card",
                )}
                style={d.energy ? { opacity: 0.55 + d.energy * 0.09 } : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
