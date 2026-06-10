"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ScanLine, Shirt, Footprints, Flame } from "lucide-react";
import { calculateAge, calculateBodyFat, BodyStats, ACTIVITY_LEVELS } from "@/lib/body-math";
import { saveBodyMeasurements } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { InputWithTooltip } from "./body-measure-fields";

interface BodyMeasurementsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialStats: BodyStats;
    onSaved: (stats: BodyStats) => void;
}

export function BodyMeasurementsDialog({ open, onOpenChange, initialStats, onSaved }: BodyMeasurementsDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [formDataState, setFormDataState] = useState<BodyStats>(initialStats);

    // Ao abrir, semeia o formulário com os dados confirmados atuais.
    // Padrão "ajustar estado durante render" (evita useEffect + cascading renders).
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) setFormDataState(initialStats);
    }

    const handleInputChange = (field: keyof BodyStats, value: string) => {
        setFormDataState(prev => ({
            ...prev,
            [field]: (field === 'gender' || field === 'birthDate') ? value : (value === '' ? 0 : Number(value))
        }));
    };

    // Preview AO VIVO: a gordura estimada recalcula enquanto digita pescoço/
    // cintura/quadril — feedback imediato de que as medidas fazem sentido.
    const liveFat = calculateBodyFat(formDataState);

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
            onSaved(formDataState);
            toast.success(result.message);
            onOpenChange(false);
        } else {
            toast.error(result.message);
        }
        setIsLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* Corpo rolável + rodapé sempre visível: no celular o botão Salvar
                não some mais no fim de um scroll comprido. */}
            <DialogContent size="xl" className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0">
                <DialogHeader className="border-b border-border/40 px-5 pb-4 pt-5 text-left sm:px-6">
                    <DialogTitle className="flex items-center gap-2.5 text-lg">
                        <div className="rounded-lg bg-primary/10 p-2 text-primary"><ScanLine className="h-4 w-4" /></div>
                        Atualizar medidas corporais
                    </DialogTitle>
                    <DialogDescription>Corpo relaxado e fita justa, sem apertar.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <Tabs defaultValue="basic" className="flex min-h-0 flex-1 flex-col">
                        <div className="px-5 pt-4 sm:px-6">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="basic">Essencial</TabsTrigger>
                                <TabsTrigger value="fullbody">Corpo completo</TabsTrigger>
                            </TabsList>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
                            {/* ABA ESSENCIAL */}
                            <TabsContent value="basic" className="mt-0 space-y-5">
                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground">Peso (kg)</Label>
                                        <Input type="number" inputMode="decimal" step="0.1" value={formDataState.weight || ''} onChange={(e) => handleInputChange('weight', e.target.value)} className="h-10 rounded-xl border-border/40 bg-muted/30" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground">Altura (cm)</Label>
                                        <Input type="number" inputMode="numeric" value={formDataState.height || ''} onChange={(e) => handleInputChange('height', e.target.value)} className="h-10 rounded-xl border-border/40 bg-muted/30" required />
                                    </div>
                                    <div className="col-span-2 space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground">Data de nascimento</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="date"
                                                value={formDataState.birthDate ? new Date(formDataState.birthDate).toISOString().split('T')[0] : ''}
                                                onChange={(e) => handleInputChange('birthDate', e.target.value)}
                                                className="h-10 min-w-0 flex-1 rounded-xl border-border/40 bg-muted/30"
                                                required
                                            />
                                            {formDataState.birthDate && (
                                                <Badge variant="outline" className="h-10 shrink-0 whitespace-nowrap rounded-xl border-border/40 px-3">
                                                    {calculateAge(formDataState.birthDate)} anos
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground">Gênero</Label>
                                        <Select value={formDataState.gender} onValueChange={(val) => handleInputChange('gender', val)}>
                                            <SelectTrigger className="h-10 rounded-xl border-border/40 bg-muted/30"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MALE">Masculino</SelectItem>
                                                <SelectItem value="FEMALE">Feminino</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium text-muted-foreground">Atividade</Label>
                                        <Select value={formDataState.activityFactor.toString()} onValueChange={(val) => handleInputChange('activityFactor', val)}>
                                            <SelectTrigger className="h-10 rounded-xl border-border/40 bg-muted/30"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {ACTIVITY_LEVELS.map((level) => (
                                                    <SelectItem key={level.value} value={level.value.toString()}>{level.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-3 border-t border-border/40 pt-4">
                                    <div>
                                        <Label className="text-sm font-semibold">Pescoço, cintura e quadril (cm)</Label>
                                        <p className="mt-0.5 text-xs text-muted-foreground">São essas 3 medidas que estimam seu % de gordura (fórmula Naval).</p>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                                        <InputWithTooltip label="Pescoço" val={formDataState.neck} onChange={(v) => handleInputChange('neck', v)} tooltip="Meça na parte mais estreita ou abaixo do pomo de adão." />
                                        <InputWithTooltip label="Cintura" val={formDataState.waist} onChange={(v) => handleInputChange('waist', v)} tooltip="Na altura do umbigo, relaxado." />
                                        <InputWithTooltip label="Quadril" val={formDataState.hip} onChange={(v) => handleInputChange('hip', v)} tooltip="Parte mais larga dos glúteos." />
                                    </div>
                                </div>
                            </TabsContent>

                            {/* ABA CORPO COMPLETO */}
                            <TabsContent value="fullbody" className="mt-0 space-y-5">
                                <div className="space-y-3">
                                    <h3 className="flex items-center gap-2 border-b border-border/40 pb-2 text-sm font-semibold">
                                        <Shirt className="h-4 w-4 text-muted-foreground" /> Tronco & superiores
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        <InputWithTooltip label="Ombros" val={formDataState.shoulders} onChange={(v) => handleInputChange('shoulders', v)} tooltip="Circunferência total. Essencial para 'Golden Ratio'." />
                                        <InputWithTooltip label="Peitoral" val={formDataState.chest} onChange={(v) => handleInputChange('chest', v)} tooltip="Na linha dos mamilos." />
                                        <InputWithTooltip label="Braço Esq." val={formDataState.armLeft} onChange={(v) => handleInputChange('armLeft', v)} tooltip="Pico do bíceps contraído." />
                                        <InputWithTooltip label="Braço Dir." val={formDataState.armRight} onChange={(v) => handleInputChange('armRight', v)} tooltip="Pico do bíceps contraído." />
                                        <InputWithTooltip label="Antebraço Esq." val={formDataState.forearmLeft} onChange={(v) => handleInputChange('forearmLeft', v)} tooltip="Parte mais larga." />
                                        <InputWithTooltip label="Antebraço Dir." val={formDataState.forearmRight} onChange={(v) => handleInputChange('forearmRight', v)} tooltip="Parte mais larga." />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="flex items-center gap-2 border-b border-border/40 pb-2 text-sm font-semibold">
                                        <Footprints className="h-4 w-4 text-muted-foreground" /> Inferiores
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                        <InputWithTooltip label="Coxa Esq." val={formDataState.thighLeft} onChange={(v) => handleInputChange('thighLeft', v)} tooltip="Parte mais larga da coxa." />
                                        <InputWithTooltip label="Coxa Dir." val={formDataState.thighRight} onChange={(v) => handleInputChange('thighRight', v)} tooltip="Parte mais larga da coxa." />
                                        <InputWithTooltip label="Panturrilha Esq." val={formDataState.calfLeft} onChange={(v) => handleInputChange('calfLeft', v)} tooltip="Parte mais larga da batata da perna." />
                                        <InputWithTooltip label="Panturrilha Dir." val={formDataState.calfRight} onChange={(v) => handleInputChange('calfRight', v)} tooltip="Parte mais larga da batata da perna." />
                                    </div>
                                </div>
                            </TabsContent>
                        </div>
                    </Tabs>

                    {/* Rodapé fixo: preview ao vivo + ações */}
                    <div className="flex items-center justify-between gap-3 border-t border-border/40 bg-background px-5 py-3 sm:px-6">
                        {liveFat > 0 ? (
                            <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                                <Flame className="h-3 w-3 shrink-0" />
                                <span className="truncate">Gordura estimada: {liveFat.toFixed(1)}%</span>
                            </span>
                        ) : (
                            <span className="hidden text-xs text-muted-foreground sm:block">Preencha pescoço, cintura e quadril para estimar a gordura.</span>
                        )}
                        <div className="flex shrink-0 items-center gap-2">
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="h-10 rounded-xl">
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading} className="h-10 min-w-[110px] rounded-xl font-semibold">
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar"}
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
