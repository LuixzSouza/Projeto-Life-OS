"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator, 
  DropdownMenuLabel 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  Palette,
  Settings2,
  Loader2,
  Copy
} from "lucide-react";
import { toast } from "sonner";
import { updateProject } from "@/app/(dashboard)/projects/actions";
import { DeleteProjectDialog } from "./delete-project-dialog";
import { cn } from "@/lib/utils";

const PROJECT_COLORS = [
  { name: "Indigo", value: "#6366f1", class: "bg-indigo-500" },
  { name: "Red", value: "#ef4444", class: "bg-red-500" },
  { name: "Orange", value: "#f97316", class: "bg-orange-500" },
  { name: "Yellow", value: "#eab308", class: "bg-yellow-500" },
  { name: "Green", value: "#22c55e", class: "bg-emerald-500" },
  { name: "Cyan", value: "#06b6d4", class: "bg-cyan-500" },
  { name: "Blue", value: "#3b82f6", class: "bg-blue-500" },
  { name: "Purple", value: "#a855f7", class: "bg-purple-500" },
  { name: "Pink", value: "#ec4899", class: "bg-pink-500" },
  { name: "Zinc", value: "#71717a", class: "bg-zinc-500" },
];

interface ProjectSettingsProps {
  projectId: string;
  projectTitle: string;
  projectDescription: string | null;
  projectColor?: string;
}

export function ProjectSettingsMenu({ 
  projectId, 
  projectTitle, 
  projectDescription,
  projectColor = "#6366f1"
}: ProjectSettingsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(projectColor);

  const handleUpdate = async (formData: FormData) => {
    setIsLoading(true);
    try {
      formData.append("id", projectId);
      formData.set("color", selectedColor); 
      await updateProject(formData);
      toast.success("Propriedades atualizadas!");
      setIsEditOpen(false);
      router.refresh();
    } catch {
      toast.error("Erro ao salvar alterações.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link do projeto copiado!");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Configurações do projeto" className="h-9 w-9 rounded-xl hover:bg-muted/80 transition-all active:scale-90">
            <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2 rounded-2xl shadow-xl border-border/40 backdrop-blur-lg">
          <DropdownMenuLabel className="px-3 py-2">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Opções do Projeto</span>
          </DropdownMenuLabel>
          
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)} className="rounded-xl px-3 py-2.5 gap-3 cursor-pointer focus:bg-primary/5 group">
            <Pencil className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" /> 
            <span className="font-bold text-sm">Editar propriedades</span>
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={handleCopyLink} className="rounded-xl px-3 py-2.5 gap-3 cursor-pointer group">
            <Copy className="h-4 w-4 text-muted-foreground group-hover:text-blue-500 transition-colors" /> 
            <span className="font-bold text-sm">Copiar link do board</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator className="my-2 bg-border/40" />
          
          <DropdownMenuItem 
            onSelect={() => setIsDeleteOpen(true)} 
            className="rounded-xl px-3 py-2.5 gap-3 text-rose-500 focus:text-rose-500 focus:bg-rose-500/10 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span className="font-bold text-sm">Mover para a lixeira</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* --- MODAL DE EDIÇÃO --- */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <div className="flex items-center gap-4">
                <div className="h-12 w-12 shrink-0 rounded-2xl flex items-center justify-center bg-background border border-border/50 shadow-sm" style={{ color: selectedColor }}>
                    <Settings2 className="h-6 w-6" />
                </div>
                <div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter">Propriedades</DialogTitle>
                    <DialogDescription className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Configurações de exibição</DialogDescription>
                </div>
            </div>
          </DialogHeader>

          <form action={handleUpdate}>
            <DialogBody className="space-y-6">
                <div className="space-y-2.5">
                <Label htmlFor="title" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Nome do Projeto</Label>
                <Input id="title" name="title" defaultValue={projectTitle} required className="h-12 bg-muted/20 border-border/50 rounded-xl font-bold text-base focus-visible:ring-primary/30" />
                </div>

                <div className="space-y-4">
                    <Label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 flex items-center gap-2">
                        <Palette className="h-3.5 w-3.5" /> Cor de Identidade
                    </Label>
                    <div className="grid grid-cols-5 gap-3 bg-muted/30 p-4 rounded-2xl border border-border/40">
                        {PROJECT_COLORS.map((color) => (
                        <button
                            key={color.value}
                            type="button"
                            onClick={() => setSelectedColor(color.value)}
                            className={cn(
                            "h-8 w-8 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center shadow-sm",
                            color.class,
                            selectedColor === color.value ? "ring-4 ring-offset-2 ring-offset-background" : "opacity-60"
                            )}
                            style={{ ringColor: selectedColor === color.value ? color.value : undefined } as React.CSSProperties}
                        >
                            {selectedColor === color.value && <Check className="h-4 w-4 text-white animate-in zoom-in duration-200" />}
                        </button>
                        ))}
                    </div>
                </div>
                
                <div className="space-y-2.5">
                <Label htmlFor="description" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Descrição</Label>
                <Textarea id="description" name="description" defaultValue={projectDescription || ""} className="resize-none min-h-[120px] bg-muted/20 border-border/50 rounded-xl font-medium p-4 focus-visible:ring-primary/30" />
                </div>
            </DialogBody>

            <DialogFooter>
              <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg transition-all active:scale-95" style={{ backgroundColor: selectedColor }}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DE EXCLUSÃO (themeable, com Desfazer) --- */}
      <DeleteProjectDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        projectId={projectId}
        title={projectTitle}
        onDeleted={() => router.push("/projects")}
      />
    </>
  );
}