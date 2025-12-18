"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
    Scale, Activity, HeartPulse, Droplets, Flame, Info, 
    Utensils, Edit3, Ruler, Loader2, 
    HelpCircle, ScanLine, AlertCircle,
    Shirt, Footprints
} from "lucide-react";
import { 
    calculateBMI, calculateBMR, calculateTDEE, calculateBodyFat, 
    calculateComposition, calculateWater, calculateRisk, calculateAge,
    BodyStats, ACTIVITY_LEVELS, Gender
} from "@/lib/body-math";
import { saveBodyMeasurements } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AdvancedInsights } from "./advanced-insights";

export function BodyDashboard({ stats: initialStats }: { stats: BodyStats }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Estado Visual (Dados confirmados)
    const [stats, setStats] = useState<BodyStats>(initialStats);

    // Estado do Formulário (Dados em edição)
    const [formDataState, setFormDataState] = useState<BodyStats>(initialStats);

    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) setFormDataState(stats);
        setOpen(isOpen);
    };

    // --- CÁLCULOS PRINCIPAIS ---
    const bmi = calculateBMI(stats.weight, stats.height);
    const bodyFat = calculateBodyFat(stats);
    const { fatMass, leanMass } = calculateComposition(stats.weight, bodyFat);
    const bmr = calculateBMR(stats);
    const tdee = calculateTDEE(bmr, stats.activityFactor);
    const risk = calculateRisk(stats.waist, stats.height);
    const waterGoal = calculateWater(stats.weight);
    const age = calculateAge(stats.birthDate);

    const cutCalories = Math.round(tdee * 0.8);
    const bulkCalories = Math.round(tdee * 1.1);

    // --- HANDLERS ---
    const handleInputChange = (field: keyof BodyStats, value: string) => {
        setFormDataState(prev => ({
            ...prev,
            [field]: (field === 'gender' || field === 'birthDate') ? value : (value === '' ? 0 : Number(value))
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const dataToSend = new FormData();
        Object.entries(formDataState).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                dataToSend.append(key, value.toString());
            }
        });

        const result = await saveBodyMeasurements(dataToSend);

        if (result.success) {
            setStats(formDataState);
            toast.success(result.message);
            setOpen(false);
        } else {
            toast.error(result.message);
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-24">
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* 1. GORDURA E COMPOSIÇÃO */}
                <Card className="md:col-span-8 relative overflow-hidden border-border/60 bg-card shadow-lg group">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none transition-opacity group-hover:opacity-80" />
                    
                    <CardHeader className="flex flex-row justify-between items-start pb-2 relative z-10">
                        <div>
                            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                <div className="p-1.5 bg-primary/10 rounded-md text-primary"><Scale className="h-4 w-4" /></div>
                                Composição Corporal
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1.5 ml-1">Análise baseada em medidas antropométricas e idade.</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2 h-9 border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors">
                            <Edit3 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Atualizar</span>
                        </Button>
                    </CardHeader>

                    <CardContent className="relative z-10 pt-6">
                        <div className="flex flex-col md:flex-row gap-10 items-end">
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
                            <div className="w-full md:w-1/2 space-y-3 pb-2">
                                <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                    <span>Atleta</span><span>Fitness</span><span>Médio</span><span>Acima</span>
                                </div>
                                <div className="h-5 w-full bg-secondary rounded-full overflow-hidden relative shadow-inner">
                                    <div className="absolute left-[13%] h-full w-px bg-background/50 z-10"></div>
                                    <div className="absolute left-[17%] h-full w-px bg-background/50 z-10"></div>
                                    <div className="absolute left-[24%] h-full w-px bg-background/50 z-10"></div>
                                    <div 
                                        className={cn("h-full transition-all duration-1000 ease-out shadow-sm", bodyFat < 13 ? 'bg-emerald-500' : bodyFat < 24 ? 'bg-blue-500' : 'bg-amber-500')} 
                                        style={{ width: `${Math.min(bodyFat, 100)}%` }} 
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. IMC */}
                <Card className="md:col-span-4 flex flex-col justify-between border-border/60 bg-card shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-2">
                            <Activity className="h-4 w-4" /> Índice de Massa (IMC)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex justify-between items-end">
                            <span className="text-5xl font-black text-foreground tracking-tighter">{bmi.value.toFixed(1)}</span>
                            <Badge className={cn("mb-2", bmi.value < 24.9 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600')}>{bmi.status}</Badge>
                        </div>
                        <div className="space-y-2">
                            <Progress value={(bmi.value / 40) * 100} className="h-2" />
                            <p className="text-[10px] text-muted-foreground text-right font-medium">Saudável: 18.5 - 24.9</p>
                        </div>
                    </CardContent>
                </Card>

                {/* 3. INSIGHTS AVANÇADOS (Novo Componente) */}
                <div className="md:col-span-12">
                    <AdvancedInsights stats={stats} />
                </div>

                {/* 4. METABOLISMO & PLANO */}
                <Card className="md:col-span-12 grid md:grid-cols-3 border-border/60 bg-card shadow-sm divide-y md:divide-y-0 md:divide-x divide-border/50">
                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-xs uppercase">
                            <Flame className="h-4 w-4" /> Gasto Calórico (TDEE)
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black">{Math.round(tdee)}</span>
                            <span className="text-sm text-muted-foreground">kcal/dia</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-muted/30 p-2 rounded border border-border/50">
                                <span className="block text-muted-foreground mb-1">Perder Peso</span>
                                <span className="font-bold text-emerald-500">{cutCalories}</span>
                            </div>
                            <div className="bg-muted/30 p-2 rounded border border-border/50">
                                <span className="block text-muted-foreground mb-1">Ganhar Massa</span>
                                <span className="font-bold text-blue-500">{bulkCalories}</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold text-xs uppercase">
                            <Droplets className="h-4 w-4" /> Hidratação Ideal
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black">{(waterGoal / 1000).toFixed(1)}</span>
                            <span className="text-sm text-muted-foreground">Litros/dia</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight">
                            Beba água ao longo do dia para otimizar o transporte de nutrientes e a queima de gordura.
                        </p>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase">
                            <Utensils className="h-4 w-4" /> Proteína Diária
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-4xl font-black">~{(leanMass * 2).toFixed(0)}</span>
                            <span className="text-sm text-muted-foreground">gramas</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-tight">
                            Baseado em 2g/kg de massa magra. Essencial para manutenção e crescimento muscular.
                        </p>
                    </div>
                </Card>

                {/* 5. RELATÓRIO DE MEDIDAS (cm) */}
                <Card className="col-span-1 md:col-span-12 border-border/60 bg-card shadow-sm">
                    <CardHeader className="border-b border-border/40 pb-4">
                        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground uppercase tracking-wider">
                            <Ruler className="h-4 w-4 text-primary" />
                            Relatório de Medidas (cm)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-4">
                                    <Shirt className="h-3.5 w-3.5" /> Tronco & Superior
                                </h4>
                                <div className="space-y-3">
                                    <MeasureRow label="Ombros" value={stats.shoulders} />
                                    <MeasureRow label="Peitoral" value={stats.chest} />
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground">Braço Esq.</span>
                                            <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.armLeft || '--'}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground">Braço Dir.</span>
                                            <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.armRight || '--'}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground">Antebraço Esq.</span>
                                            <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.forearmLeft || '--'}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground">Antebraço Dir.</span>
                                            <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.forearmRight || '--'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-4">
                                    <Activity className="h-3.5 w-3.5" /> Core & Base
                                </h4>
                                <div className="space-y-3">
                                    <MeasureRow label="Pescoço" value={stats.neck} highlight />
                                    <MeasureRow label="Cintura" value={stats.waist} highlight />
                                    <MeasureRow label="Quadril" value={stats.hip} highlight />
                                </div>
                                <div className="mt-6 p-4 rounded-xl bg-secondary/30 border border-border/50">
                                    <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
                                        <span className="font-bold text-foreground">Nota:</span> Estas 3 medidas centrais são usadas para calcular seu % de gordura e risco metabólico.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2 mb-4">
                                    <Footprints className="h-3.5 w-3.5" /> Membros Inferiores
                                </h4>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground">Coxa Esq.</span>
                                            <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.thighLeft || '--'}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground">Coxa Dir.</span>
                                            <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.thighRight || '--'}</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground">Panturrilha Esq.</span>
                                            <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.calfLeft || '--'}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-muted-foreground">Panturrilha Dir.</span>
                                            <div className="font-mono font-medium text-sm border rounded px-2 py-1 bg-muted/20">{stats.calfRight || '--'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                        </div>
                    </CardContent>
                </Card>

            </div>

            {/* --- MODAL --- */}
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-[800px] bg-background border-border shadow-2xl overflow-y-auto max-h-[90vh]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary"><ScanLine className="h-5 w-5" /></div>
                            Atualizar Medidas Corporais
                        </DialogTitle>
                        <DialogDescription>Mantenha o corpo relaxado e a fita justa, mas sem apertar.</DialogDescription>
                    </DialogHeader>
                    
                    <form onSubmit={handleSubmit} className="py-2">
                        <Tabs defaultValue="basic" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-6">
                                <TabsTrigger value="basic">Gordura & Biometria</TabsTrigger>
                                <TabsTrigger value="fullbody">Corpo Completo</TabsTrigger>
                            </TabsList>

                            {/* ABA BÁSICA */}
                            <TabsContent value="basic" className="space-y-6">
                                <Alert className="bg-primary/5 border-primary/20">
                                    <AlertCircle className="h-4 w-4 text-primary" />
                                    <AlertTitle className="text-primary font-bold text-xs uppercase">Dados Essenciais</AlertTitle>
                                    <AlertDescription className="text-xs text-muted-foreground">
                                        Necessários para cálculos metabólicos. A data de nascimento define seu metabolismo basal.
                                    </AlertDescription>
                                </Alert>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase">Peso (kg)</Label>
                                        <Input type="number" step="0.1" value={formDataState.weight || ''} onChange={(e) => handleInputChange('weight', e.target.value)} className="bg-muted/20" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase">Altura (cm)</Label>
                                        <Input type="number" value={formDataState.height || ''} onChange={(e) => handleInputChange('height', e.target.value)} className="bg-muted/20" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase">Data de Nascimento</Label>
                                        <div className="flex gap-2 items-center">
                                            <Input 
                                                type="date" 
                                                value={formDataState.birthDate ? new Date(formDataState.birthDate).toISOString().split('T')[0] : ''} 
                                                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                                                className="bg-muted/20" 
                                                required 
                                            />
                                            {/* Exibe idade calculada ao lado se existir data */}
                                            {formDataState.birthDate && (
                                                <Badge variant="outline" className="h-9 px-3 whitespace-nowrap">
                                                    {calculateAge(formDataState.birthDate)} anos
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase">Gênero</Label>
                                        <Select value={formDataState.gender} onValueChange={(val) => handleInputChange('gender', val)}>
                                            <SelectTrigger className="bg-muted/20"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MALE">Masculino</SelectItem>
                                                <SelectItem value="FEMALE">Feminino</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase">Nível de Atividade</Label>
                                        <Select value={formDataState.activityFactor.toString()} onValueChange={(val) => handleInputChange('activityFactor', val)}>
                                            <SelectTrigger className="bg-muted/20"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {ACTIVITY_LEVELS.map((level) => (
                                                    <SelectItem key={level.value} value={level.value.toString()}>{level.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <Label className="text-sm font-bold text-foreground block mb-4">Medidas para Fórmula Naval (cm)</Label>
                                    <div className="grid grid-cols-3 gap-4">
                                        <InputWithTooltip label="Pescoço" val={formDataState.neck} onChange={(v) => handleInputChange('neck', v)} tooltip="Meça na parte mais estreita ou abaixo do pomo de adão." />
                                        <InputWithTooltip label="Cintura" val={formDataState.waist} onChange={(v) => handleInputChange('waist', v)} tooltip="Na altura do umbigo, relaxado." />
                                        <InputWithTooltip label="Quadril" val={formDataState.hip} onChange={(v) => handleInputChange('hip', v)} tooltip="Parte mais larga dos glúteos." />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* ABA DETALHADA */}
                            <TabsContent value="fullbody" className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-2">
                                        <Shirt className="h-4 w-4 text-muted-foreground" /> Tronco & Superiores
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputWithTooltip label="Ombros" val={formDataState.shoulders} onChange={(v) => handleInputChange('shoulders', v)} tooltip="Circunferência total. Essencial para 'Golden Ratio'." />
                                        <InputWithTooltip label="Peitoral" val={formDataState.chest} onChange={(v) => handleInputChange('chest', v)} tooltip="Na linha dos mamilos." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputWithTooltip label="Braço Esq." val={formDataState.armLeft} onChange={(v) => handleInputChange('armLeft', v)} tooltip="Pico do bíceps contraído." />
                                        <InputWithTooltip label="Braço Dir." val={formDataState.armRight} onChange={(v) => handleInputChange('armRight', v)} tooltip="Pico do bíceps contraído." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputWithTooltip label="Antebraço Esq." val={formDataState.forearmLeft} onChange={(v) => handleInputChange('forearmLeft', v)} tooltip="Parte mais larga." />
                                        <InputWithTooltip label="Antebraço Dir." val={formDataState.forearmRight} onChange={(v) => handleInputChange('forearmRight', v)} tooltip="Parte mais larga." />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b pb-2">
                                        <Footprints className="h-4 w-4 text-muted-foreground" /> Inferiores
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputWithTooltip label="Coxa Esq." val={formDataState.thighLeft} onChange={(v) => handleInputChange('thighLeft', v)} tooltip="Parte mais larga da coxa." />
                                        <InputWithTooltip label="Coxa Dir." val={formDataState.thighRight} onChange={(v) => handleInputChange('thighRight', v)} tooltip="Parte mais larga da coxa." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InputWithTooltip label="Panturrilha Esq." val={formDataState.calfLeft} onChange={(v) => handleInputChange('calfLeft', v)} tooltip="Parte mais larga da batata da perna." />
                                        <InputWithTooltip label="Panturrilha Dir." val={formDataState.calfRight} onChange={(v) => handleInputChange('calfRight', v)} tooltip="Parte mais larga da batata da perna." />
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter className="pt-6 border-t border-border/40 mt-4">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isLoading} className="min-w-[140px] shadow-md shadow-primary/20">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Salvar Medidas"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// --- HELPERS ---
const MeasureRow = ({ label, value, highlight }: { label: string, value?: number, highlight?: boolean }) => (
    <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <div className={cn("font-mono font-medium text-sm border rounded px-2 py-1", highlight ? "bg-primary/10 border-primary/30" : "bg-muted/20")}>{value || '--'}</div>
    </div>
);

const InputWithTooltip = ({ label, val, onChange, tooltip }: { label: string, val?: number, onChange: (v: string) => void, tooltip: string }) => (
    <div className="space-y-2">
        <div className="flex items-center gap-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">{label}</Label>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger type="button"><HelpCircle className="h-3 w-3 text-muted-foreground/70 hover:text-primary cursor-help" /></TooltipTrigger>
                    <TooltipContent className="max-w-[200px] text-xs leading-normal p-2">
                        {tooltip}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
        <Input 
            type="number" step="0.1" 
            value={val || ''} 
            onChange={(e) => onChange(e.target.value)} 
            placeholder="0.0" className="bg-muted/20 h-9" 
        />
    </div>
);