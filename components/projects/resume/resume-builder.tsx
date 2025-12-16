"use client";

import { useState, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
    LayoutTemplate, Printer, Save, User, Briefcase, Layers, Code, 
    GraduationCap, MessageSquare 
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

// Helper component defined outside to avoid re-creation on render
const StatusIcon = ({ active, icon: Icon }: { active: boolean, icon: React.ElementType }) => (
    <div className={cn("p-1.5 rounded-md transition-colors", active ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground")}>
        <Icon className="h-4 w-4" />
    </div>
);

export function ResumeBuilder() {
    const [data, setData] = useState<PortfolioData>(INITIAL_PORTFOLIO);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        setTimeout(() => window.print(), 100);
    };

    const handleSave = () => {
        console.log("Saving JSON:", JSON.stringify(data, null, 2));
        toast.success("Dados salvos com sucesso!");
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

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-140px)]">
            
            {/* --- LEFT: EDITOR PANEL --- */}
            <div className="w-full lg:w-[450px] flex flex-col gap-4 overflow-hidden print:hidden shrink-0 h-full">
                <Card className="flex-1 flex flex-col overflow-hidden border-border bg-card h-full shadow-lg">
                    {/* Header */}
                    <div className="p-4 border-b border-border bg-muted/30 flex justify-between items-center shrink-0">
                        <h3 className="font-bold flex items-center gap-2 text-primary">
                            <LayoutTemplate className="h-4 w-4" /> Portfolio Builder
                        </h3>
                        <div className="flex items-center gap-2" title={`${completion}% Completo`}>
                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${completion}%` }} />
                            </div>
                            <span className="text-xs font-mono text-muted-foreground">{completion}%</span>
                        </div>
                    </div>
                    
                    {/* Accordion de Seções */}
                    <ScrollArea className="flex-1 bg-background h-full">
                        <div className="p-4 pb-20"> 
                            <Accordion type="single" collapsible defaultValue="hero" className="w-full space-y-2">
                                {/* ... (Accordion Items mantidos iguais) ... */}
                                <AccordionItem value="hero" className="border border-border rounded-lg px-4 bg-card">
                                    <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex items-center gap-3">
                                            <StatusIcon active={checklist.hero} icon={User} />
                                            <div className="text-left">
                                                <span className="font-semibold text-sm block">1. Hero & Contato</span>
                                                <span className="text-[10px] text-muted-foreground font-normal">Primeira impressão e dados</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4">
                                        <HeroForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="experience" className="border border-border rounded-lg px-4 bg-card">
                                    <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex items-center gap-3">
                                            <StatusIcon active={checklist.experience} icon={Briefcase} />
                                            <div className="text-left">
                                                <span className="font-semibold text-sm block">2. Experiência Profissional</span>
                                                <span className="text-[10px] text-muted-foreground font-normal">Histórico e conquistas</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4">
                                        <ExperienceForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="projects" className="border border-border rounded-lg px-4 bg-card">
                                    <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex items-center gap-3">
                                            <StatusIcon active={checklist.projects} icon={Layers} />
                                            <div className="text-left">
                                                <span className="font-semibold text-sm block">3. Projetos & Cases</span>
                                                <span className="text-[10px] text-muted-foreground font-normal">Portfólio prático</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4">
                                        <ProjectsForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="education" className="border border-border rounded-lg px-4 bg-card">
                                    <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex items-center gap-3">
                                            <StatusIcon active={checklist.education} icon={GraduationCap} />
                                            <div className="text-left">
                                                <span className="font-semibold text-sm block">4. Educação & Certs</span>
                                                <span className="text-[10px] text-muted-foreground font-normal">Formação acadêmica</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4">
                                        <EducationForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="skills" className="border border-border rounded-lg px-4 bg-card">
                                    <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex items-center gap-3">
                                            <StatusIcon active={checklist.skills} icon={Code} />
                                            <div className="text-left">
                                                <span className="font-semibold text-sm block">5. Habilidades</span>
                                                <span className="text-[10px] text-muted-foreground font-normal">Tech stack e soft skills</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4">
                                        <SkillsForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="testimonials" className="border border-border rounded-lg px-4 bg-card">
                                    <AccordionTrigger className="hover:no-underline py-3">
                                        <div className="flex items-center gap-3">
                                            <StatusIcon active={checklist.testimonials} icon={MessageSquare} />
                                            <div className="text-left">
                                                <span className="font-semibold text-sm block">6. Depoimentos</span>
                                                <span className="text-[10px] text-muted-foreground font-normal">Prova social</span>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-2 pb-4">
                                        <TestimonialsForm data={data} onChange={setData} />
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    </ScrollArea>

                    {/* Footer - Fixed at bottom */}
                    <div className="p-4 border-t border-border bg-background flex gap-2 shrink-0">
                        <Button variant="outline" className="flex-1 gap-2" onClick={handleSave}>
                            <Save className="h-4 w-4" /> Salvar
                        </Button>
                        <Button className="flex-1 gap-2 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handlePrint}>
                            <Printer className="h-4 w-4" /> PDF / Imprimir
                        </Button>
                    </div>
                </Card>
            </div>

            {/* --- RIGHT: PREVIEW PANEL (Professional Layout) --- */}
            <div className="flex-1 bg-zinc-100/50 dark:bg-zinc-950/50 p-4 lg:p-8 rounded-xl border border-border flex justify-center h-full overflow-hidden relative">
                
                {/* Scroll Container para o Preview */}
                <div className="w-full h-full overflow-y-auto scrollbar-hide flex justify-center pb-20">
                    <div 
                        id="resume-preview" 
                        ref={printRef}
                        // Estilos para simular papel A4
                        // w-[210mm] min-h-[297mm] = A4 exato
                        // bg-white = Papel branco
                        // shadow-xl = Sombra para dar profundidade
                        // print:* = Classes para limpar estilos na hora de imprimir
                        className="w-[210mm] min-h-[297mm] h-fit bg-white text-zinc-900 shadow-xl print:shadow-none print:w-full print:h-auto print:min-h-0 print:absolute print:top-0 print:left-0 print:m-0"
                    >
                        <ResumePreview data={data} onChange={setData} />
                    </div>
                </div>

                {/* Overlay de instrução visual (opcional) */}
                <div className="absolute bottom-4 right-8 text-xs text-muted-foreground bg-background/80 backdrop-blur px-3 py-1 rounded-full border border-border pointer-events-none print:hidden">
                    Preview A4 • Clique no texto para editar
                </div>
            </div>
        </div>
    );
}