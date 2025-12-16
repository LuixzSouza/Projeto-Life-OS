"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    Scale, Activity, HeartPulse, Droplets, Flame, Info, 
    Utensils, Edit3, User, Ruler, Loader2, 
    Link,
    ArrowLeft
} from "lucide-react";
import { 
    calculateBMI, calculateBMR, calculateTDEE, calculateBodyFat, 
    calculateComposition, calculateWater, calculateRisk, BodyStats, ACTIVITY_LEVELS, Gender
} from "@/lib/body-math";
import { logMetric } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- Tipagem Estrita ---
type ActionResponse = { success: boolean; message: string };

export function BodyDashboard({ stats: initialStats }: { stats: BodyStats }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [stats, setStats] = useState<BodyStats>(initialStats);

    // --- CÁLCULOS EM TEMPO REAL ---
    const bmi = calculateBMI(stats.weight, stats.height);
    const bodyFat = calculateBodyFat(stats);
    const { fatMass, leanMass } = calculateComposition(stats.weight, bodyFat);
    const bmr = calculateBMR(stats);
    const tdee = calculateTDEE(bmr, stats.activityFactor);
    const risk = calculateRisk(stats.waist, stats.height);
    const waterGoal = calculateWater(stats.weight);

    const cutCalories = Math.round(tdee * 0.8);
    const bulkCalories = Math.round(tdee * 1.1);

    // --- HANDLER DO FORMULÁRIO ---
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        const newStats = { ...stats };
        
        const promises: Promise<ActionResponse>[] = [];
        const numericFields: Array<keyof Pick<BodyStats, 'weight' | 'height' | 'waist' | 'neck' | 'hip'>> = 
            ['weight', 'height', 'waist', 'neck', 'hip'];

        for (const field of numericFields) {
            const val = formData.get(field);
            if (val) {
                newStats[field] = Number(val);
                const metricData = new FormData();
                metricData.append('type', field.toUpperCase());
                metricData.append('value', val.toString());
                promises.push(logMetric(metricData));
            }
        }

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
            console.error(error);
            toast.error("Erro ao salvar medidas.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-24">
            
            {/* --- GRID PRINCIPAL --- */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* 1. DESTAQUE: COMPOSIÇÃO CORPORAL (8 Colunas) */}
                <Card className="md:col-span-8 relative overflow-hidden border-border/60 bg-card shadow-lg group">
                    {/* Background Decorativo */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none transition-opacity group-hover:opacity-80" />
                    
                    <CardHeader className="flex flex-row justify-between items-start pb-2 relative z-10">
                        <div>
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                                    <Scale className="h-4 w-4" />
                                </div>
                                Composição Corporal
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1.5 ml-1">Análise baseada na estimativa naval e medidas antropométricas.</p>
                        </div>
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setOpen(true)} 
                            className="gap-2 h-9 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                            <Edit3 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Atualizar</span>
                        </Button>
                    </CardHeader>

                    <CardContent className="relative z-10 pt-6">
                        <div className="flex flex-col md:flex-row gap-10 items-end">
                            
                            {/* Esquerda: Números */}
                            <div className="flex-1 space-y-6">
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-6xl font-black tracking-tighter text-foreground">
                                            {bodyFat > 0 ? bodyFat.toFixed(1) : '--'}
                                        </span>
                                        <span className="text-xl font-bold text-muted-foreground mb-1">%</span>
                                    </div>
                                    <p className="text-sm font-medium text-muted-foreground">Gordura Corporal Estimada</p>
                                </div>
                                
                                <div className="flex gap-3">
                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 py-1 px-3">
                                        Gordura: <span className="font-bold ml-1">{fatMass.toFixed(1)}kg</span>
                                    </Badge>
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 py-1 px-3">
                                        Massa Magra: <span className="font-bold ml-1">{leanMass.toFixed(1)}kg</span>
                                    </Badge>
                                </div>
                            </div>

                            {/* Direita: Gráfico Visual */}
                            <div className="w-full md:w-1/2 space-y-3 pb-2">
                                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <span>Atleta</span>
                                    <span>Fitness</span>
                                    <span>Médio</span>
                                    <span>Acima</span>
                                </div>
                                
                                <div className="h-5 w-full bg-secondary rounded-full overflow-hidden relative shadow-inner">
                                    {/* Marcadores */}
                                    <div className="absolute left-[13%] h-full w-px bg-background/50 z-10"></div>
                                    <div className="absolute left-[17%] h-full w-px bg-background/50 z-10"></div>
                                    <div className="absolute left-[24%] h-full w-px bg-background/50 z-10"></div>
                                    
                                    {/* Barra de Progresso */}
                                    <div 
                                        className={cn(
                                            "h-full transition-all duration-1000 ease-out shadow-sm",
                                            bodyFat < 13 ? 'bg-emerald-500' : bodyFat < 24 ? 'bg-blue-500' : 'bg-amber-500'
                                        )} 
                                        style={{ width: `${Math.min(bodyFat, 100)}%` }} 
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. LATERAL: IMC (4 Colunas) */}
                <Card className="md:col-span-4 flex flex-col justify-between border-border/60 bg-card shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Índice de Massa (IMC)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex justify-between items-end">
                            <span className="text-5xl font-black text-foreground tracking-tighter">
                                {bmi.value.toFixed(1)}
                            </span>
                            <Badge className={cn("mb-2", 
                                bmi.value < 24.9 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 
                                bmi.value < 29.9 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 
                                'bg-destructive/10 text-destructive border-destructive/20'
                            )}>
                                {bmi.status}
                            </Badge>
                        </div>
                        
                        <div className="space-y-2">
                            <Progress value={(bmi.value / 40) * 100} className="h-2" />
                            <p className="text-[10px] text-muted-foreground text-right font-medium">Faixa Saudável: 18.5 - 24.9</p>
                        </div>

                        <div className="bg-muted/30 p-3 rounded-lg border border-border/50 text-xs text-muted-foreground leading-relaxed">
                            <Info className="h-3 w-3 inline mr-1 -mt-0.5" />
                            O IMC é um indicador geral. Para quem treina hipertrofia, a % de gordura é mais relevante.
                        </div>
                    </CardContent>
                </Card>

                {/* 3. METABOLISMO (4 Colunas) */}
                <Card className="md:col-span-4 bg-gradient-to-br from-orange-500/5 to-transparent border-orange-500/20 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2">
                            <Flame className="h-4 w-4" /> Metabolismo Basal
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-4xl font-black text-foreground">{Math.round(tdee)}</span>
                            <span className="text-sm font-bold text-muted-foreground">kcal/dia</span>
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-center bg-background/60 p-2.5 rounded-lg border border-border/50 text-xs shadow-sm">
                                <span className="font-medium text-muted-foreground">Definir (Cutting)</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{cutCalories} kcal</span>
                            </div>
                            <div className="flex justify-between items-center bg-background/60 p-2.5 rounded-lg border border-border/50 text-xs shadow-sm">
                                <span className="font-medium text-muted-foreground">Crescer (Bulking)</span>
                                <span className="font-bold text-blue-600 dark:text-blue-400">{bulkCalories} kcal</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. PLANO & SAÚDE (8 Colunas) */}
                <Card className="md:col-span-8 border-border/60 bg-card shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                            <div className="p-1.5 bg-primary/10 rounded-md text-primary">
                                <Info className="h-4 w-4" /> 
                            </div>
                            Plano Recomendado
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Hidratação */}
                        <div className="flex gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/20 transition-colors">
                            <div className="p-2 bg-blue-500/10 rounded-lg h-fit text-blue-600"><Droplets className="h-5 w-5" /></div>
                            <div>
                                <h4 className="font-bold text-blue-700 dark:text-blue-300 text-sm">Hidratação</h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Meta diária de <strong>{(waterGoal / 1000).toFixed(1)}L</strong>. Essencial para transporte de nutrientes.
                                </p>
                            </div>
                        </div>

                        {/* Proteína */}
                        <div className="flex gap-4 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/20 transition-colors">
                            <div className="p-2 bg-emerald-500/10 rounded-lg h-fit text-emerald-600"><Utensils className="h-5 w-5" /></div>
                            <div>
                                <h4 className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">Proteína</h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                    Consuma ~<strong>{(leanMass * 2).toFixed(0)}g</strong> diariamente (2g/kg de massa magra) para manutenção muscular.
                                </p>
                            </div>
                        </div>

                        {/* Saúde Metabólica (Full Width) */}
                        <div className="flex gap-4 p-4 rounded-xl bg-background border border-border/60 sm:col-span-2 items-center">
                            <div className="p-2 bg-secondary rounded-lg h-fit text-muted-foreground"><HeartPulse className="h-5 w-5" /></div>
                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h4 className="font-bold text-foreground text-sm">Saúde Metabólica</h4>
                                    <p className="text-xs text-muted-foreground">Relação Cintura/Altura (WHtR)</p>
                                </div>
                                <Badge variant="outline" className={cn("text-xs w-fit h-7 px-3", risk.color)}>
                                    {(stats.waist / stats.height).toFixed(2)} • {risk.level}
                                </Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* --- MODAL DE EDIÇÃO --- */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[600px] bg-background border-border shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <Edit3 className="h-5 w-5" />
                            </div>
                            Atualizar Medidas
                        </DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="space-y-6 py-2">
                        {/* Seção 1: Básico */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Peso (kg)</Label>
                                <div className="relative">
                                    <Scale className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input name="weight" type="number" step="0.1" defaultValue={stats.weight} placeholder="0.0" className="pl-9 bg-muted/20 border-border/50" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Altura (cm)</Label>
                                <div className="relative">
                                    <Ruler className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input name="height" type="number" defaultValue={stats.height} placeholder="0" className="pl-9 bg-muted/20 border-border/50" />
                                </div>
                            </div>
                        </div>

                        {/* Seção 2: Circunferências */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold text-muted-foreground uppercase">Circunferências (cm)</Label>
                            <div className="grid grid-cols-3 gap-4">
                                <Input name="neck" type="number" step="0.1" defaultValue={stats.neck} placeholder="Pescoço" className="bg-muted/20 border-border/50" />
                                <Input name="waist" type="number" step="0.1" defaultValue={stats.waist} placeholder="Cintura" className="bg-muted/20 border-border/50" />
                                <Input name="hip" type="number" step="0.1" defaultValue={stats.hip} placeholder="Quadril" className="bg-muted/20 border-border/50" />
                            </div>
                        </div>

                        {/* Seção 3: Perfil */}
                        <div className="grid grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Gênero</Label>
                                <Select name="gender" defaultValue={stats.gender}>
                                    <SelectTrigger className="bg-muted/20 border-border/50"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MALE">Masculino</SelectItem>
                                        <SelectItem value="FEMALE">Feminino</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">Nível de Atividade</Label>
                                <Select name="activityFactor" defaultValue={stats.activityFactor.toString()}>
                                    <SelectTrigger className="bg-muted/20 border-border/50"><SelectValue /></SelectTrigger>
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

                        <DialogFooter className="pt-4 border-t border-border/40">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isLoading} className="min-w-[140px] shadow-md shadow-primary/20">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Salvar e Calcular"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}