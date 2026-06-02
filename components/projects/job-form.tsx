"use client";

import { JobApplication } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, DollarSign, Clock, Users, Globe, FileText, MapPin, Flag, CalendarClock, UserCheck, Mail } from "lucide-react";
import { createJob, updateJob } from "@/app/(dashboard)/projects/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const LABEL_CLS = "text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5";
const INPUT_CLS = "h-11 bg-muted/40 border-border/40 rounded-xl focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/20";
const SELECT_CLS = "h-11 bg-muted/40 border-border/40 rounded-xl";

export function JobForm({ defaultValues, type, mode = 'create', onSubmit }: { defaultValues?: JobApplication, type: string, mode?: 'create' | 'edit', onSubmit?: () => void }) {
    return (
        <form action={async (formData: FormData) => {
            if (mode === 'create') await createJob(formData);
            else await updateJob(formData);
            toast.success(mode === 'create' ? "Registro adicionado!" : "Alterações salvas!");
            onSubmit?.();
        }} className="space-y-5">
            <input type="hidden" name="id" value={defaultValues?.id} />
            <input type="hidden" name="type" value={type} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className={LABEL_CLS}><Briefcase className="h-3.5 w-3.5" /> {type === 'JOB' ? 'Empresa' : 'Cliente'}</Label>
                    <Input name="company" defaultValue={defaultValues?.company} placeholder="Ex: Google" required className={INPUT_CLS} />
                </div>
                <div className="space-y-1.5">
                    <Label className={LABEL_CLS}><Users className="h-3.5 w-3.5" /> {type === 'JOB' ? 'Cargo' : 'Serviço'}</Label>
                    <Input name="role" defaultValue={defaultValues?.role} placeholder="Ex: Software Engineer" required className={INPUT_CLS} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className={LABEL_CLS}><DollarSign className="h-3.5 w-3.5" /> Salário / Valor estimado</Label>
                    <Input name="salary" defaultValue={defaultValues?.salary || ""} placeholder="R$ 8.000,00" className={cn(INPUT_CLS, "font-mono")} />
                </div>
                <div className="space-y-1.5">
                    <Label className={LABEL_CLS}><Globe className="h-3.5 w-3.5" /> Link da vaga / referência</Label>
                    <Input name="jobUrl" defaultValue={defaultValues?.jobUrl || ""} placeholder="https://linkedin.com/..." className={INPUT_CLS} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className={LABEL_CLS}><MapPin className="h-3.5 w-3.5" /> Localização / Modelo</Label>
                    <Input name="location" defaultValue={defaultValues?.location || ""} placeholder="Ex: Remoto · São Paulo, SP" className={INPUT_CLS} />
                </div>
                <div className="space-y-1.5">
                    <Label className={LABEL_CLS}><Flag className="h-3.5 w-3.5" /> Prioridade</Label>
                    <Select name="priority" defaultValue={defaultValues?.priority || "MEDIUM"}>
                        <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="HIGH">🔴 Alta — sonho de consumo</SelectItem>
                            <SelectItem value="MEDIUM">🟡 Média — boa oportunidade</SelectItem>
                            <SelectItem value="LOW">⚪ Baixa — plano B</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className={LABEL_CLS}><UserCheck className="h-3.5 w-3.5" /> Recrutador / Contato</Label>
                    <Input name="contactName" defaultValue={defaultValues?.contactName || ""} placeholder="Ex: Maria (RH)" className={INPUT_CLS} />
                </div>
                <div className="space-y-1.5">
                    <Label className={LABEL_CLS}><Mail className="h-3.5 w-3.5" /> E-mail do contato</Label>
                    <Input name="contactEmail" type="email" defaultValue={defaultValues?.contactEmail || ""} placeholder="recrutador@empresa.com" className={INPUT_CLS} />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label className={LABEL_CLS}><CalendarClock className="h-3.5 w-3.5" /> Próximo follow-up</Label>
                    <Input
                        name="followUpDate"
                        type="date"
                        defaultValue={defaultValues?.followUpDate ? new Date(defaultValues.followUpDate).toISOString().split("T")[0] : ""}
                        className={INPUT_CLS}
                    />
                </div>
                <div className="space-y-1.5">
                    <Label className={LABEL_CLS}><Clock className="h-3.5 w-3.5" /> Estágio do processo</Label>
                    <Select name="status" defaultValue={defaultValues?.status || "APPLIED"}>
                        <SelectTrigger className={SELECT_CLS}><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="APPLIED">🔵 Inscrito / Candidatado</SelectItem>
                            <SelectItem value="SCREENING">🟣 Triagem de currículos</SelectItem>
                            <SelectItem value="TEST">🟠 Teste técnico / Case</SelectItem>
                            <SelectItem value="INTERVIEW">🟡 Entrevista com time/RH</SelectItem>
                            <SelectItem value="OFFER">🟢 Proposta recebida</SelectItem>
                            <SelectItem value="ACTIVE">⭐ Contratado / Ativo</SelectItem>
                            <SelectItem value="REJECTED">⚪ Processo encerrado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-1.5">
                <Label className={LABEL_CLS}><FileText className="h-3.5 w-3.5" /> Notas e observações</Label>
                <Textarea
                    name="requirements"
                    defaultValue={defaultValues?.requirements || ""}
                    placeholder="Requisitos, pontos fortes, dúvidas... (usado também pela IA)"
                    className="min-h-[110px] bg-muted/40 border-border/40 rounded-xl p-3.5 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/20"
                />
            </div>

            <DialogFooter className="pt-4 border-t border-border/40">
                <Button type="submit" className="w-full h-11 rounded-xl font-bold shadow-sm">
                    {mode === 'create' ? 'Adicionar registro' : 'Salvar alterações'}
                </Button>
            </DialogFooter>
        </form>
    );
}
