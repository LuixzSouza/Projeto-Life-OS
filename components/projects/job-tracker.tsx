"use client";

import { useState } from "react";
import { JobApplication } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
    Briefcase, ExternalLink, DollarSign, Plus, Trash2, Calendar, Pencil, 
    CheckCircle2, XCircle, Clock, Search, FileCode, Users, Globe, LayoutGrid, List, FileText,
    Trophy, Rocket, Target
} from "lucide-react";
import { createJob, deleteJob, updateJob } from "@/app/(dashboard)/projects/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ResumeBuilder } from "./resume/resume-builder"; 

// --- TYPES & INTERFACES ---

type StatusTheme = "blue" | "purple" | "orange" | "yellow" | "emerald" | "indigo" | "neutral";

interface StatusDetail {
    label: string;
    theme: StatusTheme;
    progress: number;
    icon: React.ElementType;
}

const STATUS_MAP: Record<string, StatusDetail> = {
    APPLIED: { label: "Inscrito", theme: "blue", progress: 15, icon: Clock },
    SCREENING: { label: "Triagem", theme: "purple", progress: 30, icon: Search },
    TEST: { label: "Teste", theme: "orange", progress: 50, icon: FileCode },
    INTERVIEW: { label: "Entrevista", theme: "yellow", progress: 75, icon: Users },
    OFFER: { label: "Proposta", theme: "emerald", progress: 90, icon: DollarSign },
    ACTIVE: { label: "Contratado", theme: "indigo", progress: 100, icon: CheckCircle2 },
    REJECTED: { label: "Encerrado", theme: "neutral", progress: 0, icon: XCircle },
};

const getThemeClasses = (theme: StatusTheme): string => {
    switch (theme) {
        case "blue": return "text-blue-600 bg-blue-500/10 border-blue-500/20";
        case "purple": return "text-purple-600 bg-purple-500/10 border-purple-500/20";
        case "orange": return "text-orange-600 bg-orange-500/10 border-orange-500/20";
        case "yellow": return "text-amber-600 bg-amber-500/10 border-amber-500/20";
        case "emerald": return "text-emerald-600 bg-emerald-500/10 border-emerald-500/20";
        case "indigo": return "text-indigo-600 bg-indigo-500/10 border-indigo-500/20";
        default: return "text-muted-foreground bg-muted border-border";
    }
};

// --- COMPONENTS ---

