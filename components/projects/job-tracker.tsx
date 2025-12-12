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
    CheckCircle2, XCircle, Clock, Search, FileCode, Users, Globe, LayoutGrid, List, FileText 
} from "lucide-react";
import { createJob, deleteJob, updateJob } from "@/app/(dashboard)/projects/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Tipagem segura para os ícones e config
type StatusConfig = {
    label: string;
    color: string;
    progress: number;
    icon: React.ElementType;
};

const statusConfig: Record<string, StatusConfig> = {
    APPLIED: { label: "Inscrito", color: "text-blue-600 bg-blue-50 border-blue-200", progress: 15, icon: Clock },
    SCREENING: { label: "Triagem", color: "text-purple-600 bg-purple-50 border-purple-200", progress: 30, icon: Search },
    TEST: { label: "Teste Técnico", color: "text-orange-600 bg-orange-50 border-orange-200", progress: 50, icon: FileCode },
    INTERVIEW: { label: "Entrevista", color: "text-yellow-600 bg-yellow-50 border-yellow-200", progress: 75, icon: Users },
    OFFER: { label: "Proposta", color: "text-emerald-600 bg-emerald-50 border-emerald-200", progress: 90, icon: DollarSign },
    ACTIVE: { label: "Contratado", color: "text-indigo-600 bg-indigo-50 border-indigo-200", progress: 100, icon: CheckCircle2 },
    REJECTED: { label: "Encerrado", color: "text-zinc-500 bg-zinc-100 border-zinc-200", progress: 0, icon: XCircle },
};

