"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Building2 } from "lucide-react";
import { PortfolioData } from "@/types/portfolio";
import { SmartTextarea } from "./smart-textarea";
import { BrainDumpBox } from "./brain-dump-box";
import { ReorderControls, moveItem } from "./reorder-controls";
import { parseExperienceFromText } from "@/app/(dashboard)/jobs/resume-ai-actions";

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

  const moveExperience = (index: number, dir: -1 | 1) => onChange({ ...data, experience: moveItem(data.experience, index, dir) });

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

  // Controlado: mantém linhas conforme digitadas (preserva o Enter para novo item),
  // descartando só vazios no meio — a última linha vazia fica para o cursor respirar.
  const handleAchievementsChange = (id: string, value: string) => {
    const lines = value.split("\n");
    const achievementsArray = lines.filter((l, i) => l.trim() !== "" || i === lines.length - 1);
    updateExperience(id, "achievements", achievementsArray);
  };

  // Brain dump: IA estrutura texto livre em experiências e adiciona ao formulário.
  const handleBrainDump = async (text: string): Promise<{ ok: true; count: number } | { ok: false; error: string }> => {
    const res = await parseExperienceFromText(text);
    if (!res.success) return { ok: false, error: res.error };
    const created = res.items.map((it) => ({ id: crypto.randomUUID(), ...it }));
    onChange({ ...data, experience: [...data.experience, ...created] });
    return { ok: true, count: created.length };
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

      <BrainDumpBox
        title="Adicionar experiência com IA"
        description="Cole ou escreva bagunçado — a IA organiza nos campos certos."
        placeholder="Ex.: Trabalhei na Tech Solutions de 2022 até hoje como dev pleno, mexi com React e Node, refiz o checkout e a conversão subiu 20%, também liderei 2 juniores..."
        onParse={handleBrainDump}
      />

      <div className="space-y-8">
        {data.experience.map((exp, index) => (
          <div key={exp.id} className="relative group border border-border/40 bg-card rounded-[2rem] p-6 sm:p-7 shadow-sm">
            <Button
              size="icon" variant="destructive"
              aria-label="Remover experiência"
              className="absolute -top-3 -right-3 h-8 w-8 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg"
              onClick={() => removeExperience(exp.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="mb-6 flex items-center gap-3">
              <span className="bg-primary/10 text-primary text-[9px] uppercase tracking-widest font-black px-3 py-1 rounded-lg border border-primary/20">
                POSIÇÃO #{index + 1}
              </span>
              <ReorderControls
                index={index}
                count={data.experience.length}
                onMove={(dir) => moveExperience(index, dir)}
                orientation="horizontal"
              />
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
                <SmartTextarea
                  label={`Resumo — ${exp.role || "experiência"}`}
                  value={exp.summary}
                  onChange={(v) => updateExperience(exp.id, "summary", v)}
                  placeholder="Fui responsável por liderar a migração..."
                  polishKind="experience-summary"
                  polishContext={[exp.role, exp.company, exp.stack.join(", ")].filter(Boolean).join(" · ")}
                  recommendedRange={[40, 300]}
                />
              </div>

              <div className="col-span-1 md:col-span-2 space-y-2 bg-primary/5 p-4 rounded-[1.5rem] border border-primary/10">
                <Label className="text-[10px] font-black uppercase tracking-widest text-primary flex justify-between">
                  <span>Conquistas e Métricas</span>
                  <span className="text-muted-foreground/50 lowercase font-medium tracking-normal text-xs">Uma por linha · ✨ para a IA melhorar</span>
                </Label>
                <SmartTextarea
                  label={`Conquistas — ${exp.role || "experiência"}`}
                  value={exp.achievements.join("\n")}
                  onChange={(v) => handleAchievementsChange(exp.id, v)}
                  placeholder="Aumentei a conversão em 20% após reescrever o checkout..."
                  polishKind="experience-achievements"
                  polishContext={[exp.role, exp.company, exp.stack.join(", ")].filter(Boolean).join(" · ")}
                  className="bg-background border-border/40 text-sm"
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