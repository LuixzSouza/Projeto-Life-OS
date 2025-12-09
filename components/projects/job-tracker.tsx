"use client";

import { useState } from "react";
import { JobApplication } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, ExternalLink, DollarSign, Plus, Trash2, Calendar, Pencil, FileText, Zap, Laptop } from "lucide-react";
import { createJob, deleteJob, updateJob } from "@/app/(dashboard)/projects/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Cores dos Status
const statusConfig: Record<string, { label: string, color: string, columnBg: string, borderColor: string }> = {
  APPLIED: { label: "Início / Inscrito", color: "text-blue-600 bg-blue-100", columnBg: "bg-blue-50/50 dark:bg-blue-900/10", borderColor: "border-blue-200 dark:border-blue-800" },
  SCREENING: { label: "Triagem / Contato", color: "text-purple-600 bg-purple-100", columnBg: "bg-purple-50/50 dark:bg-purple-900/10", borderColor: "border-purple-200 dark:border-purple-800" },
  INTERVIEW: { label: "Entrevista / Negociação", color: "text-yellow-600 bg-yellow-100", columnBg: "bg-yellow-50/50 dark:bg-yellow-900/10", borderColor: "border-yellow-200 dark:border-yellow-800" },
  TEST: { label: "Teste / Fazendo", color: "text-orange-600 bg-orange-100", columnBg: "bg-orange-50/50 dark:bg-orange-900/10", borderColor: "border-orange-200 dark:border-orange-800" },
  OFFER: { label: "Proposta / Entregue", color: "text-emerald-600 bg-emerald-100", columnBg: "bg-emerald-50/50 dark:bg-emerald-900/10", borderColor: "border-emerald-200 dark:border-emerald-800" },
  ACTIVE: { label: "Emprego Atual / Em Andamento", color: "text-cyan-700 bg-cyan-100", columnBg: "bg-cyan-50/50 dark:bg-cyan-900/10", borderColor: "border-cyan-200 dark:border-cyan-800" },
  REJECTED: { label: "Recusado / Cancelado", color: "text-zinc-500 bg-zinc-100", columnBg: "bg-zinc-50/50 dark:bg-zinc-900/10", borderColor: "border-zinc-200 dark:border-zinc-800" },
};

const KANBAN_COLUMNS = ['APPLIED', 'SCREENING', 'INTERVIEW', 'TEST', 'OFFER', 'ACTIVE', 'REJECTED'];

function JobCard({ job }: { job: JobApplication }) {
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
    const statusInfo = statusConfig[job.status] || statusConfig.APPLIED;
    const isFreelance = job.type === 'FREELANCE';

    return (
        <Card className="group hover:border-indigo-500/50 transition-all flex flex-col h-auto mb-3 bg-white dark:bg-zinc-900 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0 p-3">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-8 w-8 rounded-md bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center border shrink-0">
                        {logo ? (
                            <img src={logo} alt={job.company} className="w-5 h-5 object-contain" />
                        ) : (
                            isFreelance ? <Zap className="h-4 w-4 text-amber-500" /> : <Briefcase className="h-4 w-4 text-zinc-400" />
                        )}
                    </div>
                    <div className="min-w-0">
                        <CardTitle className="text-sm font-bold truncate">{job.company}</CardTitle>
                        <p className="text-xs text-zinc-500 truncate">{job.role}</p>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="p-3 pt-0 space-y-2">
                <div className="flex flex-wrap gap-2 text-[10px] text-zinc-500">
                    <span className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                        <Calendar className="h-3 w-3" />
                        {new Date(job.appliedDate).toLocaleDateString()}
                    </span>
                    {job.salary && (
                        <span className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-medium">
                            <DollarSign className="h-3 w-3" />
                            {job.salary}
                        </span>
                    )}
                </div>
            </CardContent>

            <CardFooter className="p-2 gap-2 border-t bg-zinc-50/50 dark:bg-zinc-900/50">
                {job.jobUrl && (
                    <a href={job.jobUrl} target="_blank" rel="noreferrer" className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full text-xs h-7 px-0 text-zinc-500">
                            <ExternalLink className="mr-1 h-3 w-3" /> Abrir
                        </Button>
                    </a>
                )}

                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex-1 text-xs h-7 px-0 text-zinc-500 hover:text-indigo-600">
                            <Pencil className="mr-1 h-3 w-3" /> Editar
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Editar {isFreelance ? 'Serviço' : 'Candidatura'}</DialogTitle>
                        </DialogHeader>
                        <form action={async (fd) => {
                            await updateJob(fd);
                            toast.success("Atualizado!");
                            setIsEditOpen(false);
                        }} className="space-y-4">
                            <input type="hidden" name="id" value={job.id} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Tipo</Label>
                                    <Select name="type" defaultValue={job.type}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="JOB">Vaga de Emprego</SelectItem>
                                            <SelectItem value="FREELANCE">Serviço / Freela</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select name="status" defaultValue={job.status}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="APPLIED">Início / Inscrito</SelectItem>
                                            <SelectItem value="SCREENING">Triagem / Contato</SelectItem>
                                            <SelectItem value="INTERVIEW">Entrevista / Negociação</SelectItem>
                                            <SelectItem value="TEST">Teste / Fazendo</SelectItem>
                                            <SelectItem value="OFFER">Aprovado / Entregue</SelectItem>
                                            <SelectItem value="ACTIVE">⭐ Emprego Atual / Rodando</SelectItem>
                                            <SelectItem value="REJECTED">Recusado / Cancelado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{isFreelance ? 'Cliente' : 'Empresa'}</Label>
                                    <Input name="company" defaultValue={job.company} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>{isFreelance ? 'Serviço' : 'Cargo'}</Label>
                                    <Input name="role" defaultValue={job.role} required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>{isFreelance ? 'Valor' : 'Salário'}</Label>
                                    <Input name="salary" defaultValue={job.salary || ""} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Link</Label>
                                    <Input name="jobUrl" defaultValue={job.jobUrl || ""} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Notas</Label>
                                <Textarea name="requirements" defaultValue={job.requirements || ""} className="min-h-[100px]" />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="destructive" className="w-1/3">
                                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Excluir?</AlertDialogTitle>
                                            <AlertDialogDescription>Esta ação é irreversível.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700">Sim, Deletar</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                
                                <Button type="submit" className="w-2/3 bg-indigo-600 hover:bg-indigo-700">Salvar</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
    );
}

