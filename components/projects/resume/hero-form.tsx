"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PortfolioData } from "@/types/portfolio";
import { User, Mail, Phone, Briefcase } from "lucide-react";

export function HeroForm({ data, onChange }: { data: PortfolioData; onChange: (d: PortfolioData) => void }) {
  const update = (field: string, value: string) => {
    onChange({
      ...data,
      hero: { ...data.hero, [field]: value }
    });
  };

  return (
    <div className="space-y-6 bg-card border border-border/40 p-6 md:p-8 rounded-[2rem] shadow-sm">
      <div className="flex items-center gap-3 mb-6 border-b border-border/40 pb-4">
        <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <User className="h-4 w-4" />
        </div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">
          Identidade Operacional
        </h3>
      </div>

      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 flex items-center gap-2">
          Nome Completo
        </Label>
        <Input 
          value={data.hero.name} 
          onChange={e => update('name', e.target.value)} 
          placeholder="Ex: Ana Silva" 
          className="h-12 bg-muted/30 border-border/50 rounded-xl shadow-inner focus-visible:ring-primary/20 font-bold"
        />
      </div>

      <div className="space-y-3">
        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 flex items-center gap-2">
          <Briefcase className="h-3 w-3" /> Headline (Cargo / Especialidade)
        </Label>
        <Input 
          value={data.hero.headline} 
          onChange={e => update('headline', e.target.value)} 
          placeholder="Ex: Senior Frontend Engineer | React Specialist" 
          className="h-12 bg-muted/30 border-border/50 rounded-xl shadow-inner focus-visible:ring-primary/20 font-medium"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 flex items-center gap-2">
            <Mail className="h-3 w-3" /> Email
          </Label>
          <Input 
            value={data.hero.email} 
            onChange={e => update('email', e.target.value)} 
            className="h-12 bg-muted/30 border-border/50 rounded-xl shadow-inner focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 flex items-center gap-2">
            <Phone className="h-3 w-3" /> Telefone
          </Label>
          <Input 
            value={data.hero.phone} 
            onChange={e => update('phone', e.target.value)} 
            className="h-12 bg-muted/30 border-border/50 rounded-xl shadow-inner focus-visible:ring-primary/20 font-mono text-sm"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">
          Resumo Estratégico (2 linhas)
        </Label>
        <Textarea 
          value={data.about.short} 
          onChange={e => onChange({ ...data, about: { ...data.about, short: e.target.value } })} 
          className="min-h-[100px] resize-none bg-muted/30 border-border/50 rounded-xl shadow-inner focus-visible:ring-primary/20 leading-relaxed"
          placeholder="Resumo de impacto para o cabeçalho..."
        />
      </div>
    </div>
  );
}