"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogBody } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Briefcase, ExternalLink, DollarSign, Calendar, Pencil, CalendarClock, MapPin, Sparkles, Link2, Folder, Flag, Mail, AlertTriangle, ChevronDown, Target, PanelRightOpen, FileText } from "lucide-react";
import { deleteJob, updateJobStatus } from "@/app/(dashboard)/projects/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { STATUS_MAP, STATUS_ORDER, getThemeClasses } from "./job-tracker-status";
import { JobForm } from "./job-form";
import { DeleteDialog } from "./job-delete-dialog";
import { JobWithProject } from "./job-types";

// Prioridade visível (campo já existia no banco, mas não aparecia na UI).
const PRIORITY_META: Record<string, { label: string; cls: string }> = {
    HIGH: { label: "Alta", cls: "text-rose-600 bg-rose-500/10" },
    MEDIUM: { label: "Média", cls: "text-amber-600 bg-amber-500/10" },
    LOW: { label: "Baixa", cls: "text-muted-foreground bg-muted" },
};

// Candidatura "parada": dias sem movimento (updatedAt), só em processos abertos.
function getStale(updatedAt: Date, status: string): number | null {
    if (status === "ACTIVE" || status === "REJECTED") return null;
    const days = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
    return days >= 14 ? days : null;
}

// Calcula urgência do follow-up em dias (a partir de hoje).
function getFollowUp(date: Date | null): { label: string; cls: string } | null {
    if (!date) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(date); target.setHours(0, 0, 0, 0);
    const days = Math.round((target.getTime() - today.getTime()) / 86400000);

    if (days < 0) return { label: `Follow-up atrasado (${Math.abs(days)}d)`, cls: "text-rose-600 bg-rose-500/10" };
    if (days === 0) return { label: "Follow-up hoje", cls: "text-amber-600 bg-amber-500/10" };
    if (days <= 3) return { label: `Follow-up em ${days}d`, cls: "text-amber-600 bg-amber-500/10" };
    return { label: `Follow-up em ${days}d`, cls: "text-blue-600 bg-blue-500/10" };
}

