"use client";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ListOrdered, Eye, EyeOff, ChevronDown } from "lucide-react";
import { PortfolioData } from "@/types/portfolio";
import { cn } from "@/lib/utils";
import { ReorderControls, moveItem } from "./reorder-controls";
import { RESUME_SECTIONS, resolveSectionOrder, sectionLabel, type ResumeSectionKey } from "./resume-sections";

/**
 * Controle de ordem + visibilidade das seções do PDF. Reordena via ↑/↓ e
 * mostra/oculta via olho. Grava em meta.sectionOrder / meta.hiddenSections.
 */
export function SectionOrderControl({
    data,
    onChange,
}: {
    data: PortfolioData;
    onChange: (d: PortfolioData) => void;
}) {
    const order = resolveSectionOrder(data.meta?.sectionOrder);
    const hidden = new Set(data.meta?.hiddenSections ?? []);

    // Seção "tem dados" — só para sinalizar (o PDF já pula vazias de qualquer forma).
    const hasData = (key: ResumeSectionKey): boolean => {
        switch (key) {
            case "summary": return !!(data.about.short || data.about.long);
            case "experience": return data.experience.length > 0;
            case "projects": return data.projects.length > 0;
            case "education": return data.education.length > 0;
            case "skills": return data.skills.languages.length + data.skills.frameworks.length + data.skills.tools.length + data.skills.softSkills.length > 0;
            case "certifications": return data.certifications.length > 0;
            case "languages": return data.languages.length > 0;
        }
    };

    const move = (index: number, dir: -1 | 1) =>
        onChange({ ...data, meta: { ...data.meta, sectionOrder: moveItem(order, index, dir) } });

    const toggle = (key: ResumeSectionKey) => {
        const next = new Set(hidden);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        onChange({ ...data, meta: { ...data.meta, hiddenSections: [...next] } });
    };

    const hiddenCount = RESUME_SECTIONS.filter((s) => hidden.has(s.key)).length;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    title="Ordenar e mostrar/ocultar seções do PDF"
                    className="h-9 rounded-xl font-black uppercase tracking-widest text-[9px] gap-1.5 border-border/60 hover:bg-primary/5 hover:text-primary"
                >
                    <ListOrdered className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Seções</span>
                    {hiddenCount > 0 && (
                        <span className="rounded-full bg-primary/10 px-1.5 text-[9px] text-primary">−{hiddenCount}</span>
                    )}
                    <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 rounded-2xl p-3">
                <div className="mb-2 px-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70">Seções do PDF</p>
                    <p className="text-[10px] text-muted-foreground/60">Reordene com ↑/↓ e oculte com o olho.</p>
                </div>
                <div className="space-y-1">
                    {order.map((key, index) => {
                        const isHidden = hidden.has(key);
                        const empty = !hasData(key);
                        return (
                            <div
                                key={key}
                                className={cn(
                                    "flex items-center gap-2 rounded-xl border border-border/40 bg-muted/20 px-2 py-1.5",
                                    isHidden && "opacity-50"
                                )}
                            >
                                <ReorderControls
                                    index={index}
                                    count={order.length}
                                    onMove={(dir) => move(index, dir)}
                                    orientation="horizontal"
                                />
                                <span className="flex-1 truncate text-xs font-semibold text-foreground">
                                    {sectionLabel(key)}
                                    {empty && <span className="ml-1.5 text-[10px] font-normal text-muted-foreground/50">(vazia)</span>}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => toggle(key)}
                                    aria-label={isHidden ? "Mostrar seção" : "Ocultar seção"}
                                    title={isHidden ? "Mostrar no PDF" : "Ocultar do PDF"}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                >
                                    {isHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </PopoverContent>
        </Popover>
    );
}
