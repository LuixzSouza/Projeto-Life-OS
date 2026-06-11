"use client";

import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Flag, CalendarDays, LayoutTemplate, Target, Timer, X } from 'lucide-react';
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

/** Bolinha de cor nos itens dos selects — leitura instantânea do estado. */
function Dot({ className }: { className: string }) {
  return <span className={cn('mr-2 inline-block h-2 w-2 rounded-full align-middle', className)} />;
}

// Painel de propriedades da SIDEBAR do modal (coluna vertical no desktop;
// no mobile vira a seção final, em 2 colunas quando o espaço permite).
export function TaskProperties({
  status, setStatus, priority, setPriority, dueDate, setDueDate,
  progress, setProgress, onProgressChange, estimatedTime, setEstimatedTime,
}: TaskPropertiesProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-1">
        <PropertyRow icon={LayoutTemplate} label="Status">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-11 border-border/40 bg-background shadow-sm rounded-xl font-semibold text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="TODO" className="text-sm font-medium"><Dot className="bg-zinc-400" />A fazer</SelectItem>
              <SelectItem value="IN_PROGRESS" className="text-sm font-medium"><Dot className="bg-blue-500" />Em progresso</SelectItem>
              <SelectItem value="REVIEW" className="text-sm font-medium"><Dot className="bg-purple-500" />Revisão</SelectItem>
              <SelectItem value="DONE" className="text-sm font-medium"><Dot className="bg-emerald-500" />Concluído</SelectItem>
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow icon={Flag} label="Prioridade">
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-11 border-border/40 bg-background shadow-sm rounded-xl font-semibold text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="LOW" className="text-sm font-medium"><Dot className="bg-zinc-400" />Baixa</SelectItem>
              <SelectItem value="MEDIUM" className="text-sm font-medium"><Dot className="bg-amber-500" />Média</SelectItem>
              <SelectItem value="HIGH" className="text-sm font-medium"><Dot className="bg-rose-500" />Alta</SelectItem>
            </SelectContent>
          </Select>
        </PropertyRow>

        <PropertyRow icon={CalendarDays} label="Prazo">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full h-11 justify-start bg-background border-border/40 shadow-sm rounded-xl font-semibold text-sm px-4',
                  !dueDate && 'text-muted-foreground font-medium',
                )}
              >
                {dueDate ? format(dueDate, "dd MMM, yyyy", { locale: ptBR }) : "Definir prazo"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-2xl overflow-hidden border-border/40 shadow-xl" align="start">
              <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={ptBR} initialFocus />
              {/* Atalhos: 90% dos prazos são "hoje" ou "amanhã" */}
              <div className="flex items-center gap-1.5 border-t border-border/40 p-2">
                <Button type="button" variant="ghost" size="sm" className="h-8 flex-1 rounded-lg text-xs font-bold" onClick={() => setDueDate(new Date())}>
                  Hoje
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-8 flex-1 rounded-lg text-xs font-bold" onClick={() => setDueDate(addDays(new Date(), 1))}>
                  Amanhã
                </Button>
                <Button
                  type="button" variant="ghost" size="sm"
                  disabled={!dueDate}
                  className="h-8 flex-1 rounded-lg text-xs font-bold text-muted-foreground hover:text-rose-500"
                  onClick={() => setDueDate(undefined)}
                >
                  <X className="mr-1 h-3 w-3" /> Limpar
                </Button>
              </div>
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
      <div className="rounded-xl border border-border/40 bg-background/60 p-4 space-y-3">
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