function getLogoUrl(url: string | null): string | null {
    if (!url) return null;
    try {
        const domain = new URL(url).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch { return null; }
}

interface JobItemProps {
    job: JobWithProject;
    mode: 'list' | 'grid';
    onAiClick?: (job: JobWithProject) => void;
    onLinkClick?: (job: JobWithProject) => void;
    /** Abre o modal "qual currículo você enviou?" ao mover para APPLIED. */
    onApplyClick?: (job: JobWithProject) => void;
    /** Abre o detalhamento da vaga (com a aba Currículo Enviado). */
    onDetailsClick?: (job: JobWithProject) => void;
}

export function JobListItem({ job, mode, onAiClick, onLinkClick, onApplyClick, onDetailsClick }: JobItemProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const statusInfo = STATUS_MAP[job.status] || STATUS_MAP.APPLIED;
    const StatusIcon = statusInfo.icon;
    const followUp = getFollowUp(job.followUpDate);
    const logo = getLogoUrl(job.jobUrl);
    const accent = getThemeClasses(statusInfo.theme).split(" ")[0]; // text-color
    const router = useRouter();
    const priority = job.priority ? PRIORITY_META[job.priority] : null;
    const stale = getStale(job.updatedAt, job.status);

    const handleDeleteConfirmed = async (): Promise<void> => {
        await deleteJob(job.id);
        toast.success("Vaga removida com sucesso.");
    };

    const changeStatus = async (status: string) => {
        if (status === job.status) return;
        // "Candidatei-me" (APPLIED) abre o modal de escolha do currículo enviado
        // (congela o snapshot). Sem o handler, cai no fluxo direto (compat).
        if (status === "APPLIED" && onApplyClick) {
            onApplyClick(job);
            return;
        }
        const res = await updateJobStatus(job.id, status);
        if (res.success) {
            toast.success(`Movido para "${STATUS_MAP[status]?.label ?? status}".`);
            router.refresh();
        } else {
            toast.error("Não foi possível mudar o estágio.");
        }
    };

    // Badge de status agora é um dropdown — muda o estágio em 1 clique (card e Kanban).
    const statusDropdownNode = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    onClick={(e) => e.stopPropagation()}
                    className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-opacity hover:opacity-80", getThemeClasses(statusInfo.theme))}
                    title="Mudar estágio"
                >
                    <StatusIcon className="h-3 w-3" /> {statusInfo.label} <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                {STATUS_ORDER.map((s) => {
                    const info = STATUS_MAP[s];
                    const Icon = info.icon;
                    return (
                        <DropdownMenuItem key={s} onClick={() => changeStatus(s)} className={cn("gap-2 text-xs cursor-pointer", s === job.status && "font-bold")}>
                            <Icon className="h-3.5 w-3.5" /> {info.label}
                            {s === job.status && <span className="ml-auto text-[10px] text-primary">atual</span>}
                        </DropdownMenuItem>
                    );
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    // Chips de prioridade / match (IA) / "parado" — reaproveitados nos dois modos.
    const metaChips = (
        <>
            {priority && (
                <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md", priority.cls)}><Flag className="h-3 w-3" /> {priority.label}</span>
            )}
            {job.matchScore != null && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md text-violet-600 bg-violet-500/10"><Target className="h-3 w-3" /> Match {job.matchScore}%</span>
            )}
            {stale != null && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md text-amber-600 bg-amber-500/10" title={`Sem movimento há ${stale} dias`}><AlertTriangle className="h-3 w-3" /> {stale}d parado</span>
            )}
            {job.snapshotMeta && (
                <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDetailsClick?.(job); }}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md text-primary bg-primary/10 hover:bg-primary/20 transition-colors max-w-[180px]"
                    title={`Currículo enviado: ${job.snapshotMeta.resumeName}`}
                >
                    <FileText className="h-3 w-3 shrink-0" /> <span className="truncate">{job.snapshotMeta.resumeName}</span>
                </button>
            )}
        </>
    );

    // Estes são JSX/closures memorizados por render — NÃO componentes aninhados.
    // Montar <Logo/>, <EditDialog/> etc. recriaria o tipo a cada render e remontaria
    // a subárvore; no EditDialog isso zerava o formulário enquanto o usuário digitava.
    const logoNode = (
        logo
            ? <img src={logo} alt={job.company} className="w-full h-full object-contain" />
            : <Briefcase className="w-5 h-5 text-muted-foreground/40" />
    );

    const projectLinkNode = job.project ? (
        <Link
            href={`/projects/${job.project.slug}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md hover:bg-primary/20 transition-colors max-w-[160px] truncate"
            title={`Abrir projeto: ${job.project.title}`}
        >
            <Folder className="h-3 w-3 shrink-0" /> <span className="truncate">{job.project.title}</span>
        </Link>
    ) : null;

    // Botões de ação compartilhados (ghost icons).
    const renderActions = (revealOnHover = true) => (
        <div className={cn("flex items-center gap-1", revealOnHover && "opacity-0 group-hover:opacity-100 transition-opacity")}>
            {onDetailsClick && (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); onDetailsClick(job); }} title="Detalhes da vaga">
                    <PanelRightOpen className="h-4 w-4" />
                </Button>
            )}
            {onAiClick && (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-violet-600 hover:bg-violet-500/10" onClick={(e) => { e.stopPropagation(); onAiClick(job); }} title="Assistente de IA">
                    <Sparkles className="h-4 w-4" />
                </Button>
            )}
            {onLinkClick && !job.project && (
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); onLinkClick(job); }} title="Conectar a um projeto">
                    <Link2 className="h-4 w-4" />
                </Button>
            )}
            {job.contactEmail && (
                <Button variant="ghost" size="icon" aria-label="Enviar e-mail" asChild className="h-8 w-8 rounded-lg text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10">
                    <a
                        href={`mailto:${job.contactEmail}?subject=${encodeURIComponent(`Candidatura: ${job.role} — ${job.company}`)}`}
                        onClick={(e) => e.stopPropagation()}
                        title={`E-mail para ${job.contactName || job.contactEmail}`}
                    >
                        <Mail className="h-4 w-4" />
                    </a>
                </Button>
            )}
            {job.jobUrl && (
                <Button variant="ghost" size="icon" aria-label="Abrir vaga" asChild className="h-8 w-8 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-500/10">
                    <a href={job.jobUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink className="h-4 w-4" /></a>
                </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); setIsEditOpen(true); }} title="Editar">
                <Pencil className="h-4 w-4" />
            </Button>
            <DeleteDialog onConfirm={handleDeleteConfirmed} />
        </div>
    );

    const editDialogNode = (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent size="lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <Pencil className="h-5 w-5 text-primary" /> Editar registro
                    </DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <JobForm defaultValues={job} type={job.type || 'JOB'} mode="edit" events={job.events} onSubmit={() => setIsEditOpen(false)} />
                </DialogBody>
            </DialogContent>
        </Dialog>
    );

    // ============ GRID MODE ============
    if (mode === 'grid') {
        return (
            <Card className="group relative flex flex-col justify-between rounded-2xl border border-border/40 bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-primary/30 h-full">
                <CardContent className="p-0 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="h-11 w-11 rounded-xl bg-background border border-border/40 flex items-center justify-center shadow-sm overflow-hidden p-2 shrink-0">
                            {logoNode}
                        </div>
                        {statusDropdownNode}
                    </div>

                    <div className="space-y-1 min-w-0">
                        <h4 className="font-bold text-base text-foreground tracking-tight truncate group-hover:text-primary transition-colors">{job.company}</h4>
                        <p className="text-sm text-muted-foreground truncate">{job.role}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                        {job.salary && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md"><DollarSign className="h-3 w-3" /> {job.salary}</span>
                        )}
                        {followUp && (
                            <span className={cn("inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md", followUp.cls)}><CalendarClock className="h-3 w-3" /> {followUp.label}</span>
                        )}
                        {projectLinkNode}
                        {metaChips}
                    </div>

                    <div className="space-y-2 pt-1">
                        <div className="flex justify-between items-center">
                            <span className="text-[11px] font-medium text-muted-foreground">Pipeline</span>
                            <span className="text-xs font-bold text-foreground">{statusInfo.progress}%</span>
                        </div>
                        <Progress value={statusInfo.progress} className="h-1.5 bg-muted rounded-full" />
                    </div>
                </CardContent>

                <div className="mt-4 pt-3 flex items-center justify-end border-t border-border/40">
                    {renderActions(false)}
                </div>

                {editDialogNode}
            </Card>
        );
    }

    // ============ LIST MODE ============
    return (
        <div className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-card border border-border/40 rounded-2xl hover:shadow-md hover:border-primary/30 transition-all">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="h-11 w-11 rounded-xl bg-background flex items-center justify-center border border-border/40 shrink-0 shadow-sm overflow-hidden p-2">
                    {logoNode}
                </div>
                <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-base text-foreground tracking-tight truncate group-hover:text-primary transition-colors">{job.company}</h4>
                        {statusDropdownNode}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-medium truncate max-w-[220px]">{job.role}</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(job.appliedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                        {job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span>}
                        {job.salary && <span className="flex items-center gap-1 font-semibold text-emerald-600"><DollarSign className="h-3 w-3" />{job.salary}</span>}
                        {followUp && <span className={cn("inline-flex items-center gap-1 font-semibold px-1.5 py-0.5 rounded-md", followUp.cls)}><CalendarClock className="h-3 w-3" />{followUp.label}</span>}
                        {projectLinkNode}
                        {metaChips}
                    </div>
                </div>
            </div>

            <div className="hidden md:flex flex-col gap-1.5 w-40 shrink-0">
                <div className="flex justify-between items-center">
                    <span className={cn("text-[11px] font-medium", accent)}>{statusInfo.progress}%</span>
                </div>
                <Progress value={statusInfo.progress} className="h-1.5 bg-muted rounded-full" />
            </div>

            <div className="flex items-center justify-end border-t sm:border-0 pt-3 sm:pt-0">
                {renderActions()}
            </div>

            {editDialogNode}
        </div>
    );
}
