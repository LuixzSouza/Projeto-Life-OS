"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Trash2, Pencil, Folder, FolderOpen, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { updateProject, deleteProject } from "@/app/(dashboard)/projects/actions";
import { cn } from "@/lib/utils";

// Interface compatível com o Prisma
interface ProjectSummary {
    id: string;
    title: string;
    description: string | null;
    color: string | null; // Adicionado suporte a cor
    tasks: { id: string; isDone: boolean }[]; 
}

interface ProjectItemProps {
    project: ProjectSummary;
    selectedProjectId: string;
    pendingCount: number;
}

export function ProjectItem({ project, selectedProjectId, pendingCount }: ProjectItemProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const handleDelete = async () => {
        try {
            await deleteProject(project.id);
            toast.success(`Projeto excluído.`);
            if (selectedProjectId === project.id) {
                window.location.href = '/projects?id=inbox';
            }
        } catch (error) {
            toast.error("Erro ao excluir.");
        }
    };

    const handleUpdate = async (formData: FormData) => {
        try {
            await updateProject(formData);
            toast.success(`Projeto atualizado.`);
            setIsEditOpen(false);
        } catch (error) {
            toast.error("Falha ao atualizar.");
        }
    };

    const isActive = selectedProjectId === project.id;
    
    // Cor dinâmica baseada na escolha do usuário ou padrão
    const activeColorClass = isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted hover:text-foreground";

    return (
        <>
            <div 
                className={cn(
                    "group relative flex items-center w-full rounded-lg mb-1 transition-all duration-200 border border-transparent pr-1",
                    activeColorClass
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Link Principal */}
                <a 
                    href={`/projects?id=${project.id}`} 
                    className="flex-1 flex items-center gap-3 py-2 px-3 min-w-0 overflow-hidden cursor-pointer outline-none rounded-lg"
                >
                    {isActive ? (
                        <FolderOpen className="h-4 w-4 shrink-0 text-primary fill-primary/20" />
                    ) : (
                        <Folder className="h-4 w-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
                    )}
                    
                    <span className="truncate text-sm font-medium pt-0.5">
                        {project.title}
                    </span>
                </a>

                {/* Área da Direita */}
                <div className="flex items-center gap-1 shrink-0 h-8">
                    
                    {/* Badge de Contagem */}
                    {pendingCount > 0 && (
                        <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center transition-all",
                            isActive 
                                ? "bg-primary/20 text-primary" 
                                : "bg-muted text-muted-foreground group-hover:bg-background"
                        )}>
                            {pendingCount}
                        </span>
                    )}

                    {/* Menu de Opções */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={cn(
                                    "h-7 w-7 rounded-md ml-0.5 transition-all duration-200",
                                    isActive ? "text-primary hover:bg-primary/20" : "text-muted-foreground hover:bg-muted",
                                    isHovered || isActive ? "opacity-100" : "opacity-0 w-0 p-0 overflow-hidden" 
                                )}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        
                        <DropdownMenuContent align="end" className="w-48">
                            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                                <DialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                                        <Pencil className="mr-2 h-4 w-4 text-muted-foreground" /> Editar
                                    </DropdownMenuItem>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Editar Projeto</DialogTitle></DialogHeader>
                                    <form action={handleUpdate} className="space-y-4 pt-4">
                                        <input type="hidden" name="id" value={project.id} />
                                        <div className="space-y-2">
                                            <Label htmlFor="title">Nome</Label>
                                            <Input id="title" name="title" defaultValue={project.title} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description">Descrição</Label>
                                            <Input id="description" name="description" defaultValue={project.description || ""} />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit">Salvar</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem 
                                onSelect={(e) => { e.preventDefault(); setIsDeleteDialogOpen(true); }} 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                            >
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Modal de Deleção */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertCircle className="h-5 w-5" /> Excluir Projeto?
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 text-sm text-muted-foreground">
                        <p>Você está prestes a excluir <strong>{project.title}</strong>.</p>
                        <p className="mt-2 font-medium text-foreground">
                            Isso apagará permanentemente {project.tasks.length} tarefas. Ação irreversível.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete}>Sim, excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}