"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createEvent, updateEvent } from "@/app/(dashboard)/agenda/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Bell, Loader2, MapPin, Palette, Clock, Type } from "lucide-react";
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

export function EventForm({ onClose, initialData }: { onClose?: () => void, initialData?: EventFormData }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const searchParams = useSearchParams();

  const [selectedColor, setSelectedColor] = useState(initialData?.color || "#6366f1");

  const urlDate = searchParams.get("date");
  const defaultDate = initialData
    ? format(new Date(initialData.startTime), 'yyyy-MM-dd')
    : (urlDate || new Date().toISOString().split('T')[0]);

  const defaultTime = initialData
    ? format(new Date(initialData.startTime), 'HH:mm')
    : "09:00";

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    formData.set('color', selectedColor);
    
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
    <form action={handleSubmit} className="space-y-6 pt-4">
        {initialData && <input type="hidden" name="id" value={initialData.id} />}

        {/* Título */}
        <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Título</Label>
            <div className="relative">
                <Type className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                    id="title" 
                    name="title" 
                    defaultValue={initialData?.title} 
                    placeholder="Ex: Reunião de Planejamento" 
                    className="pl-10 h-11 bg-muted/30 border-border focus-visible:ring-primary"
                    required 
                    autoFocus={!initialData} 
                />
            </div>
        </div>

        {/* Data e Hora */}
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="date" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Data</Label>
                <div className="relative">
                    <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                        id="date" 
                        name="date" 
                        type="date" 
                        required 
                        defaultValue={defaultDate} 
                        className="pl-10 h-11 bg-muted/30 border-border focus-visible:ring-primary"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="time" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Horário</Label>
                <div className="relative">
                    <Clock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                        id="time" 
                        name="time" 
                        type="time" 
                        required 
                        defaultValue={defaultTime} 
                        className="pl-10 h-11 bg-muted/30 border-border focus-visible:ring-primary"
                    />
                </div>
            </div>
        </div>

        {/* Localização */}
        <div className="space-y-2">
            <Label htmlFor="location" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Localização</Label>
            <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                    id="location" 
                    name="location" 
                    defaultValue={initialData?.location || ""} 
                    placeholder="Ex: Sala de Reunião / Google Meet" 
                    className="pl-10 h-11 bg-muted/30 border-border focus-visible:ring-primary"
                />
            </div>
        </div>

        {/* Descrição */}
        <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detalhes</Label>
            <Textarea 
                id="description" 
                name="description" 
                defaultValue={initialData?.description || ""} 
                placeholder="Adicione notas, pautas ou links..." 
                rows={3} 
                className="bg-muted/30 border-border focus-visible:ring-primary resize-none p-3"
            />
        </div>

        {/* Configurações Extras */}
        <div className="pt-2 flex flex-col gap-5">
            
            {/* Seletor de Cor */}
            <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Palette className="h-3 w-3" /> Cor do Evento
                </Label>
                <div className="flex flex-wrap gap-3">
                    {PRESET_COLORS.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={cn(
                                "w-6 h-6 rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm",
                                selectedColor === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                            )}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                        />
                    ))}
                    
                    {/* Custom Color Input Wrapper */}
                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-border hover:scale-110 transition-transform cursor-pointer shadow-sm">
                        <input 
                            type="color" 
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 cursor-pointer border-0 opacity-0"
                        />
                        <div className="w-full h-full" style={{ backgroundColor: selectedColor }} />
                    </div>
                </div>
            </div>

            {/* Notificação */}
            <div className="flex items-center space-x-2 bg-muted/30 p-3 rounded-lg border border-border">
                <Checkbox id="notification" name="notification" defaultChecked className="border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <Label htmlFor="notification" className="text-sm flex items-center gap-2 cursor-pointer font-medium text-foreground">
                    <Bell className="h-4 w-4 text-primary" /> 
                    Receber notificação 30 min antes
                </Label>
            </div>
        </div>

        <DialogFooter className="mt-6 pt-4 border-t border-border">
            {onClose && (
                <Button type="button" variant="ghost" onClick={onClose} className="mr-auto text-muted-foreground hover:text-foreground">
                    Cancelar
                </Button>
            )}
            <Button type="submit" disabled={isPending} className="bg-primary text-primary-foreground hover:bg-primary/90 min-w-[140px] shadow-sm">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarIcon className="h-4 w-4 mr-2" />}
                {initialData ? "Salvar Alterações" : "Agendar Evento"}
            </Button>
        </DialogFooter>
    </form>
  );
}