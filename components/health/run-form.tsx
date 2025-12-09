"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider"; 
import { MapPin, Timer, Loader2 } from "lucide-react";
import { logWorkout, updateWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { DialogFooter } from "@/components/ui/dialog";
import { Workout } from "@prisma/client";

export function RunForm({ onClose, initialData }: { onClose?: () => void, initialData?: Workout }) {
    const [isLoading, setIsLoading] = useState(false);
    const [feeling, setFeeling] = useState(initialData?.feeling || "😄");
    // Intensity mapping: LOW=2, MEDIUM=5, HIGH=8
    const defaultIntensity = initialData?.intensity === 'HIGH' ? 8 : initialData?.intensity === 'MEDIUM' ? 5 : 2;
    const [intensity, setIntensity] = useState([defaultIntensity]);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        formData.append("type", "RUN");
        formData.append("feeling", feeling);
        formData.append("intensity", intensity[0] > 7 ? "HIGH" : intensity[0] > 4 ? "MEDIUM" : "LOW");
        
        try {
            if (initialData) {
                formData.append("id", initialData.id);
                await updateWorkout(formData);
                toast.success("Corrida atualizada!");
            } else {
                await logWorkout(formData);
                toast.success("Corrida registrada! 🏃‍♂️💨");
            }
            if(onClose) onClose();
        } catch {
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4 py-2">
            <Input name="title" defaultValue={initialData?.title} placeholder="Título (ex: Corrida no Parque)" required />
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><MapPin className="h-4 w-4"/> Distância (km)</Label>
                    <Input name="distance" type="number" step="0.1" defaultValue={initialData?.distance || ""} placeholder="5.0" required />
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Timer className="h-4 w-4"/> Tempo (min)</Label>
                    <Input name="duration" type="number" defaultValue={initialData?.duration || ""} placeholder="30" required />
                </div>
            </div>

            <div className="space-y-2">
                <Label>Pace Médio (min/km)</Label>
                <Input name="pace" defaultValue={initialData?.pace || ""} placeholder="Ex: 5:30" />
            </div>

            <div className="space-y-4 pt-2 bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-lg">
                <div className="space-y-2">
                    <Label className="flex justify-between text-xs uppercase text-zinc-500 font-bold">
                        <span>Esforço</span>
                        <span className="text-orange-500">{intensity[0]}/10</span>
                    </Label>
                    <Slider value={intensity} onValueChange={setIntensity} max={10} step={1} />
                </div>

                <div className="space-y-2">
                    <Label className="text-xs uppercase text-zinc-500 font-bold">Sensação</Label>
                    <div className="flex gap-4 justify-center">
                        {["😄", "🙂", "😐", "😫", "💀"].map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => setFeeling(emoji)}
                                className={`text-2xl p-1 rounded-full transition-all ${feeling === emoji ? "bg-white shadow-sm scale-125" : "opacity-40 hover:opacity-100"}`}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <Textarea name="notes" defaultValue={initialData?.notes || ""} placeholder="Notas sobre o percurso, tênis usado, etc..." rows={2} />

            <DialogFooter>
                <Button type="submit" disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (initialData ? "Salvar Alterações" : "Salvar Corrida")}
                </Button>
            </DialogFooter>
        </form>
    )
}