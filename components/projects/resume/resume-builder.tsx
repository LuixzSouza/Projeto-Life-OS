"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    LayoutTemplate, Printer, Save, User, Briefcase, Layers, Code,
    GraduationCap, MessageSquare, ShieldCheck, Loader2, CheckCircle2,
    Award, Languages, FileDown, Download, Upload, ChevronDown, Database, Lightbulb, Circle
} from "lucide-react";
import { PortfolioData, INITIAL_PORTFOLIO } from "@/types/portfolio";
import { savePortfolio } from "@/app/(dashboard)/projects/actions";
import { resumeHealth } from "@/lib/resume-health";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { HeroForm } from "./hero-form";
import { ExperienceForm } from "./experience-form";
import { ProjectsForm } from "./projects-form";
import { SkillsForm } from "./skills-form";
import { EducationForm } from "./education-form";
import { TestimonialsForm } from "./testimonials-form";
import { CertificationsForm } from "./certifications-form";
import { LanguagesForm } from "./languages-form";
import { ResumePreview } from "./resume-preview";
import { LUIZ_PORTFOLIO } from "./seed-data";

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

export function ResumeBuilder({ initialData }: { initialData: PortfolioData }) {
    // 1. INICIALIZAÇÃO A PARTIR DO BANCO (SQLite via Server Action)
    const [data, setData] = useState<PortfolioData>(initialData);
    const [isSaving, setIsSaving] = useState(false);
    const [autoSave, setAutoSave] = useState<"idle" | "saving" | "saved">("idle");
    const printRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const firstRender = useRef(true);

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
            await savePortfolio(data);
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
                await savePortfolio(data);
                setAutoSave("saved");
            } catch {
                setAutoSave("idle");
            }
        }, 1200);
        return () => clearTimeout(t);
    }, [data]);

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
                        /* Margens aplicadas por PÁGINA (toda página ganha respiro, não só a 1ª). */
                        @page { size: A4 portrait; margin: 14mm; }
                        * {
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            box-sizing: border-box;
                        }
                        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
                        #resume-preview-container {
                            width: auto !important;
                            min-height: 0 !important;
                            box-shadow: none !important;
                            border: none !important;
                            border-radius: 0 !important;
                            margin: 0 !important;
                        }
                        /* O @page cuida das margens — zera o padding interno da folha. */
                        #resume-preview-container .resume-page { padding: 0 !important; height: auto !important; }
                        /* Coluna única no papel: o grid de 2 colunas não pagina entre páginas. */
                        #resume-preview-container .resume-body { display: block !important; }
                        #resume-preview-container .resume-sidebar { width: 100% !important; margin-top: 1.5rem !important; }
                        /* Regras de quebra: itens inteiros nunca partem; títulos não ficam órfãos no rodapé. */
                        #resume-preview-container .break-inside-avoid,
                        #resume-preview-container li,
                        #resume-preview-container .resume-entry { break-inside: avoid; page-break-inside: avoid; }
                        #resume-preview-container h1,
                        #resume-preview-container h2,
                        #resume-preview-container h3 { break-after: avoid-page; }
                        #resume-preview-container section { margin-bottom: 1.25rem; }
                        /* Com margem de página a largura cai abaixo do breakpoint md;
                           reforço o cabeçalho em linha (nome à esquerda, contato à direita). */
                        #resume-preview-container header { flex-direction: row !important; align-items: flex-end !important; }
                        #resume-preview-container header > div:first-child { width: 65% !important; }
                        #resume-preview-container header > div:last-child { width: 35% !important; align-items: flex-end !important; }
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
        certifications: data.certifications.length > 0,
        languages: data.languages.length > 0,
        testimonials: data.testimonials.length > 0,
    }), [data]);

    const completion = Math.round((Object.values(checklist).filter(Boolean).length / 9) * 100);

    // Força do currículo (heurísticas de boas práticas) — dicas acionáveis.
    const pendingTips = useMemo(() => resumeHealth(data).filter((t) => !t.done), [data]);

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

                                {/* Item 7: Certificações */}
                                <AccordionItem
                                    value="certifications"
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-5 px-5 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.certifications} icon={Award} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">7. Certificações</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Cursos e credenciais</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 pb-6 pt-2 border-t border-border/20">
                                        <CertificationsForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                {/* Item 8: Idiomas */}
                                <AccordionItem
                                    value="languages"
                                    className="border border-border/40 rounded-[1.5rem] bg-card shadow-sm data-[state=open]:shadow-lg data-[state=open]:border-primary/30 data-[state=open]:bg-primary/[0.02] transition-all duration-300 overflow-hidden"
                                >
                                    <AccordionTrigger className="hover:no-underline py-5 px-5 hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <StatusIcon active={checklist.languages} icon={Languages} />
                                            <div className="text-left">
                                                <span className="font-black uppercase tracking-widest text-[11px] text-foreground block mb-0.5">8. Idiomas</span>
                                                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Fluência e níveis</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-5 pb-6 pt-2 border-t border-border/20">
                                        <LanguagesForm data={data} onChange={setData} />
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
                            disabled={isSaving}
                            className="flex-1 gap-2 rounded-xl h-14 font-black uppercase tracking-widest text-[11px] shadow-sm hover:bg-muted hover:text-foreground transition-all border-border/60"
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