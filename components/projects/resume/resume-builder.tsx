"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    LayoutTemplate, Save, User, Briefcase, Layers, Code,
    GraduationCap, MessageSquare, ShieldCheck, Loader2, CheckCircle2,
    Award, Languages, FileDown, Download, Upload, ChevronDown, Database, Lightbulb, Circle, ArrowLeft,
    Eye, EyeOff
} from "lucide-react";
import { PortfolioData, INITIAL_PORTFOLIO } from "@/types/portfolio";
import { saveResumeData } from "@/app/(dashboard)/jobs/resume-actions";
import { reviewResume } from "@/app/(dashboard)/jobs/resume-ai-actions";
import { resumeHealth } from "@/lib/resume-health";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogBody } from "@/components/ui/dialog";
import { FieldFocusProvider } from "./field-focus";
import { SectionOrderControl } from "./section-order-control";

import { HeroForm } from "./hero-form";
import { ExperienceForm } from "./experience-form";
import { ProjectsForm } from "./projects-form";
import { SkillsForm } from "./skills-form";
import { EducationForm } from "./education-form";
import { TestimonialsForm } from "./testimonials-form";
import { CertificationsForm } from "./certifications-form";
import { LanguagesForm } from "./languages-form";
import { useResumeExport } from "./use-resume-export";
import { LUIZ_PORTFOLIO } from "./seed-data";

// Prévia em PDF real: só carrega no client (react-pdf usa APIs do navegador) e
// fora do bundle inicial (só quando o preview é exibido).
const ResumePdfViewer = dynamic(() => import("./resume-pdf-viewer"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border border-border/40 bg-muted/20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Carregando prévia…</p>
        </div>
    ),
});

// Helper tático para os ícones do Accordion
const StatusIcon = ({ active, icon: Icon }: { active: boolean, icon: React.ElementType }) => (
    <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-500", 
        active 
            ? "bg-emerald-500/10 text-emerald-600 shadow-inner border border-emerald-500/20" 
            : "bg-muted/50 text-muted-foreground/50 border border-border/40"
    )}>
        {active ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
    </div>
);

interface ResumeBuilderProps {
    initialData: PortfolioData;
    /** Versão de currículo sendo editada (model Resume). */
    resumeId: string;
    resumeName?: string;
    /** Idioma da versão (pt-BR | en-US) — define chrome e tamanho do PDF. */
    locale?: string;
    /** Template do PDF (ATS por padrão). */
    template?: string;
    /** Quando presente, mostra o botão de voltar ao gerenciador de versões. */
    onBack?: () => void;
}

