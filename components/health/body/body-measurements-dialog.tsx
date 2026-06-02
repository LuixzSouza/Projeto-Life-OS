"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ScanLine, AlertCircle, Shirt, Footprints } from "lucide-react";
import { calculateAge, BodyStats, ACTIVITY_LEVELS } from "@/lib/body-math";
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
            <DialogContent size="xl" className="bg-background border-border shadow-2xl overflow-y-auto max-h-[90vh]">
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
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={isLoading} className="min-w-[140px] shadow-md shadow-primary/20">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Salvar Medidas"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
