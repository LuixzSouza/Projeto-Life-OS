"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GraduationCap } from "lucide-react";
import { PortfolioData } from "@/types/portfolio";
import { ReorderControls, moveItem } from "./reorder-controls";

export function EducationForm({ data, onChange }: { data: PortfolioData; onChange: (d: PortfolioData) => void }) {
  const add = () => onChange({ ...data, education: [...data.education, { id: crypto.randomUUID(), institution: "", degree: "", dates: "" }] });
  const remove = (id: string) => onChange({ ...data, education: data.education.filter(e => e.id !== id) });
  const update = (id: string, field: string, val: string) => onChange({ ...data, education: data.education.map(e => e.id === id ? { ...e, [field]: val } : e) });
  const move = (index: number, dir: -1 | 1) => onChange({ ...data, education: moveItem(data.education, index, dir) });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-border/40 pb-4">
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" /> Formação Acadêmica
          </h3>
        </div>
        <Button size="sm" onClick={add} className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg hover:scale-105 transition-all">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {data.education.map((edu, index) => (
          <div key={edu.id} className="relative group bg-card border border-border/40 p-6 rounded-[2rem] shadow-sm hover:border-primary/30 transition-all">
            <Button size="icon" variant="destructive" aria-label="Remover formação" className="absolute -top-3 -right-3 h-8 w-8 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg" onClick={() => remove(edu.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-3 mb-4">
              <span className="bg-primary/10 text-primary text-[9px] uppercase tracking-widest font-black px-3 py-1 rounded-lg border border-primary/20">#{index + 1}</span>
              <ReorderControls index={index} count={data.education.length} onMove={(dir) => move(index, dir)} orientation="horizontal" />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Instituição de Ensino</Label>
                  <Input value={edu.institution} onChange={e => update(edu.id, 'institution', e.target.value)} placeholder="Ex: Universidade XYZ" className="h-11 bg-muted/30 border-border/50 rounded-xl font-bold" />
              </div>
              <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Grau / Curso</Label>
                  <Input value={edu.degree} onChange={e => update(edu.id, 'degree', e.target.value)} placeholder="Ex: Bacharelado em Ciência da Computação" className="h-11 bg-muted/30 border-border/50 rounded-xl" />
              </div>
              <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Período</Label>
                  <Input value={edu.dates} onChange={e => update(edu.id, 'dates', e.target.value)} placeholder="Ex: 2018 - 2022" className="h-11 bg-muted/30 border-border/50 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {data.education.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-border/40 rounded-[2rem] text-muted-foreground/50 text-sm font-black uppercase tracking-widest">
          Nenhuma formação registrada.
        </div>
      )}
    </div>
  );
}