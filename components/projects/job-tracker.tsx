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
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"; // Adicionando ScrollBar
import { Briefcase, ExternalLink, DollarSign, Plus, Trash2, Calendar, Pencil, FileText } from "lucide-react";
import { createJob, deleteJob, updateJob } from "@/app/(dashboard)/projects/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


// 1. Cores dos Status
const statusConfig: Record<string, { label: string, color: string, columnBg: string }> = {
  APPLIED: { label: "Inscrito", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", columnBg: "bg-blue-50/50 dark:bg-zinc-900/20" },
  SCREENING: { label: "Triagem", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", columnBg: "bg-purple-50/50 dark:bg-zinc-900/20" },
  INTERVIEW: { label: "Entrevista", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", columnBg: "bg-yellow-50/50 dark:bg-zinc-900/20" },
  TEST: { label: "Teste Téc.", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400", columnBg: "bg-orange-50/50 dark:bg-zinc-900/20" },
  OFFER: { label: "Proposta 🎉", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", columnBg: "bg-green-50/50 dark:bg-zinc-900/20" },
  REJECTED: { label: "Recusado", color: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400", columnBg: "bg-zinc-100/50 dark:bg-zinc-900/10" },
};

const KANBAN_COLUMNS = ['APPLIED', 'SCREENING', 'INTERVIEW', 'TEST', 'OFFER', 'REJECTED'];

// --- SUB-COMPONENTE: CARD DA VAGA (Mantido JobCard) ---
// (JobCard component code... mantido, assumindo que JobCard é funcional)
function JobCard({ job }: { job: JobApplication }) {
    // ... (código do JobCard, como na última versão)
    const [isEditOpen, setIsEditOpen] = useState(false);
    
    const handleDeleteConfirmed = async () => {
        await deleteJob(job.id);
        toast.success("Vaga removida.");
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

    return (
        <Card className="group hover:border-indigo-500/50 transition-all flex flex-col h-auto mb-3">
            <CardHeader className="flex flex-row items-start justify-between pb-2 space-y-0">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden border p-1">
                        {logo ? (
                            <img src={logo} alt={job.company} className="w-full h-full object-contain" />
                        ) : (
                            <Briefcase className="h-4 w-4 text-zinc-400" />
                        )}
                    </div>
                    <div>
                        <CardTitle className="text-sm font-bold truncate max-w-[150px]">{job.company}</CardTitle>
                        <p className="text-xs text-zinc-500 font-medium">{job.role}</p>
                    </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide ${statusInfo.color}`}>
                    {statusInfo.label}
                </span>
            </CardHeader>
            
            <CardContent className="space-y-2">
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(job.appliedDate).toLocaleDateString()}
                    </div>
                    {job.salary && (
                        <div className="flex items-center gap-1 text-green-700 dark:text-green-400">
                            <DollarSign className="h-3 w-3" />
                            {job.salary}
                        </div>
                    )}
                </div>

                {job.requirements && (
                    <div className="text-xs text-zinc-500 line-clamp-2 italic pt-1">
                        {job.requirements}
                    </div>
                )}
            </CardContent>

            <CardFooter className="pt-0 gap-2">
                {job.jobUrl && (
                    <a href={job.jobUrl} target="_blank" rel="noreferrer" className="w-full">
                        <Button variant="outline" size="sm" className="w-full text-xs h-7 px-2">
                            <ExternalLink className="mr-2 h-3 w-3" /> Link
                        </Button>
                    </a>
                )}

                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                    <DialogTrigger asChild>
                        <Button variant="secondary" size="sm" className="w-full text-xs h-7 px-2">
                            <Pencil className="mr-1 h-3 w-3" /> Editar
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Editar Candidatura</DialogTitle>
                        </DialogHeader>
                        <form action={async (fd) => {
                            await updateJob(fd);
                            toast.success("Vaga atualizada!");
                            setIsEditOpen(false);
                        }} className="space-y-4">
                            <input type="hidden" name="id" value={job.id} />
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Empresa</Label>
                                    <Input name="company" defaultValue={job.company} required />
                                </div>
                                <div className="space-y-2">
                                    <Label>Cargo</Label>
                                    <Input name="role" defaultValue={job.role} required />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Status do Processo</Label>
                                <Select name="status" defaultValue={job.status}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="APPLIED">Inscrito</SelectItem>
                                        <SelectItem value="SCREENING">Triagem / RH</SelectItem>
                                        <SelectItem value="INTERVIEW">Entrevista Técnica</SelectItem>
                                        <SelectItem value="TEST">Teste Prático</SelectItem>
                                        <SelectItem value="OFFER">Proposta (Offer)</SelectItem>
                                        <SelectItem value="REJECTED">Recusado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Salário</Label>
                                    <Input name="salary" defaultValue={job.salary || ""} placeholder="Ex: 8k" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Link</Label>
                                    <Input name="jobUrl" defaultValue={job.jobUrl || ""} placeholder="https://..." />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Requisitos & Anotações</Label>
                                <Textarea 
                                    name="requirements" 
                                    defaultValue={job.requirements || ""} 
                                    placeholder="Cole aqui a descrição da vaga, requisitos técnicos ou anotações da entrevista..."
                                    className="min-h-[100px] font-sans"
                                />
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
                                            <AlertDialogTitle>Excluir Candidatura?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta ação é irreversível. Você tem certeza que deseja remover o processo de **{job.company}**?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction 
                                                onClick={handleDeleteConfirmed} 
                                                className="bg-red-600 hover:bg-red-700"
                                            >
                                                Sim, Deletar
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                                
                                <Button type="submit" className="w-2/3 bg-indigo-600 hover:bg-indigo-700">Salvar Alterações</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
    );
}

// --- COMPONENTE PRINCIPAL: JOB TRACKER KANBAN VIEW ---

export function JobTracker({ jobs }: { jobs: JobApplication[] }) {

    // Função para agrupar as vagas por status
    const groupedJobs = jobs.reduce((acc, job) => {
        const status = job.status || 'APPLIED';
        if (!acc[status]) {
            acc[status] = [];
        }
        acc[status].push(job);
        return acc;
    }, {} as Record<string, JobApplication[]>);


    // Renderiza o Board (Kanban)
    return (
        // O ScrollArea principal agora envolve toda a área do Kanban (horizontal)
        <ScrollArea className="w-full h-full pb-4">
            <div className="flex h-full min-w-max pr-4"> {/* Flex horizontal para o Kanban */}
                
                {KANBAN_COLUMNS.map(statusKey => {
                    const info = statusConfig[statusKey] || statusConfig.APPLIED;
                    const jobsInColumn = groupedJobs[statusKey] || [];
                    
                    return (
                        <div 
                            key={statusKey} 
                            className={cn("flex flex-col rounded-xl p-3 border shadow-md shrink-0 mx-2", info.columnBg)}
                            style={{ width: '320px' }} // Largura fixa para colunas
                        >
                            <h3 className="font-bold text-sm mb-3 uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex justify-between items-center">
                                {info.label}
                                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white dark:bg-zinc-900 border">
                                    {jobsInColumn.length}
                                </span>
                            </h3>
                            
                            {/* Scroll vertical DENTRO da coluna */}
                            <ScrollArea className="flex-1 h-full min-h-[300px] pr-2">
                                <div className="space-y-3">
                                    {jobsInColumn.map(job => (
                                        <JobCard key={job.id} job={job} />
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    );
                })}
            </div>
            <ScrollBar orientation="horizontal" /> {/* Adiciona barra de rolagem horizontal */}
        </ScrollArea>
    );
}