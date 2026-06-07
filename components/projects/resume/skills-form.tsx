"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Code2, Heart } from "lucide-react";
import { PortfolioData, Proficiency } from "@/types/portfolio";

interface SkillsFormProps {
  data: PortfolioData;
  onChange: (data: PortfolioData) => void;
}

interface SkillCategoryProps {
  title: string;
  category: 'languages' | 'frameworks' | 'tools';
  data: PortfolioData;
  onAdd: (category: 'languages' | 'frameworks' | 'tools') => void;
  onRemove: (category: 'languages' | 'frameworks' | 'tools', index: number) => void;
  onUpdate: (category: 'languages' | 'frameworks' | 'tools', index: number, field: 'name' | 'proficiency', value: string) => void;
}

const SkillCategory = ({ title, category, data, onAdd, onRemove, onUpdate }: SkillCategoryProps) => (
  <div className="space-y-4 bg-muted/10 border border-border/40 p-5 rounded-[1.5rem]">
    <div className="flex justify-between items-center border-b border-border/40 pb-3">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
            <Code2 className="h-3 w-3" />
        </div>
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</Label>
      </div>
      <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg bg-background shadow-sm hover:bg-primary/10 hover:text-primary" onClick={() => onAdd(category)}>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    </div>
    
    <div className="grid grid-cols-1 gap-3">
      {data.skills[category].map((skill, index) => (
        <div key={index} className="flex gap-2 items-center group">
          <Input 
            value={skill.name} 
            onChange={(e) => onUpdate(category, index, "name", e.target.value)} 
            placeholder="Ex: React"
            className="h-10 text-sm bg-background border-border/50 rounded-xl shadow-inner font-medium"
          />
          <Select 
            value={skill.proficiency} 
            onValueChange={(val) => onUpdate(category, index, "proficiency", val)}
          >
            <SelectTrigger className="h-10 w-[130px] text-xs bg-background border-border/50 rounded-xl shadow-inner font-bold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Beginner" className="text-xs font-bold">Iniciante</SelectItem>
              <SelectItem value="Intermediate" className="text-xs font-bold text-amber-500">Interm.</SelectItem>
              <SelectItem value="Advanced" className="text-xs font-bold text-emerald-500">Avançado</SelectItem>
              <SelectItem value="Expert" className="text-xs font-bold text-purple-500">Expert</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all rounded-xl"
            onClick={() => onRemove(category, index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {data.skills[category].length === 0 && (
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 text-center py-4 border-2 border-dashed border-border/40 rounded-xl">
          Nenhuma habilidade listada.
        </p>
      )}
    </div>
  </div>
);

// --- Soft Skills (tags livres) ---
const SoftSkills = ({ data, onChange }: SkillsFormProps) => {
  const [input, setInput] = useState("");

  const addTag = () => {
    const val = input.trim();
    if (!val || data.skills.softSkills.includes(val)) { setInput(""); return; }
    onChange({ ...data, skills: { ...data.skills, softSkills: [...data.skills.softSkills, val] } });
    setInput("");
  };

  const removeTag = (tag: string) => onChange({ ...data, skills: { ...data.skills, softSkills: data.skills.softSkills.filter(t => t !== tag) } });

  return (
    <div className="space-y-4 bg-muted/10 border border-border/40 p-5 rounded-[1.5rem]">
      <div className="flex items-center gap-2 border-b border-border/40 pb-3">
        <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center text-primary">
          <Heart className="h-3 w-3" />
        </div>
        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Soft Skills</Label>
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
          placeholder="Ex: Trabalho em equipe (Enter para adicionar)"
          className="h-10 text-sm bg-background border-border/50 rounded-xl shadow-inner font-medium"
        />
        <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0 rounded-xl bg-background shadow-sm hover:bg-primary/10 hover:text-primary" onClick={addTag}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {data.skills.softSkills.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {data.skills.softSkills.map(tag => (
            <span key={tag} className="group flex items-center gap-1.5 text-[11px] font-bold text-foreground bg-background border border-border/50 px-3 py-1.5 rounded-lg shadow-sm">
              {tag}
              <button onClick={() => removeTag(tag)} className="text-muted-foreground/50 hover:text-destructive transition-colors">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 text-center py-4 border-2 border-dashed border-border/40 rounded-xl">
          Nenhuma soft skill listada.
        </p>
      )}
    </div>
  );
};

export function SkillsForm({ data, onChange }: SkillsFormProps) {

  const addSkill = (category: 'languages' | 'frameworks' | 'tools') => {
    const newSkill = { name: "", proficiency: "Advanced" as Proficiency };
    onChange({
      ...data,
      skills: { ...data.skills, [category]: [...data.skills[category], newSkill] }
    });
  };

  const removeSkill = (category: 'languages' | 'frameworks' | 'tools', index: number) => {
    const newArr = [...data.skills[category]];
    newArr.splice(index, 1);
    onChange({ ...data, skills: { ...data.skills, [category]: newArr } });
  };

  const updateSkill = (category: 'languages' | 'frameworks' | 'tools', index: number, field: 'name' | 'proficiency', value: string) => {
    const newArr = [...data.skills[category]];
    newArr[index] = { ...newArr[index], [field]: value };
    onChange({ ...data, skills: { ...data.skills, [category]: newArr } });
  };

  return (
    <div className="space-y-6">
      <SkillCategory title="Linguagens de Programação" category="languages" data={data} onAdd={addSkill} onRemove={removeSkill} onUpdate={updateSkill} />
      <SkillCategory title="Frameworks & Bibliotecas" category="frameworks" data={data} onAdd={addSkill} onRemove={removeSkill} onUpdate={updateSkill} />
      <SkillCategory title="Ferramentas & DevOps" category="tools" data={data} onAdd={addSkill} onRemove={removeSkill} onUpdate={updateSkill} />
      <SoftSkills data={data} onChange={onChange} />
    </div>
  );
}