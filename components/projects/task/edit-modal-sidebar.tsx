"use client";

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Flag, CalendarDays, LayoutTemplate, Target, Timer } from 'lucide-react';
import { PropertyRow } from './edit-modal-helpers';

interface EditModalSidebarProps {
  status: string;
  setStatus: (v: string) => void;
  priority: string;
  setPriority: (v: string) => void;
  dueDate: Date | undefined;
  setDueDate: (v: Date | undefined) => void;
  progress: number;
  setProgress: (v: number) => void;
  onProgressChange: (value: number) => void;
  estimatedTime: number;
  setEstimatedTime: (v: number) => void;
}

export function EditModalSidebar({
  status, setStatus, priority, setPriority, dueDate, setDueDate,
  progress, setProgress, onProgressChange, estimatedTime, setEstimatedTime,
}: EditModalSidebarProps) {
  return (
    <aside className="w-full lg:w-[360px] border-l border-border/40 bg-muted/5 p-8 space-y-10 overflow-y-auto shrink-0">
      <section className="space-y-8">
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">Parâmetros</h4>

        <PropertyRow icon={LayoutTemplate} label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-11 border-none bg-background/50 shadow-xl rounded-2xl font-bold text-[10px] uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="TODO" className="text-[10px] font-bold uppercase">A Fazer</SelectItem>
              <SelectItem value="IN_PROGRESS" className="text-[10px] font-bold uppercase">Em Curso</SelectItem>
              <SelectItem value="DONE" className="text-[10px] font-bold uppercase">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow icon={Flag} label="Urgência">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-11 border-none bg-background/50 shadow-xl rounded-2xl font-bold text-[10px] uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="LOW" className="text-[10px] font-bold uppercase">Baixa</SelectItem>
              <SelectItem value="MEDIUM" className="text-[10px] font-bold uppercase text-amber-500">Média</SelectItem>
              <SelectItem value="HIGH" className="text-[10px] font-bold uppercase text-rose-500">Alta</SelectItem>
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow icon={CalendarDays} label="Prazo">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="w-full h-11 justify-start bg-background/50 shadow-xl rounded-2xl font-bold text-[10px] uppercase px-5">
                {dueDate ? format(dueDate, "dd MMM, yyyy", { locale: ptBR }) : "Definir"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-[2rem] overflow-hidden border-border/40 shadow-2xl" align="end">
              <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={ptBR} initialFocus />
            </PopoverContent>
          </Popover>
        </PropertyRow>
      </section>

      <Separator className="bg-border/40" />

      <section className="space-y-8">
        <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">Métricas</h4>
        <div className="bg-background border border-border/40 rounded-[2rem] p-6 space-y-6 shadow-xl">
          <div className="flex justify-between items-end">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Saúde</span>
              <div className="text-4xl font-black font-mono tracking-tighter text-primary">{progress}%</div>
            </div>
            <Target size={24} className="text-primary/20" />
          </div>
          <Slider value={[progress]} onValueChange={([v]) => { setProgress(v); onProgressChange(v); }} max={100} step={5} />
        </div>

        <div className="flex items-center justify-between px-4 py-4 bg-background/40 rounded-2xl border border-dashed border-border/60">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase text-muted-foreground/60">
            <Timer size={14} /> Esforço
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={estimatedTime}
              onChange={e => setEstimatedTime(Number(e.target.value))}
              className="w-12 bg-transparent border-none text-right font-mono text-lg font-black outline-none text-primary"
            />
            <span className="text-[9px] font-black text-muted-foreground/30 uppercase">Min</span>
          </div>
        </div>
      </section>
    </aside>
  );
}
