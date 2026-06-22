"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Building2 } from "lucide-react";
import { PortfolioData } from "@/types/portfolio";

interface ExperienceFormProps {
  data: PortfolioData;
  onChange: (data: PortfolioData) => void;
}

export function ExperienceForm({ data, onChange }: ExperienceFormProps) {
  const addExperience = () => {
    const newExp = { id: crypto.randomUUID(), company: "", role: "", startDate: "", endDate: "", location: "", summary: "", achievements: [], stack: [] };
    onChange({ ...data, experience: [...data.experience, newExp] });
  };

  const removeExperience = (id: string) => onChange({ ...data, experience: data.experience.filter((exp) => exp.id !== id) });

  const updateExperience = (id: string, field: string, value: string | string[]) => {
    onChange({
      ...data,
      experience: data.experience.map((exp) => exp.id === id ? { ...exp, [field]: value } : exp),
    });
  };

  const handleStackChange = (id: string, value: string) => {
    const stackArray = value.split(",").map((s) => s.trim()).filter(Boolean);
    updateExperience(id, "stack", stackArray);
  };

  const handleAchievementsChange = (id: string, value: string) => {
    const achievementsArray = value.split("\n").map((s) => s.trim()).filter(Boolean);
    updateExperience(id, "achievements", achievementsArray);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-border/40 pb-4">
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" /> Histórico Profissional
          </h3>
          <p className="text-xs text-muted-foreground">Registre sua evolução de carreira.</p>
        </div>
        <Button size="sm" onClick={addExperience} className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg hover:scale-105 transition-all">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <div className="space-y-6">
        {data.experience.map((exp, index) => (
          <div key={exp.id} className="relative group border border-border/40 bg-card rounded-[2rem] p-8 shadow-xl">
            <Button
              size="icon" variant="destructive"
              aria-label="Remover experiência"
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg"
              onClick={() => removeExperience(exp.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="mb-6">
              <span className="bg-primary/10 text-primary text-[9px] uppercase tracking-widest font-black px-3 py-1 rounded-lg border border-primary/20">
                POSIÇÃO #{index + 1}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Empresa / Instituição</Label>
                <Input 
                  value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} 
                  placeholder="Ex: Tech Solutions Inc." className="h-11 bg-muted/30 border-border/50 rounded-xl font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cargo Ocupado</Label>
                <Input 
                  value={exp.role} onChange={(e) => updateExperience(exp.id, "role", e.target.value)} 
                  placeholder="Ex: Senior Developer" className="h-11 bg-muted/30 border-border/50 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Período de Atuação</Label>
                <div className="flex gap-2">
                    <Input value={exp.startDate} onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} placeholder="Início" className="h-11 bg-muted/30 border-border/50 rounded-xl" />
                    <Input value={exp.endDate} onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)} placeholder="Fim (ou Atual)" className="h-11 bg-muted/30 border-border/50 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Tecnologias Usadas</Label>
                <Input 
                  defaultValue={exp.stack.join(", ")} onBlur={(e) => handleStackChange(exp.id, e.target.value)} 
                  placeholder="React, Node.js, AWS (separadas por vírgula)" className="h-11 bg-muted/30 border-border/50 rounded-xl font-mono text-xs"
                />
              </div>
              
              <div className="col-span-1 md:col-span-2 space-y-2 pt-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Resumo da Responsabilidade</Label>
                <Textarea 
                  value={exp.summary} onChange={(e) => updateExperience(exp.id, "summary", e.target.value)} 
                  placeholder="Fui responsável por liderar a migração..." className="min-h-[80px] bg-muted/30 border-border/50 rounded-xl resize-none leading-relaxed"
                />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-2 bg-primary/5 p-4 rounded-[1.5rem] border border-primary/10">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex justify-between">
                  <span>Conquistas e Métricas</span>
                  <span className="text-muted-foreground/50 lowercase font-medium tracking-normal text-xs">Pressione ENTER para separar itens</span>
                </Label>
                <Textarea 
                  defaultValue={exp.achievements.join("\n")} onBlur={(e) => handleAchievementsChange(exp.id, e.target.value)} 
                  placeholder="Aumentei a conversão em 20% após reescrever o checkout..." className="min-h-[100px] bg-background border-border/40 rounded-xl text-sm resize-none"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {data.experience.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-border/40 rounded-[2rem] text-muted-foreground/50 text-sm font-black uppercase tracking-widest">
          Nenhuma experiência registrada.
        </div>
      )}
    </div>
  );
}