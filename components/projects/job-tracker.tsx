"use client";

import { useState, useMemo } from "react";
import { PortfolioData } from "@/types/portfolio";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Briefcase, Plus, LayoutGrid, List, FileText, Trophy, Rocket, Target, Columns3, Search } from "lucide-react";
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

const BOARD_COLUMNS = ["APPLIED", "SCREENING", "TEST", "INTERVIEW", "OFFER", "ACTIVE", "REJECTED"] as const;

interface JobTrackerProps {
    jobs: JobWithProject[];
    portfolio: PortfolioData;
    projects: ProjectOption[];
}

export function JobTracker({ jobs, portfolio, projects }: JobTrackerProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [search, setSearch] = useState("");
    const [aiJob, setAiJob] = useState<JobWithProject | null>(null);
    const [projectJob, setProjectJob] = useState<JobWithProject | null>(null);

    const renderContent = (type: string) => {
        const typed = jobs.filter(j => (j.type || 'JOB') === type);
        const query = search.trim().toLowerCase();
        const filtered = query
            ? typed.filter(j =>
                j.company.toLowerCase().includes(query) ||
                j.role.toLowerCase().includes(query) ||
                (j.location || "").toLowerCase().includes(query))
            : typed;

        const activeCount = typed.filter(j => j.status !== 'REJECTED' && j.status !== 'ACTIVE').length;
        const interviewCount = typed.filter(j => j.status === 'INTERVIEW').length;
        const offerCount = typed.filter(j => j.status === 'OFFER' || j.status === 'ACTIVE').length;

        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StatsCard label="Em andamento" value={activeCount} icon={Rocket} theme="blue" hint="processos abertos" />
                    <StatsCard label="Entrevistas" value={interviewCount} icon={Target} theme="yellow" hint="fase de entrevista" />
                    <StatsCard label="Conquistas" value={offerCount} icon={Trophy} theme="emerald" hint="propostas e contratos" />
                </div>

                {/* Toolbar */}
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
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

                        <div className="relative w-full lg:max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar empresa, cargo ou local..."
                                className="pl-9 h-10 rounded-xl bg-muted/40 border-border/40 focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-primary/20"
                            />
                        </div>
                    </div>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button className="gap-2 h-10 rounded-xl font-bold shadow-sm shrink-0">
                                <Plus className="h-4 w-4" /> Adicionar {type === 'JOB' ? 'vaga' : 'freela'}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden rounded-[2rem] shadow-2xl gap-0">
                            <DialogHeader className="p-6 pb-5 border-b border-border/40 bg-muted/10 text-left">
                                <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                                    <Briefcase className="h-5 w-5 text-primary" /> Novo registro
                                </DialogTitle>
                            </DialogHeader>
                            <div className="p-6 overflow-y-auto max-h-[70vh]">
                                <JobForm type={type} />
                            </div>
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
