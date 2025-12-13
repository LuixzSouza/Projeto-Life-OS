// components/landing/bento/agenda-card.tsx
"use client";

import { Calendar, Clock } from "lucide-react";
import { BaseCard } from "./base-card";
import { cn } from "@/lib/utils";

export function AgendaCard() {
  // Gerando dias para preencher o grid (4 semanas perfeitas para visual limpo)
  const days = Array.from({ length: 28 }, (_, i) => i + 1);
  const currentDay = 14; 
  const events = [3, 14, 22, 27]; // Dias com eventos simulados

  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

  return (
    <BaseCard
      title="Agenda"
      description="" // Descrição vazia para focar no visual
      icon={Calendar}
      className="col-span-1 row-span-1"
    >
      <div className="p-4 w-full h-full flex flex-col items-center justify-between">
        
        {/* --- CABEÇALHO DO CALENDÁRIO --- */}
        <div className="flex justify-between items-center w-full max-w-[200px] mb-2 px-1">
            <span className="text-xs font-bold text-zinc-200">Outubro</span>
            <span className="text-[10px] text-zinc-500 font-mono">2025</span>
        </div>

        {/* --- GRID DE DIAS --- */}
        <div className="grid grid-cols-7 gap-1 w-full max-w-[200px]">
            {/* Headers (Dias da Semana) */}
            {weekDays.map((d, i) => (
                // CORREÇÃO AQUI: Usando 'i' (index) como key, pois 'd' se repete
                <span key={i} className="text-[9px] text-zinc-600 text-center font-bold">
                    {d}
                </span>
            ))}
            
            {/* Dias Numéricos */}
            {days.map(day => {
                const isToday = day === currentDay;
                const hasEvent = events.includes(day);

                return (
                    <div 
                        key={day} 
                        className={cn(
                            "h-6 w-full rounded-md flex items-center justify-center text-[10px] relative transition-all cursor-default group",
                            isToday 
                                ? "bg-white text-black font-bold shadow-lg scale-105 z-10" 
                                : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
                        )}
                    >
                        {day}
                        
                        {/* Indicador de Evento (Bolinha) */}
                        {hasEvent && (
                            <div className={cn(
                                "absolute bottom-0.5 w-1 h-1 rounded-full",
                                isToday ? "bg-indigo-600" : "bg-indigo-500"
                            )} />
                        )}
                    </div>
                );
            })}
        </div>
        
        {/* --- RODAPÉ: PRÓXIMO EVENTO --- */}
        <div className="mt-3 w-full bg-zinc-800/40 border border-white/5 rounded-lg p-2.5 flex items-center gap-3 hover:bg-zinc-800/60 transition-colors cursor-pointer group">
            <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 group-hover:text-indigo-300 transition-colors">
                <Clock className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
                <p className="text-[9px] text-zinc-500 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> 
                    Agora
                </p>
                <p className="text-[10px] text-zinc-200 font-semibold truncate max-w-[120px]">
                    Reunião de Projeto
                </p>
            </div>
        </div>

      </div>
    </BaseCard>
  );
}