"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Timer, MapPin, Activity, Flame, Footprints, Navigation, Save, Gauge } from "lucide-react";
import { logWorkout } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function RunForm() {
    // Estados do Formulário (Inputs manuais)
    const [distance, setDistance] = useState<string>("");
    const [duration, setDuration] = useState<string>(""); // em minutos
    const [intensity, setIntensity] = useState([5]); // 1-10
    const [surface, setSurface] = useState("ROAD");
    const [notes, setNotes] = useState("");
    const [shoes, setShoes] = useState("NONE");

    // ✅ CORREÇÃO: Dados Derivados com useMemo (Sem useState/useEffect)
    // Calcula automaticamente sempre que distance ou duration mudam
    const { pace, calories } = useMemo(() => {
        const dist = parseFloat(distance) || 0;
        const dur = parseFloat(duration) || 0;

        if (dist > 0 && dur > 0) {
            // Pace: min/km
            const paceDecimal = dur / dist;
            const paceMin = Math.floor(paceDecimal);
            const paceSec = Math.round((paceDecimal - paceMin) * 60);
            
            // Formatação segura dos segundos (ex: 6:05 em vez de 6:5)
            const formattedPace = `${paceMin}'${paceSec.toString().padStart(2, '0')}"`;

            // Calorias (Estimativa: METs * Peso * Horas)
            // METs médio corrida: 8 | Peso base: 75kg
            const hours = dur / 60;
            const estimatedCals = Math.round(8 * 75 * hours); 

            return { pace: formattedPace, calories: estimatedCals };
        }

        return { pace: "0'00\"", calories: 0 };
    }, [distance, duration]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); 
        
        if (!distance || !duration) {
            toast.error("Preencha a distância e duração.");
            return;
        }

        const formData = new FormData();
        formData.append("title", `Corrida de ${distance}km`);
        formData.append("type", "RUNNING");
        formData.append("distance", distance);
        formData.append("duration", duration);
        formData.append("pace", pace); // Usa o valor calculado
        
        // Mapeia intensidade visual (1-10) para rótulo
        const intensityMap = ["Muito Leve", "Leve", "Moderado", "Difícil", "Máximo"];
        // Lógica para pegar o índice correto (aprox)
        const intensityLabel = intensityMap[Math.min(Math.floor((intensity[0] - 1) / 2), 4)] || "Moderado";
        formData.append("intensity", intensityLabel);
        
        // Monta notas detalhadas
        const shoesText = shoes !== "NONE" ? ` | Tênis: ${shoes}` : "";
        formData.append("notes", `Terreno: ${surface}${shoesText}. ${notes}`);
        
        // Feeling automático baseado na intensidade (pode ser refinado depois)
        formData.append("feeling", intensity[0] <= 3 ? "GOOD" : intensity[0] >= 8 ? "EXHAUSTED" : "TIRED");

        await logWorkout(formData);
        toast.success("Corrida registrada! 🏃‍♂️💨");
        
        // Reset
        setDistance("");
        setDuration("");
        setNotes("");
        setIntensity([5]);
        setShoes("NONE");
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* CARD DE RESUMO (Topo - Feedback em Tempo Real) */}
            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 grid grid-cols-2 gap-4">
                <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-black rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Gauge className="h-3 w-3" /> Pace Médio
                    </span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-zinc-800 dark:text-white font-mono">{pace}</span>
                        <span className="text-xs text-zinc-500">/km</span>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-black rounded-lg shadow-sm border border-zinc-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <Flame className="h-3 w-3" /> Gasto Calórico
                    </span>
                    <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-orange-500 font-mono">{calories}</span>
                        <span className="text-xs text-zinc-500">kcal</span>
                    </div>
                </div>
            </div>

            {/* INPUTS PRINCIPAIS */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs uppercase font-bold text-zinc-500">
                        <MapPin className="h-3 w-3" /> Distância (km)
                    </Label>
                    <Input 
                        type="number" 
                        step="0.01" 
                        placeholder="Ex: 5.0" 
                        className="font-mono text-lg h-12 bg-white dark:bg-zinc-950"
                        value={distance}
                        onChange={(e) => setDistance(e.target.value)}
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs uppercase font-bold text-zinc-500">
                        <Timer className="h-3 w-3" /> Duração (min)
                    </Label>
                    <Input 
                        type="number" 
                        placeholder="Ex: 30" 
                        className="font-mono text-lg h-12 bg-white dark:bg-zinc-950"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        required
                    />
                </div>
            </div>

            {/* SLIDER DE INTENSIDADE */}
            <div className="space-y-4 pt-2 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
                <div className="flex justify-between items-center">
                    <Label className="flex items-center gap-2 text-xs uppercase font-bold text-zinc-500">
                        <Activity className="h-3 w-3" /> Esforço Percebido
                    </Label>
                    <span className={cn(
                        "text-xs font-bold px-2 py-1 rounded shadow-sm border",
                        intensity[0] <= 3 ? "bg-green-100 text-green-700 border-green-200" : 
                        intensity[0] <= 7 ? "bg-yellow-100 text-yellow-700 border-yellow-200" : 
                        "bg-red-100 text-red-700 border-red-200"
                    )}>
                        Nível {intensity[0]} / 10
                    </span>
                </div>
                <Slider 
                    value={intensity} 
                    onValueChange={setIntensity} 
                    max={10} 
                    min={1} 
                    step={1} 
                    className="cursor-pointer py-2"
                />
                <div className="flex justify-between text-[10px] text-zinc-400 font-medium px-1">
                    <span>Muito Leve</span>
                    <span>Moderado</span>
                    <span>Exaustivo</span>
                </div>
            </div>

            {/* DETALHES EXTRAS */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs uppercase font-bold text-zinc-500">
                        <Footprints className="h-3 w-3" /> Terreno
                    </Label>
                    <Select value={surface} onValueChange={setSurface}>
                        <SelectTrigger className="bg-white dark:bg-zinc-950"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ROAD">Asfalto / Rua</SelectItem>
                            <SelectItem value="TREADMILL">Esteira</SelectItem>
                            <SelectItem value="TRAIL">Trilha / Terra</SelectItem>
                            <SelectItem value="TRACK">Pista de Atletismo</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-xs uppercase font-bold text-zinc-500">
                        <Navigation className="h-3 w-3" /> Tênis (Opcional)
                    </Label>
                    <Select value={shoes} onValueChange={setShoes}>
                        <SelectTrigger className="bg-white dark:bg-zinc-950"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="NONE">Nenhum específico</SelectItem>
                            <SelectItem value="NIKE_PEGASUS">Nike Pegasus</SelectItem>
                            <SelectItem value="ADIDAS_ULTRABOOST">Adidas Ultraboost</SelectItem>
                            <SelectItem value="OLYMPIKUS">Olympikus Corre</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs uppercase font-bold text-zinc-500">Notas da Corrida</Label>
                <Textarea 
                    placeholder="Como você se sentiu? Dor? Clima?" 
                    className="resize-none h-20 bg-white dark:bg-zinc-950"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]">
                <Save className="mr-2 h-5 w-5" /> Salvar Treino
            </Button>
        </form>
    );
}