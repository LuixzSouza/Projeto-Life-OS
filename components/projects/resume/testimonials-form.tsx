"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, MessageSquareQuote } from "lucide-react";
import { PortfolioData } from "@/types/portfolio";

export function TestimonialsForm({ data, onChange }: { data: PortfolioData, onChange: (d: PortfolioData) => void }) {
    
    const add = () => onChange({ ...data, testimonials: [...data.testimonials, { id: crypto.randomUUID(), authorName: "", authorRole: "", company: "", text: "" }] });
    const remove = (id: string) => onChange({ ...data, testimonials: data.testimonials.filter(t => t.id !== id) });
    const update = (id: string, field: string, val: string) => onChange({ ...data, testimonials: data.testimonials.map(t => t.id === id ? { ...t, [field]: val } : t) });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end border-b border-border/40 pb-4">
                <div className="space-y-1">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground/80 flex items-center gap-2">
                        <MessageSquareQuote className="h-4 w-4 text-primary" /> Prova Social
                    </h3>
                </div>
                <Button size="sm" onClick={add} className="h-10 rounded-xl font-black uppercase tracking-widest text-[10px] gap-2 shadow-lg hover:scale-105 transition-all">
                    <Plus className="h-4 w-4" /> Adicionar
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {data.testimonials.map((test) => (
                    <div key={test.id} className="relative group bg-card border border-border/40 p-6 rounded-[2rem] shadow-lg hover:border-primary/30 transition-all">
                        <Button
                            size="icon"
                            variant="destructive"
                            aria-label="Remover depoimento"
                            className="absolute -top-3 -right-3 h-8 w-8 rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity shadow-lg"
                            onClick={() => remove(test.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Conteúdo do Depoimento</Label>
                                <Textarea 
                                    placeholder="O que disseram sobre o seu trabalho..." 
                                    value={test.text} 
                                    onChange={e => update(test.id, 'text', e.target.value)} 
                                    className="min-h-[80px] text-sm bg-muted/30 border-border/50 rounded-xl resize-none italic font-medium leading-relaxed" 
                                />
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Nome do Autor</Label>
                                    <Input 
                                        placeholder="Ex: João Souza" 
                                        value={test.authorName} 
                                        onChange={e => update(test.id, 'authorName', e.target.value)} 
                                        className="h-11 bg-muted/30 border-border/50 rounded-xl font-bold" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Empresa</Label>
                                    <Input 
                                        placeholder="Ex: Acme Corp" 
                                        value={test.company} 
                                        onChange={e => update(test.id, 'company', e.target.value)} 
                                        className="h-11 bg-muted/30 border-border/50 rounded-xl" 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Cargo do Autor</Label>
                                <Input 
                                    placeholder="Ex: CTO" 
                                    value={test.authorRole} 
                                    onChange={e => update(test.id, 'authorRole', e.target.value)} 
                                    className="h-11 bg-muted/30 border-border/50 rounded-xl" 
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            {data.testimonials.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-border/40 rounded-[2rem] text-muted-foreground/50 text-sm font-black uppercase tracking-widest">
                    Nenhum depoimento registrado.
                </div>
            )}
        </div>
    );
}