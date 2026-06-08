"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createEvent, updateEvent } from "@/app/(dashboard)/agenda/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CalendarIcon,
  Bell,
  Loader2,
  MapPin,
  Palette,
  Clock,
  Type,
  CalendarCheck,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { format, addHours } from "date-fns";
import { cn } from "@/lib/utils";

export interface EventFormData {
  id?: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime?: Date | null; 
  location?: string | null;
  color?: string | null;
  projectId?: string | null;
}

const PRESET_COLORS = [
  "#3B82F6", // Blue (Google Default)
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#64748B", // Slate
];

export function EventForm({
  onClose,
  initialData,
  defaultStart,
  defaultEnd,
  taskId,
  taskTitle,
}: {
  onClose?: () => void;
  initialData?: EventFormData;
  // Pré-preenchimento ao CRIAR (sem initialData): vindo do clique num slot da grade.
  defaultStart?: Date;
  defaultEnd?: Date;
  // Ao CRIAR a partir de uma tarefa: vincula o bloco à tarefa (Projetos↔Agenda).
  taskId?: string | null;
  taskTitle?: string | null;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const searchParams = useSearchParams();

  const [selectedColor, setSelectedColor] = useState(
    initialData?.color || "#3B82F6"
  );

  const urlDate = searchParams.get("date");
  const defaultDate = initialData
    ? format(new Date(initialData.startTime), "yyyy-MM-dd")
    : defaultStart
      ? format(defaultStart, "yyyy-MM-dd")
      : urlDate || format(new Date(), "yyyy-MM-dd");

  const defaultStartTime = initialData
    ? format(new Date(initialData.startTime), "HH:mm")
    : defaultStart
      ? format(defaultStart, "HH:mm")
      : "09:00";

  const defaultEndTime = initialData?.endTime
    ? format(new Date(initialData.endTime), "HH:mm")
    : initialData
        ? format(addHours(new Date(initialData.startTime), 1), "HH:mm")
        : defaultEnd
          ? format(defaultEnd, "HH:mm")
          : defaultStart
            ? format(addHours(defaultStart, 1), "HH:mm")
            : "10:00";

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    formData.set("color", selectedColor);

    try {
      if (initialData) {
        await updateEvent(formData);
        toast.success("Alocação de tempo atualizada.");
      } else {
        await createEvent(formData);
        toast.success("Novo bloco de tempo reservado.");
      }

      router.refresh();
      if (onClose) onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Falha na sincronização.";
      toast.error(msg);
    } finally {
      setIsPending(false);
    }
  };

  return (
    // 🟢 CORREÇÃO AQUI: Trocado 'h-full' por 'max-h-[75vh] w-full'. Isso garante que ele nunca ultrapasse a tela do celular/monitor!
    <form action={handleSubmit} className="flex flex-col w-full max-h-[75vh] sm:max-h-[80vh] overflow-hidden">
      
      {initialData && <input type="hidden" name="id" value={initialData.id} />}
      {!initialData && taskId && <input type="hidden" name="taskId" value={taskId} />}

      {/* ÁREA ROLÁVEL (Inputs) - Agora vai rolar perfeitamente */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">

          {!initialData && taskId && taskTitle && (
            <div className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
              <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Bloco vinculado à tarefa: <span className="text-primary">{taskTitle}</span>
              </span>
            </div>
          )}

          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Type className="h-3 w-3" /> Identificação do Evento
            </Label>
            <Input
              id="title"
              name="title"
              defaultValue={initialData?.title ?? (taskTitle || undefined)}
              placeholder="Ex: Sync de Projetos"
              className="h-12 text-base font-bold placeholder:text-muted-foreground/30 bg-muted/20 border-border/40 focus-visible:ring-primary/30 focus-visible:border-primary transition-all rounded-xl"
              required
              autoFocus={!initialData}
            />
          </div>

          {/* Data e Horários (Timeblocking Grid) */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-muted/10 p-4 rounded-[1.5rem] border border-border/40 shadow-inner">
            <div className="sm:col-span-12">
              <Label htmlFor="date" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-2">
                <CalendarCheck className="h-3 w-3" /> Data Base
              </Label>
              <div className="relative group">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
                <Input
                  id="date"
                  name="date"
                  type="date"
                  required
                  defaultValue={defaultDate}
                  className="pl-10 h-11 bg-background border-border/40 focus-visible:ring-primary/30 transition-all rounded-xl font-mono font-bold text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-6 space-y-2">
              <Label htmlFor="time" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" /> Início
              </Label>
              <Input
                id="time"
                name="time"
                type="time"
                required
                defaultValue={defaultStartTime}
                className="h-11 bg-background border-border/40 focus-visible:ring-primary/30 transition-all rounded-xl font-mono font-bold text-sm text-center"
              />
            </div>
            
            <div className="sm:col-span-6 space-y-2">
              <Label htmlFor="endTime" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" /> Fim
              </Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                required
                defaultValue={defaultEndTime}
                className="h-11 bg-background border-border/40 focus-visible:ring-primary/30 transition-all rounded-xl font-mono font-bold text-sm text-center"
              />
            </div>
          </div>

          {/* Localização */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <MapPin className="h-3 w-3" /> Local ou Link
            </Label>
            <div className="relative group">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none" />
              <Input
                id="location"
                name="location"
                defaultValue={initialData?.location || ""}
                placeholder="Ex: Sala de Reunião 1 / Link do Meet"
                className="pl-10 h-11 bg-muted/20 border-border/40 focus-visible:ring-primary/30 transition-all rounded-xl font-medium text-sm"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              Detalhes Adicionais
            </Label>
            <Textarea
              id="description"
              name="description"
              defaultValue={initialData?.description || ""}
              placeholder="Adicione pautas, links importantes ou notas..."
              rows={3}
              className="bg-muted/20 border-border/40 focus-visible:ring-primary/30 resize-none p-4 rounded-xl min-h-[100px] text-sm font-medium leading-relaxed transition-all"
            />
          </div>

          {/* Cor e Notificações */}
          <div className="space-y-6 pb-2">
            <div className="space-y-3">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Palette className="h-3 w-3" /> Classificação de Cor
              </Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "w-8 h-8 rounded-lg transition-all focus:outline-none shadow-sm flex items-center justify-center border-2 border-transparent",
                      selectedColor === color
                        ? "scale-110 border-background ring-2 ring-primary"
                        : "hover:scale-105 hover:border-primary/20"
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {selectedColor === color && <CheckCircle className="h-4 w-4 text-white drop-shadow-md" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-3 bg-muted/30 p-4 rounded-xl border border-border/40">
              <Checkbox
                id="notification"
                name="notification"
                defaultChecked
                className="h-5 w-5 border-2 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all rounded-md"
              />
              <Label htmlFor="notification" className="text-xs font-bold uppercase tracking-wider text-foreground cursor-pointer select-none flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-primary" /> Alerta (-30 min)
              </Label>
            </div>
          </div>
      </div>

      {/* 🟢 ÁREA FIXA (Footer) - Usando shrink-0 para impedir que o flexbox amasse os botões */}
      <div className="p-6 bg-background border-t border-border/40 flex items-center gap-3 shrink-0">
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="flex-1 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/40 transition-all hidden sm:flex"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending}
          className="flex-[2] h-12 w-full rounded-xl bg-foreground text-background hover:bg-primary hover:text-white font-black uppercase tracking-widest text-[10px] shadow-lg transition-all group active:scale-95"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <span className="flex items-center gap-2">
              {initialData ? "Atualizar Linha do Tempo" : "Gravar Linha do Tempo"}
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}