"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { PortfolioData } from "@/types/portfolio";

interface ExperienceFormProps {
  data: PortfolioData;
  onChange: (data: PortfolioData) => void;
}

export function ExperienceForm({ data, onChange }: ExperienceFormProps) {
  
  const addExperience = () => {
    const newExp = {
      id: crypto.randomUUID(),
      company: "",
      role: "",
      startDate: "",
      endDate: "",
      location: "",
      summary: "",
      achievements: [],
      stack: []
    };
    onChange({ ...data, experience: [...data.experience, newExp] });
  };

  const removeExperience = (id: string) => {
    onChange({ ...data, experience: data.experience.filter((exp) => exp.id !== id) });
  };

  // Fixed Type: Explicitly allow string OR string array
  const updateExperience = (id: string, field: string, value: string | string[]) => {
    onChange({
      ...data,
      experience: data.experience.map((exp) =>
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    });
  };

  // Helper para converter string separada por vírgula em array
  const handleStackChange = (id: string, value: string) => {
    const stackArray = value.split(",").map((s) => s.trim()).filter(Boolean);
    updateExperience(id, "stack", stackArray);
  };

  // Helper para converter texto com quebra de linha em array de bullets
  const handleAchievementsChange = (id: string, value: string) => {
    const achievementsArray = value.split("\n").map((s) => s.trim()).filter(Boolean);
    updateExperience(id, "achievements", achievementsArray);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">Liste suas experiências mais relevantes.</p>
        <Button size="sm" variant="outline" onClick={addExperience} className="gap-2">
          <Plus className="h-3 w-3" /> Adicionar
        </Button>
      </div>

      <div className="space-y-4">
        {data.experience.map((exp, index) => (
          <Card key={exp.id} className="relative group border-border/60 bg-muted/10">
            <Button
              size="icon"
              variant="ghost"
              className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeExperience(exp.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="bg-muted text-muted-foreground text-[10px] font-bold px-2 py-1 rounded">#{index + 1}</span>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Empresa</Label>
                  <Input 
                    value={exp.company} 
                    onChange={(e) => updateExperience(exp.id, "company", e.target.value)} 
                    placeholder="Ex: Tech Solutions"
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Cargo</Label>
                  <Input 
                    value={exp.role} 
                    onChange={(e) => updateExperience(exp.id, "role", e.target.value)} 
                    placeholder="Ex: Senior Developer"
                    className="bg-background"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Início</Label>
                    <Input value={exp.startDate} onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} placeholder="MM/AAAA" className="bg-background" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fim</Label>
                    <Input value={exp.endDate} onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)} placeholder="MM/AAAA ou Atual" className="bg-background" />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Resumo Geral</Label>
                  <Textarea 
                    value={exp.summary} 
                    onChange={(e) => updateExperience(exp.id, "summary", e.target.value)} 
                    placeholder="Visão geral da sua responsabilidade..."
                    className="min-h-[60px] bg-background text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-emerald-600 font-semibold">Conquistas (1 por linha)</Label>
                  <Textarea 
                    defaultValue={exp.achievements.join("\n")} 
                    onBlur={(e) => handleAchievementsChange(exp.id, e.target.value)} 
                    placeholder="• Aumentei a conversão em 20%&#10;• Liderança de squad com 5 devs..."
                    className="min-h-[80px] bg-background text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tech Stack (separado por vírgula)</Label>
                  <Input 
                    defaultValue={exp.stack.join(", ")} 
                    onBlur={(e) => handleStackChange(exp.id, e.target.value)} 
                    placeholder="React, Node.js, AWS..."
                    className="bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}