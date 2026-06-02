"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FolderPlus, Link2, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { createProjectFromJob, linkJobToProject } from "@/app/(dashboard)/projects/actions";
import { JobWithProject, ProjectOption } from "./job-types";

export function JobProjectDialog({ job, projects, onOpenChange }: { job: JobWithProject | null; projects: ProjectOption[]; onOpenChange: (open: boolean) => void }) {
    const router = useRouter();
    const [loading, setLoading] = useState<"create" | "link" | null>(null);
    const [selected, setSelected] = useState<string>("");

    const handleCreate = async () => {
        if (!job) return;
        setLoading("create");
        const res = await createProjectFromJob(job.id);
        setLoading(null);
        if (res.success && res.slug) {
            toast.success("Projeto criado e vinculado!");
            onOpenChange(false);
            router.push(`/projects/${res.slug}`);
        } else {
            toast.error(res.error || "Falha ao criar projeto.");
        }
    };

    const handleLink = async () => {
        if (!job || !selected) return;
        setLoading("link");
        const res = await linkJobToProject(job.id, selected);
        setLoading(null);
        if (res.success) {
            toast.success("Vaga vinculada ao projeto!");
            onOpenChange(false);
        } else {
            toast.error(res.error || "Falha ao vincular.");
        }
    };

    return (
        <Dialog open={!!job} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-[2rem] shadow-2xl gap-0">
                <DialogHeader className="p-6 pb-5 border-b border-border/40 bg-muted/10 text-left">
                    <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-primary" /> Conectar a um projeto
                    </DialogTitle>
                    {job && (
                        <DialogDescription className="pt-1">
                            {job.role} · {job.company}
                        </DialogDescription>
                    )}
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Criar novo projeto */}
                    <div className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Novo projeto</p>
                        <Button onClick={handleCreate} disabled={loading !== null} className="w-full h-11 gap-2 rounded-xl font-bold justify-between">
                            <span className="flex items-center gap-2">
                                {loading === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FolderPlus className="h-4 w-4" />}
                                Criar projeto a partir desta vaga
                            </span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Vincular a existente */}
                    {projects.length > 0 && (
                        <>
                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-border/60" />
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">ou vincule a um existente</span>
                                <div className="h-px flex-1 bg-border/60" />
                            </div>
                            <div className="space-y-2">
                                <Select value={selected} onValueChange={setSelected}>
                                    <SelectTrigger className="h-11 rounded-xl bg-muted/40 border-border/40">
                                        <SelectValue placeholder="Selecione um projeto..." />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleLink} disabled={!selected || loading !== null} variant="outline" className="w-full h-11 gap-2 rounded-xl font-bold border-border/60">
                                    {loading === "link" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                                    Vincular ao projeto selecionado
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
