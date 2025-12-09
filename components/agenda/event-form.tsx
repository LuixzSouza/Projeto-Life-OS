"use client";

import { useState } from "react";
import { useRouter } from "next/navigation"; // Import router for refresh
import { createEvent, updateEvent } from "@/app/(dashboard)/agenda/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Bell, Loader2, MapPin, Palette, Clock, Type } from "lucide-react";
import { toast } from "sonner";
import { DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox"; // Assuming Checkbox component exists
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

// Interface matches Prisma/DB structure
export interface EventFormData {
  id?: string;
  title: string;
  description?: string | null;
  startTime: Date;
  location?: string | null;
  color?: string | null;
}

const PRESET_COLORS = [
  "#6366f1", // Indigo (Default)
  "#ef4444", // Red
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#3b82f6", // Blue
  "#ec4899", // Pink
  "#8b5cf6", // Violet
];

export function EventForm({ onClose, initialData }: { onClose?: () => void, initialData?: EventFormData }) {
  const router = useRouter(); // Initialize router
  const [isPending, setIsPending] = useState(false);
  const searchParams = useSearchParams();

  // State for Color Picker to make it interactive
  const [selectedColor, setSelectedColor] = useState(initialData?.color || "#6366f1");

  // Defaults
  const urlDate = searchParams.get("date");
  const defaultDate = initialData
    ? format(initialData.startTime, 'yyyy-MM-dd')
    : (urlDate || new Date().toISOString().split('T')[0]);

  const defaultTime = initialData
    ? format(initialData.startTime, 'HH:mm')
    : "09:00";

  const handleSubmit = async (formData: FormData) => {
    setIsPending(true);
    // Append selected color manually since we might use divs for selection
    formData.set('color', selectedColor);
    
    try {
        if (initialData) {
            await updateEvent(formData);
            toast.success("Evento atualizado com sucesso!");
        } else {
            await createEvent(formData);
            toast.success("Novo compromisso agendado!");
        }

        router.refresh(); // Refresh data on page
        if (onClose) onClose(); // Close modal
    } catch (error) {
        console.error(error);
        toast.error("Ocorreu um erro ao salvar.");
    } finally {
        setIsPending(false);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-5 py-2">
        {initialData && <input type="hidden" name="id" value={initialData.id} />}

        {/* Title Input with Icon */}
        <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Título</Label>
            <div className="relative">
                <Type className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input 
                    id="title" 
                    name="title" 
                    defaultValue={initialData?.title} 
                    placeholder="Ex: Reunião de Planejamento" 
                    className="pl-9 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus-visible:ring-indigo-500"
                    required 
                    autoFocus={!initialData} // Auto focus only on create
                />
            </div>
        </div>

        {/* Date & Time Grid */}
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="date" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Data</Label>
                <div className="relative">
                    <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input 
                        id="date" 
                        name="date" 
                        type="date" 
                        required 
                        defaultValue={defaultDate} 
                        className="pl-9 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="time" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Horário</Label>
                <div className="relative">
                    <Clock className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                    <Input 
                        id="time" 
                        name="time" 
                        type="time" 
                        required 
                        defaultValue={defaultTime} 
                        className="pl-9 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                    />
                </div>
            </div>
        </div>

        {/* Location */}
        <div className="space-y-2">
            <Label htmlFor="location" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Localização</Label>
            <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                <Input 
                    id="location" 
                    name="location" 
                    defaultValue={initialData?.location || ""} 
                    placeholder="Ex: Sala de Reunião / Google Meet" 
                    className="pl-9 bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800"
                />
            </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
            <Label htmlFor="description" className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Detalhes</Label>
            <Textarea 
                id="description" 
                name="description" 
                defaultValue={initialData?.description || ""} 
                placeholder="Adicione notas, pautas ou links..." 
                rows={3} 
                className="bg-zinc-50/50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 resize-none"
            />
        </div>

        {/* Settings Row: Color & Notification */}
        <div className="pt-2 flex flex-col gap-4">
            
            {/* Color Selection */}
            <div className="space-y-2">
                <Label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
                    <Palette className="h-3 w-3" /> Cor do Evento
                </Label>
                <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => setSelectedColor(color)}
                            className={cn(
                                "w-6 h-6 rounded-full border-2 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500",
                                selectedColor === color ? "border-zinc-900 dark:border-white scale-110 shadow-sm" : "border-transparent"
                            )}
                            style={{ backgroundColor: color }}
                            aria-label={`Select color ${color}`}
                        />
                    ))}
                    {/* Custom Color Picker Hidden but accessible via a custom trigger if needed, or simple input for fallback */}
                     <div className="relative w-6 h-6 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 hover:scale-110 transition-transform">
                        <input 
                            type="color" 
                            value={selectedColor}
                            onChange={(e) => setSelectedColor(e.target.value)}
                            className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] p-0 cursor-pointer border-0"
                        />
                     </div>
                </div>
            </div>

            {/* Notification Checkbox */}
            <div className="flex items-center space-x-2 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
                <Checkbox id="notification" name="notification" defaultChecked />
                <Label htmlFor="notification" className="text-sm flex items-center gap-2 cursor-pointer font-normal text-zinc-700 dark:text-zinc-300">
                    <Bell className="h-4 w-4 text-indigo-500" /> 
                    Receber notificação 30 min antes
                </Label>
            </div>
        </div>

        <DialogFooter className="mt-6">
            {onClose && (
                <Button type="button" variant="ghost" onClick={onClose} className="mr-auto">
                    Cancelar
                </Button>
            )}
            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarIcon className="h-4 w-4 mr-2" />}
                {initialData ? "Salvar" : "Agendar"}
            </Button>
        </DialogFooter>
    </form>
  );
}