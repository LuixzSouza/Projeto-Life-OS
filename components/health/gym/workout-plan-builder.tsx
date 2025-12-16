"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
    Dumbbell, Footprints, Bike, Waves, Moon, 
    Plus, Trash2, Copy, FileDown, Pencil 
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
// 1. Importe o template criado
import { WorkoutPrintTemplate } from "./workout-print-template";

// --- Types (Mantenha os mesmos) ---
export type ActivityType = 'GYM' | 'RUN' | 'BIKE' | 'SWIM' | 'REST';

export interface Activity {
    id: string;
    type: ActivityType;
    name: string; 
    details: string; 
    target?: string; 
}

export interface DayPlan {
    day: string; 
    label: string; 
    activities: Activity[];
    isRest: boolean;
}

const INITIAL_WEEK: DayPlan[] = [
    { day: 'mon', label: 'Segunda', activities: [], isRest: false },
    { day: 'tue', label: 'Terça', activities: [], isRest: false },
    { day: 'wed', label: 'Quarta', activities: [], isRest: false },
    { day: 'thu', label: 'Quinta', activities: [], isRest: false },
    { day: 'fri', label: 'Sexta', activities: [], isRest: false },
    { day: 'sat', label: 'Sábado', activities: [], isRest: false },
    { day: 'sun', label: 'Domingo', activities: [], isRest: true },
];

