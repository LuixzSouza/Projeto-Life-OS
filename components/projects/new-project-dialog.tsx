"use client";

import { useState } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription, 
    DialogTrigger, 
    DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
    Sparkles, 
    Plus, 
    Type, 
    FileText, 
    Palette, 
    Loader2, 
    CheckCircle2 
} from "lucide-react";
// Verifique se este caminho está correto no seu projeto. 
// Se não, ajuste para onde você criou a Server Action de projetos.
import { createProject } from "@/app/(dashboard)/projects/actions"; 
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Cores disponíveis (Tipagem para segurança se usar TS estrito)
type ProjectColor = { name: string; value: string; class: string };

const PROJECT_COLORS: ProjectColor[] = [
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
    const [selectedColor, setSelectedColor] = useState(PROJECT_COLORS[0].value); // Estado para cor selecionada

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        
        // Garante que a cor selecionada via state seja enviada se o radio falhar ou para consistência
        if (!formData.get("color")) {
            formData.set("color", selectedColor);
        }

        try {
            const result = await createProject(formData);
            
            // Se sua Server Action retornar erro, trate aqui
            if (result?.error) {
                toast.error(result.error);
                return;
            }

            toast.success("Projeto criado com sucesso!");
            setOpen(false);
            
            // Opcional: Resetar form se necessário, mas como o dialog desmonta/remonta, o state limpa.
        } catch (error) {
            console.error(error);
            toast.error("Erro ao criar projeto. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    size="sm" 
                    className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                >
                    <Plus className="h-4 w-4" /> Novo Projeto
                </Button>
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden gap-0 border-border shadow-lg">
                
                {/* Header Visual */}
                <div className="bg-muted/30 border-b border-border p-6 flex flex-col items-center text-center">
                    <div className="h-12 w-12 bg-background rounded-full flex items-center justify-center shadow-sm mb-3 border border-border animate-in zoom-in duration-300">
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
                        <Input 
                            id="title" 
                            name="title" 
                            placeholder="Ex: Redesign do Site..." 
                            required 
                            autoFocus
                            className="bg-muted/30 border-border focus-visible:ring-primary" 
                        />
                    </div>

                    {/* Descrição */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <FileText className="h-3.5 w-3.5" /> Descrição Curta
                        </Label>
                        <Input 
                            id="description" 
                            name="description" 
                            placeholder="Objetivo principal..." 
                            className="bg-muted/30 border-border focus-visible:ring-primary" 
                        />
                    </div>

                    {/* Cores */}
                    <div className="space-y-3">
                        <Label className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                            <Palette className="h-3.5 w-3.5" /> Cor do Marcador
                        </Label>
                        <div className="flex flex-wrap gap-3">
                            {PROJECT_COLORS.map((color) => (
                                <label 
                                    key={color.value} 
                                    className="relative cursor-pointer group"
                                    onClick={() => setSelectedColor(color.value)}
                                >
                                    <input 
                                        type="radio" 
                                        name="color" 
                                        value={color.value} 
                                        className="peer sr-only" 
                                        checked={selectedColor === color.value}
                                        onChange={() => setSelectedColor(color.value)}
                                    />
                                    <div className={cn(
                                        `w-8 h-8 rounded-full ${color.class} border-2 border-transparent transition-all shadow-sm`,
                                        "peer-checked:border-background peer-checked:ring-2 peer-checked:ring-offset-1 peer-checked:ring-primary hover:scale-110",
                                        selectedColor === color.value ? "scale-110 ring-2 ring-primary ring-offset-2" : ""
                                    )}>
                                        {selectedColor === color.value && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                                <div className="h-2 w-2 bg-white rounded-full shadow-sm" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="sr-only">{color.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button 
                            type="submit" 
                            disabled={isLoading} 
                            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium shadow-md transition-all active:scale-[0.98]"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Criando...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Criar Projeto
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}