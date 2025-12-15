"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Timer, MapPin, Activity, Flame, Save, Gauge, Loader2, Navigation, Footprints } from "lucide-react";
import { logWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- TIPAGEM ESTRITA (Sem any) ---
export interface RunFormData {
    id?: string;
    distance?: number | null;
    duration?: number;
    notes?: string | null;
    pace?: string | null;
    feeling?: string | null;
}

interface RunFormProps {
    onSuccess?: () => void;
    onClose?: () => void;
    initialData?: RunFormData; // Tipagem correta aqui
}

export function RunForm({ onSuccess, onClose, initialData }: RunFormProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Estados
    const [distance, setDistance] = useState<string>(initialData?.distance ? String(initialData.distance) : "");
    const [duration, setDuration] = useState<string>(initialData?.duration ? String(initialData.duration) : ""); 
    const [intensity, setIntensity] = useState([5]); 
    const [surface, setSurface] = useState("ROAD");
    const [shoes, setShoes] = useState("NONE");
    const [notes, setNotes] = useState(initialData?.notes || "");

    // Cálculos Derivados
    const { pace, calories } = useMemo(() => {
        const dist = parseFloat(distance) || 0;
        const dur = parseFloat(duration) || 0;

        if (dist > 0 && dur > 0) {
            const paceDecimal = dur / dist;
            const paceMin = Math.floor(paceDecimal);
            const paceSec = Math.round((paceDecimal - paceMin) * 60);
            const formattedPace = `${paceMin}'${paceSec.toString().padStart(2, '0')}"`;

            // Estimativa: 8 METs * 75kg * horas
            const hours = dur / 60;
            const estimatedCals = Math.round(8 * 75 * hours); 

            return { pace: formattedPace, calories: estimatedCals };
        }
        return { pace: "0'00\"", calories: 0 };
    }, [distance, duration]);

    // Helpers de Estilo para Intensidade
    const getIntensityColor = (val: number) => {
        if (val <= 3) return "bg-emerald-500";
        if (val <= 7) return "bg-yellow-500";
        return "bg-red-500";
    };

    const getIntensityLabel = (val: number) => {
        if (val <= 2) return "Muito Leve (Recuperação)";
        if (val <= 4) return "Leve (Aeróbico)";
        if (val <= 6) return "Moderado (Ritmo)";
        if (val <= 8) return "Difícil (Limiar)";
        return "Máximo (Sprint/VO2)";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); 
        setIsLoading(true);
        
        if (!distance || !duration) {
            toast.error("Preencha a distância e duração.");
            setIsLoading(false);
            return;
        }

        const formData = new FormData();
        formData.append("title", `Corrida de ${distance}km`);
        formData.append("type", "RUNNING");
        formData.append("distance", distance);
        formData.append("duration", duration);
        formData.append("pace", pace); 
        
        // Intensidade textual para o banco
        const intensityMap = ["Muito Leve", "Leve", "Moderado", "Difícil", "Máximo"];
        const intensityLabel = intensityMap[Math.min(Math.floor((intensity[0] - 1) / 2), 4)] || "Moderado";
        formData.append("intensity", intensityLabel);
        
        // Notas compostas
        const shoesText = shoes !== "NONE" ? ` | Tênis: ${shoes}` : "";
        formData.append("notes", `Terreno: ${surface}${shoesText}. ${notes}`);
        
        // Feeling automático
        formData.append("feeling", intensity[0] <= 3 ? "GOOD" : intensity[0] >= 8 ? "EXHAUSTED" : "TIRED");

        try {
            await logWorkout(formData);
            toast.success("Corrida registrada! 🏃‍♂️💨");
            
            if (onSuccess) onSuccess();
            if (onClose) onClose();

            // Limpa form se o modal não fechar
            setDistance("");
            setDuration("");
            setNotes("");
            setIntensity([5]);
        } catch {
            toast.error("Erro ao salvar corrida.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 py-4">
            
            {/* 1. SEÇÃO PRINCIPAL (Inputs Grandes) */}
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                        <MapPin className="h-4 w-4 text-blue-500" /> Distância
                    </Label>
                    <div className="relative group">
                        <Input 
                            type="number" 
                            step="0.01" 
                            placeholder="0.0" 
                            className="font-mono text-3xl h-16 pl-4 pr-12 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            required
                            autoFocus
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 pointer-events-none group-hover:text-blue-500 transition-colors">km</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label className="flex items-center gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                        <Timer className="h-4 w-4 text-blue-500" /> Tempo
                    </Label>
                    <div className="relative group">
                        <Input 
                            type="number" 
                            placeholder="00" 
                            className="font-mono text-3xl h-16 pl-4 pr-12 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold"
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            required
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 pointer-events-none group-hover:text-blue-500 transition-colors">min</span>
                    </div>
                </div>
            </div>

            {/* 2. CARD DE FEEDBACK (PACE & CALORIAS) */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/50 flex divide-x divide-blue-200 dark:divide-blue-800">
                <div className="flex-1 flex flex-col items-center justify-center gap-1">
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Gauge className="h-3.5 w-3.5" /> Pace Estimado
                    </span>
                    <div className="text-3xl font-black text-blue-700 dark:text-blue-300 font-mono tracking-tight">
                        {pace} <span className="text-xs font-bold text-blue-400/70 -ml-1">/km</span>
                    </div>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-1">
                    <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Flame className="h-3.5 w-3.5" /> Gasto Calórico
                    </span>
                    <div className="text-3xl font-black text-orange-600 dark:text-orange-400 font-mono tracking-tight">
                        {calories} <span className="text-xs font-bold text-orange-400/70 -ml-1">kcal</span>
                    </div>
                </div>
            </div>

            {/* 3. SLIDER DE INTENSIDADE (Visualmente Rico) */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <Label className="flex items-center gap-2 text-sm font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wide">
                        <Activity className="h-4 w-4 text-blue-500" /> Esforço
                    </Label>
                    <span className={cn(
                        "text-xs font-bold px-3 py-1 rounded-full text-white shadow-sm transition-all",
                        getIntensityColor(intensity[0])
                    )}>
                        {intensity[0]} - {getIntensityLabel(intensity[0])}
                    </span>
                </div>
                <div className="px-1">
                    <Slider 
                        value={intensity} 
                        onValueChange={setIntensity} 
                        max={10} 
                        min={1} 
                        step={1} 
                        className="cursor-pointer py-4"
                    />
                </div>
                <div className="flex justify-between px-1 text-[10px] uppercase font-bold text-zinc-400">
                    <span>Relaxado</span>
                    <span>Moderado</span>
                    <span>Máximo</span>
                </div>
            </div>

            {/* 4. DETALHES (Selects Maiores) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                        <Navigation className="h-3.5 w-3.5" /> Terreno
                    </Label>
                    <Select value={surface} onValueChange={setSurface}>
                        <SelectTrigger className="h-11 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ROAD">🛣️ Asfalto / Rua</SelectItem>
                            <SelectItem value="TREADMILL">🏃‍♂️ Esteira</SelectItem>
                            <SelectItem value="TRAIL">🌲 Trilha / Terra</SelectItem>
                            <SelectItem value="TRACK">🏟️ Pista de Atletismo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide flex items-center gap-2">
                        <Footprints className="h-3.5 w-3.5" /> Tênis
                    </Label>
                    <Select value={shoes} onValueChange={setShoes}>
                        <SelectTrigger className="h-11 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="NONE">👟 Nenhum específico</SelectItem>
                            <SelectItem value="NIKE_PEGASUS">Nike Pegasus</SelectItem>
                            <SelectItem value="ADIDAS_ULTRABOOST">Adidas Ultraboost</SelectItem>
                            <SelectItem value="OLYMPIKUS">Olympikus Corre</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* 5. NOTAS */}
            <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase tracking-wide">Notas da Corrida</Label>
                <Textarea 
                    placeholder="Como você se sentiu? Dor? Clima?" 
                    className="resize-none h-24 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-sm leading-relaxed focus:ring-blue-500/20"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            {/* BOTÃO DE SALVAR */}
            <Button 
                type="submit" 
                disabled={isLoading} 
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 font-bold h-14 text-lg shadow-xl shadow-zinc-900/10 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
                {isLoading ? (
                    <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Salvando...</>
                ) : (
                    <><Save className="mr-2 h-5 w-5" /> Salvar Treino</>
                )}
            </Button>
        </form>
    );
}