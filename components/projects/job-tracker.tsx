"use client";

import { useState, useMemo } from "react";
import { PortfolioData } from "@/types/portfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogBody } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, Plus, LayoutGrid, List, FileText, Trophy, Rocket, Target, Columns3, Search, CalendarClock, ArrowUpDown } from "lucide-react";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ResumeBuilder } from "./resume/resume-builder";
import { JobListItem } from "./job-list-item";
import { JobForm } from "./job-form";
import { StatsCard } from "./job-stats-card";
import { JobAiDialog } from "./job-ai-dialog";
import { JobProjectDialog } from "./job-project-dialog";
import { STATUS_MAP, getThemeClasses } from "./job-tracker-status";
import { JobWithProject, ProjectOption } from "./job-types";

type ViewMode = 'list' | 'grid' | 'board';
type SortMode = 'recent' | 'followup' | 'priority' | 'progress';

const PRIORITY_RANK: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };

// Estágio mais avançado já alcançado (usa a timeline; cai no status atual se não houver).
// REJECTED tem progresso 0, então os eventos preservam o quão longe a candidatura foi.
function maxProgress(j: JobWithProject): number {
    const fromEvents = (j.events ?? []).map(e => STATUS_MAP[e.status]?.progress ?? 0);
    return Math.max(STATUS_MAP[j.status]?.progress ?? 0, ...fromEvents, 0);
}

// Precisa de follow-up: tem data <= hoje e o processo ainda está aberto.
function needsFollowUp(j: JobWithProject): boolean {
    if (!j.followUpDate || j.status === 'REJECTED' || j.status === 'ACTIVE') return false;
    const today = new Date(); today.setHours(23, 59, 59, 999);
    return new Date(j.followUpDate) <= today;
}

const BOARD_COLUMNS = ["APPLIED", "SCREENING", "TEST", "INTERVIEW", "OFFER", "ACTIVE", "REJECTED"] as const;

interface JobTrackerProps {
    jobs: JobWithProject[];
    portfolio: PortfolioData;
    projects: ProjectOption[];
}

