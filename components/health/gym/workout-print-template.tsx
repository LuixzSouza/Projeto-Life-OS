"use client";

import { Dumbbell, Footprints, Bike, Waves, Moon, CheckSquare, Trophy, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

type ActivityType = 'GYM' | 'RUN' | 'BIKE' | 'SWIM' | 'REST';

interface Activity {
    id: string;
    type: ActivityType;
    name: string;
    details: string;
    target?: string;
}

interface DayPlan {
    day: string;
    label: string;
    activities: Activity[];
    isRest: boolean;
}

interface WorkoutPrintTemplateProps {
    plan: DayPlan[];
}

export function WorkoutPrintTemplate({ plan }: WorkoutPrintTemplateProps) {
    
    const getActivityIcon = (type: ActivityType) => {
        switch (type) {
            case 'GYM': return <Dumbbell className="h-3.5 w-3.5" />;
            case 'RUN': return <Footprints className="h-3.5 w-3.5" />;
            case 'BIKE': return <Bike className="h-3.5 w-3.5" />;
            case 'SWIM': return <Waves className="h-3.5 w-3.5" />;
            default: return <Dumbbell className="h-3.5 w-3.5" />;
        }
    };

    return (
        <div className="hidden print:block print:w-[210mm] print:min-h-[297mm] bg-white text-black p-10 font-sans">
            
            {/* --- CABEÇALHO PROFISSIONAL --- */}
            <div className="flex justify-between items-start border-b-4 border-black pb-6 mb-8">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tighter italic">Life OS <span className="text-zinc-400">/ Health</span></h1>
                    <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-600">
                            <CalendarDays className="h-3.5 w-3.5" /> Semana: ____/____/____
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-zinc-600">
                            <Trophy className="h-3.5 w-3.5" /> Meta: _____________________
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Status do Relatório</div>
                    <div className="border-2 border-black px-3 py-1 text-sm font-bold uppercase">Cronograma Ativo</div>
                </div>
            </div>

            {/* --- GRID SEMANAL (2 colunas bem definidas) --- */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                {plan.map((day) => (
                    <div 
                        key={day.day} 
                        className={cn(
                            "flex flex-col border-2 border-black rounded-none p-4 break-inside-avoid transition-all",
                            day.isRest ? "bg-zinc-50 border-dashed border-zinc-300" : "bg-white shadow-[4px_4px_0px_black]"
                        )}
                    >
                        {/* Header do Dia */}
                        <div className="flex justify-between items-center mb-4 border-b-2 border-zinc-100 pb-2">
                            <h3 className="font-black text-lg uppercase italic tracking-tighter">{day.label}</h3>
                            <div className="flex gap-1">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="w-3 h-3 border border-zinc-300 rounded-sm" title="Check de conclusão" />
                                ))}
                            </div>
                        </div>

                        {/* Conteúdo */}
                        <div className="flex-1">
                            {day.isRest ? (
                                <div className="h-full flex flex-col items-center justify-center py-6 text-zinc-400 gap-2">
                                    <Moon className="h-6 w-6 opacity-20" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Active Recovery</span>
                                </div>
                            ) : day.activities.length === 0 ? (
                                <div className="h-full border-2 border-dashed border-zinc-100 rounded flex items-center justify-center py-8">
                                    <span className="text-[10px] font-bold text-zinc-300 uppercase italic">Nenhuma atividade alocada</span>
                                </div>
                            ) : (
                                <ul className="space-y-4">
                                    {day.activities.map((act) => (
                                        <li key={act.id} className="flex items-start gap-3">
                                            <div className="mt-1 bg-black text-white p-1 rounded-sm">
                                                {getActivityIcon(act.type)}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-sm uppercase leading-none">{act.name}</span>
                                                    {act.target && (
                                                        <span className="text-[9px] font-bold bg-zinc-100 px-1.5 py-0.5 rounded uppercase">
                                                            {act.target}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-zinc-500 font-medium leading-tight mt-1">
                                                    {act.details}
                                                </p>
                                            </div>
                                            <div className="w-5 h-5 border-2 border-black shrink-0 mt-0.5" />
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                ))}

                {/* --- CARD EXTRA: MÉTRICAS DE PERFORMANCE (Ocupa o espaço que sobrar) --- */}
                <div className="border-2 border-black p-4 bg-zinc-100 flex flex-col justify-between">
                    <div>
                        <h3 className="font-black text-sm uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CheckSquare className="h-4 w-4" /> Resumo da Semana
                        </h3>
                        <div className="space-y-2">
                            {[ 'Hidratação', 'Qualidade do Sono', 'Intensidade Média', 'Foco Mantido' ].map(label => (
                                <div key={label} className="flex justify-between items-center">
                                    <span className="text-[10px] font-bold uppercase">{label}</span>
                                    <span className="text-[10px]">◯ ◯ ◯ ◯ ◯</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="text-[9px] font-bold uppercase italic text-zinc-400 text-center mt-4">
                        Consistência vence a intensidade.
                    </div>
                </div>
            </div>

            {/* --- ÁREA DE ANOTAÇÕES TÁTICAS (Estilo Caderno) --- */}
            <div className="mt-10">
                <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-black rounded-full" /> Observações e Ajustes de Carga:
                </h4>
                <div className="grid grid-rows-4 border-y border-zinc-200">
                    <div className="h-8 border-b border-zinc-100" />
                    <div className="h-8 border-b border-zinc-100" />
                    <div className="h-8 border-b border-zinc-100" />
                    <div className="h-8" />
                </div>
            </div>

            {/* Rodapé de autenticidade */}
            <div className="mt-12 flex justify-between items-end opacity-30">
                <div className="text-[10px] font-mono">ID: REF-HEALTH-{new Date().getFullYear()}-001</div>
                <div className="text-[10px] font-bold uppercase tracking-tighter">Generated by Life OS Intelligence System</div>
            </div>
        </div>
    );
}