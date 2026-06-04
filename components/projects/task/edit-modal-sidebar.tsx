"use client";

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Flag, CalendarDays, LayoutTemplate, Target, Timer } from 'lucide-react';
import { PropertyRow } from './edit-modal-helpers';

interface TaskPropertiesProps {
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

// Painel de propriedades em GRADE (não é mais uma sidebar vertical) — entra no
// corpo do modal em coluna única.
export function TaskProperties({
  status, setStatus, priority, setPriority, dueDate, setDueDate,
  progress, setProgress, onProgressChange, estimatedTime, setEstimatedTime,
}: TaskPropertiesProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PropertyRow icon={LayoutTemplate} label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-11 border-border/40 bg-background shadow-sm rounded-xl font-semibold text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="TODO" className="text-sm font-medium">A fazer</SelectItem>
              <SelectItem value="IN_PROGRESS" className="text-sm font-medium">Em andamento</SelectItem>
              <SelectItem value="DONE" className="text-sm font-medium">Concluído</SelectItem>
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow icon={Flag} label="Prioridade">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-11 border-border/40 bg-background shadow-sm rounded-xl font-semibold text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="LOW" className="text-sm font-medium">Baixa</SelectItem>
              <SelectItem value="MEDIUM" className="text-sm font-medium text-amber-500">Média</SelectItem>
              <SelectItem value="HIGH" className="text-sm font-medium text-rose-500">Alta</SelectItem>
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow icon={CalendarDays} label="Prazo">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full h-11 justify-start bg-background border-border/40 shadow-sm rounded-xl font-semibold text-sm px-4">
                {dueDate ? format(dueDate, "dd MMM, yyyy", { locale: ptBR }) : "Definir prazo"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden border-border/40 shadow-xl" align="start">
              <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={ptBR} initialFocus />
            </PopoverContent>
          </Popover>
        </PropertyRow>

        <PropertyRow icon={Timer} label="Tempo estimado">
          <div className="flex items-center h-11 rounded-xl border border-border/40 bg-background shadow-sm px-3.5 gap-2">
            <input
              type="number"
              min={0}
              value={estimatedTime}
              onChange={e => setEstimatedTime(Number(e.target.value))}
              className="w-full bg-transparent border-none outline-none font-semibold text-sm text-foreground"
            />
            <span className="text-xs font-medium text-muted-foreground shrink-0">min</span>
          </div>
        </PropertyRow>
      </div>

      {/* Progresso */}
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Target size={14} /> Conclusão
          </span>
          <span className="text-lg font-bold font-mono tracking-tight text-primary">{progress}%</span>
        </div>
        <Slider value={[progress]} onValueChange={([v]) => { setProgress(v); onProgressChange(v); }} max={100} step={5} />
      </div>
    </div>
  );
}
