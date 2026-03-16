"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
    LayoutTemplate, Printer, Save, User, Briefcase, Layers, Code, 
    GraduationCap, MessageSquare, ShieldCheck, Loader2, CheckCircle2
} from "lucide-react";
import { PortfolioData, INITIAL_PORTFOLIO } from "@/types/portfolio";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { HeroForm } from "./hero-form";
import { ExperienceForm } from "./experience-form";
import { ProjectsForm } from "./projects-form";
import { SkillsForm } from "./skills-form";
import { EducationForm } from "./education-form";
import { TestimonialsForm } from "./testimonials-form";
import { ResumePreview } from "./resume-preview";

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

export function ResumeBuilder() {
    // 1. INICIALIZAÇÃO PURA
    const [data, setData] = useState<PortfolioData>(INITIAL_PORTFOLIO);
    const [isLoaded, setIsLoaded] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    // 2. SINCRONIZAÇÃO COM SISTEMA EXTERNO (LocalStorage)
    useEffect(() => {
        const loadTimer = setTimeout(() => {
            try {
                const savedResume = localStorage.getItem("life-os-resume");
                if (savedResume) {
                    setData(JSON.parse(savedResume));
                }
            } catch (e) {
                console.error("Erro ao carregar dados salvos", e);
            } finally {
                setIsLoaded(true);
            }
        }, 10);

        return () => clearTimeout(loadTimer);
    }, []);

    // 3. SALVAMENTO (Local Storage)
    const handleSave = () => {
        localStorage.setItem("life-os-resume", JSON.stringify(data));
        toast.success("Dados sincronizados com sucesso!");
    };

    // 4. EXPORTAÇÃO PROFISSIONAL DE PDF
    const handlePrint = () => {
        toast.info("Renderizando PDF em alta qualidade...");
        
        const previewNode = document.getElementById("resume-preview-container");
        if (!previewNode) return;

        const iframe = document.createElement("iframe");
        iframe.style.display = "none";
        document.body.appendChild(iframe);

        const iframeDoc = iframe.contentWindow?.document;
        if (!iframeDoc) return;

        const styleNodes = document.querySelectorAll("style, link[rel='stylesheet']");
        const stylesHtml = Array.from(styleNodes).map(node => node.outerHTML).join("");

        iframeDoc.open();
        iframeDoc.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Curriculo_${data.hero.name ? data.hero.name.replace(/\s+/g, '_') : 'Export'}</title>
                    ${stylesHtml}
                    <style>
                        @page { size: A4 portrait; margin: 0; }
                        body { 
                            margin: 0; 
                            padding: 0; 
                            background: white !important; 
                            -webkit-print-color-adjust: exact !important; 
                            print-color-adjust: exact !important; 
                        }
                        #resume-preview-container {
                            width: 210mm !important;
                            min-height: 297mm !important;
                            box-shadow: none !important;
                            border: none !important;
                            margin: 0 auto !important;
                        }
                    </style>
                </head>
                <body>
                    ${previewNode.outerHTML}
                </body>
            </html>
        `);
        iframeDoc.close();

        setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => { document.body.removeChild(iframe); }, 1000);
        }, 500);
    };

    const checklist = useMemo(() => ({
        hero: !!data.hero.name && !!data.hero.headline && !!data.hero.email,
        about: !!data.about.short,
        experience: data.experience.length > 0,
        projects: data.projects.length > 0,
        skills: data.skills.languages.length > 0 || data.skills.frameworks.length > 0,
        education: data.education.length > 0,
        testimonials: data.testimonials.length > 0,
    }), [data]);

    const completion = Math.round((Object.values(checklist).filter(Boolean).length / 7) * 100);

    if (!isLoaded) {
        return (
            <div className="flex h-[50vh] w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
            </div>
        );
    }

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)] w-full">
            
            {/* --- LEFT: EDITOR PANEL --- */}
            <div className="no-print w-full lg:w-[500px] xl:w-[550px] flex flex-col gap-4 overflow-hidden shrink-0 h-full">
                <Card className="flex-1 flex flex-col overflow-hidden border-border/40 bg-card/60 backdrop-blur-2xl h-full shadow-2xl rounded-[2rem]">
                    
                    {/* Header do Painel */}
                    <div className="px-8 py-6 border-b border-border/40 bg-background/50 flex flex-col gap-5 shrink-0 z-10">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                                    <LayoutTemplate className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="font-black uppercase tracking-widest text-primary text-[11px]">
                                        Builder Engine
                                    </h3>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
                                        Gerador de Portfólio
                                    </p>
                                </div>
                            </div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/50 px-2.5 py-1.5 bg-muted/50 rounded-lg border border-border/40">
                                V {new Date().getFullYear()}
                            </span>
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
                        </div>
                    </div>
                    
                    {/* Accordion de Seções (Área de Scroll) */}
                    <ScrollArea className="flex-1 bg-muted/5 h-full custom-scrollbar relative">
                        <div className="px-6 py-6 pb-32"> 
                            <Accordion type="single" collapsible defaultValue="hero" className="w-full space-y-4">
                                
                                {/* Item 1: Identidade */}
                                <AccordionItem 
                                    value="hero" 
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-5 px-5 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.hero} icon={User} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">1. Identidade</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Dados básicos e contato</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 pb-6 pt-2 border-t border-border/20">
                                        <HeroForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 2: Experiência */}
                                <AccordionItem 
                                    value="experience" 
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-5 px-5 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.experience} icon={Briefcase} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">2. Experiência</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Histórico profissional</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 pb-6 pt-2 border-t border-border/20">
                                        <ExperienceForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 3: Projetos */}
                                <AccordionItem 
                                    value="projects" 
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-5 px-5 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.projects} icon={Layers} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">3. Projetos</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Cases práticos</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 pb-6 pt-2 border-t border-border/20">
                                        <ProjectsForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 4: Educação */}
                                <AccordionItem 
                                    value="education" 
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-5 px-5 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.education} icon={GraduationCap} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">4. Educação</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Formação acadêmica</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 pb-6 pt-2 border-t border-border/20">
                                        <EducationForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 5: Habilidades */}
                                <AccordionItem 
                                    value="skills" 
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-5 px-5 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.skills} icon={Code} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">5. Habilidades</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Tech stack e ferramentas</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 pb-6 pt-2 border-t border-border/20">
                                        <SkillsForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 6: Depoimentos */}
                                <AccordionItem 
                                    value="testimonials" 
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-5 px-5 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.testimonials} icon={MessageSquare} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">6. Depoimentos</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Prova social</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 pb-6 pt-2 border-t border-border/20">
                                        <TestimonialsForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                            </Accordion>
                        </div>
                        
                        {/* Gradiente para suavizar o final do scroll */}
                        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-card/80 to-transparent pointer-events-none" />
                    </ScrollArea>

                    {/* Footer Actions (Rodapé Fixo) */}
                    <div className="px-6 py-5 border-t border-border/40 bg-background/95 backdrop-blur-xl flex gap-4 shrink-0 z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                        <Button 
                            variant="outline" 
                            className="flex-1 gap-2 rounded-xl h-14 font-black uppercase tracking-widest text-[11px] shadow-sm hover:bg-muted hover:text-foreground transition-all border-border/60" 
                            onClick={handleSave}
                        >
                            <Save className="h-4 w-4" /> Gravar Dados
                        </Button>
                        <Button 
                            className="flex-1 gap-2 rounded-xl h-14 bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-widest text-[11px] shadow-xl transition-all" 
                            onClick={handlePrint}
                        >
                            <Printer className="h-4 w-4" /> Exportar PDF
                        </Button>
                    </div>
                </Card>
            </div>

            {/* --- RIGHT: PREVIEW PANEL --- */}
            <div className="no-print-bg flex-1 bg-zinc-100/50 dark:bg-zinc-950/50 p-4 lg:p-8 rounded-[2rem] border border-border/40 shadow-inner flex justify-center h-full overflow-hidden relative">
                <div className="w-full h-full overflow-y-auto scrollbar-hide flex justify-center pb-20">
                    {/* ESTE É O CONTAINER QUE SERÁ IMPRESSO */}
                    <div 
                        id="resume-preview-container" 
                        ref={printRef}
                        className="w-[210mm] min-h-[297mm] h-fit bg-white text-zinc-900 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] rounded-sm transition-all"
                    >
                        <ResumePreview data={data} onChange={setData} />
                    </div>
                </div>

                <div className="no-print absolute bottom-8 right-12 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 bg-background/95 backdrop-blur-md px-5 py-2.5 rounded-xl border border-border/40 shadow-2xl pointer-events-none flex items-center gap-2.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    Preview Dinâmico (A4)
                </div>
            </div>
        </div>
    );
}