// Item de Lista (Modo Lista)
function JobListItem({ job, mode }: { job: JobApplication, mode: 'list' | 'grid' }) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    
    const handleDeleteConfirmed = async () => {
        await deleteJob(job.id);
        toast.success("Item removido.");
    }

    const getLogoUrl = (url: string | null) => {
        if (!url) return null;
        try {
            const domain = new URL(url).hostname;
            return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
        } catch { return null; }
    };

    const logo = getLogoUrl(job.jobUrl);
    const status = statusConfig[job.status] || statusConfig.APPLIED;
    const StatusIcon = status.icon;

    if (mode === 'grid') {
        return (
            <Card className="group relative overflow-hidden hover:shadow-lg transition-all border-zinc-200 dark:border-zinc-800">
                <div className={cn("absolute top-0 left-0 w-full h-1", status.color.split(" ")[1].replace("bg-", "bg-"))} />
                <CardContent className="p-5 pt-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="h-12 w-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border flex items-center justify-center shadow-sm">
                            {logo ? <img src={logo} alt={job.company} className="w-6 h-6 object-contain" /> : <Briefcase className="w-5 h-5 text-zinc-400" />}
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", status.color)}>
                            {status.label}
                        </Badge>
                    </div>
                    
                    <h4 className="font-bold text-lg truncate">{job.company}</h4>
                    <p className="text-sm text-zinc-500 truncate mb-4">{job.role}</p>
                    
                    <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-zinc-500">
                            <span>Progresso</span>
                            <span>{status.progress}%</span>
                        </div>
                        <Progress value={status.progress} className="h-1.5" />
                        
                        <div className="flex justify-between items-center pt-2">
                             {job.salary && <span className="text-xs font-mono bg-green-50 text-green-700 px-1.5 py-0.5 rounded">{job.salary}</span>}
                             <div className="flex gap-1 ml-auto">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditOpen(true)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <DeleteDialog onConfirm={handleDeleteConfirmed} />
                             </div>
                        </div>
                    </div>
                </CardContent>
                
                {/* Modal de Edição (Grid) */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader><DialogTitle>Editar Vaga</DialogTitle></DialogHeader>
                        <JobForm defaultValues={job} type={job.type} mode="edit" onSubmit={() => setIsEditOpen(false)} />
                    </DialogContent>
                </Dialog>
            </Card>
        );
    }

    // Modo Lista (Padrão)
    return (
        <div className="group flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all mb-3 relative overflow-hidden">
            <div className={cn("absolute left-0 top-0 bottom-0 w-1", status.color.split(" ")[1].replace("bg-", "bg-"))} />
            
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="h-12 w-12 rounded-lg bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center border shrink-0 shadow-sm">
                    {logo ? <img src={logo} alt={job.company} className="w-7 h-7 object-contain" /> : <Briefcase className="h-5 w-5 text-zinc-400" />}
                </div>
                <div className="min-w-0">
                    <h4 className="font-bold text-base text-zinc-900 dark:text-zinc-100 truncate">{job.company}</h4>
                    <p className="text-sm text-zinc-500 truncate">{job.role}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-zinc-400">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(job.appliedDate).toLocaleDateString()}</span>
                        {job.salary && <span className="flex items-center gap-1 text-green-600 font-medium"><DollarSign className="h-3 w-3" /> {job.salary}</span>}
                    </div>
                </div>
            </div>

            <div className="w-full sm:w-48 flex flex-col gap-1.5 shrink-0">
                <div className="flex justify-between items-center text-xs">
                    <span className={cn("font-bold flex items-center gap-1.5", status.color.split(" ")[0])}>
                        <StatusIcon className="h-3.5 w-3.5" /> {status.label}
                    </span>
                    <span className="text-zinc-400">{status.progress}%</span>
                </div>
                <Progress value={status.progress} className="h-1.5 bg-zinc-100 dark:bg-zinc-800" indicatorClassName={status.color.split(" ")[1].replace("bg-", "bg-")} />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                {job.jobUrl && (
                    <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-zinc-400 hover:text-blue-600">
                        <a href={job.jobUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                )}
                
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-indigo-600"><Pencil className="h-4 w-4" /></Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-xl">
                        <DialogHeader><DialogTitle>Editar Vaga</DialogTitle></DialogHeader>
                        <JobForm defaultValues={job} type={job.type} mode="edit" onSubmit={() => setIsEditOpen(false)} />
                    </DialogContent>
                </Dialog>

                <DeleteDialog onConfirm={handleDeleteConfirmed} />
            </div>
        </div>
    )
}

// Botão de Deletar Isolado
function DeleteDialog({ onConfirm }: { onConfirm: () => void }) {
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Excluir?</AlertDialogTitle>
                    <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} className="bg-red-600">Excluir</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

// Formulário Profissional
function JobForm({ defaultValues, type, mode = 'create', onSubmit }: { defaultValues?: JobApplication, type: string, mode?: 'create'|'edit', onSubmit?: () => void }) {
    return (
        <form action={async (fd) => { 
            if (mode === 'create') await createJob(fd);
            else await updateJob(fd);
            toast.success(mode === 'create' ? "Criado com sucesso!" : "Atualizado com sucesso!");
            onSubmit?.();
        }} className="space-y-6 pt-4">
            <input type="hidden" name="id" value={defaultValues?.id} />
            <input type="hidden" name="type" value={type} />
            
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                        <Briefcase className="h-3.5 w-3.5" /> {type === 'JOB' ? 'Empresa' : 'Cliente'}
                    </Label>
                    <Input name="company" defaultValue={defaultValues?.company} placeholder="Ex: Google" required className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                        <Users className="h-3.5 w-3.5" /> {type === 'JOB' ? 'Cargo' : 'Serviço'}
                    </Label>
                    <Input name="role" defaultValue={defaultValues?.role} placeholder="Ex: Frontend Engineer" required className="bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800" />
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5" /> Valor / Salário
                    </Label>
                    <Input name="salary" defaultValue={defaultValues?.salary || ""} placeholder="R$ 5.000" className="bg-zinc-50 dark:bg-zinc-900 font-mono" />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                        <Globe className="h-3.5 w-3.5" /> Link da Vaga
                    </Label>
                    <Input name="jobUrl" defaultValue={defaultValues?.jobUrl || ""} placeholder="https://..." className="bg-zinc-50 dark:bg-zinc-900" />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5" /> Status Atual
                </Label>
                <Select name="status" defaultValue={defaultValues?.status || "APPLIED"}>
                    <SelectTrigger className="bg-zinc-50 dark:bg-zinc-900"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="APPLIED">🔵 Início / Inscrito</SelectItem>
                        <SelectItem value="SCREENING">🟣 Triagem / RH</SelectItem>
                        <SelectItem value="TEST">🟠 Teste Técnico</SelectItem>
                        <SelectItem value="INTERVIEW">🟡 Entrevista</SelectItem>
                        <SelectItem value="OFFER">🟢 Proposta Recebida</SelectItem>
                        <SelectItem value="ACTIVE">⭐ Contratado / Ativo</SelectItem>
                        <SelectItem value="REJECTED">⚪ Encerrado / Recusado</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-bold text-zinc-500 uppercase flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" /> Notas
                </Label>
                <Textarea 
                    name="requirements" 
                    defaultValue={defaultValues?.requirements || ""} 
                    placeholder="Requisitos, dúvidas, anotações..." 
                    className="min-h-[100px] bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-200 focus-visible:ring-yellow-400" 
                />
            </div>

            <DialogFooter>
                 <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-500/20">Salvar Registro</Button>
            </DialogFooter>
        </form>
    );
}

// Componente Principal
export function JobTracker({ jobs }: { jobs: JobApplication[] }) {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const renderContent = (type: string) => {
        const filtered = jobs.filter(j => (j.type || 'JOB') === type);
        
        // Stats
        const active = filtered.filter(j => j.status !== 'REJECTED' && j.status !== 'ACTIVE').length;
        const interviews = filtered.filter(j => j.status === 'INTERVIEW').length;
        const offers = filtered.filter(j => j.status === 'OFFER' || j.status === 'ACTIVE').length;

        return (
            <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900 shadow-sm">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-black text-blue-600">{active}</span>
                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mt-1">Em Andamento</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-yellow-50/50 dark:bg-yellow-900/10 border-yellow-100 dark:border-yellow-900 shadow-sm">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-black text-yellow-600">{interviews}</span>
                            <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mt-1">Entrevistas</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900 shadow-sm">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                            <span className="text-3xl font-black text-emerald-600">{offers}</span>
                            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mt-1">Conquistas</span>
                        </CardContent>
                    </Card>
                </div>

                <div className="flex justify-between items-center border-b pb-4 mb-4">
                    <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg">
                        <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white shadow text-indigo-600" : "text-zinc-400 hover:text-zinc-600")}>
                            <List className="h-4 w-4" />
                        </button>
                        <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-white shadow text-indigo-600" : "text-zinc-400 hover:text-zinc-600")}>
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2 shadow-md h-9 text-xs uppercase font-bold tracking-wide">
                                <Plus className="h-4 w-4" /> Novo {type === 'JOB' ? 'Processo' : 'Serviço'}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-xl">
                            <DialogHeader>
                                <DialogTitle className="text-xl flex items-center gap-2">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><Briefcase className="h-5 w-5"/></div>
                                    Novo Registro
                                </DialogTitle>
                            </DialogHeader>
                            <JobForm type={type} />
                        </DialogContent>
                    </Dialog>
                </div>

                <div className={cn("space-y-1", viewMode === 'grid' && "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 space-y-0")}>
                    {filtered.length === 0 ? (
                        <div className="text-center py-16 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl col-span-full">
                            <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Briefcase className="h-8 w-8 text-zinc-300" />
                            </div>
                            <p className="text-zinc-500 font-medium">Nenhum registro encontrado.</p>
                            <p className="text-zinc-400 text-sm">Adicione uma vaga para começar a rastrear.</p>
                        </div>
                    ) : (
                        filtered.map(job => <JobListItem key={job.id} job={job} mode={viewMode} />)
                    )}
                </div>
            </div>
        )
    };

    return (
        <Tabs defaultValue="jobs" className="w-full">
            <div className="flex justify-center mb-8">
                <TabsList className="bg-zinc-100 dark:bg-zinc-900 p-1.5 rounded-full border border-zinc-200 dark:border-zinc-800 h-auto">
                    <TabsTrigger value="jobs" className="rounded-full px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all font-medium text-sm">Vagas de Emprego</TabsTrigger>
                    <TabsTrigger value="freela" className="rounded-full px-6 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm transition-all font-medium text-sm">Freelas & Projetos</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="jobs" className="mt-0 focus-visible:ring-0">{renderContent('JOB')}</TabsContent>
            <TabsContent value="freela" className="mt-0 focus-visible:ring-0">{renderContent('FREELANCE')}</TabsContent>
        </Tabs>
    );
}