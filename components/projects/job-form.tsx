"use client";

import { useRef, useState } from "react";
import { JobApplication } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, DollarSign, Clock, Users, Globe, FileText, MapPin, Flag, CalendarClock, UserCheck, Mail, Wand2, Loader2, History } from "lucide-react";
import { createJob, updateJob, scrapeJob } from "@/app/(dashboard)/projects/actions";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { STATUS_MAP } from "./job-tracker-status";
import type { JobEventLite } from "./job-types";

const LABEL_CLS = "text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5";
const INPUT_CLS = "h-11 bg-muted/40 border-border/40 rounded-xl focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/20";
const SELECT_CLS = "h-11 bg-muted/40 border-border/40 rounded-xl";

export function JobForm({ defaultValues, type, mode = 'create', events, onSubmit }: { defaultValues?: JobApplication, type: string, mode?: 'create' | 'edit', events?: JobEventLite[], onSubmit?: () => void }) {
    const formRef = useRef<HTMLFormElement>(null);
    const [importUrl, setImportUrl] = useState("");
    const [importing, setImporting] = useState(false);

    // Preenche um campo (input/textarea uncontrolled) via DOM — o submit lê do DOM.
    const setField = (name: string, value?: string) => {
        if (!value) return;
        const el = formRef.current?.elements.namedItem(name);
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) el.value = value;
    };

    const runImport = async () => {
        const url = importUrl.trim();
        if (!url) return;
        setImporting(true);
        try {
            const res = await scrapeJob(url);
            if (res.success) {
                setField("company", res.data.company);
                setField("role", res.data.role);
                setField("location", res.data.location);
                setField("salary", res.data.salary);
                setField("requirements", res.data.requirements);
                setField("jobUrl", url);
                toast.success("Dados importados do link! Revise antes de salvar. ✨");
            } else {
                toast.error(res.error);
            }
        } catch {
            toast.error("Falha ao importar o link.");
        } finally {
            setImporting(false);
        }
    };

    return (
        <form ref={formRef} action={async (formData: FormData) => {
            if (mode === 'create') await createJob(formData);
            else await updateJob(formData);
            toast.success(mode === 'create' ? "Registro adicionado!" : "Alterações salvas!");
            onSubmit?.();
        }} className="space-y-5">
            <input type="hidden" name="id" value={defaultValues?.id} />
            <input type="hidden" name="type" value={type} />

            {/* Auto-import por URL (best-effort: JSON-LD/meta tags) — só ao criar */}
            {mode === 'create' && (
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] p-2">
                    <Globe className="h-4 w-4 text-primary shrink-0 ml-1" />
                    <Input
                        value={importUrl}
                        onChange={(e) => setImportUrl(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); runImport(); } }}
                        placeholder="Cole o link da vaga para preencher automaticamente…"
                        className="h-9 border-none bg-transparent shadow-none focus-visible:ring-0 text-sm"
                    />
                    <Button type="button" size="sm" onClick={runImport} disabled={importing || !importUrl.trim()} className="shrink-0 gap-1.5 rounded-lg">
                        {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Importar
                    </Button>
                </div>
            )}

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

            {/* Timeline de estágios (histórico do funil) */}
            {mode === 'edit' && events && events.length > 0 && (
                <div className="space-y-2 rounded-xl border border-border/40 bg-muted/20 p-3">
                    <p className={LABEL_CLS}><History className="h-3.5 w-3.5" /> Histórico de estágios</p>
                    <ol className="relative ml-1 space-y-2 border-l border-border/60 pl-4">
                        {events.map((ev, i) => {
                            const info = STATUS_MAP[ev.status] || STATUS_MAP.APPLIED;
                            return (
                                <li key={i} className="relative">
                                    <span className="absolute -left-[1.30rem] top-1 h-2 w-2 rounded-full bg-primary" />
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold">{info.label}</span>
                                        <span className="text-[10px] text-muted-foreground">{format(new Date(ev.createdAt), "dd MMM yyyy", { locale: ptBR })}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </div>
            )}

            <DialogFooter className="pt-4 border-t border-border/40">
                <Button type="submit" className="w-full h-11 rounded-xl font-bold shadow-sm">
                    {mode === 'create' ? 'Adicionar registro' : 'Salvar alterações'}
                </Button>
            </DialogFooter>
        </form>
    );
}
