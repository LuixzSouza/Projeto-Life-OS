"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Languages } from "lucide-react";
import { PortfolioData } from "@/types/portfolio";

const LEVELS = ["Nativo", "Fluente", "Avançado", "Intermediário", "Básico"];

export function LanguagesForm({ data, onChange }: { data: PortfolioData; onChange: (d: PortfolioData) => void }) {
  const add = () => onChange({ ...data, languages: [...data.languages, { id: crypto.randomUUID(), name: "", level: "Intermediário" }] });
  const remove = (id: string) => onChange({ ...data, languages: data.languages.filter(l => l.id !== id) });
  const update = (id: string, field: string, val: string) => onChange({ ...data, languages: data.languages.map(l => l.id === id ? { ...l, [field]: val } : l) });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-border/40 pb-4">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" /> Idiomas
        </h3>
        <Button size="sm" onClick={add} className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg hover:scale-105 transition-all">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {data.languages.map((lang) => (
          <div key={lang.id} className="flex gap-2 items-center group">
            <Input
              value={lang.name}
              onChange={e => update(lang.id, 'name', e.target.value)}
              placeholder="Ex: Inglês"
              className="h-11 text-sm bg-muted/30 border-border/50 rounded-xl font-bold"
            />
            <Select value={lang.level} onValueChange={val => update(lang.id, 'level', val)}>
              <SelectTrigger className="h-11 w-[150px] text-xs bg-muted/30 border-border/50 rounded-xl font-bold shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {LEVELS.map(l => <SelectItem key={l} value={l} className="text-xs font-bold">{l}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all rounded-xl"
              onClick={() => remove(lang.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        {data.languages.length === 0 && (
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 text-center py-6 border-2 border-dashed border-border/40 rounded-xl">
            Nenhum idioma listado.
          </p>
        )}
      </div>
    </div>
  );
}
