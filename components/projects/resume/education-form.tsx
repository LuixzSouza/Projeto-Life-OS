"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { PortfolioData } from "@/types/portfolio";

export function EducationForm({ data, onChange }: { data: PortfolioData, onChange: (d: PortfolioData) => void }) {
    const add = () => onChange({ ...data, education: [...data.education, { id: crypto.randomUUID(), institution: "", degree: "", dates: "" }] });
    const remove = (id: string) => onChange({ ...data, education: data.education.filter(e => e.id !== id) });
    const update = (id: string, field: string, val: string) => onChange({ ...data, education: data.education.map(e => e.id === id ? { ...e, [field]: val } : e) });

    return (
        <div className="space-y-4">
            <Button size="sm" variant="outline" onClick={add} className="w-full gap-2"><Plus className="h-3 w-3"/> Adicionar Educação</Button>
            {data.education.map((edu) => (
                <Card key={edu.id} className="relative bg-muted/10">
                    <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-6 w-6" onClick={() => remove(edu.id)}><Trash2 className="h-3 w-3"/></Button>
                    <CardContent className="p-3 space-y-2">
                        <Input placeholder="Instituição" value={edu.institution} onChange={e => update(edu.id, 'institution', e.target.value)} className="h-8 text-sm" />
                        <Input placeholder="Grau / Curso" value={edu.degree} onChange={e => update(edu.id, 'degree', e.target.value)} className="h-8 text-sm" />
                        <Input placeholder="Período" value={edu.dates} onChange={e => update(edu.id, 'dates', e.target.value)} className="h-8 text-sm" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}