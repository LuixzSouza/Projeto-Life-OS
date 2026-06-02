"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useCurrencySymbol } from "@/components/providers/currency-provider";

export function InputGroup({ label, value, onChange, highlight = false, icon }: { label: string, value: number, onChange: (v: number) => void, highlight?: boolean, icon?: React.ReactNode }) {
  const symbol = useCurrencySymbol();
  return (
    <div className="space-y-2.5 group">
      <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 group-focus-within:text-primary transition-colors ml-1">
        <span className="opacity-70">{icon}</span> {label}
      </Label>
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black text-base">{symbol}</span>
        <Input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className={cn(
            "pl-12 font-mono font-bold text-lg h-12 bg-muted/20 border-border/50 rounded-xl transition-all shadow-inner",
            "focus-visible:ring-primary/30 focus-visible:border-primary",
            highlight && "border-primary/50 bg-primary/5 text-primary focus-visible:ring-primary/50"
          )}
        />
      </div>
    </div>
  );
}

export function TimeSlider({ years, setYears, max = 40 }: { years: number, setYears: (v: number) => void, max?: number }) {
  return (
    <div className="space-y-5">
      <div className="flex justify-between items-end">
        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Tempo Investido</Label>
        <span className="text-sm font-black font-mono tracking-tighter text-primary bg-primary/10 px-3 py-1 rounded-lg text-nowrap border border-primary/20 shadow-sm">
          {years} anos
        </span>
      </div>
      <Slider
        value={[years]}
        onValueChange={(v) => setYears(v[0])}
        max={max}
        min={1}
        className="py-1 cursor-grab active:cursor-grabbing"
      />
    </div>
  );
}
