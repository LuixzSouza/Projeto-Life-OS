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

// --- Types ---
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
  initialData?: RunFormData;
}

const SHOE_OPTIONS = [
    { value: "NONE", label: "Nenhum específico" },
    { value: "NIKE_PEGASUS", label: "Nike Pegasus" },
    { value: "ADIDAS_ULTRABOOST", label: "Adidas Ultraboost" },
    { value: "OLYMPIKUS", label: "Olympikus Corre" },
];

const SURFACE_OPTIONS = [
    { value: "ROAD", label: "Asfalto / Rua", icon: "🛣️" },
    { value: "TREADMILL", label: "Esteira", icon: "🏃‍♂️" },
    { value: "TRAIL", label: "Trilha / Terra", icon: "🌲" },
    { value: "TRACK", label: "Pista", icon: "🏟️" },
];

export function RunForm({ onSuccess, onClose, initialData }: RunFormProps) {
  const [isLoading, setIsLoading] = useState(false);

  // States
  const [distance, setDistance] = useState<string>(initialData?.distance ? String(initialData.distance) : "");
  const [duration, setDuration] = useState<string>(initialData?.duration ? String(initialData.duration) : ""); 
  const [intensity, setIntensity] = useState([5]); 
  const [surface, setSurface] = useState("ROAD");
  const [shoes, setShoes] = useState("NONE");
  const [notes, setNotes] = useState(initialData?.notes || "");

  // Derived Calculations
  const { pace, calories } = useMemo(() => {
    const dist = parseFloat(distance) || 0;
    const dur = parseFloat(duration) || 0;

    if (dist > 0 && dur > 0) {
      const paceDecimal = dur / dist;
      const paceMin = Math.floor(paceDecimal);
      const paceSec = Math.round((paceDecimal - paceMin) * 60);
      const formattedPace = `${paceMin}'${paceSec.toString().padStart(2, '0')}"`;

      // Estimate: 8 METs * 75kg * hours (Simple formula)
      const hours = dur / 60;
      const estimatedCals = Math.round(8 * 75 * hours); 

      return { pace: formattedPace, calories: estimatedCals };
    }
    return { pace: "0'00\"", calories: 0 };
  }, [distance, duration]);

  // Helpers
  const getIntensityColor = (val: number) => {
    if (val <= 3) return "bg-emerald-500";
    if (val <= 7) return "bg-amber-500";
    return "bg-destructive";
  };

  const getIntensityLabel = (val: number) => {
    if (val <= 2) return "Muito Leve";
    if (val <= 4) return "Leve";
    if (val <= 6) return "Moderado";
    if (val <= 8) return "Difícil";
    return "Máximo";
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
    
    const intensityMap = ["Muito Leve", "Leve", "Moderado", "Difícil", "Máximo"];
    const intensityLabel = intensityMap[Math.min(Math.floor((intensity[0] - 1) / 2), 4)] || "Moderado";
    formData.append("intensity", intensityLabel);
    
    const shoesText = shoes !== "NONE" ? ` | Tênis: ${shoes}` : "";
    formData.append("notes", `Terreno: ${surface}${shoesText}. ${notes}`);
    
    formData.append("feeling", intensity[0] <= 3 ? "GOOD" : intensity[0] >= 8 ? "EXHAUSTED" : "TIRED");

    try {
      await logWorkout(formData);
      toast.success("Corrida registrada! 🏃‍♂️💨");
      onSuccess?.();
      onClose?.();
      
      // Reset if not closed
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6 py-2">
      
      {/* 1. Core Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <MapPin className="h-3.5 w-3.5 text-primary" /> Distância
          </Label>
          <div className="relative group">
            <Input 
              type="number" 
              step="0.01" 
              placeholder="0.0" 
              className="font-mono text-2xl h-14 pl-4 pr-10 bg-muted/20 border-border/60 focus:border-primary/50 font-bold transition-all"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              required
              autoFocus
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase">km</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
            <Timer className="h-3.5 w-3.5 text-primary" /> Tempo
          </Label>
          <div className="relative group">
            <Input 
              type="number" 
              placeholder="00" 
              className="font-mono text-2xl h-14 pl-4 pr-12 bg-muted/20 border-border/60 focus:border-primary/50 font-bold transition-all"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground uppercase">min</span>
          </div>
        </div>
      </div>

      {/* 2. Live Feedback Card */}
      <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 flex divide-x divide-primary/10">
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest flex items-center gap-1.5">
            <Gauge className="h-3 w-3" /> Pace Médio
          </span>
          <div className="text-2xl font-black text-primary font-mono tracking-tight">
            {pace} <span className="text-[10px] font-bold opacity-60 -ml-1">/km</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest flex items-center gap-1.5">
            <Flame className="h-3 w-3" /> Calorias
          </span>
          <div className="text-2xl font-black text-primary font-mono tracking-tight">
            {calories} <span className="text-[10px] font-bold opacity-60 -ml-1">kcal</span>
          </div>
        </div>
      </div>

      {/* 3. Intensity Slider */}
      <div className="space-y-4 px-1">
        <div className="flex justify-between items-center">
          <Label className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-wide">
            <Activity className="h-3.5 w-3.5 text-primary" /> Esforço Percebido
          </Label>
          <span className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-md text-white shadow-sm transition-all",
            getIntensityColor(intensity[0])
          )}>
            {intensity[0]} - {getIntensityLabel(intensity[0])}
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
        <div className="flex justify-between text-[9px] uppercase font-bold text-muted-foreground/50">
          <span>Relaxado</span>
          <span>Moderado</span>
          <span>Máximo</span>
        </div>
      </div>

      {/* 4. Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Navigation className="h-3 w-3" /> Terreno
          </Label>
          <Select value={surface} onValueChange={setSurface}>
            <SelectTrigger className="h-9 text-xs bg-background border-border/60 focus:ring-primary/20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
                {SURFACE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                        <span className="mr-2">{opt.icon}</span> {opt.label}
                    </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <Footprints className="h-3 w-3" /> Tênis
          </Label>
          <Select value={shoes} onValueChange={setShoes}>
            <SelectTrigger className="h-9 text-xs bg-background border-border/60 focus:ring-primary/20">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
                {SHOE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 5. Notes */}
      <div className="space-y-1.5">
        <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Notas</Label>
        <Textarea 
          placeholder="Sensações, clima, dor..." 
          className="resize-none h-20 text-xs bg-background border-border/60 focus-visible:ring-primary/20 leading-relaxed"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Action Button */}
      <Button 
        type="submit" 
        disabled={isLoading} 
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-12 shadow-lg shadow-primary/20 transition-all active:scale-[0.98] mt-2"
      >
        {isLoading ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</>
        ) : (
          <><Save className="mr-2 h-4 w-4" /> Salvar Corrida</>
        )}
      </Button>
    </form>
  );
}