"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Scale, Activity, HeartPulse, Droplets, Flame, Info, 
    Utensils, Edit3 
} from "lucide-react";
import { 
    calculateBMI, calculateBMR, calculateTDEE, calculateBodyFat, 
    calculateComposition, calculateWater, calculateRisk, BodyStats, ACTIVITY_LEVELS, Gender
} from "@/lib/body-math";
import { logMetric } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";

// Definindo o tipo de resposta da action para não usar 'any'
type ActionResponse = { success: boolean; message: string };

export function BodyDashboard({ stats: initialStats }: { stats: BodyStats }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const [stats, setStats] = useState<BodyStats>(initialStats);

    // --- CÁLCULOS ---
    const bmi = calculateBMI(stats.weight, stats.height);
    const bodyFat = calculateBodyFat(stats);
    const { fatMass, leanMass } = calculateComposition(stats.weight, bodyFat);
    const bmr = calculateBMR(stats);
    const tdee = calculateTDEE(bmr, stats.activityFactor);
    const risk = calculateRisk(stats.waist, stats.height);
    const waterGoal = calculateWater(stats.weight);

    const cutCalories = Math.round(tdee * 0.8);
    const bulkCalories = Math.round(tdee * 1.1);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const newStats = { ...stats };
        
        // ✅ CORREÇÃO 1: Tipagem explícita do array de Promises (sem 'any')
        const promises: Promise<ActionResponse>[] = [];

        // ✅ CORREÇÃO 2: Definimos quais campos são numéricos explicitamente
        // Isso diz ao TypeScript: "Estes campos são chaves de BodyStats e SÃO números"
        const numericFields: Array<keyof Pick<BodyStats, 'weight' | 'height' | 'waist' | 'neck' | 'hip'>> = 
            ['weight', 'height', 'waist', 'neck', 'hip'];

        for (const field of numericFields) {
            const val = formData.get(field);
            if (val) {
                // Agora o TS sabe que newStats[field] aceita number
                newStats[field] = Number(val);
                
                const metricData = new FormData();
                metricData.append('type', field.toUpperCase());
                metricData.append('value', val.toString());
                
                promises.push(logMetric(metricData));
            }
        }

        // Tratamento de campos não numéricos separados para evitar conflito de tipos
        const genderVal = formData.get('gender');
        if (genderVal) newStats.gender = genderVal as Gender;

        const activityVal = formData.get('activityFactor');
        if (activityVal) newStats.activityFactor = Number(activityVal);

        try {
            await Promise.all(promises);
            setStats(newStats);
            toast.success("Medidas atualizadas com sucesso!");
            setOpen(false);
        } catch (error) {
            console.error(error); // Log para debug
            toast.error("Erro ao salvar medidas.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* 1. COMPOSIÇÃO CORPORAL */}
                <Card className="md:col-span-8 bg-zinc-900 text-white border-zinc-800 relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                    <CardHeader className="flex flex-row justify-between items-start pb-2 relative z-10">
                        <div>
                            <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                                <Scale className="h-4 w-4" /> Composição Corporal
                            </CardTitle>
                            <p className="text-xs text-zinc-500 mt-1">Gordura vs Massa Magra (Estimativa Naval)</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="text-zinc-900 bg-white hover:bg-zinc-200 border-0 h-8 text-xs gap-2">
                            <Edit3 className="h-3 w-3" /> Atualizar Medidas
                        </Button>
                    </CardHeader>
                    <CardContent className="relative z-10">
                        <div className="flex flex-col md:flex-row gap-8 items-end">
                            <div className="flex-1">
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-6xl font-black tracking-tighter">{bodyFat > 0 ? bodyFat.toFixed(1) : '--'}%</span>
                                    <span className="text-lg text-zinc-400 font-medium mb-1">Gordura</span>
                                </div>
                                <div className="flex gap-2 mb-6">
                                    <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30">
                                        Gordura: {fatMass.toFixed(1)}kg
                                    </Badge>
                                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                                        Massa Magra: {leanMass.toFixed(1)}kg
                                    </Badge>
                                </div>
                            </div>
                            <div className="w-full md:w-1/2 space-y-3 pb-2">
                                <div className="flex justify-between text-xs text-zinc-400">
                                    <span>Atleta (6-13%)</span>
                                    <span>Fitness (14-17%)</span>
                                    <span>Médio (18-24%)</span>
                                </div>
                                <div className="h-4 w-full bg-zinc-800 rounded-full overflow-hidden relative border border-zinc-700">
                                    <div className="absolute left-[13%] h-full w-px bg-zinc-600/50"></div>
                                    <div className="absolute left-[17%] h-full w-px bg-zinc-600/50"></div>
                                    <div className="absolute left-[24%] h-full w-px bg-zinc-600/50"></div>
                                    <div 
                                        className={`h-full transition-all duration-1000 ${bodyFat < 13 ? 'bg-emerald-500' : bodyFat < 24 ? 'bg-blue-500' : 'bg-yellow-500'}`} 
                                        style={{ width: `${Math.min(bodyFat, 100)}%` }} 
                                    />
                                </div>
                                <p className="text-xs text-right text-zinc-500">*Estimativa baseada em medidas antropométricas.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. IMC CARD */}
                <Card className="md:col-span-4 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-center">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-zinc-500 flex items-center gap-2">
                            <Activity className="h-4 w-4" /> IMC (Índice de Massa)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-end">
                            <span className="text-4xl font-black text-zinc-800 dark:text-zinc-100">{bmi.value.toFixed(1)}</span>
                            <Badge className={`mb-1 ${bmi.value < 24.9 ? 'bg-emerald-100 text-emerald-700' : bmi.value < 29.9 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {bmi.status}
                            </Badge>
                        </div>
                        <Progress value={(bmi.value / 40) * 100} className="h-2" />
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-3 rounded-lg text-xs text-zinc-500 leading-snug">
                            O IMC é um indicador geral. Se você treina pesado, foque mais na % de gordura acima.
                        </div>
                    </CardContent>
                </Card>

                {/* 3. METABOLISMO & ENERGIA */}
                <Card className="md:col-span-4 bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                            <Flame className="h-4 w-4" /> Metabolismo Basal
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-1 mb-1">
                            <span className="text-3xl font-black text-orange-900 dark:text-orange-100">{Math.round(tdee)}</span>
                            <span className="text-sm font-bold text-orange-600/70">kcal/dia</span>
                        </div>
                        <p className="text-xs text-orange-700/60 dark:text-orange-300/60 mb-4">
                            Gasto total estimado para manter seu peso atual.
                        </p>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center bg-white/60 dark:bg-black/20 p-2 rounded text-xs">
                                <span className="text-zinc-600 dark:text-zinc-400">Definir (Perda)</span>
                                <span className="font-bold text-emerald-600">{cutCalories} kcal</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/60 dark:bg-black/20 p-2 rounded text-xs">
                                <span className="text-zinc-600 dark:text-zinc-400">Crescer (Ganho)</span>
                                <span className="font-bold text-blue-600">{bulkCalories} kcal</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. RECOMENDAÇÕES (COACH) */}
                <Card className="md:col-span-8 border-zinc-200 dark:border-zinc-800 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-zinc-700 dark:text-zinc-200">
                            <Info className="h-4 w-4 text-blue-500" /> Plano Recomendado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="flex gap-4 p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg h-fit text-blue-600"><Droplets className="h-5 w-5" /></div>
                            <div>
                                <h4 className="font-bold text-blue-900 dark:text-blue-100 text-sm">Hidratação</h4>
                                <p className="text-xs text-blue-700/70 dark:text-blue-300/70 mt-1 leading-relaxed">
                                    Beba <strong>{(waterGoal / 1000).toFixed(1)}L</strong> de água. Otimiza transporte de nutrientes.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30">
                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg h-fit text-emerald-600"><Utensils className="h-5 w-5" /></div>
                            <div>
                                <h4 className="font-bold text-emerald-900 dark:text-emerald-100 text-sm">Macros (Proteína)</h4>
                                <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70 mt-1 leading-relaxed">
                                    Consuma aprox. <strong>{(leanMass * 2).toFixed(0)}g</strong> de proteína diariamente (2g/kg magro).
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 sm:col-span-2">
                            <div className="p-2 bg-zinc-200 dark:bg-zinc-800 rounded-lg h-fit text-zinc-600 dark:text-zinc-400"><HeartPulse className="h-5 w-5" /></div>
                            <div>
                                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Saúde Metabólica</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-zinc-500">Relação Cintura/Altura:</p>
                                    <Badge variant="outline" className={`text-[10px] font-normal ${risk.color}`}>
                                        {(stats.waist / stats.height).toFixed(2)} ({risk.level})
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* MODAL DE ATUALIZAÇÃO */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit3 className="h-5 w-5 text-blue-600" /> Atualizar Medidas
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Peso (kg)</Label>
                                <Input name="weight" type="number" step="0.1" defaultValue={stats.weight} placeholder="Ex: 80.5" />
                            </div>
                            <div className="space-y-2">
                                <Label>Altura (cm)</Label>
                                <Input name="height" type="number" defaultValue={stats.height} placeholder="Ex: 175" />
                            </div>
                            <div className="space-y-2">
                                <Label>Cintura (cm)</Label>
                                <Input name="waist" type="number" defaultValue={stats.waist} placeholder="Na altura do umbigo" />
                            </div>
                            <div className="space-y-2">
                                <Label>Pescoço (cm)</Label>
                                <Input name="neck" type="number" defaultValue={stats.neck} placeholder="Abaixo do gogó" />
                            </div>
                            <div className="space-y-2">
                                <Label>Quadril (cm)</Label>
                                <Input name="hip" type="number" defaultValue={stats.hip} placeholder="Parte mais larga (mulheres)" />
                            </div>
                            <div className="space-y-2">
                                <Label>Gênero</Label>
                                <Select name="gender" defaultValue={stats.gender}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MALE">Masculino</SelectItem>
                                        <SelectItem value="FEMALE">Feminino</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 space-y-2">
                                <Label>Nível de Atividade</Label>
                                <Select name="activityFactor" defaultValue={stats.activityFactor.toString()}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {ACTIVITY_LEVELS.map((level) => (
                                            <SelectItem key={level.value} value={level.value.toString()}>
                                                {level.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button type="submit" disabled={isLoading} className="w-full">
                                {isLoading ? "Salvando..." : "Salvar e Recalcular"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}