export function WorkoutPlanBuilder() {
    const [weekPlan, setWeekPlan] = useState<DayPlan[]>(INITIAL_WEEK);
    const [activeDay, setActiveDay] = useState('mon');
    const [isAddOpen, setIsAddOpen] = useState(false);

    // Form State
    const [activityType, setActivityType] = useState<ActivityType>('GYM');
    const [activityName, setActivityName] = useState("");
    const [activityDetails, setActivityDetails] = useState("");
    const [activityTarget, setActivityTarget] = useState("");

    // --- Actions ---

    const handleAddActivity = () => {
        if (!activityName) return;

        const newActivity: Activity = {
            id: crypto.randomUUID(),
            type: activityType,
            name: activityName,
            details: activityDetails,
            target: activityType === 'GYM' ? activityTarget : undefined
        };

        setWeekPlan(prev => prev.map(d => {
            if (d.day === activeDay) {
                return { ...d, activities: [...d.activities, newActivity], isRest: false };
            }
            return d;
        }));

        setActivityName("");
        setActivityDetails("");
        setActivityTarget("");
        setIsAddOpen(false);
        toast.success("Atividade adicionada!");
    };

    const handleDeleteActivity = (dayCode: string, actId: string) => {
        setWeekPlan(prev => prev.map(d => {
            if (d.day === dayCode) {
                return { ...d, activities: d.activities.filter(a => a.id !== actId) };
            }
            return d;
        }));
    };

    const toggleRestDay = (dayCode: string) => {
        setWeekPlan(prev => prev.map(d => {
            if (d.day === dayCode) {
                return { ...d, isRest: !d.isRest };
            }
            return d;
        }));
    };

    const copyToClipboard = () => {
        let text = "*🏋️ MINHA FICHA DE TREINO SEMANAL*\n\n";
        weekPlan.forEach(day => {
            text += `*📅 ${day.label}*`;
            if (day.isRest) {
                text += " - 🛌 Descanso\n";
            } else if (day.activities.length === 0) {
                text += " - (Sem registro)\n";
            } else {
                text += "\n";
                day.activities.forEach(act => {
                    const icon = act.type === 'GYM' ? '💪' : act.type === 'RUN' ? '🏃' : '🚴';
                    text += `${icon} ${act.name}: ${act.details}\n`;
                });
            }
            text += "\n";
        });
        navigator.clipboard.writeText(text);
        toast.success("Copiado!");
    };

    // 2. Função de Impressão Simples
    const handlePrint = () => {
        // Um pequeno timeout garante que a renderização esteja pronta
        setTimeout(() => window.print(), 100);
    };

    const getActivityIcon = (type: ActivityType) => {
        switch (type) {
            case 'GYM': return <Dumbbell className="h-4 w-4" />;
            case 'RUN': return <Footprints className="h-4 w-4" />;
            case 'BIKE': return <Bike className="h-4 w-4" />;
            case 'SWIM': return <Waves className="h-4 w-4" />;
            default: return <Dumbbell className="h-4 w-4" />;
        }
    };

    const currentDayPlan = weekPlan.find(d => d.day === activeDay);

    return (
        <>
            {/* 3. Área de Impressão (Invisível na tela, Visível no Print) */}
            <div className="hidden print:block absolute top-0 left-0 w-full bg-white z-[9999]">
                <WorkoutPrintTemplate plan={weekPlan} />
            </div>

            {/* 4. Interface Principal (Escondida no Print) */}
            <Card className="h-full flex flex-col border-border/60 shadow-lg print:hidden">
                <CardHeader className="border-b border-border/40 pb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <span className="p-2 bg-primary/10 rounded-lg text-primary"><Dumbbell className="h-5 w-5"/></span>
                                Montar Ficha
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">Organize sua rotina semanal.</p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={copyToClipboard} title="Copiar texto">
                                <Copy className="h-4 w-4 mr-2" /> Copiar
                            </Button>
                            {/* Botão de PDF Ativado */}
                            <Button variant="outline" size="sm" onClick={handlePrint} title="Salvar como PDF">
                                <FileDown className="h-4 w-4 mr-2" /> PDF / Imprimir
                            </Button>
                        </div>
                    </div>
                </CardHeader>

                <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                    
                    {/* Sidebar: Dias */}
                    <div className="w-full md:w-48 border-b md:border-b-0 md:border-r border-border/40 bg-muted/10 p-2 overflow-x-auto md:overflow-y-auto flex md:flex-col gap-1 shrink-0 scrollbar-hide">
                        {weekPlan.map(day => (
                            <button
                                key={day.day}
                                onClick={() => setActiveDay(day.day)}
                                className={cn(
                                    "flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all min-w-[120px] md:min-w-0 md:w-full text-left",
                                    activeDay === day.day 
                                        ? "bg-primary text-primary-foreground shadow-md" 
                                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <span>{day.label}</span>
                                {day.isRest && <Moon className="h-3.5 w-3.5 opacity-70" />}
                                {!day.isRest && day.activities.length > 0 && (
                                    <span className="text-[10px] bg-background/20 px-1.5 py-0.5 rounded-full">
                                        {day.activities.length}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Conteúdo Principal */}
                    <div className="flex-1 flex flex-col h-[500px] md:h-auto overflow-hidden bg-background">
                        
                        {/* Toolbar do Dia */}
                        <div className="p-4 border-b border-border/40 flex justify-between items-center bg-card">
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-lg">{currentDayPlan?.label}</h3>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => toggleRestDay(activeDay)}
                                    className={cn("h-7 px-2 text-xs rounded-full border", currentDayPlan?.isRest ? "bg-indigo-100 text-indigo-700 border-indigo-200" : "text-muted-foreground border-transparent hover:border-border")}
                                >
                                    {currentDayPlan?.isRest ? "🛌 Dia de Descanso" : "⚡ Dia de Treino"}
                                </Button>
                            </div>
                            
                            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                                        <Plus className="h-4 w-4" /> Adicionar
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Adicionar Atividade</DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label>Tipo</Label>
                                                <Select value={activityType} onValueChange={(v: ActivityType) => setActivityType(v)}>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="GYM">Musculação</SelectItem>
                                                        <SelectItem value="RUN">Corrida</SelectItem>
                                                        <SelectItem value="BIKE">Ciclismo</SelectItem>
                                                        <SelectItem value="SWIM">Natação</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            {activityType === 'GYM' && (
                                                <div className="space-y-2">
                                                    <Label>Grupo Muscular</Label>
                                                    <Select value={activityTarget} onValueChange={setActivityTarget}>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Ex: Peito" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Peito">Peito</SelectItem>
                                                            <SelectItem value="Costas">Costas</SelectItem>
                                                            <SelectItem value="Pernas">Pernas</SelectItem>
                                                            <SelectItem value="Ombros">Ombros</SelectItem>
                                                            <SelectItem value="Biceps">Bíceps</SelectItem>
                                                            <SelectItem value="Triceps">Tríceps</SelectItem>
                                                            <SelectItem value="Abdomem">Abdomem</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Nome do Exercício / Atividade</Label>
                                            <Input 
                                                placeholder={activityType === 'GYM' ? "Ex: Supino Reto" : "Ex: Corrida no Parque"} 
                                                value={activityName}
                                                onChange={(e) => setActivityName(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Detalhes (Séries/Reps ou Distância/Tempo)</Label>
                                            <Input 
                                                placeholder={activityType === 'GYM' ? "Ex: 4 séries de 12 repetições" : "Ex: 5km em 30min"} 
                                                value={activityDetails}
                                                onChange={(e) => setActivityDetails(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAddActivity} className="w-full">Salvar na Ficha</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>

                        {/* Lista de Atividades */}
                        <ScrollArea className="flex-1 p-4">
                            {currentDayPlan?.isRest ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-4 opacity-60 min-h-[300px]">
                                    <Moon className="h-16 w-16 stroke-1" />
                                    <div className="text-center">
                                        <p className="text-lg font-medium">Dia de Recuperação</p>
                                        <p className="text-sm">O descanso é essencial para a hipertrofia.</p>
                                    </div>
                                </div>
                            ) : currentDayPlan?.activities.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 min-h-[300px] border-2 border-dashed border-border/50 rounded-xl">
                                    <p className="text-sm">Nenhuma atividade planejada.</p>
                                    <Button variant="link" onClick={() => setIsAddOpen(true)}>Adicionar primeira atividade</Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {currentDayPlan?.activities.map((act) => (
                                        <div key={act.id} className="group flex items-center justify-between p-3 rounded-lg bg-card border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("p-2 rounded-md", 
                                                    act.type === 'GYM' ? "bg-orange-500/10 text-orange-600" : 
                                                    act.type === 'RUN' ? "bg-blue-500/10 text-blue-600" :
                                                    "bg-green-500/10 text-green-600"
                                                )}>
                                                    {getActivityIcon(act.type)}
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                                        {act.name}
                                                        {act.target && <span className="text-[10px] font-normal px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{act.target}</span>}
                                                    </h4>
                                                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{act.details}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteActivity(activeDay, act.id)}>
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </Card>
        </>
    );
}