"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Calculator, Moon, Sunrise } from "lucide-react";
import { bedtimeSuggestions, wakeSuggestions } from "@/lib/sleep-math";
import { cn } from "@/lib/utils";

export function BedtimeCalculator() {
  const [mode, setMode] = useState<"wake" | "sleep">("wake");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [bedTime, setBedTime] = useState("23:00");

  const suggestions = useMemo(
    () => (mode === "wake" ? bedtimeSuggestions(wakeTime) : wakeSuggestions(bedTime)),
    [mode, wakeTime, bedTime]
  );

  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="pb-3 border-b border-border/40 bg-muted/20">
        <CardTitle className="text-xs uppercase font-bold text-muted-foreground tracking-widest flex items-center gap-2 py-1">
          <Calculator className="h-4 w-4 text-primary" /> Calculadora de Ciclos
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        {/* Modo */}
        <div className="inline-flex w-full items-center gap-1 p-1 rounded-lg border border-border/50 bg-muted/30">
          <button
            onClick={() => setMode("wake")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium transition-all",
              mode === "wake" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sunrise className="h-3.5 w-3.5" /> Quero acordar às
          </button>
          <button
            onClick={() => setMode("sleep")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs font-medium transition-all",
              mode === "sleep" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Moon className="h-3.5 w-3.5" /> Vou dormir às
          </button>
        </div>

        <Input
          type="time"
          value={mode === "wake" ? wakeTime : bedTime}
          onChange={(e) => (mode === "wake" ? setWakeTime(e.target.value) : setBedTime(e.target.value))}
          className="h-12 text-2xl font-bold text-center bg-muted/20 border-border/50"
        />

        <p className="text-xs text-muted-foreground text-center">
          {mode === "wake" ? "Para acordar renovado, deite-se em um destes horários:" : "Acorde em um destes horários para completar ciclos:"}
        </p>

        <div className="grid grid-cols-3 gap-2">
          {suggestions.map((sug, i) => (
            <div
              key={sug.cycles}
              className={cn(
                "rounded-xl border p-3 text-center transition-all",
                i === 0 ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/10"
              )}
            >
              <p className="text-lg font-black tracking-tight text-foreground">{sug.time}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{sug.cycles} ciclos · {sug.hours}h</p>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground/70 text-center leading-relaxed">
          Cada ciclo dura ~90 min. Acordar no fim de um ciclo evita a sensação de cansaço. Inclui ~15 min para adormecer.
        </p>
      </CardContent>
    </Card>
  );
}
