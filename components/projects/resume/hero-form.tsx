"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PortfolioData } from "@/types/portfolio";
import { User, Mail, Phone, Briefcase, MapPin, Globe, Upload, X, Palette, Check } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SmartTextarea } from "./smart-textarea";

// Presets profissionais de cor de destaque do PDF (o 1º é o padrão indigo).
const ACCENT_PRESETS = [
  { hex: "#4F46E5", name: "Índigo" },
  { hex: "#0F172A", name: "Grafite" },
  { hex: "#0D9488", name: "Teal" },
  { hex: "#2563EB", name: "Azul" },
  { hex: "#7C3AED", name: "Violeta" },
  { hex: "#B91C1C", name: "Vinho" },
  { hex: "#B45309", name: "Âmbar" },
];

export function HeroForm({ data, onChange }: { data: PortfolioData; onChange: (d: PortfolioData) => void }) {
  const update = (field: string, value: string) => {
    onChange({
      ...data,
      hero: { ...data.hero, [field]: value }
    });
  };

  const accent = data.meta?.accentColor || ACCENT_PRESETS[0].hex;
  const setAccent = (hex: string) => onChange({ ...data, meta: { ...data.meta, accentColor: hex } });

  const showPhoto = !!data.meta?.showPhoto;
  const toggleShowPhoto = () => onChange({ ...data, meta: { ...data.meta, showPhoto: !showPhoto } });

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
          {data.hero.photoUrl && (
            <button
              type="button"
              onClick={toggleShowPhoto}
              aria-pressed={showPhoto}
              className="mt-1 flex items-center gap-2 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className={cn(
                "flex h-4 w-4 items-center justify-center rounded-[5px] border transition-colors",
                showPhoto ? "bg-primary border-primary text-primary-foreground" : "border-border/60"
              )}>
                {showPhoto && <Check className="h-3 w-3" />}
              </span>
              Mostrar foto no PDF
            </button>
          )}
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
        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 flex justify-between">
          <span>Resumo Estratégico</span>
          <span className="text-muted-foreground/40 lowercase font-medium tracking-normal text-xs">✨ para a IA melhorar</span>
        </Label>
        <SmartTextarea
          label="Resumo Estratégico"
          value={data.about.short}
          onChange={(v) => onChange({ ...data, about: { ...data.about, short: v } })}
          placeholder="Resumo de impacto para o cabeçalho..."
          polishKind="about-short"
          polishContext={[data.hero.headline, data.hero.name].filter(Boolean).join(" · ")}
          recommendedRange={[120, 450]}
          minHeight={100}
          className="bg-muted/30 shadow-inner"
        />
      </div>

      {/* COR DE DESTAQUE DO PDF */}
      <div className="space-y-3 pt-2 border-t border-border/40">
        <Label className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/60 flex items-center gap-2">
          <Palette className="h-3 w-3" /> Cor de Destaque do Currículo
        </Label>
        <div className="flex flex-wrap items-center gap-2.5">
          {ACCENT_PRESETS.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => setAccent(c.hex)}
              title={c.name}
              aria-label={`Cor ${c.name}`}
              aria-pressed={accent.toLowerCase() === c.hex.toLowerCase()}
              className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center transition-all hover:scale-110 shadow-sm ring-offset-2 ring-offset-background",
                accent.toLowerCase() === c.hex.toLowerCase() && "ring-2 ring-foreground/40"
              )}
              style={{ backgroundColor: c.hex }}
            >
              {accent.toLowerCase() === c.hex.toLowerCase() && <Check className="h-4 w-4 text-white" />}
            </button>
          ))}
          {/* Cor personalizada (input nativo). */}
          <label
            title="Cor personalizada"
            className="h-8 w-8 rounded-full flex items-center justify-center border-2 border-dashed border-border/60 cursor-pointer hover:border-primary/50 transition-colors relative overflow-hidden"
            style={ACCENT_PRESETS.some((c) => c.hex.toLowerCase() === accent.toLowerCase()) ? undefined : { backgroundColor: accent, borderStyle: "solid" }}
          >
            <Palette className="h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Escolher cor personalizada"
            />
          </label>
        </div>
        <p className="text-[10px] text-muted-foreground/60">Aplica no nome, títulos de seção e marcadores do PDF.</p>
      </div>
    </div>
  );
}