"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Moon, Plus, BedDouble, Loader2, Clock, Sunrise } from "lucide-react";
import { logSleep } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { durationBetween, DEFAULT_SLEEP_GOAL } from "@/lib/sleep-math";
import { cn } from "@/lib/utils";

const todayStr = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export function LogSleepDialog({ goal = DEFAULT_SLEEP_GOAL }: { goal?: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [mode, setMode] = useState<"time" | "duration">("time");
  const [date, setDate] = useState(todayStr());
  const [bedtime, setBedtime] = useState("23:00");
  const [wakeTime, setWakeTime] = useState("07:00");
  const [hours, setHours] = useState("");

  const computed = useMemo(() => durationBetween(bedtime, wakeTime), [bedtime, wakeTime]);
  const finalValue: number = mode === "time" ? (computed ?? 0) : (parseFloat(hours) || 0);

  const reset = () => {
    setMode("time"); setDate(todayStr()); setBedtime("23:00"); setWakeTime("07:00"); setHours("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalValue || finalValue <= 0 || finalValue > 24) {
      toast.error("Informe uma duração válida entre 0 e 24 horas.");
      return;
    }

    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append("value", finalValue.toString());
      fd.append("date", date);
      const res = await logSleep(fd);
      if (res.success) {
        toast.success(res.message);
        setIsOpen(false);
        reset();
      } else {
        toast.error(res.message);
      }
    } catch {
      toast.error("Erro ao salvar registro.");
    } finally {
      setIsLoading(false);
    }
  };

  const onGoal = finalValue >= goal;

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Card className="bg-primary hover:bg-primary/90 border-primary text-primary-foreground shadow-lg shadow-primary/20 flex flex-col justify-center items-center text-center p-6 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] h-full">
          <div className="bg-background/20 p-4 rounded-full mb-3 backdrop-blur-sm shadow-inner">
            <Plus className="h-8 w-8 text-primary-foreground" />
          </div>
          <h3 className="font-bold text-xl">Registrar Noite</h3>
          <p className="text-primary-foreground/80 text-sm mt-1 font-medium">Deitou, acordou e pronto</p>
        </Card>
      </DialogTrigger>

      <DialogContent size="md">
        <DialogHeader
          icon={<Moon />}
          title="Registrar Sono"
          description="Informe os horários — calculamos a duração automaticamente."
        />

        <form onSubmit={handleSubmit} className="flex flex-1 flex-col min-h-0">
          <DialogBody className="space-y-5">
            {/* Data */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">Noite de</Label>
              <Input
                type="date"
                value={date}
                max={todayStr()}
                onChange={(e) => setDate(e.target.value)}
                className="h-10 bg-muted/20 border-border/50"
              />
            </div>

            {/* Modo */}
            <Tabs value={mode} onValueChange={(v) => setMode(v as "time" | "duration")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="time" className="gap-1.5"><Clock className="h-3.5 w-3.5" /> Horário</TabsTrigger>
                <TabsTrigger value="duration" className="gap-1.5"><BedDouble className="h-3.5 w-3.5" /> Duração</TabsTrigger>
              </TabsList>
            </Tabs>

            {mode === "time" ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <Moon className="h-3.5 w-3.5 text-indigo-500" /> Deitou
                  </Label>
                  <Input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="h-12 text-lg font-bold bg-muted/20 border-border/50" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                    <Sunrise className="h-3.5 w-3.5 text-amber-500" /> Acordou
                  </Label>
                  <Input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="h-12 text-lg font-bold bg-muted/20 border-border/50" />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Duração (Horas)</Label>
                <div className="relative">
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    placeholder="0.0"
                    value={hours}
                    onChange={(e) => setHours(e.target.value)}
                    className="h-14 text-3xl font-bold pl-4 pr-12 bg-muted/20 border-border/50"
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg font-medium text-muted-foreground">h</span>
                </div>
              </div>
            )}

            {/* Duração resultante */}
            <div className={cn(
              "flex items-center justify-between p-4 rounded-xl border transition-colors",
              onGoal ? "bg-emerald-500/10 border-emerald-500/20" : "bg-muted/30 border-border/50"
            )}>
              <div className="flex items-center gap-3">
                <BedDouble className={cn("h-5 w-5", onGoal ? "text-emerald-500" : "text-primary")} />
                <p className="text-xs text-muted-foreground leading-snug max-w-[180px]">
                  {finalValue > 0
                    ? (onGoal ? "Ótimo! Dentro da meta de descanso." : `Faltam ${(goal - finalValue).toFixed(1)}h para a meta de ${goal}h.`)
                    : "Defina o horário que dormiu e acordou."}
                </p>
              </div>
              <div className="text-right">
                <span className={cn("text-3xl font-black tracking-tighter", onGoal ? "text-emerald-500" : "text-foreground")}>
                  {finalValue > 0 ? finalValue.toFixed(1) : "--"}
                </span>
                <span className="text-sm font-bold text-muted-foreground ml-0.5">h</span>
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="submit" className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Salvar Registro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
