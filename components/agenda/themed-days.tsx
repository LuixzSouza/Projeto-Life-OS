"use client";

// Dias Temáticos (Fase 1): banner do tema do dia atual na grade de Blocos +
// um diálogo ÚNICO (sem Dialog no .map) para editar o tema dos 7 dias da semana.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Palette, Sparkles, Check, Loader2, Trash2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogBody,
} from "@/components/ui/dialog";
import {
  upsertThemedDay, deleteThemedDay, type ThemedDayData,
} from "@/app/(dashboard)/agenda/themed-days-actions";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const PRESET_COLORS = [
  "#6366f1", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#8B5CF6", "#EC4899", "#64748B",
];

// Sugestões rápidas (preenchem nome+emoji+cor ao clicar).
const PRESETS: { name: string; icon: string; color: string }[] = [
  { name: "Deep Work", icon: "🎯", color: "#6366f1" },
  { name: "Reuniões", icon: "🤝", color: "#8B5CF6" },
  { name: "Estudos", icon: "📚", color: "#3B82F6" },
  { name: "Criativo", icon: "🎨", color: "#EC4899" },
  { name: "Admin", icon: "🗂️", color: "#64748B" },
  { name: "Descanso", icon: "🌿", color: "#10B981" },
];

interface RowState {
  name: string;
  color: string;
  icon: string;
  focus: string;
}

const emptyRow: RowState = { name: "", color: "#6366f1", icon: "", focus: "" };

function seedRows(themedDays: ThemedDayData[]): Record<number, RowState> {
  const map: Record<number, RowState> = {};
  for (let d = 0; d < 7; d++) {
    const found = themedDays.find((t) => t.weekday === d);
    map[d] = found
      ? { name: found.name, color: found.color, icon: found.icon ?? "", focus: found.focus ?? "" }
      : { ...emptyRow };
  }
  return map;
}

export function ThemedDays({ themedDays, weekday }: { themedDays: ThemedDayData[]; weekday: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record<number, RowState>>(() => seedRows(themedDays));
  const [savingDay, setSavingDay] = useState<number | null>(null);

  // Reseed ao abrir (reflete o que o servidor tem após um refresh).
  useEffect(() => {
    if (open) setRows(seedRows(themedDays));
  }, [open, themedDays]);

  const current = themedDays.find((t) => t.weekday === weekday) ?? null;

  const setField = (d: number, patch: Partial<RowState>) =>
    setRows((prev) => ({ ...prev, [d]: { ...prev[d], ...patch } }));

  const saveDay = async (d: number) => {
    const row = rows[d];
    if (!row.name.trim()) { toast.error("Dê um nome ao tema."); return; }
    setSavingDay(d);
    try {
      const res = await upsertThemedDay({ weekday: d, name: row.name, color: row.color, icon: row.icon, focus: row.focus });
      if (res.success) { toast.success(`${WEEKDAYS[d]} atualizada.`); router.refresh(); }
      else toast.error(res.message ?? "Falha ao salvar.");
    } finally {
      setSavingDay(null);
    }
  };

  const clearDay = async (d: number) => {
    setSavingDay(d);
    try {
      await deleteThemedDay(d);
      setField(d, { ...emptyRow });
      toast.success(`${WEEKDAYS[d]} limpa.`);
      router.refresh();
    } finally {
      setSavingDay(null);
    }
  };

  return (
    <>
      {/* BANNER DO DIA */}
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-2">
        {current ? (
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-base shadow-inner"
              style={{ backgroundColor: `${current.color}1f`, color: current.color }}
            >
              {current.icon || "✦"}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-black leading-none" style={{ color: current.color }}>{current.name}</p>
              {current.focus && <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">{current.focus}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium">Sem tema para {WEEKDAYS[weekday]}</span>
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => setOpen(true)} className="h-8 shrink-0 rounded-lg px-2.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-foreground">
          <Palette className="mr-1.5 h-3.5 w-3.5" /> Temas
        </Button>
      </div>

      {/* DIÁLOGO: editar os 7 dias */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent size="lg" className="p-0">
          <DialogHeader
            icon={<Palette className="h-5 w-5" />}
            title="Dias Temáticos"
            description="Dê uma identidade a cada dia da semana"
          />
          <DialogBody className="space-y-2.5">
            {Array.from({ length: 7 }).map((_, d) => {
              const row = rows[d];
              const saving = savingDay === d;
              const hasTheme = themedDays.some((t) => t.weekday === d);
              return (
                <div key={d} className="rounded-2xl border border-border/40 bg-muted/10 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{WEEKDAYS[d]}</span>
                    <div className="flex items-center gap-1.5">
                      {hasTheme && (
                        <Button variant="ghost" size="icon" onClick={() => clearDay(d)} disabled={saving} className="h-9 w-9 md:h-7 md:w-7 text-muted-foreground hover:text-rose-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" onClick={() => saveDay(d)} disabled={saving} className="h-7 rounded-lg px-3 text-[10px] font-black uppercase tracking-wider">
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Check className="mr-1 h-3.5 w-3.5" /> Salvar</>}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      value={row.icon}
                      onChange={(e) => setField(d, { icon: e.target.value })}
                      placeholder="🎯"
                      maxLength={2}
                      className="h-10 w-12 shrink-0 rounded-xl border-border/40 bg-background text-center text-lg"
                    />
                    <Input
                      value={row.name}
                      onChange={(e) => setField(d, { name: e.target.value })}
                      placeholder="Nome do tema (ex.: Deep Work)"
                      className="h-10 flex-1 rounded-xl border-border/40 bg-background text-sm font-semibold"
                    />
                  </div>

                  <Input
                    value={row.focus}
                    onChange={(e) => setField(d, { focus: e.target.value })}
                    placeholder="Intenção do dia (opcional)"
                    className="mt-2 h-9 rounded-xl border-border/40 bg-background text-sm"
                  />

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setField(d, { color: c })}
                        className={cn("h-6 w-6 rounded-md border-2 transition-all", row.color === c ? "scale-110 border-foreground" : "border-transparent hover:scale-105")}
                        style={{ backgroundColor: c }}
                        aria-label={`Cor ${c}`}
                      />
                    ))}
                  </div>

                  {/* Sugestões rápidas */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        onClick={() => setField(d, { name: p.name, icon: p.icon, color: p.color })}
                        className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background px-2 py-0.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                      >
                        <Wand2 className="h-2.5 w-2.5" /> {p.icon} {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </>
  );
}
