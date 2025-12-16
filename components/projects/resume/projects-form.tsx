"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Link as LinkIcon, Github } from "lucide-react";
import { PortfolioData } from "@/types/portfolio";

interface ProjectsFormProps {
  data: PortfolioData;
  onChange: (data: PortfolioData) => void;
}

export function ProjectsForm({ data, onChange }: ProjectsFormProps) {
  
  const addProject = () => {
    const newProj = {
      id: crypto.randomUUID(),
      title: "",
      role: "",
      duration: "",
      problem: "",
      solution: "",
      impact: "",
      stack: [],
      liveLink: "",
      repoLink: ""
    };
    onChange({ ...data, projects: [...data.projects, newProj] });
  };

  const removeProject = (id: string) => {
    onChange({ ...data, projects: data.projects.filter((p) => p.id !== id) });
  };

  // Fixed type: 'value' is now explicitly typed as string
  const updateProject = (id: string, field: string, value: string) => {
    onChange({
      ...data,
      projects: data.projects.map((p) =>
        p.id === id ? { ...p, [field]: value } : p
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Projetos de destaque (Case Studies).</p>
        <Button size="sm" variant="outline" onClick={addProject} className="gap-2">
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>

      <div className="space-y-4">
        {data.projects.map((proj, index) => (
          <Card key={proj.id} className="relative group border-border/60 bg-muted/10">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeProject(proj.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-1 rounded">PROJETO #{index + 1}</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Título do Projeto</Label>
                  <Input 
                    value={proj.title} 
                    onChange={(e) => updateProject(proj.id, "title", e.target.value)} 
                    placeholder="Ex: Plataforma SaaS de Vendas"
                    className="bg-background font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs">Sua Função</Label>
                        <Input value={proj.role} onChange={(e) => updateProject(proj.id, "role", e.target.value)} placeholder="Lead Frontend" className="bg-background" />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs">Duração</Label>
                        <Input value={proj.duration} onChange={(e) => updateProject(proj.id, "duration", e.target.value)} placeholder="3 meses" className="bg-background" />
                    </div>
                </div>

                {/* Estrutura de Case Study */}
                <div className="space-y-2 border-l-2 border-primary/20 pl-3 py-1">
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold">Problema (Desafio)</Label>
                        <Textarea 
                            value={proj.problem} 
                            onChange={(e) => updateProject(proj.id, "problem", e.target.value)} 
                            placeholder="O cliente tinha um processo manual lento..."
                            className="bg-background min-h-[50px] text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs font-semibold text-emerald-600">Impacto (Resultados)</Label>
                        <Textarea 
                            value={proj.impact} 
                            onChange={(e) => updateProject(proj.id, "impact", e.target.value)} 
                            placeholder="Redução de 40% no tempo de carregamento..."
                            className="bg-background min-h-[50px] text-xs"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1 relative">
                        <Label className="text-xs flex items-center gap-1"><LinkIcon className="h-3 w-3" /> Live URL</Label>
                        <Input value={proj.liveLink || ""} onChange={(e) => updateProject(proj.id, "liveLink", e.target.value)} className="bg-background" />
                    </div>
                    <div className="space-y-1 relative">
                        <Label className="text-xs flex items-center gap-1"><Github className="h-3 w-3" /> Repo URL</Label>
                        <Input value={proj.repoLink || ""} onChange={(e) => updateProject(proj.id, "repoLink", e.target.value)} className="bg-background" />
                    </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}