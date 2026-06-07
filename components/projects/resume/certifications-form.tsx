"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Award } from "lucide-react";
import { PortfolioData } from "@/types/portfolio";

export function CertificationsForm({ data, onChange }: { data: PortfolioData; onChange: (d: PortfolioData) => void }) {
  const add = () => onChange({ ...data, certifications: [...data.certifications, { id: crypto.randomUUID(), name: "", issuer: "", date: "", link: "" }] });
  const remove = (id: string) => onChange({ ...data, certifications: data.certifications.filter(c => c.id !== id) });
  const update = (id: string, field: string, val: string) => onChange({ ...data, certifications: data.certifications.map(c => c.id === id ? { ...c, [field]: val } : c) });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end border-b border-border/40 pb-4">
        <div className="space-y-1">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
            <Award className="h-4 w-4 text-primary" /> Cursos & Certificações
          </h3>
        </div>
        <Button size="sm" onClick={add} className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg hover:scale-105 transition-all">
          <Plus className="h-4 w-4" /> Adicionar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {data.certifications.map((cert) => (
          <div key={cert.id} className="relative group bg-card border border-border/40 p-6 rounded-[2rem] shadow-lg hover:border-primary/30 transition-all">
            <Button size="icon" variant="destructive" className="absolute -top-3 -right-3 h-8 w-8 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg" onClick={() => remove(cert.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nome do Certificado / Curso</Label>
                <Input value={cert.name} onChange={e => update(cert.id, 'name', e.target.value)} placeholder="Ex: AWS Academy Cloud Foundations" className="h-11 bg-muted/30 border-border/50 rounded-xl font-bold" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Emissor</Label>
                  <Input value={cert.issuer} onChange={e => update(cert.id, 'issuer', e.target.value)} placeholder="Ex: AWS Academy" className="h-11 bg-muted/30 border-border/50 rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Data</Label>
                  <Input value={cert.date} onChange={e => update(cert.id, 'date', e.target.value)} placeholder="Ex: mar — abr 2024" className="h-11 bg-muted/30 border-border/50 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Link (opcional)</Label>
                <Input value={cert.link || ""} onChange={e => update(cert.id, 'link', e.target.value)} placeholder="https://..." className="h-11 bg-muted/30 border-border/50 rounded-xl font-medium" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {data.certifications.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-border/40 rounded-[2rem] text-muted-foreground/50 text-sm font-black uppercase tracking-widest">
          Nenhuma certificação registrada.
        </div>
      )}
    </div>
  );
}