export function JobTracker({ jobs, portfolio, projects }: JobTrackerProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState<SortMode>('recent');
    const [onlyFollowUp, setOnlyFollowUp] = useState(false);
    const [aiJob, setAiJob] = useState<JobWithProject | null>(null);
    const [projectJob, setProjectJob] = useState<JobWithProject | null>(null);

    const renderContent = (type: string) => {
        const typed = jobs.filter(j => (j.type || 'JOB') === type);
        const query = search.trim().toLowerCase();
        let filtered = query
            ? typed.filter(j =>
                j.company.toLowerCase().includes(query) ||
                j.role.toLowerCase().includes(query) ||
                (j.location || "").toLowerCase().includes(query))
            : typed;

        // Filtro "só follow-up pendente" (item 4)
        if (onlyFollowUp) filtered = filtered.filter(needsFollowUp);

        // Ordenação (item 3)
        filtered = [...filtered].sort((a, b) => {
            switch (sortBy) {
                case 'followup': {
                    const av = a.followUpDate ? new Date(a.followUpDate).getTime() : Infinity;
                    const bv = b.followUpDate ? new Date(b.followUpDate).getTime() : Infinity;
                    return av - bv;
                }
                case 'priority':
                    return (PRIORITY_RANK[a.priority ?? 'MEDIUM'] ?? 1) - (PRIORITY_RANK[b.priority ?? 'MEDIUM'] ?? 1);
                case 'progress':
                    return (STATUS_MAP[b.status]?.progress ?? 0) - (STATUS_MAP[a.status]?.progress ?? 0);
                default:
                    return new Date(b.appliedDate).getTime() - new Date(a.appliedDate).getTime();
            }
        });

        const activeCount = typed.filter(j => j.status !== 'REJECTED' && j.status !== 'ACTIVE').length;
        const interviewCount = typed.filter(j => j.status === 'INTERVIEW').length;
        const offerCount = typed.filter(j => j.status === 'OFFER' || j.status === 'ACTIVE').length;
        const followUpCount = typed.filter(needsFollowUp).length;

        // Funil de conversão (item 6) — usa a timeline (maxProgress) p/ ser fiel.
        const applied = typed.length;
        const responded = typed.filter(j => maxProgress(j) >= 30).length;
        const interviewed = typed.filter(j => maxProgress(j) >= 75).length;
        const offered = typed.filter(j => maxProgress(j) >= 90).length;
        const rate = (n: number) => (applied > 0 ? Math.round((n / applied) * 100) : 0);

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                {/* KPIs */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatsCard label="Em andamento" value={activeCount} icon={Rocket} theme="blue" hint="processos abertos" />
                    <StatsCard label="Entrevistas" value={interviewCount} icon={Target} theme="yellow" hint="fase de entrevista" />
                    <StatsCard label="Conquistas" value={offerCount} icon={Trophy} theme="emerald" hint="propostas e contratos" />
                    <button type="button" onClick={() => setOnlyFollowUp(v => !v)} className="text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30">
                        <div className={cn("h-full", onlyFollowUp && "ring-2 ring-primary/40 rounded-xl")}>
                            <StatsCard label="Follow-ups" value={followUpCount} icon={CalendarClock} theme="yellow" hint={onlyFollowUp ? "filtrando ✓" : "tocar p/ filtrar"} />
                        </div>
                    </button>
                </div>

                {/* Funil de conversão */}
                {applied > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-2xl border border-border/40 bg-muted/10 p-4">
                        <FunnelStep label="Candidaturas" value={applied} pct={100} tone="text-blue-600" />
                        <FunnelStep label="Responderam" value={responded} pct={rate(responded)} tone="text-purple-600" />
                        <FunnelStep label="Entrevistas" value={interviewed} pct={rate(interviewed)} tone="text-amber-600" />
                        <FunnelStep label="Propostas" value={offered} pct={rate(offered)} tone="text-emerald-600" />
                    </div>
                )}

                {/* Toolbar */}
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
                    {/* flex-wrap: no mobile a busca desce para a própria linha em vez
                        de espremer pílula + busca + select nos 375px. */}
                    <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                        <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 shrink-0">
                            <button onClick={() => setViewMode('list')} title="Lista" className={cn("h-8 w-8 flex items-center justify-center rounded-lg transition-all", viewMode === 'list' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                                <List className="h-4 w-4" />
                            </button>
                            <button onClick={() => setViewMode('grid')} title="Grade" className={cn("h-8 w-8 flex items-center justify-center rounded-lg transition-all", viewMode === 'grid' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                                <LayoutGrid className="h-4 w-4" />
                            </button>
                            <button onClick={() => setViewMode('board')} title="Kanban" className={cn("h-8 w-8 flex items-center justify-center rounded-lg transition-all", viewMode === 'board' ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}>
                                <Columns3 className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="relative order-last w-full sm:order-none sm:w-auto sm:flex-1 lg:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar empresa, cargo ou local..."
                                className="pl-9 h-10 rounded-xl bg-muted/40 border-border/40 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                        </div>

                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortMode)}>
                            <SelectTrigger className="h-10 min-w-0 flex-1 rounded-xl bg-muted/40 border-border/40 gap-1.5 text-xs sm:flex-none sm:w-[160px]">
                                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="recent">Mais recentes</SelectItem>
                                <SelectItem value="followup">Follow-up próximo</SelectItem>
                                <SelectItem value="priority">Prioridade</SelectItem>
                                <SelectItem value="progress">Progresso</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="gap-2 h-10 w-full rounded-xl font-bold shadow-sm shrink-0 lg:w-auto">
                                <Plus className="h-4 w-4" /> Adicionar {type === 'JOB' ? 'vaga' : 'freela'}
                            </Button>
                        </DialogTrigger>
                        <DialogContent size="lg">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-primary" /> Novo registro
                                </DialogTitle>
                            </DialogHeader>
                            <DialogBody>
                                <JobForm type={type} />
                            </DialogBody>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Content */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/10 text-center">
                        <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                            <Briefcase className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                        <h3 className="text-lg font-bold text-foreground">{query ? "Nada encontrado" : "Pipeline vazio"}</h3>
                        <p className="text-sm text-muted-foreground max-w-xs mt-1">
                            {query ? "Ajuste a busca para encontrar suas oportunidades." : "Comece a rastrear suas oportunidades para acelerar sua carreira."}
                        </p>
                    </div>
                ) : viewMode === 'board' ? (
                    <KanbanBoard jobs={filtered} onAiClick={setAiJob} onLinkClick={setProjectJob} />
                ) : (
                    <div className={cn(viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch" : "space-y-3")}>
                        {filtered.map(job => <JobListItem key={job.id} job={job} mode={viewMode} onAiClick={setAiJob} onLinkClick={setProjectJob} />)}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <Tabs defaultValue="jobs" className="w-full">
                <div className="flex justify-center mb-8 print:hidden">
                    <TabsList className="bg-muted/40 p-1 rounded-xl border border-border/40 h-11 w-full max-w-[560px]">
                        <TabsTrigger value="jobs" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all flex-1 h-full">
                            Vagas CLT/PJ
                        </TabsTrigger>
                        <TabsTrigger value="freela" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all flex-1 h-full">
                            Freelas & Projetos
                        </TabsTrigger>
                        <TabsTrigger value="resume" className="rounded-lg text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all gap-1.5 flex-1 h-full">
                            <FileText className="h-3.5 w-3.5" /> Currículo
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="jobs" className="mt-0 focus-visible:ring-0 outline-none">{renderContent('JOB')}</TabsContent>
                <TabsContent value="freela" className="mt-0 focus-visible:ring-0 outline-none">{renderContent('FREELANCE')}</TabsContent>
                <TabsContent value="resume" className="mt-0 focus-visible:ring-0 outline-none">
                    <div className="bg-white dark:bg-zinc-950 border border-border/40 rounded-[2rem] shadow-sm overflow-hidden p-2">
                        <ResumeBuilder initialData={portfolio} />
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modais globais (fora do .map) */}
            <JobAiDialog job={aiJob} onOpenChange={(open) => { if (!open) setAiJob(null); }} />
            <JobProjectDialog job={projectJob} projects={projects} onOpenChange={(open) => { if (!open) setProjectJob(null); }} />
        </>
    );
}

// --- ETAPA DO FUNIL DE CONVERSÃO ---

function FunnelStep({ label, value, pct, tone }: { label: string; value: number; pct: number; tone: string }) {
    return (
        <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{label}</span>
                <span className={cn("text-[11px] font-bold", tone)}>{pct}%</span>
            </div>
            <p className="text-xl font-black tracking-tight">{value}</p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className={cn("h-full rounded-full", tone.replace("text-", "bg-"))} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}

// --- KANBAN BOARD ---

function KanbanBoard({ jobs, onAiClick, onLinkClick }: { jobs: JobWithProject[]; onAiClick: (job: JobWithProject) => void; onLinkClick: (job: JobWithProject) => void }) {
    const grouped = useMemo(() => {
        const map: Record<string, JobWithProject[]> = {};
        for (const col of BOARD_COLUMNS) map[col] = [];
        for (const job of jobs) {
            const key = map[job.status] ? job.status : "APPLIED";
            map[key].push(job);
        }
        return map;
    }, [jobs]);

    return (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {BOARD_COLUMNS.map(col => {
                const info = STATUS_MAP[col];
                const items = grouped[col];
                const accent = getThemeClasses(info.theme).split(" ")[0];
                return (
                    <div key={col} className="w-[300px] shrink-0 flex flex-col">
                        <div className="flex items-center justify-between mb-3 px-1">
                            <span className={cn("text-xs font-semibold flex items-center gap-1.5", accent)}>
                                <span className={cn("h-2 w-2 rounded-full", accent.replace("text", "bg"))} />
                                {info.label}
                            </span>
                            <span className="text-[11px] font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">{items.length}</span>
                        </div>
                        <div className="flex-1 space-y-3 bg-muted/20 rounded-2xl p-3 min-h-[180px] border border-border/40">
                            {items.length === 0 ? (
                                <p className="text-xs font-medium text-muted-foreground/40 text-center py-8">Vazio</p>
                            ) : (
                                items.map(job => <JobListItem key={job.id} job={job} mode="grid" onAiClick={onAiClick} onLinkClick={onLinkClick} />)
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
