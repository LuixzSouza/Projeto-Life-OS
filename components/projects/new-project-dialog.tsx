"use client";

import { useState } from "react";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
    DialogBody,
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
    Check,
    FolderPlus
} from "lucide-react";
import { createProject } from "@/app/(dashboard)/projects/actions";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PARA_TYPES, PARA_META, type ParaType } from "@/lib/para";

// Definição estrita do tipo para evitar 'any'
interface ProjectColor {
    name: string;
    value: string;
    class: string;
    ringClass: string;
}

const PROJECT_COLORS: ProjectColor[] = [
    { name: "Indigo", value: "#6366f1", class: "bg-indigo-500", ringClass: "focus-within:ring-indigo-500/30" },
    { name: "Blue", value: "#3b82f6", class: "bg-blue-500", ringClass: "focus-within:ring-blue-500/30" },
    { name: "Emerald", value: "#10b981", class: "bg-emerald-500", ringClass: "focus-within:ring-emerald-500/30" },
    { name: "Amber", value: "#f59e0b", class: "bg-amber-500", ringClass: "focus-within:ring-amber-500/30" },
    { name: "Rose", value: "#f43f5e", class: "bg-rose-500", ringClass: "focus-within:ring-rose-500/30" },
    { name: "Violet", value: "#8b5cf6", class: "bg-violet-500", ringClass: "focus-within:ring-violet-500/30" },
];

export function NewProjectDialog() {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedColor, setSelectedColor] = useState<ProjectColor>(PROJECT_COLORS[0]);
    const [paraType, setParaType] = useState<ParaType | null>("PROJECT");

    async function handleSubmit(formData: FormData): Promise<void> {
        setIsLoading(true);
        formData.set("color", selectedColor.value);
        if (paraType) formData.set("paraType", paraType);

        try {
            const result = await createProject(formData);
            
            if (result?.error) {
                toast.error(result.error);
                return;
            }

            toast.success("Projeto iniciado com sucesso! 🚀");
            setOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Ocorreu um erro ao criar o projeto.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    className="gap-2 bg-foreground text-background hover:bg-foreground/90 shadow-lg rounded-xl px-5 h-11 transition-all active:scale-95"
                >
                    <Plus className="h-4 w-4" /> 
                    <span className="font-bold tracking-tight">Novo Projeto</span>
                </Button>
            </DialogTrigger>
            
            <DialogContent size="sm">
                <form action={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "h-12 w-12 rounded-2xl flex items-center justify-center shadow-inner transition-colors duration-500",
                            selectedColor.class,
                            "bg-opacity-20"
                        )}>
                            <FolderPlus className={cn("h-6 w-6 transition-colors duration-500", selectedColor.class.replace('bg-', 'text-'))} />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Criar Projeto</DialogTitle>
                            <DialogDescription className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Defina sua nova meta</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <DialogBody className="space-y-6">
                    {/* Nome do Projeto */}
                    <div className={cn("space-y-2 transition-all duration-300", selectedColor.ringClass)}>
                        <Label htmlFor="title" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                            Título
                        </Label>
                        <div className="relative group">
                            <Type className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 transition-colors group-focus-within:text-foreground" />
                            <Input 
                                id="title" 
                                name="title" 
                                placeholder="Dê um nome impactante..." 
                                required 
                                maxLength={40}
                                className="h-12 pl-11 bg-muted/20 border-border/50 rounded-xl font-bold text-base focus-visible:ring-offset-0 focus-visible:ring-1 transition-all" 
                            />
                        </div>
                    </div>

                    {/* Descrição */}
                    <div className={cn("space-y-2 transition-all duration-300", selectedColor.ringClass)}>
                        <Label htmlFor="description" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                            Descrição (Opcional)
                        </Label>
                        <div className="relative group">
                            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 transition-colors group-focus-within:text-foreground" />
                            <Input 
                                id="description" 
                                name="description" 
                                placeholder="Qual o grande objetivo?" 
                                maxLength={80}
                                className="h-12 pl-11 bg-muted/20 border-border/50 rounded-xl font-medium focus-visible:ring-offset-0 focus-visible:ring-1 transition-all" 
                            />
                        </div>
                    </div>

                    {/* Taxonomia PARA (#10): em qual gaveta isso vive? */}
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                            Método PARA
                        </Label>
                        <div className="grid grid-cols-4 gap-1.5">
                            {PARA_TYPES.map((key) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setParaType(paraType === key ? null : key)}
                                    title={PARA_META[key].hint}
                                    className={cn(
                                        "rounded-xl border px-2 py-2 text-[10px] font-black uppercase tracking-wider transition-all",
                                        paraType === key
                                            ? cn("border-transparent shadow-sm", PARA_META[key].badgeClass)
                                            : "border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/50",
                                    )}
                                >
                                    {PARA_META[key].label}
                                </button>
                            ))}
                        </div>
                        <p className="ml-1 text-[10px] text-muted-foreground">
                            {paraType ? PARA_META[paraType].hint : "Sem classificação — dá pra definir depois."}
                        </p>
                    </div>

                    {/* Color Picker Corrigido */}
                    <div className="space-y-4">
                        <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Palette className="h-3.5 w-3.5" /> Identidade Visual
                        </Label>
                        <div className="flex justify-between items-center bg-muted/30 p-3 rounded-2xl border border-border/40">
                            {PROJECT_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className={cn(
                                        "relative h-8 w-8 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm",
                                        color.class,
                                        selectedColor.value === color.value ? "ring-4 ring-offset-2 ring-offset-background" : "opacity-80"
                                    )}
                                    // A CORREÇÃO ESTÁ AQUI: Usando variável CSS ou propriedades padrão
                                    style={{ ringColor: selectedColor.value === color.value ? color.value : undefined } as React.CSSProperties}
                                >
                                    {selectedColor.value === color.value && (
                                        <Check className="h-4 w-4 text-white animate-in zoom-in duration-200" />
                                    )}
                                    <span className="sr-only">{color.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    </DialogBody>

                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={isLoading} 
                            className={cn(
                                "w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl transition-all duration-500",
                                selectedColor.class,
                                "text-white hover:brightness-110 active:scale-95 disabled:opacity-50"
                            )}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Sincronizando...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-5 w-5 fill-current" />
                                    Lançar Projeto
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}