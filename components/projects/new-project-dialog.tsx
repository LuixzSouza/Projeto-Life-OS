"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Plus, Type, FileText, Palette, Loader2 } from "lucide-react";
import { createProject } from "@/app/(dashboard)/projects/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Cores disponíveis
const PROJECT_COLORS = [
    { name: "Indigo", value: "#6366f1", class: "bg-indigo-500" },
    { name: "Blue", value: "#3b82f6", class: "bg-blue-500" },
    { name: "Emerald", value: "#10b981", class: "bg-emerald-500" },
    { name: "Amber", value: "#f59e0b", class: "bg-amber-500" },
    { name: "Rose", value: "#f43f5e", class: "bg-rose-500" },
    { name: "Violet", value: "#8b5cf6", class: "bg-violet-500" },
];

export function NewProjectDialog() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            await createProject(formData);
            toast.success("Projeto criado com sucesso!");
            setOpen(false);
        } catch (error) {
            toast.error("Erro ao criar projeto.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="icon" variant="ghost" className="h-6 w-6 hover:bg-primary/10 rounded-full text-primary">
                    <Plus className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden gap-0 border-border">
                
                {/* Header Visual */}
                <div className="bg-muted/30 border-b border-border p-6 flex flex-col items-center text-center">
                    <div className="h-12 w-12 bg-background rounded-full flex items-center justify-center shadow-sm mb-3 border border-border">
                        <Sparkles className="h-6 w-6 text-primary" />
                    </div>
                    <DialogTitle className="text-lg font-semibold text-foreground">Novo Projeto</DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                        Crie um espaço para organizar suas tarefas, ideias e metas.
                    </DialogDescription>
                </div>

                <form action={handleSubmit} className="p-6 space-y-5">
                    {/* Nome */}
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <Type className="h-3.5 w-3.5" /> Nome do Projeto
                        </Label>
                        <Input id="title" name="title" placeholder="Ex: Redesign do Site..." required className="bg-muted/30 border-border" />
                    </div>

                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5" /> Descrição Curta
                        </Label>
                        <Input id="description" name="description" placeholder="Objetivo principal..." className="bg-muted/30 border-border" />
                    </div>

                    {/* Cores */}
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <Palette className="h-3.5 w-3.5" /> Cor do Marcador
                        </Label>
                        <div className="flex flex-wrap gap-3">
                            {PROJECT_COLORS.map((color) => (
                                <label key={color.value} className="relative cursor-pointer group">
                                    <input 
                                        type="radio" 
                                        name="color" 
                                        value={color.value} 
                                        className="peer sr-only" 
                                        defaultChecked={color.name === "Indigo"}
                                    />
                                    <div className={cn(
                                        `w-8 h-8 rounded-full ${color.class} border-2 border-transparent transition-all shadow-sm`,
                                        "peer-checked:border-background peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:ring-primary hover:scale-110"
                                    )}></div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="submit" disabled={isLoading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-md">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Criar Projeto
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}