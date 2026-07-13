"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Link as LinkIcon, Github, LayoutTemplate, Target, Zap } from "lucide-react";
import { PortfolioData } from "@/types/portfolio";
import { SmartTextarea } from "./smart-textarea";
import { BrainDumpBox } from "./brain-dump-box";
import { ReorderControls, moveItem } from "./reorder-controls";
import { parseProjectsFromText } from "@/app/(dashboard)/jobs/resume-ai-actions";

interface ProjectsFormProps {
  data: PortfolioData;
  onChange: (data: PortfolioData) => void;
}

export function ProjectsForm({ data, onChange }: ProjectsFormProps) {
  const addProject = () => {
    const newProj = {
      id: crypto.randomUUID(),
      title: "", role: "", duration: "", problem: "", solution: "", impact: "", stack: [], liveLink: "", repoLink: ""
    };
    onChange({ ...data, projects: [...data.projects, newProj] });
  };

  const removeProject = (id: string) => onChange({ ...data, projects: data.projects.filter((p) => p.id !== id) });

  const moveProject = (index: number, dir: -1 | 1) => onChange({ ...data, projects: moveItem(data.projects, index, dir) });

  const updateProject = (id: string, field: string, value: string) => {
    onChange({
      ...data,
      projects: data.projects.map((p) => p.id === id ? { ...p, [field]: value } : p),
    });
  };

  // Brain dump: IA estrutura texto livre em projetos e adiciona ao formulário.
  const handleBrainDump = async (text: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> => {
    const res = await parseProjectsFromText(text);
    if (!res.success) return { ok: false, error: res.error };
    const created = res.items.map((it) => ({ id: crypto.randomUUID(), ...it }));
    onChange({ ...data, projects: [...data.projects, ...created] });
    return { ok: true, count: created.length };
  };

  return (
    <div className="space-y-6 bg-card border border-border/40 p-6 md:p-8 rounded-[2rem] shadow-sm">
      
      {/* HEADER DA SEÇÃO */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <LayoutTemplate className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
              Case Studies
            </h3>
            <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
              Projetos de destaque para o portfólio
            </p>
          </div>
        </div>
        <Button 
          size="sm" 
          onClick={addProject} 
          className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-sm hover:scale-105 transition-all w-full sm:w-auto"
        >
          <Plus className="h-4 w-4" /> Novo Projeto
        </Button>
      </div>

      <BrainDumpBox
        title="Adicionar projeto com IA"
        description="Descreva o projeto livremente — a IA separa desafio, impacto e stack."
        placeholder="Ex.: Fiz o site luixzsouza.com.br, um portfólio com design system próprio em Next.js e Tailwind, pra centralizar minha marca e cases. github.com/LuixzSouza..."
        onParse={handleBrainDump}
      />

      {/* GRID DE PROJETOS */}
      <div className="grid grid-cols-1 xl:grid-cols-1 gap-8">
        {data.projects.map((proj, index) => (
          <div 
            key={proj.id} 
            className="relative group border border-border/60 bg-muted/10 rounded-[1.5rem] p-5 md:p-6 shadow-sm hover:border-primary/30 transition-all"
          >
            {/* Cabeçalho do Card */}
            <div className="flex justify-between items-center mb-5 border-b border-border/40 pb-3">
              <div className="flex items-center gap-3">
                <span className="bg-primary/10 text-primary text-[9px] uppercase tracking-widest font-black px-3 py-1.5 rounded-lg border border-primary/20">
                  PROJETO #{index + 1}
                </span>
                <ReorderControls
                  index={index}
                  count={data.projects.length}
                  onMove={(dir) => moveProject(index, dir)}
                  orientation="horizontal"
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                onClick={() => removeProject(proj.id)}
                title="Excluir Projeto"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-5">
              {/* Título */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                  Título da Missão
                </Label>
                <Input 
                  value={proj.title} 
                  onChange={(e) => updateProject(proj.id, "title", e.target.value)} 
                  placeholder="Ex: Plataforma SaaS de Vendas"
                  className="h-11 bg-background border-border/50 rounded-xl shadow-inner font-bold focus-visible:ring-primary/20"
                />
              </div>

              {/* Função e Duração */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Função/Cargo
                    </Label>
                    <Input 
                      value={proj.role} 
                      onChange={(e) => updateProject(proj.id, "role", e.target.value)} 
                      placeholder="Ex: Lead Frontend" 
                      className="h-11 bg-background border-border/50 rounded-xl shadow-inner focus-visible:ring-primary/20" 
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Duração
                    </Label>
                    <Input 
                      value={proj.duration} 
                      onChange={(e) => updateProject(proj.id, "duration", e.target.value)} 
                      placeholder="Ex: 3 meses" 
                      className="h-11 bg-background border-border/50 rounded-xl shadow-inner focus-visible:ring-primary/20" 
                    />
                </div>
              </div>

              {/* Estrutura do Case Study (Problema e Impacto) */}
              <div className="space-y-4 border-l-2 border-primary/30 pl-4 py-2 bg-primary/5 rounded-r-2xl pr-4">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                        <Target className="h-3 w-3 text-primary" /> Desafio (Problema)
                      </Label>
                      <SmartTextarea
                          label={`Desafio — ${proj.title || "projeto"}`}
                          value={proj.problem}
                          onChange={(v) => updateProject(proj.id, "problem", v)}
                          placeholder="O cliente tinha um processo manual que tomava 5 horas..."
                          polishKind="project-problem"
                          polishContext={[proj.title, proj.role, proj.stack.join(", ")].filter(Boolean).join(" · ")}
                          minHeight={70}
                          className="bg-background text-sm shadow-inner"
                      />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500 flex items-center gap-1.5">
                        <Zap className="h-3 w-3" /> Resultados (Impacto)
                      </Label>
                      <SmartTextarea
                          label={`Impacto — ${proj.title || "projeto"}`}
                          value={proj.impact}
                          onChange={(v) => updateProject(proj.id, "impact", v)}
                          placeholder="Automação reduziu o tempo para 10 minutos (redução de 96%)..."
                          polishKind="project-impact"
                          polishContext={[proj.title, proj.role, proj.stack.join(", ")].filter(Boolean).join(" · ")}
                          minHeight={70}
                          className="bg-background text-sm border-emerald-500/20 shadow-inner"
                      />
                  </div>
              </div>

              {/* Links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/40">
                  <div className="space-y-2 mt-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                        <LinkIcon className="h-3 w-3" /> Live URL
                      </Label>
                      <Input 
                        value={proj.liveLink || ""} 
                        onChange={(e) => updateProject(proj.id, "liveLink", e.target.value)} 
                        className="h-11 bg-background border-border/50 rounded-xl shadow-inner focus-visible:ring-primary/20 font-mono text-xs" 
                        placeholder="https://..." 
                      />
                  </div>
                  <div className="space-y-2 mt-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1.5">
                        <Github className="h-3 w-3" /> Repo URL
                      </Label>
                      <Input 
                        value={proj.repoLink || ""} 
                        onChange={(e) => updateProject(proj.id, "repoLink", e.target.value)} 
                        className="h-11 bg-background border-border/50 rounded-xl shadow-inner focus-visible:ring-primary/20 font-mono text-xs" 
                        placeholder="github.com/..." 
                      />
                  </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* ESTADO VAZIO (EMPTY STATE) */}
      {data.projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-border/40 rounded-[2rem] bg-muted/5">
          <LayoutTemplate className="h-8 w-8 text-muted-foreground/20 mb-3" />
          <p className="text-muted-foreground/60 text-[11px] font-black uppercase tracking-widest">
            Nenhum projeto registrado.
          </p>
        </div>
      )}
    </div>
  );
}