export function ResumeBuilder({ initialData, resumeId, resumeName, locale, template, onBack }: ResumeBuilderProps) {
    const { exporting, exportPdf } = useResumeExport();
    // 1. INICIALIZAÇÃO A PARTIR DO BANCO (SQLite via Server Action)
    const [data, setData] = useState<PortfolioData>(initialData);
    const [isSaving, setIsSaving] = useState(false);
    const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved">("idle");
    const fileRef = useRef<HTMLInputElement>(null);
    const firstRender = useRef(true);

    // Toggle da prévia: escondê-la dá tela cheia ao formulário (foco no preenchimento).
    const [showPreview, setShowPreview] = useState(true);

    // Revisão do CV pela IA (coach): modal com markdown de pontos fortes/melhorias.
    const [reviewOpen, setReviewOpen] = useState(false);
    const [reviewLoading, setReviewLoading] = useState(false);
    const [reviewText, setReviewText] = useState("");

    const handleReview = async () => {
        setReviewOpen(true);
        setReviewLoading(true);
        setReviewText("");
        try {
            const res = await reviewResume(data);
            if (res.success) setReviewText(res.content);
            else { setReviewText(""); toast.error(res.error); setReviewOpen(false); }
        } catch {
            toast.error("Falha ao consultar a IA.");
            setReviewOpen(false);
        } finally {
            setReviewLoading(false);
        }
    };

    // 2. MIGRAÇÃO SUAVE: se houver currículo legado no localStorage e o banco
    //    estiver vazio, importa uma única vez e limpa a chave antiga.
    useEffect(() => {
        const isEmpty = !initialData.hero.name && initialData.experience.length === 0;
        if (!isEmpty) return;
        try {
            const legacy = localStorage.getItem("life-os-resume");
            if (legacy) {
                setData({ ...INITIAL_PORTFOLIO, ...JSON.parse(legacy) });
                localStorage.removeItem("life-os-resume");
                toast.info("Currículo antigo importado do navegador — salvo automaticamente no banco.");
            }
        } catch (e) {
            console.error("Erro ao migrar currículo legado", e);
        }
    }, [initialData]);

    // 3. SALVAMENTO MANUAL (Banco de Dados / SQLite)
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await saveResumeData(resumeId, data);
            if (!res.success) throw new Error(res.error);
            setAutoSave("saved");
            toast.success("Currículo salvo no banco de dados!");
        } catch {
            toast.error("Falha ao salvar. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };

    // 3b. AUTOSAVE: grava sozinho ~1,2s após a última edição (debounce). Acaba com o
    // risco de perder alterações por esquecer de clicar em Gravar.
    useEffect(() => {
        if (firstRender.current) { firstRender.current = false; return; }
        setAutoSave("saving");
        const t = setTimeout(async () => {
            try {
                const res = await saveResumeData(resumeId, data);
                setAutoSave(res.success ? "saved" : "idle");
            } catch {
                setAutoSave("idle");
            }
        }, 1200);
        return () => clearTimeout(t);
    }, [data, resumeId]);

    // 3c. EXPORT / IMPORT JSON (backup e portabilidade — local-first).
    const exportJson = () => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `curriculo-${(data.hero.name || "export").replace(/\s+/g, "_").toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        toast.success("Currículo exportado (.json).");
    };

    const importJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const parsed = JSON.parse(await file.text()) as Partial<PortfolioData>;
            if (!parsed || typeof parsed !== "object" || !parsed.hero) throw new Error("invalid");
            setData({ ...INITIAL_PORTFOLIO, ...parsed });
            toast.success("Currículo importado! O autosave já vai gravar.");
        } catch {
            toast.error("Arquivo inválido — exporte um .json gerado aqui.");
        } finally {
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    // 4. EXPORTAÇÃO PROFISSIONAL DE PDF (react-pdf — motor determinístico, ATS-friendly).
    //    Byte-a-byte igual à prévia na tela (mesmo componente ResumePdf).
    const handleExportPdf = () =>
        exportPdf({ data, name: resumeName, locale, template });

    const checklist = useMemo(() => ({
        hero: !!data.hero.name && !!data.hero.headline && !!data.hero.email,
        about: !!data.about.short,
        experience: data.experience.length > 0,
        projects: data.projects.length > 0,
        skills: data.skills.languages.length > 0 || data.skills.frameworks.length > 0,
        education: data.education.length > 0,
        certifications: data.certifications.length > 0,
        languages: data.languages.length > 0,
        testimonials: data.testimonials.length > 0,
    }), [data]);

    const completion = Math.round((Object.values(checklist).filter(Boolean).length / 9) * 100);

    // Força do currículo (heurísticas de boas práticas) — dicas acionáveis.
    const pendingTips = useMemo(() => resumeHealth(data).filter((t) => !t.done), [data]);

    return (
        <FieldFocusProvider>
        {/* Altura travada só no desktop (painéis lado a lado com scroll interno).
            No mobile o conteúdo flui na página — altura fixa esmagava os painéis. */}
        <div className="flex flex-col lg:flex-row gap-6 lg:h-[calc(100vh-140px)] w-full">

            {/* --- LEFT: EDITOR PANEL --- */}
            <div className={cn(
                "flex flex-col gap-4 overflow-hidden lg:h-full",
                showPreview
                    ? "w-full lg:w-[500px] xl:w-[550px] shrink-0"
                    : "w-full max-w-4xl mx-auto" // prévia oculta: coluna única, centralizada e confortável
            )}>
                <Card className="flex-1 flex flex-col overflow-hidden border-border/40 bg-card/60 backdrop-blur-2xl h-full shadow-2xl rounded-[2rem]">
                    
                    {/* Header do Painel */}
                    <div className="px-4 py-4 sm:px-8 sm:py-6 border-b border-border/40 bg-background/50 flex flex-col gap-5 shrink-0 z-10">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3 min-w-0">
                                {onBack && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onBack}
                                        aria-label="Voltar aos currículos"
                                        className="h-9 w-9 rounded-xl shrink-0 text-muted-foreground hover:text-foreground"
                                    >
                                        <ArrowLeft className="h-4 w-4" />
                                    </Button>
                                )}
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                                    <LayoutTemplate className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-black uppercase tracking-widest text-primary text-[11px]">
                                        Builder Engine
                                    </h3>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5 truncate">
                                        {resumeName || "Gerador de Portfólio"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                {/* Revisão do CV pela IA (coach). */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleReview}
                                    disabled={reviewLoading}
                                    title="A IA revisa seu currículo e sugere melhorias"
                                    className="h-9 rounded-xl font-black uppercase tracking-widest text-[9px] gap-1.5 border-violet-500/30 bg-violet-500/5 text-violet-600 hover:bg-violet-500/10"
                                >
                                    {reviewLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                    <span className="hidden sm:inline">Revisar IA</span>
                                </Button>
                                {/* Ordem e visibilidade das seções do PDF. */}
                                <SectionOrderControl data={data} onChange={setData} />
                                {/* Toggle da prévia em PDF — foca no formulário quando oculto. */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowPreview((v) => !v)}
                                    aria-pressed={showPreview}
                                    title={showPreview ? "Ocultar prévia (tela cheia p/ o formulário)" : "Mostrar prévia em PDF"}
                                    className={cn(
                                        "h-9 rounded-xl font-black uppercase tracking-widest text-[9px] gap-1.5 border-border/60",
                                        showPreview ? "bg-primary/5 text-primary" : "hover:bg-primary/5 hover:text-primary"
                                    )}
                                >
                                    {showPreview ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                                    <span className="hidden sm:inline">Prévia</span>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-9 rounded-xl font-black uppercase tracking-widest text-[9px] gap-1.5 border-border/60 hover:bg-primary/5 hover:text-primary"
                                        >
                                            <Database className="h-3.5 w-3.5" /> Dados <ChevronDown className="h-3 w-3 opacity-60" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="rounded-xl">
                                        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest">Backup & importação</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={exportJson} className="gap-2 text-xs cursor-pointer">
                                            <Download className="h-3.5 w-3.5" /> Exportar JSON (backup)
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => fileRef.current?.click()} className="gap-2 text-xs cursor-pointer">
                                            <Upload className="h-3.5 w-3.5" /> Importar JSON
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => { setData(LUIZ_PORTFOLIO); toast.success("Dados do PDF importados! Revise — o autosave grava sozinho."); }} className="gap-2 text-xs cursor-pointer">
                                            <FileDown className="h-3.5 w-3.5" /> Preencher com dados do PDF
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={importJson} />
                        </div>

                        {/* Barra de Integridade Otimizada */}
                        <div className="space-y-2 bg-muted/20 p-4 rounded-2xl border border-border/30" title={`${completion}% Completo`}>
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-1.5">
                                    <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                    Integridade dos Dados
                                </span>
                                <span className="text-[11px] font-mono font-black text-primary">{completion}%</span>
                            </div>
                            <div className="w-full h-2 bg-muted/60 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-primary transition-all duration-1000 ease-out" style={{ width: `${completion}%` }} />
                            </div>

                            {/* Força do currículo: dicas acionáveis (só as pendentes) */}
                            {pendingTips.length > 0 ? (
                                <div className="mt-3 space-y-1.5 border-t border-border/30 pt-3">
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-1.5">
                                        <Lightbulb className="h-3 w-3 text-amber-500" /> Fortaleça seu currículo
                                    </span>
                                    {pendingTips.slice(0, 3).map((t) => (
                                        <div key={t.id} className="flex items-start gap-1.5 text-[10px] font-medium text-muted-foreground">
                                            <Circle className="h-2.5 w-2.5 mt-[3px] shrink-0 text-amber-500" /> {t.label}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-3 flex items-center gap-1.5 border-t border-border/30 pt-3 text-[10px] font-bold text-emerald-600">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Currículo forte — boas práticas atendidas!
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Accordion de Seções (Área de Scroll) */}
                    <ScrollArea className="flex-1 bg-muted/5 h-full custom-scrollbar relative">
                        <div className="px-4 py-5 pb-24 sm:px-7 sm:py-7 sm:pb-32">
                            <Accordion type="single" collapsible defaultValue="hero" className="w-full space-y-5">
                                
                                {/* Item 1: Identidade */}
                                <AccordionItem 
                                    value="hero" 
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-6 px-5 sm:px-6 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.hero} icon={User} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">1. Identidade</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Dados básicos e contato</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 sm:px-6 pb-7 pt-4 border-t border-border/20">
                                        <HeroForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 2: Experiência */}
                                <AccordionItem 
                                    value="experience" 
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-6 px-5 sm:px-6 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.experience} icon={Briefcase} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">2. Experiência</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Histórico profissional</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 sm:px-6 pb-7 pt-4 border-t border-border/20">
                                        <ExperienceForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 3: Projetos */}
                                <AccordionItem 
                                    value="projects" 
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-6 px-5 sm:px-6 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.projects} icon={Layers} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">3. Projetos</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Cases práticos</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 sm:px-6 pb-7 pt-4 border-t border-border/20">
                                        <ProjectsForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 4: Educação */}
                                <AccordionItem 
                                    value="education" 
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-6 px-5 sm:px-6 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.education} icon={GraduationCap} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">4. Educação</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Formação acadêmica</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 sm:px-6 pb-7 pt-4 border-t border-border/20">
                                        <EducationForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 5: Habilidades */}
                                <AccordionItem 
                                    value="skills" 
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-6 px-5 sm:px-6 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.skills} icon={Code} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">5. Habilidades</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Tech stack e ferramentas</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 sm:px-6 pb-7 pt-4 border-t border-border/20">
                                        <SkillsForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 6: Depoimentos */}
                                <AccordionItem 
                                    value="testimonials" 
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-6 px-5 sm:px-6 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.testimonials} icon={MessageSquare} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">6. Depoimentos</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Prova social</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 sm:px-6 pb-7 pt-4 border-t border-border/20">
                                        <TestimonialsForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 7: Certificações */}
                                <AccordionItem
                                    value="certifications"
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-6 px-5 sm:px-6 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.certifications} icon={Award} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">7. Certificações</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Cursos e credenciais</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 sm:px-6 pb-7 pt-4 border-t border-border/20">
                                        <CertificationsForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 8: Idiomas */}
                                <AccordionItem
                                    value="languages"
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-6 px-5 sm:px-6 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.languages} icon={Languages} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">8. Idiomas</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Fluência e níveis</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 sm:px-6 pb-7 pt-4 border-t border-border/20">
                                        <LanguagesForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                            </Accordion>
                        </div>
                        
                        {/* Gradiente para suavizar o final do scroll */}
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />
                    </ScrollArea>

                    {/* Footer Actions (Rodapé Fixo) */}
                    <div className="px-4 py-4 sm:px-6 sm:py-5 border-t border-border/40 bg-background/95 backdrop-blur-xl flex gap-3 sm:gap-4 shrink-0 z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                        <Button
                            variant="outline"
                            disabled={isSaving}
                            className="flex-1 gap-2 rounded-xl h-12 sm:h-14 font-black uppercase tracking-widest text-[11px] shadow-sm hover:bg-muted hover:text-foreground transition-all border-border/60"
                            onClick={handleSave}
                            title="Autosave ativo — clique para gravar agora"
                        >
                            {isSaving || autoSave === "saving" ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</>
                            ) : autoSave === "saved" ? (
                                <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Salvo</>
                            ) : (
                                <><Save className="h-4 w-4" /> Gravar Dados</>
                            )}
                        </Button>
                        <Button
                            disabled={exporting}
                            className="flex-1 gap-2 rounded-xl h-12 sm:h-14 bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest text-[11px] shadow-xl transition-all"
                            onClick={handleExportPdf}
                            title="Gera um PDF ATS-friendly (uma coluna, texto linear)"
                        >
                            {exporting ? (
                                <><Loader2 className="h-4 w-4 animate-spin" /> Gerando PDF…</>
                            ) : (
                                <><FileDown className="h-4 w-4" /> Exportar PDF</>
                            )}
                        </Button>
                    </div>
                </Card>
            </div>

            {/* --- RIGHT: PREVIEW PANEL (PDF REAL — WYSIWYG) --- */}
            {showPreview && (
                <div className="flex-1 min-w-0 bg-zinc-100/50 dark:bg-zinc-950/50 p-3 sm:p-4 lg:p-5 rounded-[2rem] border border-border/40 shadow-inner flex flex-col lg:h-full relative">
                    {/* A barra de ferramentas e o rótulo agora vivem dentro do viewer.
                        Altura mínima no mobile (sem lg:h-full) p/ o iframe ter espaço. */}
                    <div className="flex-1 min-h-[70vh] lg:min-h-0">
                        <ResumePdfViewer data={data} locale={locale} template={template} name={resumeName} />
                    </div>
                </div>
            )}
        </div>

        {/* Revisão do CV pela IA — coach com pontos fortes e melhorias. */}
        <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
            <DialogContent size="lg">
                <DialogHeader
                    icon={<Sparkles />}
                    iconClassName="bg-violet-500/10 text-violet-500 border-violet-500/20"
                    title="Revisão do currículo pela IA"
                    description="Sugestões acionáveis — nada é aplicado automaticamente."
                />
                <DialogBody>
                    {reviewLoading ? (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                            <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
                            <span className="text-xs font-black uppercase tracking-widest">Analisando seu currículo…</span>
                        </div>
                    ) : (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_h2]:text-base [&_h2]:font-black [&_h3]:mt-4 [&_h3]:font-bold [&_ul]:my-2 [&_li]:my-0.5">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{reviewText}</ReactMarkdown>
                        </div>
                    )}
                </DialogBody>
            </DialogContent>
        </Dialog>
        </FieldFocusProvider>
    );
}