function JobListItem({ job, mode }: { job: JobApplication, mode: 'list' | 'grid' }) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const statusInfo = STATUS_MAP[job.status] || STATUS_MAP.APPLIED;
    const StatusIcon = statusInfo.icon;

    const handleDeleteConfirmed = async (): Promise<void> => {
        await deleteJob(job.id);
        toast.success("Vaga removida com sucesso.");
    }

    const getLogoUrl = (url: string | null): string | null => {
        if (!url) return null;
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch { return null; }
    };

    const logo = getLogoUrl(job.jobUrl);

    if (mode === 'grid') {
        return (
            <Card className="group relative overflow-hidden hover:shadow-xl transition-all duration-300 border-border/50 bg-card rounded-2xl">
                <div className={cn("absolute top-0 left-0 w-full h-1.5", getThemeClasses(statusInfo.theme).split(" ")[0].replace("text", "bg"))} />
                <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-5">
                        <div className="h-12 w-12 rounded-2xl bg-background border border-border/50 flex items-center justify-center shadow-sm overflow-hidden p-2">
                            {logo ? (
                                <img src={logo} alt={job.company} className="w-full h-full object-contain" />
                            ) : (
                                <Briefcase className="w-6 h-6 text-muted-foreground/50" />
                            )}
                        </div>
                        <Badge variant="outline" className={cn("text-[9px] font-black uppercase tracking-widest px-2 py-0.5", getThemeClasses(statusInfo.theme))}>
                            {statusInfo.label}
                        </Badge>
                    </div>
                    
                    <div className="space-y-1 mb-6">
                        <h4 className="font-black text-lg truncate text-foreground tracking-tight">{job.company}</h4>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">{job.role}</p>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            <span>Pipeline</span>
                            <span>{statusInfo.progress}%</span>
                        </div>
                        <Progress value={statusInfo.progress} className="h-1.5 bg-muted rounded-full" />
                        
                        <div className="flex justify-between items-center pt-4 mt-2 border-t border-border/40">
                             {job.salary ? (
                                <span className="text-[11px] font-black font-mono bg-emerald-500/10 text-emerald-600 px-2 py-1 rounded-lg">
                                    {job.salary}
                                </span>
                             ) : <div />}
                             <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => setIsEditOpen(true)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                                <DeleteDialog onConfirm={handleDeleteConfirmed} />
                             </div>
                        </div>
                    </div>
                </CardContent>
                
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-[95vw] sm:max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] p-0 overflow-hidden bg-background border-border/50 shadow-2xl">
                        <div className="bg-muted/10 p-6 border-b border-border/40 shrink-0">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                    <Pencil className="h-5 w-5 text-primary" /> Editar Registro
                                </DialogTitle>
                            </DialogHeader>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto max-h-[70vh]">
                            <JobForm defaultValues={job} type={job.type || 'JOB'} mode="edit" onSubmit={() => setIsEditOpen(false)} />
                        </div>
                    </DialogContent>
                </Dialog>
            </Card>
        );
    }

    return (
        <div className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-card border border-border/60 rounded-2xl hover:shadow-lg hover:border-primary/30 transition-all mb-4 relative overflow-hidden active:scale-[0.99]">
            <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", getThemeClasses(statusInfo.theme).split(" ")[0].replace("text", "bg"))} />
            
            <div className="flex items-center gap-5 flex-1 min-w-0">
                <div className="h-14 w-14 rounded-2xl bg-background flex items-center justify-center border border-border/50 shrink-0 shadow-sm overflow-hidden p-2.5">
                    {logo ? <img src={logo} alt={job.company} className="w-full h-full object-contain" /> : <Briefcase className="w-6 h-6 text-muted-foreground/40" />}
                </div>
                <div className="min-w-0 space-y-1">
                    <h4 className="font-black text-lg text-foreground tracking-tight truncate leading-tight">{job.company}</h4>
                    <div className="flex flex-wrap items-center gap-3">
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest truncate max-w-[200px]">{job.role}</p>
                        <span className="text-border text-[10px]">•</span>
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground/70">
                            <Calendar className="h-3.5 w-3.5" /> 
                            {new Date(job.appliedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                        {job.salary && (
                            <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                <DollarSign className="h-3 w-3" /> {job.salary}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-full sm:w-56 flex flex-col gap-2 shrink-0">
                <div className="flex justify-between items-center">
                    <span className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5", statusInfo.theme === 'neutral' ? 'text-muted-foreground' : getThemeClasses(statusInfo.theme).split(" ")[0])}>
                        <StatusIcon className="h-3.5 w-3.5" /> {statusInfo.label}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground">{statusInfo.progress}%</span>
                </div>
                <Progress value={statusInfo.progress} className="h-2 bg-muted rounded-full" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-0 pt-4 sm:pt-0 mt-2 sm:mt-0">
                {job.jobUrl && (
                    <Button variant="outline" size="icon" asChild className="h-10 w-10 rounded-xl text-muted-foreground hover:text-blue-600 hover:bg-blue-50 border-border/60">
                        <a href={job.jobUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4.5 w-4.5" /></a>
                    </Button>
                )}
                
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 border-border/60"><Pencil className="h-4.5 w-4.5" /></Button>
                    </DialogTrigger>
                    <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-[95vw] sm:max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] p-0 overflow-hidden bg-background border-border/50 shadow-2xl">
                         <div className="bg-muted/10 p-6 border-b border-border/40 shrink-0">
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                    <Pencil className="h-5 w-5 text-primary" /> Editar Registro
                                </DialogTitle>
                            </DialogHeader>
                        </div>
                        <div className="p-6 md:p-8 overflow-y-auto max-h-[70vh]">
                            <JobForm defaultValues={job} type={job.type || 'JOB'} mode="edit" onSubmit={() => setIsEditOpen(false)} />
                        </div>
                    </DialogContent>
                </Dialog>

                <DeleteDialog onConfirm={handleDeleteConfirmed} />
            </div>
        </div>
    );
}

function DeleteDialog({ onConfirm }: { onConfirm: () => Promise<void> }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-50 border-border/60"><Trash2 className="h-4.5 w-4.5" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[2rem]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-black uppercase tracking-tighter">Remover registro?</AlertDialogTitle>
                    <AlertDialogDescription className="font-medium">
                        Esta ação removerá permanentemente o registro do seu pipeline de carreira.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl font-bold">Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-rose-600 text-white hover:bg-rose-700 rounded-xl font-bold">Excluir</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

function JobForm({ defaultValues, type, mode = 'create', onSubmit }: { defaultValues?: JobApplication, type: string, mode?: 'create'|'edit', onSubmit?: () => void }) {
    return (
        <form action={async (formData: FormData) => { 
            if (mode === 'create') await createJob(formData);
            else await updateJob(formData);
            toast.success(mode === 'create' ? "Pipeline atualizado!" : "Alterações salvas!");
            onSubmit?.();
        }} className="space-y-6">
            <input type="hidden" name="id" value={defaultValues?.id} />
            <input type="hidden" name="type" value={type} />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5" /> {type === 'JOB' ? 'Empresa' : 'Cliente'}
                    </Label>
                    <Input name="company" defaultValue={defaultValues?.company} placeholder="Ex: Google ou Freelancer" required className="h-12 bg-muted/20 border-border/50 rounded-xl font-bold focus-visible:ring-primary/30" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" /> {type === 'JOB' ? 'Cargo' : 'Serviço'}
                    </Label>
                    <Input name="role" defaultValue={defaultValues?.role} placeholder="Ex: Software Engineer" required className="h-12 bg-muted/20 border-border/50 rounded-xl font-bold focus-visible:ring-primary/30" />
                </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5" /> Valor Estimado / Salário
                    </Label>
                    <Input name="salary" defaultValue={defaultValues?.salary || ""} placeholder="R$ 8.000,00" className="h-12 bg-muted/20 border-border/50 rounded-xl font-mono font-bold focus-visible:ring-primary/30" />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" /> Link da Vaga / Referência
                    </Label>
                    <Input name="jobUrl" defaultValue={defaultValues?.jobUrl || ""} placeholder="https://linkedin.com/..." className="h-12 bg-muted/20 border-border/50 rounded-xl font-medium focus-visible:ring-primary/30" />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Estágio do Processo
                </Label>
                <Select name="status" defaultValue={defaultValues?.status || "APPLIED"}>
                    <SelectTrigger className="h-12 bg-muted/20 border-border/50 rounded-xl font-bold">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="APPLIED">🔵 Inscrito / Candidatado</SelectItem>
                        <SelectItem value="SCREENING">🟣 Triagem de Currículos</SelectItem>
                        <SelectItem value="TEST">🟠 Teste Técnico / Case</SelectItem>
                        <SelectItem value="INTERVIEW">🟡 Entrevista com Time/RH</SelectItem>
                        <SelectItem value="OFFER">🟢 Proposta Recebida</SelectItem>
                        <SelectItem value="ACTIVE">⭐ Contratado / Ativo</SelectItem>
                        <SelectItem value="REJECTED">⚪ Processo Encerrado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" /> Notas e Observações
                </Label>
                <Textarea 
                    name="requirements" 
                    defaultValue={defaultValues?.requirements || ""} 
                    placeholder="Escreva sobre requisitos, pontos fortes, dúvidas..." 
                    className="min-h-[120px] bg-muted/20 border-border/50 rounded-xl font-medium p-4 focus-visible:ring-primary/30" 
                />
            </div>

            <DialogFooter className="pt-4 border-t border-border/40">
                 <Button type="submit" className="w-full h-14 bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95">
                    Confirmar Registro
                 </Button>
            </DialogFooter>
        </form>
    );
}

// --- MAIN TRACKER COMPONENT ---

export function JobTracker({ jobs }: { jobs: JobApplication[] }) {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const renderContent = (type: string) => {
        const filtered = jobs.filter(j => (j.type || 'JOB') === type);
        
        const activeCount = filtered.filter(j => j.status !== 'REJECTED' && j.status !== 'ACTIVE').length;
        const interviewCount = filtered.filter(j => j.status === 'INTERVIEW').length;
        const offerCount = filtered.filter(j => j.status === 'OFFER' || j.status === 'ACTIVE').length;

        return (
            <div className="space-y-10 animate-in fade-in duration-500">
                {/* Stats Section */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <StatsCard label="Em Andamento" value={activeCount} icon={Rocket} theme="blue" />
                    <StatsCard label="Entrevistas" value={interviewCount} icon={Target} theme="yellow" />
                    <StatsCard label="Conquistas" value={offerCount} icon={Trophy} theme="emerald" />
                </div>

                {/* Toolbar */}
                <div className="flex justify-between items-center border-b border-border/40 pb-6">
                    <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-2xl border border-border/50">
                        <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-xl transition-all", viewMode === 'list' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>
                            <List className="h-5 w-5" />
                        </button>
                        <button onClick={() => setViewMode('grid')} className={cn("p-2 rounded-xl transition-all", viewMode === 'grid' ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}>
                            <LayoutGrid className="h-5 w-5" />
                        </button>
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 shadow-xl h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95">
                                <Plus className="h-5 w-5" /> Adicionar {type === 'JOB' ? 'Vaga' : 'Freela'}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="fixed left-[50%] top-[50%] z-50 grid w-[95vw] sm:max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] p-0 overflow-hidden bg-background border-border/50 shadow-2xl">
                             <div className="bg-muted/10 p-6 border-b border-border/40 shrink-0">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                                        <Briefcase className="h-6 w-6 text-primary" /> Novo Registro
                                    </DialogTitle>
                                </DialogHeader>
                            </div>
                            <div className="p-6 md:p-8 overflow-y-auto max-h-[70vh]">
                                <JobForm type={type} />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Items List */}
                <div className={cn("pb-10", viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-2")}>
                    {filtered.length === 0 ? (
                        <div className="text-center py-24 border-2 border-dashed border-border/60 rounded-[3rem] col-span-full bg-muted/5">
                            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                                <Briefcase className="h-10 w-10 text-muted-foreground/30" />
                            </div>
                            <h3 className="text-lg font-bold text-foreground uppercase tracking-widest">Pipeline Vazio</h3>
                            <p className="text-muted-foreground text-sm mt-1 max-w-[280px] mx-auto">Comece a rastrear suas oportunidades para acelerar sua carreira.</p>
                        </div>
                    ) : (
                        filtered.map(job => <JobListItem key={job.id} job={job} mode={viewMode} />)
                    )}
                </div>
            </div>
        )
    };

    return (
        <Tabs defaultValue="jobs" className="w-full h-full flex flex-col p-2">
            <div className="flex justify-center mb-10 shrink-0 print:hidden">
                <TabsList className="bg-zinc-200/50 dark:bg-zinc-900/50 p-1.5 rounded-2xl border border-border/40 h-14 w-full max-w-[600px] shadow-inner">
                    <TabsTrigger value="jobs" className="rounded-xl px-8 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all gap-2 h-full flex-1">
                        Vagas CLT/PJ
                    </TabsTrigger>
                    <TabsTrigger value="freela" className="rounded-xl px-8 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all gap-2 h-full flex-1">
                        Freelas & Projetos
                    </TabsTrigger>
                    <TabsTrigger value="resume" className="rounded-xl px-8 font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:text-foreground data-[state=active]:shadow-md transition-all gap-2 h-full flex-1">
                        <FileText className="h-3.5 w-3.5" /> Currículo
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 min-h-0 print:overflow-visible">
                <TabsContent value="jobs" className="mt-0 focus-visible:ring-0 outline-none">{renderContent('JOB')}</TabsContent>
                <TabsContent value="freela" className="mt-0 focus-visible:ring-0 outline-none">{renderContent('FREELANCE')}</TabsContent>
                <TabsContent value="resume" className="mt-0 focus-visible:ring-0 outline-none h-full">
                    <div className="bg-white dark:bg-zinc-950 border border-border/40 rounded-[2.5rem] shadow-sm overflow-hidden p-2">
                        <ResumeBuilder />
                    </div>
                </TabsContent>
            </div>
        </Tabs>
    );
}

interface StatsCardProps {
    label: string;
    value: number;
    icon: React.ElementType;
    theme: "blue" | "yellow" | "emerald";
}

function StatsCard({ label, value, icon: Icon, theme }: StatsCardProps) {
    const themes = {
        blue: "text-blue-600 bg-blue-500/10 border-blue-500/20 shadow-blue-500/5",
        yellow: "text-amber-600 bg-amber-500/10 border-amber-500/20 shadow-amber-500/5",
        emerald: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/5",
    };

    return (
        <Card className={cn("border bg-card shadow-sm rounded-3xl transition-all hover:shadow-md", themes[theme].split(" ").slice(2).join(" "))}>
            <CardContent className="p-6 flex items-center gap-5">
                <div className={cn("p-4 rounded-2xl shrink-0", themes[theme].split(" ").slice(0, 2).join(" "))}>
                    <Icon className="h-7 w-7" />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
                    <h3 className="text-3xl font-black tracking-tighter text-foreground leading-none">{value}</h3>
                </div>
            </CardContent>
        </Card>
    );
}