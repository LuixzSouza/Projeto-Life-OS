"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import { PortfolioData, Proficiency } from "@/types/portfolio";

interface SkillsFormProps {
  data: PortfolioData;
  onChange: (data: PortfolioData) => void;
}

// 1. Define Props for the helper component
interface SkillCategoryProps {
  title: string;
  category: 'languages' | 'frameworks' | 'tools';
  data: PortfolioData;
  onAdd: (category: 'languages' | 'frameworks' | 'tools') => void;
  onRemove: (category: 'languages' | 'frameworks' | 'tools', index: number) => void;
  onUpdate: (category: 'languages' | 'frameworks' | 'tools', index: number, field: 'name' | 'proficiency', value: string) => void;
}

// 2. Define the component OUTSIDE the main component
const SkillCategory = ({ title, category, data, onAdd, onRemove, onUpdate }: SkillCategoryProps) => (
  <div className="space-y-3">
    <div className="flex justify-between items-center border-b border-border pb-1">
      <Label className="text-xs font-bold uppercase text-muted-foreground">{title}</Label>
      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onAdd(category)}>
        <Plus className="h-3 w-3" />
      </Button>
    </div>
    <div className="grid grid-cols-1 gap-2">
      {data.skills[category].map((skill, index) => (
        <div key={index} className="flex gap-2 items-center group">
          <Input 
            value={skill.name} 
            onChange={(e) => onUpdate(category, index, "name", e.target.value)} 
            placeholder="Nome (ex: React)"
            className="h-8 text-sm bg-background"
          />
          <Select 
            value={skill.proficiency} 
            onValueChange={(val) => onUpdate(category, index, "proficiency", val)}
          >
            <SelectTrigger className="h-8 w-[110px] text-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Beginner">Iniciante</SelectItem>
              <SelectItem value="Intermediate">Interm.</SelectItem>
              <SelectItem value="Advanced">Avançado</SelectItem>
              <SelectItem value="Expert">Expert</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
            onClick={() => onRemove(category, index)}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
      {data.skills[category].length === 0 && (
        <p className="text-[10px] text-muted-foreground italic text-center py-2">Sem itens.</p>
      )}
    </div>
  </div>
);

export function SkillsForm({ data, onChange }: SkillsFormProps) {
  
  const addSkill = (category: 'languages' | 'frameworks' | 'tools') => {
    const newSkill = { name: "", proficiency: "Advanced" as Proficiency };
    onChange({
      ...data,
      skills: {
        ...data.skills,
        [category]: [...data.skills[category], newSkill]
      }
    });
  };

  const removeSkill = (category: 'languages' | 'frameworks' | 'tools', index: number) => {
    const newArr = [...data.skills[category]];
    newArr.splice(index, 1);
    onChange({
      ...data,
      skills: { ...data.skills, [category]: newArr }
    });
  };

  const updateSkill = (category: 'languages' | 'frameworks' | 'tools', index: number, field: 'name' | 'proficiency', value: string) => {
    const newArr = [...data.skills[category]];
    newArr[index] = { ...newArr[index], [field]: value };
    onChange({
      ...data,
      skills: { ...data.skills, [category]: newArr }
    });
  };

  return (
    <div className="space-y-6">
      <Card className="bg-muted/10 border-border/60">
        <CardContent className="p-4 space-y-6">
            <SkillCategory 
              title="Linguagens" 
              category="languages" 
              data={data} 
              onAdd={addSkill} 
              onRemove={removeSkill} 
              onUpdate={updateSkill} 
            />
            <SkillCategory 
              title="Frameworks & Libs" 
              category="frameworks" 
              data={data} 
              onAdd={addSkill} 
              onRemove={removeSkill} 
              onUpdate={updateSkill} 
            />
            <SkillCategory 
              title="Ferramentas & DevOps" 
              category="tools" 
              data={data} 
              onAdd={addSkill} 
              onRemove={removeSkill} 
              onUpdate={updateSkill} 
            />
        </CardContent>
      </Card>
    </div>
  );
}