"use client";

import { Activity, Moon, Dumbbell, Utensils, Footprints } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BaseCard } from "./base-card";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Subrotas reais de /health: Treino, Corrida, Nutrição, Sono.
type HealthCategory = "gym" | "run" | "food" | "sleep";

interface Metric {
  id: HealthCategory;
  label: string;
  value: string;
  subValue: string;
  icon: LucideIcon;
  percent: number;
}

const METRICS: Metric[] = [
  { id: "gym", label: "Treino", value: "Upper B.", subValue: "45 min", icon: Dumbbell, percent: 75 },
  { id: "run", label: "Corrida", value: "5.2 km", subValue: "Pace 5'00\"", icon: Footprints, percent: 60 },
  { id: "food", label: "Nutrição", value: "1.8k", subValue: "kcal", icon: Utensils, percent: 40 },
  { id: "sleep", label: "Sono", value: "7h 42m", subValue: "88%", icon: Moon, percent: 90 },
];

export function HealthCard() {
  const [active, setActive] = useState<HealthCategory>("gym");
  const data = METRICS.find((m) => m.id === active) ?? METRICS[0];
  const Icon = data.icon;

  return (
    <BaseCard title="Saúde" icon={Activity} description="Treino, corrida, nutrição e sono." className="col-span-1 min-h-[260px]">
      <div className="relative flex h-full w-full flex-col">
        {/* Anel de progresso */}
        <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center p-2">
          <div className="relative flex size-24 items-center justify-center">
            <svg className="size-full -rotate-90">
              <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="5" fill="transparent" className="text-muted" />
              <motion.circle
                key={active}
                cx="48"
                cy="48"
                r="42"
                stroke="currentColor"
                strokeWidth="5"
                fill="transparent"
                className="text-primary"
                strokeLinecap="round"
                strokeDasharray={263}
                initial={{ strokeDashoffset: 263 }}
                animate={{ strokeDashoffset: 263 - (data.percent / 100) * 263 }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex flex-col items-center"
                >
                  <Icon className="mb-0.5 size-4 text-primary" />
                  <span className="text-base font-bold leading-none text-foreground">{data.value}</span>
                  <span className="mt-0.5 text-[9px] font-medium text-muted-foreground">{data.subValue}</span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Frequência cardíaca */}
          <div className="absolute right-2 top-1 flex items-center gap-1 text-primary/70">
            <Activity className="size-2.5 animate-pulse" />
            <span className="font-mono text-[8px]">72 bpm</span>
          </div>
        </div>

        {/* Seletores (subrotas reais) */}
        <div className="grid shrink-0 grid-cols-4 border-t border-border/60">
          {METRICS.map((m) => {
            const TabIcon = m.icon;
            const isActive = active === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setActive(m.id)}
                onMouseEnter={() => setActive(m.id)}
                className={cn(
                  "group relative flex flex-col items-center justify-center gap-1 py-2 transition-all",
                  isActive ? "bg-primary/5" : "hover:bg-primary/5"
                )}
              >
                {isActive && (
                  <motion.div layoutId="active-pill-health" className="absolute top-0 h-0.5 w-full bg-primary" />
                )}
                <TabIcon className={cn("size-3.5 transition-colors", isActive ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-[7px] font-bold uppercase tracking-wider", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </BaseCard>
  );
}
