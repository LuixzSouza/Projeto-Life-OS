"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Trash2, Pencil, Folder, FolderOpen, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { updateProject, deleteProject } from "@/app/(dashboard)/projects/actions";
import { cn } from "@/lib/utils";

// Definimos a interface aqui para garantir consistência
interface ProjectSummary {
    id: string;
    title: string;
    description: string | null;
    tasks: { 
        id: string; 
        isDone: boolean 
    }[]; 
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

    return (
        <>
            <div 
                className={cn(
                    "group relative flex items-center w-full rounded-md mb-0.5 transition-all duration-200 border border-transparent pr-1",
                    isActive 
                        ? "bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-700 dark:text-indigo-300 font-medium" 
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* 1. Link Principal (Área Clicável) */}
                <a 
                    href={`/projects?id=${project.id}`} 
                    className="flex-1 flex items-center gap-2.5 py-2 px-3 min-w-0 overflow-hidden cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-md"
                >
                    {isActive ? (
                        <FolderOpen className="h-4 w-4 shrink-0 text-indigo-500 fill-indigo-500/20" />
                    ) : (
                        <Folder className="h-4 w-4 shrink-0 text-zinc-400 group-hover:text-zinc-500 transition-colors" />
                    )}
                    
                    <span className="truncate text-sm leading-none pt-0.5">
                        {project.title}
                    </span>
                </a>

                {/* 2. Área da Direita (Badge + Menu) */}
                <div className="flex items-center gap-1 shrink-0 h-8">
                    
                    {/* Badge de Contagem */}
                    {pendingCount > 0 && (
                        <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center transition-all",
                            isActive 
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300" 
                                : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700"
                        )}>
                            {pendingCount}
                        </span>
                    )}

                    {/* Menu de Opções (Visível no Hover/Ativo) */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className={cn(
                                    "h-7 w-7 rounded-md ml-0.5 transition-all duration-200",
                                    isActive ? "text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/30" : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700",
                                    // Lógica visual: mostra se estiver com hover OU se o menu estiver aberto OU se o item estiver ativo
                                    isHovered || isActive ? "opacity-100" : "opacity-0 w-0 p-0 overflow-hidden" 
                                )}
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        
                        <DropdownMenuContent align="end" className="w-48 shadow-lg border-zinc-200 dark:border-zinc-800">
                            
                            {/* Opção Editar */}
                            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                                <DialogTrigger asChild>
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="cursor-pointer">
                                        <Pencil className="mr-2 h-4 w-4 text-zinc-500" /> Editar
                                    </DropdownMenuItem>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader><DialogTitle>Editar Projeto</DialogTitle></DialogHeader>
                                    <form action={handleUpdate} className="space-y-4 pt-4">
                                        <input type="hidden" name="id" value={project.id} />
                                        <div className="space-y-2">
                                            <Label htmlFor="title">Nome</Label>
                                            <Input id="title" name="title" defaultValue={project.title} required className="bg-zinc-50 dark:bg-zinc-900" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="description">Descrição</Label>
                                            <Input id="description" name="description" defaultValue={project.description || ""} className="bg-zinc-50 dark:bg-zinc-900" />
                                        </div>
                                        <DialogFooter>
                                            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">Salvar</Button>
                                        </DialogFooter>
                                    </form>
                                </DialogContent>
                            </Dialog>

                            <DropdownMenuSeparator />

                            {/* Opção Deletar */}
                            <DropdownMenuItem 
                                onSelect={(e) => { e.preventDefault(); setIsDeleteDialogOpen(true); }} 
                                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20 cursor-pointer"
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
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-5 w-5" /> Excluir Projeto?
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-2 text-sm text-zinc-500">
                        <p>Você está prestes a excluir <strong>{project.title}</strong>.</p>
                        <p className="mt-2 font-medium">
                            Isso apagará permanentemente {project.tasks.length} tarefas associadas. Essa ação não pode ser desfeita.
                        </p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Sim, excluir</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}