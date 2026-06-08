"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { JobApplication } from "@prisma/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, FileText, Target, Loader2, Copy, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { generateCoverLetter, analyzeJobMatch } from "@/app/(dashboard)/jobs/ai-actions";

type Mode = "cover" | "match";

export function JobAiDialog({ job, onOpenChange }: { job: JobApplication | null; onOpenChange: (open: boolean) => void }) {
    const router = useRouter();
    const [loading, setLoading] = useState<Mode | null>(null);
    const [results, setResults] = useState<Record<Mode, string>>({ cover: "", match: "" });

    // Pré-carrega a carta persistida (não regenerar sempre). O match guarda só o score,
    // então a aba de análise começa vazia mas o score aparece no cabeçalho.
    useEffect(() => {
        setResults({ cover: job?.coverLetter ?? "", match: "" });
    }, [job?.id, job?.coverLetter]);

    const run = async (mode: Mode) => {
        if (!job) return;
        setLoading(mode);
        try {
            const res = mode === "cover" ? await generateCoverLetter(job.id) : await analyzeJobMatch(job.id);
            if (res.success) {
                setResults(prev => ({ ...prev, [mode]: res.content }));
                router.refresh(); // reflete coverLetter/matchScore persistidos
            } else {
                toast.error(res.error);
            }
        } catch {
            toast.error("Falha ao consultar a IA.");
        } finally {
            setLoading(null);
        }
    };

    const copy = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("Copiado para a área de transferência!");
    };

    const renderPane = (mode: Mode, generateLabel: string) => {
        const value = results[mode];
        const isLoading = loading === mode;
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                    <Button onClick={() => run(mode)} disabled={isLoading} className="gap-2 rounded-xl font-black uppercase tracking-widest text-[11px] h-11">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : value ? <RefreshCw className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                        {value ? "Gerar novamente" : generateLabel}
                    </Button>
                    {value && (
                        <Button variant="outline" onClick={() => copy(value)} className="gap-2 rounded-xl font-black uppercase tracking-widest text-[10px] h-11 border-border/60">
                            <Copy className="h-3.5 w-3.5" /> Copiar
                        </Button>
                    )}
                </div>

                <div className="min-h-[300px] max-h-[50vh] overflow-y-auto bg-muted/20 border border-border/40 rounded-2xl p-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-[280px] gap-3 text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                            <p className="text-[11px] font-black uppercase tracking-widest">Processando com IA...</p>
                        </div>
                    ) : value ? (
                        <div className={cn(
                            "prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap leading-relaxed",
                            "prose-headings:font-black prose-headings:uppercase prose-headings:tracking-wider prose-strong:font-black"
                        )}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[280px] gap-3 text-center text-muted-foreground/50">
                            <Sparkles className="h-10 w-10" />
                            <p className="text-[11px] font-black uppercase tracking-widest max-w-[260px]">
                                Clique em &quot;{generateLabel}&quot; para a IA gerar usando seu currículo e os dados da vaga.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <Dialog open={!!job} onOpenChange={onOpenChange}>
            <DialogContent className="fixed left-[50%] top-[50%] z-50 w-[95vw] sm:max-w-2xl translate-x-[-50%] translate-y-[-50%] rounded-[2rem] p-0 overflow-hidden bg-background border-border/50 shadow-2xl">
                <div className="bg-gradient-to-br from-violet-500/10 to-transparent p-6 border-b border-border/40 shrink-0">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
                            <Sparkles className="h-6 w-6 text-violet-500" /> Assistente de Carreira
                        </DialogTitle>
                        {job && (
                            <div className="flex items-center gap-2 pt-1">
                                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                    {job.role} · {job.company}
                                </p>
                                {job.matchScore != null && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-black text-violet-600">
                                        <Target className="h-3 w-3" /> Match {job.matchScore}%
                                    </span>
                                )}
                            </div>
                        )}
                    </DialogHeader>
                </div>

                <div className="p-6">
                    <Tabs defaultValue="cover" className="w-full">
                        <TabsList className="bg-muted/40 p-1.5 rounded-2xl border border-border/40 h-12 w-full mb-6">
                            <TabsTrigger value="cover" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-md gap-2 h-full flex-1">
                                <FileText className="h-3.5 w-3.5" /> Carta de Apresentação
                            </TabsTrigger>
                            <TabsTrigger value="match" className="rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-background data-[state=active]:shadow-md gap-2 h-full flex-1">
                                <Target className="h-3.5 w-3.5" /> Análise de Match
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="cover" className="mt-0 focus-visible:ring-0 outline-none">
                            {renderPane("cover", "Gerar carta")}
                        </TabsContent>
                        <TabsContent value="match" className="mt-0 focus-visible:ring-0 outline-none">
                            {renderPane("match", "Analisar match")}
                        </TabsContent>
                    </Tabs>
                </div>
            </DialogContent>
        </Dialog>
    );
}
