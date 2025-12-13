"use client";

import { 
  Activity, 
  Moon, 
  Dumbbell, 
  Utensils, 
  Footprints, 
  LucideIcon
} from "lucide-react";
import { BaseCard } from "./base-card";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

// --- TIPAGEM ESTRITA (Correção do ANY) ---
type HealthCategory = "gym" | "run" | "food" | "sleep";

interface HealthMetric {
  id: HealthCategory;
  label: string;
  value: string;
  subValue: string;
  icon: LucideIcon; // Mudança aqui: de 'any' para 'LucideIcon'
  color: string;
  ringColor: string;
  percent: number;
}

const METRICS: HealthMetric[] = [
  { 
    id: "gym", 
    label: "Treino", 
    value: "Upper B.", 
    subValue: "45min", 
    icon: Dumbbell, 
    color: "text-blue-400", 
    ringColor: "text-blue-500",
    percent: 75 
  },
  { 
    id: "run", 
    label: "Cardio", 
    value: "5.2 km", 
    subValue: "Pace 5'", 
    icon: Footprints, 
    color: "text-orange-400", 
    ringColor: "text-orange-500",
    percent: 60 
  },
  { 
    id: "food", 
    label: "Dieta", 
    value: "1.8k", 
    subValue: "Kcal", 
    icon: Utensils, 
    color: "text-emerald-400", 
    ringColor: "text-emerald-500",
    percent: 40 
  },
  { 
    id: "sleep", 
    label: "Sono", 
    value: "7h 42m", 
    subValue: "88%", 
    icon: Moon, 
    color: "text-purple-400", 
    ringColor: "text-purple-500",
    percent: 90 
  },
];

export function HealthCard() {
  const [activeTab, setActiveTab] = useState<HealthCategory>("gym");

  // Encontra os dados da aba ativa (com fallback seguro)
  const currentData = METRICS.find(m => m.id === activeTab) || METRICS[0];

  return (
    <BaseCard 
        title="Bio Rastreamento" 
        icon={Activity} 
        description="Saúde 360°."
        className="col-span-1 min-h-[260px]"
    >
        <div className="flex flex-col h-full w-full bg-[#09090b] relative">
            
            {/* --- ÁREA CENTRAL (Compactada) --- */}
            <div className="flex-1 flex flex-col items-center justify-center relative p-2 min-h-0">
                
                {/* Círculo de Progresso Principal */}
                <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
                    {/* Fundo do Anel */}
                    <svg className="w-full h-full -rotate-90">
                        <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-zinc-800" />
                        <motion.circle 
                            key={activeTab} // Reinicia animação ao trocar
                            cx="48" cy="48" r="42" 
                            stroke="currentColor" strokeWidth="5" fill="transparent" 
                            className={currentData.ringColor}
                            strokeLinecap="round"
                            strokeDasharray={263} // 2 * PI * 42
                            initial={{ strokeDashoffset: 263 }}
                            animate={{ strokeDashoffset: 263 - (currentData.percent / 100) * 263 }}
                            transition={{ duration: 1, ease: "easeOut" }}
                        />
                    </svg>

                    {/* Conteúdo Central */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center"
                            >
                                <currentData.icon className={cn("h-4 w-4 mb-0.5", currentData.color)} />
                                <span className="text-base font-bold text-white leading-none">{currentData.value}</span>
                                <span className="text-[9px] text-zinc-500 mt-0.5 font-medium">
                                    {currentData.subValue}
                                </span>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </div>

                {/* Cardíaco (Badge flutuante menor) */}
                <div className="absolute top-1 right-2 flex items-center gap-1 opacity-60">
                    <Activity className="h-2.5 w-2.5 text-rose-500 animate-pulse" />
                    <span className="text-[8px] font-mono text-rose-500">72</span>
                </div>
            </div>

            {/* --- RODAPÉ: SELETORES (Compacto) --- */}
            <div className="grid grid-cols-4 border-t border-white/5 bg-zinc-900/30 shrink-0">
                {METRICS.map((metric) => {
                    const isActive = activeTab === metric.id;
                    const Icon = metric.icon;
                    
                    return (
                        <button
                            key={metric.id}
                            onClick={() => setActiveTab(metric.id)}
                            onMouseEnter={() => setActiveTab(metric.id)}
                            className={cn(
                                "flex flex-col items-center justify-center py-2 gap-1 transition-all duration-300 relative group",
                                isActive ? "bg-white/5" : "hover:bg-white/5"
                            )}
                        >
                            {/* Linha indicadora superior */}
                            {isActive && (
                                <motion.div 
                                    layoutId="active-pill-health"
                                    className={cn("absolute top-0 w-full h-0.5", metric.ringColor.replace("text-", "bg-"))}
                                />
                            )}
                            
                            <Icon className={cn(
                                "h-3.5 w-3.5 transition-colors", 
                                isActive ? metric.color : "text-zinc-600 group-hover:text-zinc-400"
                            )} />
                            <span className={cn(
                                "text-[7px] font-bold uppercase tracking-wider",
                                isActive ? "text-white" : "text-zinc-600"
                            )}>
                                {metric.label}
                            </span>
                        </button>
                    )
                })}
            </div>

        </div>
    </BaseCard>
  );
}