"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BrushCleaning, Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { DAYS } from "./routine-config";
import { seedCleaningRotation } from "@/app/(dashboard)/agenda/actions";

const DEFAULT_ROOMS = ["Cozinha", "Banheiro", "Quarto", "Sala", "Área de serviço"];

interface CleaningRotationDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Limpeza Programada (Fase 1 — #3): monta o rodízio "um pedaço da casa por dia".
 * Os cômodos são distribuídos em round-robin pelos dias marcados e viram blocos
 * fixos da Rotina (categoria Casa) — sem faxina-monstro no sábado.
 */
export function CleaningRotationDialog({ open, onClose }: CleaningRotationDialogProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<string[]>(DEFAULT_ROOMS);
  const [newRoom, setNewRoom] = useState("");
  const [days, setDays] = useState<string[]>(["mon", "wed", "fri"]);
  const [startTime, setStartTime] = useState("19:00");
  const [duration, setDuration] = useState(30);
  const [isPending, start] = useTransition();

  const addRoom = () => {
    const name = newRoom.trim();
    if (!name || rooms.includes(name)) return;
    setRooms((r) => [...r, name]);
    setNewRoom("");
  };

  const toggleDay = (id: string) => {
    setDays((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  };

  const submit = () => {
    start(async () => {
      const res = await seedCleaningRotation({ rooms, days, startTime, durationMinutes: duration });
      if (res.success) {
        toast.success(res.message);
        router.refresh();
        onClose();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[95%] max-w-[480px] rounded-[2.5rem] border-border/40 p-0 overflow-hidden">
        <div className="border-b border-border/40 bg-muted/10 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-500 shadow-inner">
              <BrushCleaning className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter">Limpeza Programada</DialogTitle>
              <DialogDescription className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Um pedaço da casa por dia, em rodízio
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* CÔMODOS */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Cômodos / áreas (na ordem)</p>
            <div className="flex flex-wrap gap-1.5">
              {rooms.map((room) => (
                <span key={room} className="flex items-center gap-1 rounded-lg border border-border/40 bg-muted/40 px-2 py-1 text-xs font-semibold text-foreground">
                  {room}
                  <button
                    type="button"
                    onClick={() => setRooms((r) => r.filter((x) => x !== room))}
                    className="text-muted-foreground transition-colors hover:text-rose-500"
                    title={`Remover ${room}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newRoom}
                onChange={(e) => setNewRoom(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRoom();
                  }
                }}
                placeholder="Ex.: Varanda"
                maxLength={40}
                className="h-9 text-sm"
              />
              <Button type="button" onClick={addRoom} size="icon" variant="outline" className="h-9 w-9 shrink-0 rounded-lg" title="Adicionar cômodo">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* DIAS */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Dias do rodízio</p>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleDay(day.id)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-[11px] font-black uppercase tracking-widest transition-colors",
                    days.includes(day.id)
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border/40 bg-background text-muted-foreground hover:bg-muted",
                  )}
                >
                  {day.short}
                </button>
              ))}
            </div>
          </div>

          {/* HORÁRIO + DURAÇÃO */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Horário</p>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Duração (min)</p>
              <Input
                type="number"
                min={10}
                max={240}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value) || 30)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <Button
            onClick={submit}
            disabled={isPending || rooms.length === 0 || days.length === 0}
            className="h-12 w-full rounded-xl text-[10px] font-black uppercase tracking-widest"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrushCleaning className="h-4 w-4" />}
            Criar rodízio ({rooms.length} cômodos · {days.length} dias)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
