import { Dumbbell, Footprints, Bike, Waves, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

// Reutilizando tipos (idealmente estariam em um arquivo types.ts separado)
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
            case 'GYM': return <Dumbbell className="h-3 w-3" />;
            case 'RUN': return <Footprints className="h-3 w-3" />;
            case 'BIKE': return <Bike className="h-3 w-3" />;
            case 'SWIM': return <Waves className="h-3 w-3" />;
            default: return <Dumbbell className="h-3 w-3" />;
        }
    };

    return (
        <div className="hidden print:block print:w-[210mm] print:h-[297mm] bg-white text-black p-8 font-sans">
            {/* Cabeçalho */}
            <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight">Ficha de Treino Semanal</h1>
                    <p className="text-sm text-zinc-500">Planejamento de rotina</p>
                </div>
                <div className="text-right text-xs text-zinc-400">
                    Gerado pelo LifeOS
                </div>
            </div>

            {/* Grid Semanal */}
            <div className="grid grid-cols-2 gap-4">
                {plan.map((day) => (
                    <div key={day.day} className={cn(
                        "border border-zinc-200 rounded-lg p-3 min-h-[120px] break-inside-avoid",
                        day.isRest ? "bg-zinc-50 border-dashed" : "bg-white"
                    )}>
                        <div className="flex justify-between items-center mb-2 border-b border-zinc-100 pb-1">
                            <h3 className="font-bold text-sm uppercase">{day.label}</h3>
                            {day.isRest && <span className="text-[10px] uppercase font-bold text-zinc-400">Descanso</span>}
                        </div>

                        {day.isRest ? (
                            <div className="h-full flex items-center justify-center text-zinc-300 gap-2 pb-4">
                                <Moon className="h-5 w-5" />
                                <span className="text-xs">Recuperação</span>
                            </div>
                        ) : day.activities.length === 0 ? (
                            <p className="text-[10px] text-zinc-300 italic text-center py-4">Livre / Sem registro</p>
                        ) : (
                            <ul className="space-y-2">
                                {day.activities.map((act) => (
                                    <li key={act.id} className="flex items-start gap-2 text-xs">
                                        <div className="mt-0.5 text-zinc-500">
                                            {getActivityIcon(act.type)}
                                        </div>
                                        <div>
                                            <span className="font-bold block text-zinc-800">
                                                {act.name} 
                                                {act.target && <span className="font-normal text-zinc-400 ml-1">({act.target})</span>}
                                            </span>
                                            <span className="text-zinc-500 text-[10px] block">{act.details}</span>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}
            </div>

            {/* Rodapé / Notas */}
            <div className="mt-8 border-t border-zinc-200 pt-4">
                <h4 className="text-xs font-bold uppercase mb-2">Anotações:</h4>
                <div className="h-24 border border-zinc-200 rounded-lg bg-zinc-50"></div>
            </div>
        </div>
    );
}