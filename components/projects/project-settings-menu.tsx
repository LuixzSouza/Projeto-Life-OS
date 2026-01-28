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
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MoreVertical, 
  Pencil, 
  Trash2, 
  AlertTriangle, 
  Settings 
} from "lucide-react";
import { toast } from "sonner";
import { updateProject, deleteProject } from "@/app/(dashboard)/projects/actions";

interface ProjectSettingsProps {
  projectId: string;
  projectTitle: string;
  projectDescription: string | null;
}

export function ProjectSettingsMenu({ 
  projectId, 
  projectTitle, 
  projectDescription 
}: ProjectSettingsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- DELETE ACTION ---
  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await deleteProject(projectId);
      toast.success("Projeto excluído com sucesso.");
      router.push("/projects"); // Volta para a lista
    } catch (error) {
      console.error(error);
      toast.error("Erro ao excluir projeto.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- UPDATE ACTION ---
  const handleUpdate = async (formData: FormData) => {
    setIsLoading(true);
    try {
      // Adiciona o ID ao formData para a Server Action saber quem atualizar
      formData.append("id", projectId);
      
      await updateProject(formData);
      toast.success("Projeto atualizado!");
      setIsEditOpen(false);
      router.refresh(); // Atualiza a página para mostrar novo título
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar projeto.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Opções do Projeto</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" /> Editar Detalhes
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onSelect={() => setIsDeleteOpen(true)} 
            className="text-destructive focus:text-destructive focus:bg-destructive/10"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Excluir Projeto
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* --- MODAL DE EDIÇÃO --- */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Projeto</DialogTitle>
            <DialogDescription>Altere o nome ou descrição do projeto.</DialogDescription>
          </DialogHeader>
          
          <form action={handleUpdate} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="title">Nome do Projeto</Label>
              <Input id="title" name="title" defaultValue={projectTitle} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" defaultValue={projectDescription || ""} />
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* --- MODAL DE DELEÇÃO --- */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="border-destructive/20">
          <DialogHeader>
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-destructive">Excluir Projeto?</DialogTitle>
            </div>
            <DialogDescription>
              Você tem certeza que deseja excluir <strong>{projectTitle}</strong>?
              <br/>
              Essa ação não pode ser desfeita e todas as tarefas serão perdidas.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4">
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button 
                variant="destructive" 
                onClick={handleDelete} 
                disabled={isLoading}
            >
                {isLoading ? "Excluindo..." : "Sim, Excluir Projeto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}