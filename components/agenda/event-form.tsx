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
import { DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface EventFormData {
  id?: string;
  title: string;
  description?: string | null;
  startTime: Date;
  location?: string | null;
  color?: string | null;
  projectId?: string | null;
}

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#ec4899", // Pink
  "#8b5cf6", // Violet
];

export function EventForm({
  onClose,
  initialData,
}: {
  onClose?: () => void;
  initialData?: EventFormData;
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const searchParams = useSearchParams();

  const [selectedColor, setSelectedColor] = useState(
    initialData?.color || "#6366f1"
  );

  const urlDate = searchParams.get("date");
  const defaultDate = initialData
    ? format(new Date(initialData.startTime), "yyyy-MM-dd")
    : urlDate || new Date().toISOString().split("T")[0];

  const defaultTime = initialData
    ? format(new Date(initialData.startTime), "HH:mm")
    : "09:00";

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    formData.set("color", selectedColor);

    try {
      if (initialData) {
        await updateEvent(formData);
        toast.success("Evento atualizado com sucesso!");
      } else {
        await createEvent(formData);
        toast.success("Novo compromisso agendado!");
      }

      router.refresh();
      if (onClose) onClose();
    } catch (error) {
      console.error(error);
      toast.error("Ocorreu um erro ao salvar.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-6 pt-2">
      {initialData && <input type="hidden" name="id" value={initialData.id} />}

      {/* Seção Principal: Título */}
      <div className="space-y-2">
        <Label
          htmlFor="title"
          className="text-xs font-bold text-primary uppercase tracking-wide flex items-center gap-1.5"
        >
          <Type className="h-3.5 w-3.5" /> Título do Evento
        </Label>
        <Input
          id="title"
          name="title"
          defaultValue={initialData?.title}
          placeholder="Ex: Reunião de Planejamento Trimestral"
          className="h-12 text-lg font-medium placeholder:text-muted-foreground/50 border-primary/20 bg-primary/5 focus-visible:ring-primary focus-visible:border-primary transition-all rounded-xl"
          required
          autoFocus={!initialData}
        />
      </div>

      {/* Grid: Data e Hora */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label
            htmlFor="date"
            className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"
          >
            <CalendarCheck className="h-3.5 w-3.5" /> Data
          </Label>
          <div className="relative group">
            <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors z-10 pointer-events-none" />
            <Input
              id="date"
              name="date"
              type="date"
              required
              defaultValue={defaultDate}
              className="pl-10 h-11 bg-background border-input hover:border-primary/50 focus-visible:ring-primary transition-all rounded-lg"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label
            htmlFor="time"
            className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"
          >
            <Clock className="h-3.5 w-3.5" /> Horário
          </Label>
          <div className="relative group">
            <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors z-10 pointer-events-none" />
            <Input
              id="time"
              name="time"
              type="time"
              required
              defaultValue={defaultTime}
              className="pl-10 h-11 bg-background border-input hover:border-primary/50 focus-visible:ring-primary transition-all rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Localização */}
      <div className="space-y-2">
        <Label
          htmlFor="location"
          className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5"
        >
          <MapPin className="h-3.5 w-3.5" /> Localização
        </Label>
        <div className="relative group">
          <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors z-10 pointer-events-none" />
          <Input
            id="location"
            name="location"
            defaultValue={initialData?.location || ""}
            placeholder="Ex: Sala de Reunião 1 / Link do Meet"
            className="pl-10 h-11 bg-background border-input hover:border-primary/50 focus-visible:ring-primary transition-all rounded-lg"
          />
        </div>
      </div>

      {/* Detalhes (Textarea) */}
      <div className="space-y-2">
        <Label
          htmlFor="description"
          className="text-xs font-bold text-muted-foreground uppercase tracking-wide"
        >
          Detalhes Adicionais
        </Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={initialData?.description || ""}
          placeholder="Adicione pautas, links importantes ou notas prévias..."
          rows={3}
          className="bg-background border-input focus-visible:ring-primary resize-none p-3 rounded-xl min-h-[100px] leading-relaxed"
        />
      </div>

      {/* Seção Visual: Cor e Notificação */}
      <div className="pt-4 flex flex-col gap-6 border-t border-border/50">
        {/* Seletor de Cor */}
        <div className="space-y-3">
          <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Palette className="h-3.5 w-3.5" /> Identificação Visual
          </Label>
          <div className="flex flex-wrap gap-3 items-center">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                className={cn(
                  "w-8 h-8 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm flex items-center justify-center border-2 border-transparent",
                  selectedColor === color
                    ? "ring-2 ring-offset-2 ring-primary scale-110 border-background"
                    : "hover:border-primary/30"
                )}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              >
                {selectedColor === color && (
                  <CheckCircle className="h-4 w-4 text-white drop-shadow-md animate-in zoom-in duration-200" />
                )}
              </button>
            ))}

            {/* Custom Color Picker (Hidden logic, visual trigger) */}
            <div className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-border border-dashed hover:border-primary hover:scale-110 transition-all cursor-pointer shadow-sm bg-gradient-to-br from-background to-muted group">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 cursor-pointer border-0 opacity-0"
                title="Cor personalizada"
              />
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  backgroundColor: !PRESET_COLORS.includes(selectedColor)
                    ? selectedColor
                    : "transparent",
                }}
              >
                {!PRESET_COLORS.includes(selectedColor) ? (
                  <CheckCircle className="h-4 w-4 text-white drop-shadow-md" />
                ) : (
                  <Palette className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Notificação Checkbox */}
        <div className="flex items-center space-x-3 bg-primary/5 p-4 rounded-xl border border-primary/10 transition-colors hover:border-primary/20">
          <Checkbox
            id="notification"
            name="notification"
            defaultChecked
            className="h-5 w-5 border-2 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-all"
          />
          <Label
            htmlFor="notification"
            className="text-sm flex items-center gap-2 cursor-pointer font-medium text-foreground select-none"
          >
            <Bell className="h-4 w-4 text-primary" />
            Receber lembrete 30 minutos antes
          </Label>
        </div>
      </div>

      <DialogFooter className="mt-8 pt-4 border-t border-border/50 gap-2 sm:gap-0">
        {onClose && (
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="mr-auto text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending}
          className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[160px] shadow-lg shadow-primary/20 h-11 text-sm font-semibold rounded-lg transition-all active:scale-[0.98]"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...
            </>
          ) : (
            <>
              <CalendarIcon className="h-4 w-4 mr-2" />
              {initialData ? "Atualizar Evento" : "Confirmar Agendamento"}
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}