"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ScanLine, Shirt, Footprints, Flame, Gauge, Ruler } from "lucide-react";
import {
    calculateAge, calculateBodyFat, BodyStats, ACTIVITY_LEVELS,
    bodyFatFromSkinfolds, skinfoldSites, type Gender,
} from "@/lib/body-math";
import { saveBodyMeasurements, saveBodyDeviceMetrics } from "@/app/(dashboard)/health/actions";
import { toast } from "sonner";
import { InputWithTooltip } from "./body-measure-fields";

// Estado dos campos de aparelho (strings — vazio = não informado).
const EMPTY_DEVICE = { bodyFatMeasured: "", muscleMass: "", bodyWater: "", visceralFat: "", boneMass: "", metabolicAge: "" };
const EMPTY_SKIN = { a: "", b: "", c: "" };

interface BodyMeasurementsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialStats: BodyStats;
    onSaved: (stats: BodyStats) => void;
}

export function BodyMeasurementsDialog({ open, onOpenChange, initialStats, onSaved }: BodyMeasurementsDialogProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formDataState, setFormDataState] = useState<BodyStats>(initialStats);
    // Aparelhos: bioimpedância (valores diretos) + adipômetro (3 dobras).
    const [device, setDevice] = useState({ ...EMPTY_DEVICE });
    const [skin, setSkin] = useState({ ...EMPTY_SKIN });

    // Ao abrir, semeia o formulário com os dados confirmados atuais.
    // Padrão "ajustar estado durante render" (evita useEffect + cascading renders).
    const [wasOpen, setWasOpen] = useState(open);
    if (open !== wasOpen) {
        setWasOpen(open);
        if (open) {
            setFormDataState(initialStats);
            // Campos de aparelho começam vazios: são um NOVO registro do dia,
            // não uma edição do valor anterior (o histórico é preservado).
            setDevice({ ...EMPTY_DEVICE });
            setSkin({ ...EMPTY_SKIN });
        }
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

    // Adipômetro: soma das 3 dobras → % de gordura (Jackson-Pollock + Siri).
    const age = calculateAge(formDataState.birthDate);
    const skinSum = [skin.a, skin.b, skin.c].reduce((s, v) => s + (parseFloat(v) || 0), 0);
    const caliperFat = bodyFatFromSkinfolds(skinSum, age, formDataState.gender as Gender);
    const skinLabels = skinfoldSites(formDataState.gender as Gender);

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
            // Medições de aparelho (opcionais): bioimpedância direta + gordura
            // calculada pelo adipômetro. A % explícita da balança tem prioridade;
            // se só houver dobras, usa o resultado do adipômetro.
            const deviceForm = new FormData();
            const bf = device.bodyFatMeasured.trim() || (caliperFat > 0 ? String(caliperFat) : "");
            if (bf) deviceForm.append("bodyFatMeasured", bf);
            if (device.muscleMass.trim()) deviceForm.append("muscleMass", device.muscleMass);
            if (device.bodyWater.trim()) deviceForm.append("bodyWater", device.bodyWater);
            if (device.visceralFat.trim()) deviceForm.append("visceralFat", device.visceralFat);
            if (device.boneMass.trim()) deviceForm.append("boneMass", device.boneMass);
            if (device.metabolicAge.trim()) deviceForm.append("metabolicAge", device.metabolicAge);

            if ([...deviceForm.keys()].length > 0) {
                const dRes = await saveBodyDeviceMetrics(deviceForm);
                if (!dRes.success) toast.error(dRes.message);
            }

            onSaved(formDataState);
            toast.success(result.message);
            onOpenChange(false);
            router.refresh(); // recarrega medidas + métricas de aparelho do servidor
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
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="basic">Essencial</TabsTrigger>
                                <TabsTrigger value="fullbody">Corpo completo</TabsTrigger>
                                <TabsTrigger value="devices">Aparelhos</TabsTrigger>
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
                                        <InputWithTooltip label="Ombros" val={formDataState.shoulders} onChange={(v) => handleInputChange('shoulders', v)} tooltip="CIRCUNFERÊNCIA: passe a fita ao redor da parte mais larga dos ombros/deltoides (por cima do peito). NÃO é a largura de ombro a ombro. Costuma dar ~110–130 cm e é o que calcula o V-Shape." />
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

                            {/* ABA APARELHOS: bioimpedância + adipômetro (opcional) */}
                            <TabsContent value="devices" className="mt-0 space-y-6">
                                <p className="rounded-xl border border-border/40 bg-muted/20 p-3 text-xs leading-relaxed text-muted-foreground">
                                    Tem uma <b>balança de bioimpedância</b> ou um <b>adipômetro</b> (medidor de dobras)? Informe os valores abaixo — o Life OS passa a usar sua gordura <b>medida</b> no lugar da estimativa por fita, deixando tudo mais preciso. É tudo opcional: preencha só o que você tem.
                                </p>

                                {/* BIOIMPEDÂNCIA */}
                                <div className="space-y-3">
                                    <h3 className="flex items-center gap-2 border-b border-border/40 pb-2 text-sm font-semibold">
                                        <Gauge className="h-4 w-4 text-muted-foreground" /> Balança de bioimpedância
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                                        <InputWithTooltip label="Gordura (%)" val={device.bodyFatMeasured ? Number(device.bodyFatMeasured) : undefined} onChange={(v) => setDevice(d => ({ ...d, bodyFatMeasured: v }))} tooltip="A % de gordura que a balança mostra. Tem prioridade sobre a estimativa por fita." />
                                        <InputWithTooltip label="Massa muscular (kg)" val={device.muscleMass ? Number(device.muscleMass) : undefined} onChange={(v) => setDevice(d => ({ ...d, muscleMass: v }))} tooltip="Peso de músculo (kg) informado pela balança." />
                                        <InputWithTooltip label="Água (%)" val={device.bodyWater ? Number(device.bodyWater) : undefined} onChange={(v) => setDevice(d => ({ ...d, bodyWater: v }))} tooltip="Percentual de água corporal. Referência saudável: ~50–65%." />
                                        <InputWithTooltip label="Gordura visceral" val={device.visceralFat ? Number(device.visceralFat) : undefined} onChange={(v) => setDevice(d => ({ ...d, visceralFat: v }))} tooltip="Nível de gordura ao redor dos órgãos. Ideal costuma ser até 9 (quanto menor, melhor)." />
                                        <InputWithTooltip label="Massa óssea (kg)" val={device.boneMass ? Number(device.boneMass) : undefined} onChange={(v) => setDevice(d => ({ ...d, boneMass: v }))} tooltip="Peso estimado dos ossos (kg)." />
                                        <InputWithTooltip label="Idade metabólica" val={device.metabolicAge ? Number(device.metabolicAge) : undefined} onChange={(v) => setDevice(d => ({ ...d, metabolicAge: v }))} tooltip="Idade que seu metabolismo aparenta. Menor que a idade real é ótimo sinal." />
                                    </div>
                                </div>

                                {/* ADIPÔMETRO (DOBRAS) */}
                                <div className="space-y-3">
                                    <h3 className="flex items-center gap-2 border-b border-border/40 pb-2 text-sm font-semibold">
                                        <Ruler className="h-4 w-4 text-muted-foreground" /> Adipômetro — dobras cutâneas (mm)
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Protocolo de 3 dobras ({formDataState.gender === "FEMALE" ? "feminino" : "masculino"}). Belisque a pele com o adipômetro e informe cada dobra em milímetros.
                                    </p>
                                    <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
                                        <InputWithTooltip label={skinLabels[0]} val={skin.a ? Number(skin.a) : undefined} onChange={(v) => setSkin(s => ({ ...s, a: v }))} tooltip="Dobra vertical, em milímetros." />
                                        <InputWithTooltip label={skinLabels[1]} val={skin.b ? Number(skin.b) : undefined} onChange={(v) => setSkin(s => ({ ...s, b: v }))} tooltip="Dobra em milímetros." />
                                        <InputWithTooltip label={skinLabels[2]} val={skin.c ? Number(skin.c) : undefined} onChange={(v) => setSkin(s => ({ ...s, c: v }))} tooltip="Dobra vertical na frente da coxa, em milímetros." />
                                    </div>
                                    {caliperFat > 0 && (
                                        <div className="flex items-center justify-between rounded-xl bg-primary/10 px-3.5 py-2.5">
                                            <span className="text-xs font-medium text-muted-foreground">Gordura pelo adipômetro (Jackson-Pollock)</span>
                                            <span className="text-lg font-bold text-primary">{caliperFat.toFixed(1)}%</span>
                                        </div>
                                    )}
                                    {skinSum > 0 && caliperFat <= 0 && (
                                        <p className="text-[11px] text-amber-600 dark:text-amber-400">Preencha as 3 dobras e a data de nascimento (na aba Essencial) para calcular a gordura.</p>
                                    )}
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
