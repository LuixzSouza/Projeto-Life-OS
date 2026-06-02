"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PortfolioData } from "@/types/portfolio";
import { User, Mail, Phone, Briefcase, MapPin, Globe, Upload, X } from "lucide-react";
import { toast } from "sonner";

export function HeroForm({ data, onChange }: { data: PortfolioData; onChange: (d: PortfolioData) => void }) {
  const update = (field: string, value: string) => {
    onChange({
      ...data,
      hero: { ...data.hero, [field]: value }
    });
  };

  // Upload local em Base64 (mantém o app portátil, sem buckets externos).
  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 2MB).");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => update('photoUrl', reader.result as string);
    reader.readAsDataURL(file);
  };

  const initials = (data.hero.name || "?").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();

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

      {/* FOTO (Base64) */}
      <div className="flex items-center gap-4">
        <div className="h-20 w-20 rounded-2xl overflow-hidden border border-border/50 bg-muted/40 flex items-center justify-center shrink-0 shadow-inner">
          {data.hero.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.hero.photoUrl} alt="Foto" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-black text-muted-foreground/50">{initials}</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60">Foto de Perfil</Label>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 cursor-pointer">
              <label>
                <Upload className="h-3.5 w-3.5" /> Enviar
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            </Button>
            {data.hero.photoUrl && (
              <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-destructive gap-1.5 text-[10px] font-black uppercase tracking-widest" onClick={() => update('photoUrl', '')}>
                <X className="h-3.5 w-3.5" /> Remover
              </Button>
            )}
          </div>
        </div>
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
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 flex items-center gap-2">
            <MapPin className="h-3 w-3" /> Localização
          </Label>
          <Input
            value={data.hero.location}
            onChange={e => update('location', e.target.value)}
            placeholder="Ex: Inconfidentes — MG, Brasil"
            className="h-12 bg-muted/30 border-border/50 rounded-xl shadow-inner focus-visible:ring-primary/20"
          />
        </div>
        <div className="space-y-3">
          <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 flex items-center gap-2">
            <Globe className="h-3 w-3" /> Website / Portfólio
          </Label>
          <Input
            value={data.hero.website}
            onChange={e => update('website', e.target.value)}
            placeholder="Ex: luixzsouza.com.br"
            className="h-12 bg-muted/30 border-border/50 rounded-xl shadow-inner focus-visible:ring-primary/20"
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