// --- COMPONENTE PRINCIPAL ---

export function JobTracker({ jobs }: { jobs: JobApplication[] }) {

    // MODAL DE CRIAÇÃO (Reutilizável)
    const CreateModal = ({ defaultType }: { defaultType: string }) => (
        <Dialog>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                    <Plus className="h-4 w-4" /> 
                    {defaultType === 'JOB' ? 'Nova Vaga' : 'Novo Serviço'}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Adicionar {defaultType === 'JOB' ? 'Vaga' : 'Serviço'}</DialogTitle>
                </DialogHeader>
                <form action={async (fd) => { await createJob(fd); toast.success("Registrado!"); }} className="space-y-4">
                    <input type="hidden" name="type" value={defaultType} />
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{defaultType === 'JOB' ? 'Empresa' : 'Cliente'}</Label>
                            <Input name="company" placeholder="Ex: Google" required />
                        </div>
                        <div className="space-y-2">
                            <Label>{defaultType === 'JOB' ? 'Cargo' : 'Serviço'}</Label>
                            <Input name="role" placeholder={defaultType === 'JOB' ? 'Frontend Dev' : 'Landing Page'} required />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{defaultType === 'JOB' ? 'Salário' : 'Orçamento'}</Label>
                            <Input name="salary" placeholder="$$$" />
                        </div>
                        <div className="space-y-2">
                            <Label>Link</Label>
                            <Input name="jobUrl" placeholder="https://..." />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Status Inicial</Label>
                        <Select name="status" defaultValue="APPLIED">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="APPLIED">Início / Inscrito</SelectItem>
                                <SelectItem value="INTERVIEW">Em Conversa</SelectItem>
                                {/* NOVO ITEM (Caso já queira cadastrar como atual) */}
                                <SelectItem value="ACTIVE">Já estou trabalhando aqui</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Notas</Label>
                        <Textarea name="requirements" placeholder="Detalhes..." />
                    </div>

                    <Button type="submit" className="w-full">Salvar</Button>
                </form>
            </DialogContent>
        </Dialog>
    );

    // Renderiza as colunas do Grid
    const renderBoard = (type: string) => {
        const filteredJobs = jobs.filter(j => (j.type || 'JOB') === type);
        
        // Agrupar
        const grouped = filteredJobs.reduce((acc, job) => {
            const status = job.status || 'APPLIED';
            if (!acc[status]) acc[status] = [];
            acc[status].push(job);
            return acc;
        }, {} as Record<string, JobApplication[]>);

        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-zinc-700 dark:text-zinc-200">
                        {type === 'JOB' ? 'Processos Seletivos' : 'Meus Freelas & Serviços'}
                    </h3>
                    <CreateModal defaultType={type} />
                </div>

                {/* GRID RESPONSIVO (SUBSTITUI O SCROLL HORIZONTAL) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
                    {KANBAN_COLUMNS.map(statusKey => {
                        const info = statusConfig[statusKey] || statusConfig.APPLIED;
                        const jobsInColumn = grouped[statusKey] || [];
                        
                        // Só mostra a coluna se tiver itens (opcional, para limpar a tela)
                        // OU mostra sempre para manter a estrutura. Vamos mostrar sempre mas com visual clean.
                        
                        return (
                            <div 
                                key={statusKey} 
                                className={cn(
                                    "flex flex-col rounded-xl border-2 border-transparent transition-all",
                                    info.columnBg,
                                    jobsInColumn.length > 0 ? info.borderColor : "opacity-70 border-dashed"
                                )}
                            >
                                <div className="p-3 flex justify-between items-center">
                                    <h4 className={`font-bold text-xs uppercase tracking-wider ${info.color.split(' ')[0]}`}>
                                        {info.label}
                                    </h4>
                                    <span className="text-[10px] font-mono bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full">
                                        {jobsInColumn.length}
                                    </span>
                                </div>

                                <div className="p-3 pt-0 flex-1 flex flex-col gap-3 min-h-[100px]">
                                    {jobsInColumn.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-zinc-400 text-xs italic">
                                            Vazio
                                        </div>
                                    ) : (
                                        jobsInColumn.map(job => <JobCard key={job.id} job={job} />)
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <Tabs defaultValue="jobs" className="w-full h-full flex flex-col">
            <div className="flex justify-center mb-6">
                <TabsList className="grid w-full max-w-[400px] grid-cols-2">
                    <TabsTrigger value="jobs" className="gap-2">
                        <Briefcase className="h-4 w-4" /> Vagas de Emprego
                    </TabsTrigger>
                    <TabsTrigger value="services" className="gap-2">
                        <Laptop className="h-4 w-4" /> Meus Serviços
                    </TabsTrigger>
                </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 pb-10">
                <TabsContent value="jobs" className="mt-0 outline-none">
                    {renderBoard('JOB')}
                </TabsContent>
                <TabsContent value="services" className="mt-0 outline-none">
                    {renderBoard('FREELANCE')}
                </TabsContent>
            </div>
        </Tabs>
    );
}