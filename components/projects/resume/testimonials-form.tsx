"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { PortfolioData } from "@/types/portfolio";

export function TestimonialsForm({ data, onChange }: { data: PortfolioData, onChange: (d: PortfolioData) => void }) {
    const add = () => onChange({ ...data, testimonials: [...data.testimonials, { id: crypto.randomUUID(), authorName: "", authorRole: "", company: "", text: "" }] });
    const remove = (id: string) => onChange({ ...data, testimonials: data.testimonials.filter(t => t.id !== id) });
    const update = (id: string, field: string, val: string) => onChange({ ...data, testimonials: data.testimonials.map(t => t.id === id ? { ...t, [field]: val } : t) });

    return (
        <div className="space-y-4">
            <Button size="sm" variant="outline" onClick={add} className="w-full gap-2"><Plus className="h-3 w-3"/> Adicionar Depoimento</Button>
            {data.testimonials.map((test) => (
                <Card key={test.id} className="relative bg-muted/10">
                    <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(test.id)}><Trash2 className="h-3 w-3"/></Button>
                    <CardContent className="p-3 space-y-2">
                        <Input placeholder="Nome do Autor" value={test.authorName} onChange={e => update(test.id, 'authorName', e.target.value)} className="h-8 text-sm" />
                        <div className="grid grid-cols-2 gap-2">
                            <Input placeholder="Cargo" value={test.authorRole} onChange={e => update(test.id, 'authorRole', e.target.value)} className="h-8 text-sm" />
                            <Input placeholder="Empresa" value={test.company} onChange={e => update(test.id, 'company', e.target.value)} className="h-8 text-sm" />
                        </div>
                        <Textarea placeholder="O que disseram sobre você..." value={test.text} onChange={e => update(test.id, 'text', e.target.value)} className="h-16 text-xs bg-background" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}