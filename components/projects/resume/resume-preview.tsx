"use client";

import { PortfolioData } from "@/types/portfolio";
import { 
  MapPin, Mail, Phone, Globe, Briefcase, Layers, Code, 
  GraduationCap, MessageSquare, Linkedin, Github 
} from "lucide-react";
import { EditableText } from "./editable-text";

interface ResumePreviewProps {
  data: PortfolioData;
  onChange: (data: PortfolioData) => void;
}

export function ResumePreview({ data, onChange }: ResumePreviewProps) {
  
  // Helpers para atualização aninhada
  const updateHero = (field: string, val: string) => {
    onChange({ ...data, hero: { ...data.hero, [field]: val } });
  };

  const updateAbout = (field: string, val: string) => {
    onChange({ ...data, about: { ...data.about, [field]: val } });
  };

  const updateExperience = (id: string, field: string, val: string) => {
    onChange({
      ...data,
      experience: data.experience.map(e => e.id === id ? { ...e, [field]: val } : e)
    });
  };

  const updateProject = (id: string, field: string, val: string) => {
    onChange({
      ...data,
      projects: data.projects.map(p => p.id === id ? { ...p, [field]: val } : p)
    });
  };

  // Nota: Para Skills e Education, como são listas simples/complexas, 
  // geralmente é melhor gerenciar a estrutura (adicionar/remover) no menu lateral
  // e deixar apenas o texto editável aqui se necessário. 
  // Por simplicidade e robustez, manteremos Skills/Education como visualização aqui,
  // mas com renderização completa.

  return (
    <div className="p-[15mm] md:p-[20mm] h-full flex flex-col font-sans text-zinc-900 leading-relaxed group/preview">
      
      {/* 1. HERO SECTION */}
      <header className="border-b-2 border-zinc-900 pb-6 mb-8">
        <div className="flex justify-between items-start">
          <div className="w-full">
            <EditableText 
                tagName="h1"
                value={data.hero.name} 
                onChange={(val) => updateHero('name', val)} 
                className="text-5xl font-extrabold uppercase tracking-tight text-zinc-900 mb-2 block w-full"
                placeholder="SEU NOME"
            />
            <EditableText 
                tagName="p"
                value={data.hero.headline} 
                onChange={(val) => updateHero('headline', val)} 
                className="text-xl text-zinc-600 font-medium mb-4 block w-full"
                placeholder="Seu Cargo / Especialidade"
            />
          </div>
        </div>
        
        {/* Contact Grid */}
        <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-600 font-medium mt-2">
            <div className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-zinc-400" /> 
                <EditableText value={data.hero.email} onChange={(val) => updateHero('email', val)} placeholder="email@exemplo.com" tagName="span" />
            </div>
            <div className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-zinc-400" />
                <EditableText value={data.hero.phone} onChange={(val) => updateHero('phone', val)} placeholder="(00) 00000-0000" tagName="span" />
            </div>
            <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                <EditableText value={data.hero.location} onChange={(val) => updateHero('location', val)} placeholder="Cidade, UF" tagName="span" />
            </div>
            <div className="flex items-center gap-1.5">
                <Globe className="h-3.5 w-3.5 text-zinc-400" />
                <EditableText value={data.hero.website} onChange={(val) => updateHero('website', val)} placeholder="seusite.com" tagName="span" />
            </div>
        </div>
      </header>

      {/* 2. SUMMARY */}
      {data.about.short && (
        <section className="mb-10 group/section">
            <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 border-b border-zinc-100 pb-1">Perfil Profissional</h2>
            <EditableText 
                tagName="p"
                multiline
                value={data.about.short} 
                onChange={(val) => updateAbout('short', val)} 
                className="text-base text-zinc-800 leading-7 block w-full text-justify"
                placeholder="Escreva um resumo impactante sobre sua carreira..."
            />
        </section>
      )}

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-10">
        
        {/* COLUNA ESQUERDA (Principal) */}
        <div className="space-y-10">
            
            {/* 3. EXPERIENCE */}
            <section>
                <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 mb-5 border-b border-zinc-200 pb-2 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-zinc-400" /> Experiência
                </h2>
                <div className="space-y-8">
                    {data.experience.map((exp) => (
                        <div key={exp.id} className="group/item relative page-break-inside-avoid">
                            <div className="flex justify-between items-baseline mb-1">
                                <EditableText 
                                    tagName="h3"
                                    value={exp.role} 
                                    onChange={(val) => updateExperience(exp.id, 'role', val)} 
                                    className="font-bold text-lg text-zinc-900"
                                    placeholder="Cargo"
                                />
                                <div className="text-xs font-semibold text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded flex gap-1 whitespace-nowrap">
                                    <EditableText value={exp.startDate} onChange={(val) => updateExperience(exp.id, 'startDate', val)} placeholder="Início" tagName="span" className="min-w-[40px] text-right" />
                                    -
                                    <EditableText value={exp.endDate} onChange={(val) => updateExperience(exp.id, 'endDate', val)} placeholder="Fim" tagName="span" className="min-w-[40px]" />
                                </div>
                            </div>
                            
                            <div className="text-sm font-semibold text-zinc-700 mb-3 flex gap-1 items-center">
                                <EditableText value={exp.company} onChange={(val) => updateExperience(exp.id, 'company', val)} placeholder="Empresa" tagName="span" />
                                <span className="text-zinc-300">•</span>
                                <EditableText value={exp.location} onChange={(val) => updateExperience(exp.id, 'location', val)} placeholder="Local" tagName="span" />
                            </div>
                            
                            <EditableText 
                                tagName="p"
                                multiline
                                value={exp.summary} 
                                onChange={(val) => updateExperience(exp.id, 'summary', val)} 
                                className="text-sm text-zinc-600 mb-3 italic block w-full"
                                placeholder="Resumo das responsabilidades..."
                            />
                            
                            {/* Achievements List */}
                            {exp.achievements.length > 0 && (
                                <ul className="list-disc list-outside ml-4 space-y-1.5 marker:text-zinc-300">
                                    {exp.achievements.map((ach, i) => (
                                        <li key={i} className="text-sm text-zinc-700 pl-1">{ach}</li>
                                    ))}
                                </ul>
                            )}

                            {/* Stack Chips */}
                            {exp.stack.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3 pt-2 border-t border-dashed border-zinc-100">
                                    {exp.stack.map((tech, i) => (
                                        <span key={i} className="text-[10px] uppercase font-semibold tracking-wide text-zinc-500 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                                            {tech}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {data.experience.length === 0 && (
                        <div className="text-sm text-muted-foreground italic border-2 border-dashed border-zinc-100 p-6 rounded-lg text-center print:hidden bg-zinc-50/50">
                            Adicione suas experiências profissionais no editor lateral.
                        </div>
                    )}
                </div>
            </section>

            {/* 4. PROJECTS */}
            {data.projects.length > 0 && (
                <section className="page-break-inside-avoid">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 mb-5 border-b border-zinc-200 pb-2 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-zinc-400" /> Projetos Relevantes
                    </h2>
                    <div className="space-y-6">
                        {data.projects.map(proj => (
                            <div key={proj.id} className="bg-zinc-50 p-5 rounded-lg border border-zinc-200/60 page-break-inside-avoid">
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <EditableText 
                                            tagName="h3"
                                            value={proj.title} 
                                            onChange={(val) => updateProject(proj.id, 'title', val)} 
                                            className="font-bold text-base text-zinc-900 block"
                                            placeholder="Nome do Projeto"
                                        />
                                        <EditableText 
                                            tagName="p"
                                            value={proj.role} 
                                            onChange={(val) => updateProject(proj.id, 'role', val)} 
                                            className="text-xs text-zinc-500 block uppercase tracking-wide mt-0.5"
                                            placeholder="SUA FUNÇÃO"
                                        />
                                    </div>
                                    <div className="flex gap-2 text-xs">
                                        {proj.liveLink && <span className="flex items-center gap-1 text-zinc-400"><Globe className="h-3 w-3"/> Live</span>}
                                        {proj.repoLink && <span className="flex items-center gap-1 text-zinc-400"><Github className="h-3 w-3"/> Code</span>}
                                    </div>
                                </div>
                                
                                <div className="space-y-3 text-sm text-zinc-700">
                                    <div className="flex gap-2 items-start">
                                        <span className="font-semibold text-zinc-900 shrink-0 text-xs uppercase mt-0.5 bg-zinc-200 px-1.5 rounded">Desafio</span> 
                                        <EditableText multiline value={proj.problem} onChange={(val) => updateProject(proj.id, 'problem', val)} className="flex-1" placeholder="Descreva o problema..." tagName="span" />
                                    </div>
                                    <div className="flex gap-2 items-start">
                                        <span className="font-semibold text-emerald-700 shrink-0 text-xs uppercase mt-0.5 bg-emerald-100 px-1.5 rounded">Impacto</span> 
                                        <EditableText multiline value={proj.impact} onChange={(val) => updateProject(proj.id, 'impact', val)} className="flex-1 text-emerald-900 font-medium" placeholder="Resultados alcançados..." tagName="span" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>

        {/* COLUNA DIREITA (Lateral) */}
        <div className="space-y-10">
            
            {/* 5. SKILLS */}
            <section className="page-break-inside-avoid">
                <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 border-b border-zinc-200 pb-1 flex items-center gap-2">
                    <Code className="h-3.5 w-3.5" /> Habilidades
                </h2>
                
                {(data.skills.languages.length > 0 || data.skills.frameworks.length > 0) && (
                    <div className="mb-5">
                        <h3 className="text-xs font-semibold text-zinc-900 mb-2">Tech Stack</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {[...data.skills.languages, ...data.skills.frameworks].map((s, i) => (
                                <span key={i} className="text-xs font-medium text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-1 rounded">
                                    {s.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {data.skills.tools.length > 0 && (
                    <div>
                        <h3 className="text-xs font-semibold text-zinc-900 mb-2">Ferramentas</h3>
                        <div className="flex flex-wrap gap-1.5">
                            {data.skills.tools.map((s, i) => (
                                <span key={i} className="text-xs font-medium text-zinc-600 bg-white border border-zinc-200 px-2 py-1 rounded">
                                    {s.name}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            {/* 6. EDUCATION */}
            {data.education.length > 0 && (
                <section className="page-break-inside-avoid">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 border-b border-zinc-200 pb-1 flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5" /> Educação
                    </h2>
                    <div className="space-y-4">
                        {data.education.map(edu => (
                            <div key={edu.id}>
                                <h3 className="font-bold text-sm text-zinc-900 leading-tight">{edu.institution}</h3>
                                <p className="text-xs text-zinc-600 mt-0.5">{edu.degree}</p>
                                <p className="text-[10px] font-mono text-zinc-400 mt-1">{edu.dates}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* 7. TESTIMONIALS */}
            {data.testimonials.length > 0 && (
                <section className="page-break-inside-avoid">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-3 border-b border-zinc-200 pb-1 flex items-center gap-2">
                        <MessageSquare className="h-3.5 w-3.5" /> Recomendações
                    </h2>
                    <div className="space-y-4">
                        {data.testimonials.map(test => (
                            <div key={test.id} className="bg-zinc-50/80 p-3 rounded-lg border border-zinc-100 text-xs">
                                <p className="text-zinc-600 italic leading-relaxed mb-2">&quot;{test.text}&quot;</p>
                                <div className="font-semibold text-zinc-800">
                                    {test.authorName}
                                </div>
                                <div className="text-[10px] text-zinc-500 leading-tight">
                                    {test.authorRole}, {test.company}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

        </div>
      </div>
    </div>
  );
}