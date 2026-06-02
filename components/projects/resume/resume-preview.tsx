"use client";

import { PortfolioData } from "@/types/portfolio";
import { 
  MapPin, Mail, Phone, Globe, Linkedin, Github, ExternalLink
} from "lucide-react";
import { EditableText } from "./editable-text";
import { cn } from "@/lib/utils";

interface ResumePreviewProps {
  data: PortfolioData;
  onChange: (data: PortfolioData) => void;
}

export function ResumePreview({ data, onChange }: ResumePreviewProps) {
  
  // Helpers para atualização aninhada
  const updateHero = (field: string, val: string) => onChange({ ...data, hero: { ...data.hero, [field]: val } });
  const updateAbout = (field: string, val: string) => onChange({ ...data, about: { ...data.about, [field]: val } });
  const updateExperience = (id: string, field: string, val: string) => onChange({ ...data, experience: data.experience.map(e => e.id === id ? { ...e, [field]: val } : e) });
  const updateProject = (id: string, field: string, val: string) => onChange({ ...data, projects: data.projects.map(p => p.id === id ? { ...p, [field]: val } : p) });

  return (
    <div className="p-[12mm] md:p-[15mm] h-full flex flex-col font-sans text-zinc-900 leading-relaxed bg-white selection:bg-zinc-200">
      
      {/* 1. HEADER (Identidade e Contato) */}
      <header className="border-b-4 border-zinc-900 pb-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="w-full md:w-[65%] flex items-center gap-5">
          {data.hero.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.hero.photoUrl}
              alt={data.hero.name}
              className="h-24 w-24 rounded-2xl object-cover border-2 border-zinc-900 shrink-0 grayscale"
            />
          )}
          <div className="min-w-0">
            <EditableText
                tagName="h1"
                value={data.hero.name}
                onChange={(val) => updateHero('name', val)}
                className="text-4xl md:text-5xl font-black uppercase tracking-tighter text-zinc-900 leading-[0.9] mb-3 block w-full break-words"
                placeholder="NOME COMPLETO"
            />
            <EditableText
                tagName="p"
                value={data.hero.headline}
                onChange={(val) => updateHero('headline', val)}
                className="text-base md:text-lg font-bold tracking-tight text-zinc-500 uppercase block w-full break-words"
                placeholder="SEU CARGO / ESPECIALIDADE"
            />
          </div>
        </div>
        
        {/* Informações de Contato Alinhadas à Direita - Adicionado break-all para não vazar */}
        <div className="w-full md:w-[35%] flex flex-col items-start md:items-end gap-1.5 text-xs font-semibold text-zinc-600 shrink-0">
            <div className="flex items-center gap-2 max-w-full">
                <EditableText value={data.hero.email} onChange={(val) => updateHero('email', val)} placeholder="email@exemplo.com" tagName="span" className="break-all text-right" />
                <Mail className="h-3 w-3 text-zinc-400 shrink-0" /> 
            </div>
            <div className="flex items-center gap-2 max-w-full">
                <EditableText value={data.hero.phone} onChange={(val) => updateHero('phone', val)} placeholder="(00) 00000-0000" tagName="span" className="font-mono text-right" />
                <Phone className="h-3 w-3 text-zinc-400 shrink-0" />
            </div>
            <div className="flex items-center gap-2 max-w-full">
                <EditableText value={data.hero.location} onChange={(val) => updateHero('location', val)} placeholder="Cidade, UF" tagName="span" className="break-words text-right" />
                <MapPin className="h-3 w-3 text-zinc-400 shrink-0" />
            </div>
            <div className="flex items-center gap-2 max-w-full">
                <EditableText value={data.hero.website} onChange={(val) => updateHero('website', val)} placeholder="seusite.com" tagName="span" className="break-all text-right" />
                <Globe className="h-3 w-3 text-zinc-400 shrink-0" />
            </div>
        </div>
      </header>

      {/* 2. CORPO DO CURRÍCULO (Grid 2 Colunas Fixas para A4) */}
      <div className="grid grid-cols-[1fr_240px] gap-10">
        
        {/* COLUNA ESQUERDA (Experiência e Projetos) */}
        <div className="space-y-10 min-w-0"> {/* min-w-0 impede que o flex/grid estoure com links longos */}
            
            {/* SOBRE MIM */}
            {data.about.short && (
                <section>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-zinc-900 rounded-sm inline-block shrink-0" /> Resumo Estratégico
                    </h2>
                    <EditableText 
                        tagName="p" multiline
                        value={data.about.short} 
                        onChange={(val) => updateAbout('short', val)} 
                        className="text-sm font-medium text-zinc-800 leading-relaxed text-justify break-words"
                        placeholder="Escreva um resumo impactante sobre sua carreira..."
                    />
                </section>
            )}

            {/* EXPERIÊNCIA */}
            {data.experience.length > 0 && (
                <section>
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-5 flex items-center gap-2">
                        <span className="w-2 h-2 bg-zinc-900 rounded-sm inline-block shrink-0" /> Experiência Profissional
                    </h2>
                    <div className="space-y-8">
                        {data.experience.map((exp) => (
                            <div key={exp.id} className="relative pl-4 border-l-2 border-zinc-200 break-inside-avoid">
                                <div className="absolute w-2.5 h-2.5 bg-white border-2 border-zinc-900 rounded-full -left-[7px] top-1.5" />
                                
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-baseline mb-1 gap-2">
                                    <EditableText 
                                        tagName="h3" value={exp.role} onChange={(val) => updateExperience(exp.id, 'role', val)} 
                                        className="font-bold text-base text-zinc-900 uppercase tracking-tight break-words" placeholder="Cargo"
                                    />
                                    <div className="text-[10px] font-mono font-bold text-zinc-500 bg-zinc-100 px-2 py-1 rounded-md shrink-0 border border-zinc-200">
                                        <EditableText value={exp.startDate} onChange={(val) => updateExperience(exp.id, 'startDate', val)} placeholder="Início" tagName="span" /> 
                                        {" "}-{" "}
                                        <EditableText value={exp.endDate} onChange={(val) => updateExperience(exp.id, 'endDate', val)} placeholder="Fim" tagName="span" />
                                    </div>
                                </div>
                                
                                <div className="text-sm font-bold text-zinc-600 mb-3 flex flex-wrap gap-x-2 gap-y-1 items-center">
                                    <EditableText value={exp.company} onChange={(val) => updateExperience(exp.id, 'company', val)} placeholder="Empresa" tagName="span" className="break-words" />
                                    <span className="text-zinc-300">•</span>
                                    <EditableText value={exp.location} onChange={(val) => updateExperience(exp.id, 'location', val)} placeholder="Local" tagName="span" className="font-medium break-words" />
                                </div>
                                
                                <EditableText 
                                    tagName="p" multiline value={exp.summary} onChange={(val) => updateExperience(exp.id, 'summary', val)} 
                                    className="text-[13px] text-zinc-700 mb-3 leading-relaxed break-words" placeholder="Resumo das responsabilidades..."
                                />
                                
                                {exp.achievements.length > 0 && (
                                    <ul className="space-y-1.5 mb-3">
                                        {exp.achievements.map((ach, i) => (
                                            <li key={i} className="text-[13px] text-zinc-700 flex items-start gap-2 break-words">
                                                <span className="text-zinc-400 mt-1.5 text-[8px] shrink-0">▶</span>
                                                <span className="flex-1 leading-relaxed">{ach}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}

                                {exp.stack.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {exp.stack.map((tech, i) => (
                                            <span key={i} className="text-[9px] font-mono font-bold uppercase text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded-sm">
                                                {tech}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* PROJETOS */}
            {data.projects.length > 0 && (
                <section className="break-inside-avoid">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-5 flex items-center gap-2">
                        <span className="w-2 h-2 bg-zinc-900 rounded-sm inline-block shrink-0" /> Projetos em Destaque
                    </h2>
                    <div className="grid grid-cols-1 gap-5">
                        {data.projects.map(proj => (
                            <div key={proj.id} className="border border-zinc-200 p-4 rounded-xl bg-zinc-50/50 break-inside-avoid">
                                <div className="flex justify-between items-start mb-2 gap-4">
                                    <div className="min-w-0">
                                        <EditableText 
                                            tagName="h3" value={proj.title} onChange={(val) => updateProject(proj.id, 'title', val)} 
                                            className="font-bold text-sm text-zinc-900 uppercase tracking-tight break-words" placeholder="Nome do Projeto"
                                        />
                                        <EditableText 
                                            tagName="p" value={proj.role} onChange={(val) => updateProject(proj.id, 'role', val)} 
                                            className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1 break-words" placeholder="SUA FUNÇÃO"
                                        />
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-2 text-[10px] font-bold font-mono shrink-0 items-end">
                                        {proj.repoLink && <span className="flex items-center gap-1 text-zinc-500 border border-zinc-200 px-2 py-1 rounded bg-white max-w-[100px] truncate"><Github className="h-3 w-3 shrink-0"/> Code</span>}
                                        {proj.liveLink && <span className="flex items-center gap-1 text-zinc-900 border border-zinc-900 px-2 py-1 rounded bg-zinc-100 max-w-[100px] truncate"><ExternalLink className="h-3 w-3 shrink-0"/> Live</span>}
                                    </div>
                                </div>
                                
                                <div className="space-y-2 mt-3">
                                    <div className="text-[13px] leading-relaxed flex gap-2">
                                        <span className="font-bold text-zinc-900 shrink-0">Problema:</span> 
                                        <EditableText multiline value={proj.problem} onChange={(val) => updateProject(proj.id, 'problem', val)} className="text-zinc-700 break-words" placeholder="Descreva o problema..." tagName="span" />
                                    </div>
                                    <div className="text-[13px] leading-relaxed flex gap-2">
                                        <span className="font-bold text-zinc-900 shrink-0">Solução & Impacto:</span> 
                                        <EditableText multiline value={proj.impact} onChange={(val) => updateProject(proj.id, 'impact', val)} className="text-zinc-700 font-medium break-words" placeholder="Resultados alcançados..." tagName="span" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* CERTIFICAÇÕES */}
            {data.certifications.length > 0 && (
                <section className="break-inside-avoid">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-5 flex items-center gap-2">
                        <span className="w-2 h-2 bg-zinc-900 rounded-sm inline-block shrink-0" /> Cursos & Certificações
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {data.certifications.map(cert => (
                            <div key={cert.id} className="border border-zinc-200 p-3 rounded-lg bg-zinc-50/50 break-inside-avoid">
                                <h3 className="font-bold text-[13px] text-zinc-900 leading-tight break-words">{cert.name}</h3>
                                <p className="text-[11px] font-medium text-zinc-600 mt-0.5 break-words">{cert.issuer}</p>
                                {cert.date && <p className="text-[10px] font-mono font-bold text-zinc-400 mt-1 break-words">{cert.date}</p>}
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </div>

        {/* COLUNA DIREITA (Sidebar Tática) */}
        <div className="space-y-10 min-w-0">
            
            {/* SKILLS */}
            {(data.skills.languages.length > 0 || data.skills.frameworks.length > 0 || data.skills.tools.length > 0) && (
                <section className="break-inside-avoid">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-200 pb-2">
                        Tech Stack
                    </h2>
                    
                    {data.skills.languages.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 mb-2">Linguagens</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {data.skills.languages.map((s, i) => (
                                    <span key={i} className="text-[10px] font-mono font-bold text-white bg-zinc-900 px-2 py-1 rounded-sm shadow-sm break-words">
                                        {s.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {data.skills.frameworks.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 mb-2">Frameworks</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {data.skills.frameworks.map((s, i) => (
                                    <span key={i} className="text-[10px] font-bold text-zinc-800 bg-zinc-100 border border-zinc-300 px-2 py-1 rounded-sm break-words">
                                        {s.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {data.skills.tools.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-900 mb-2">Ferramentas / Ops</h3>
                            <div className="flex flex-wrap gap-1.5">
                                {data.skills.tools.map((s, i) => (
                                    <span key={i} className="text-[10px] font-medium text-zinc-600 bg-white border border-zinc-200 px-2 py-1 rounded-sm break-words">
                                        {s.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}

            {/* SOFT SKILLS */}
            {data.skills.softSkills.length > 0 && (
                <section className="break-inside-avoid">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-200 pb-2">
                        Soft Skills
                    </h2>
                    <div className="flex flex-wrap gap-1.5">
                        {data.skills.softSkills.map((s, i) => (
                            <span key={i} className="text-[10px] font-medium text-zinc-700 bg-zinc-100 border border-zinc-200 px-2 py-1 rounded-sm break-words">
                                {s}
                            </span>
                        ))}
                    </div>
                </section>
            )}

            {/* IDIOMAS */}
            {data.languages.length > 0 && (
                <section className="break-inside-avoid">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-200 pb-2">
                        Idiomas
                    </h2>
                    <div className="space-y-2">
                        {data.languages.map(lang => (
                            <div key={lang.id} className="flex justify-between items-baseline gap-2">
                                <span className="font-bold text-[13px] text-zinc-900 break-words">{lang.name}</span>
                                <span className="text-[10px] font-mono font-bold text-zinc-500 shrink-0">{lang.level}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* EDUCATION */}
            {data.education.length > 0 && (
                <section className="break-inside-avoid">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-200 pb-2">
                        Formação
                    </h2>
                    <div className="space-y-4">
                        {data.education.map(edu => (
                            <div key={edu.id} className="relative">
                                <h3 className="font-bold text-sm text-zinc-900 leading-tight break-words">{edu.institution}</h3>
                                <p className="text-xs font-medium text-zinc-600 mt-0.5 break-words">{edu.degree}</p>
                                <p className="text-[10px] font-mono font-bold text-zinc-400 mt-1 break-words">{edu.dates}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* TESTIMONIALS */}
            {data.testimonials.length > 0 && (
                <section className="break-inside-avoid">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 flex items-center gap-2 border-b border-zinc-200 pb-2">
                        Referências
                    </h2>
                    <div className="space-y-4">
                        {data.testimonials.map(test => (
                            <div key={test.id} className="relative text-sm">
                                <span className="text-4xl font-serif text-zinc-200 absolute -top-3 -left-2 select-none leading-none">&quot;</span>
                                <p className="text-zinc-600 italic leading-relaxed mb-2 relative z-10 text-[12px] pl-2 break-words">{test.text}</p>
                                <div className="pl-2 border-l-2 border-zinc-900 mt-2">
                                    <div className="font-bold text-zinc-900 text-xs uppercase tracking-tight break-words">
                                        {test.authorName}
                                    </div>
                                    <div className="text-[10px] font-medium text-zinc-500 break-words">
                                        {test.authorRole}, {test.company}
                                    </div>
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