"use client";

import { useState } from "react";
import { Project, Task } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Trash2, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { updateProject, deleteProject } from "@/app/(dashboard)/projects/actions";

interface ProjectWithTasks extends Project {
    tasks: Task[];
}

export function ProjectItem({ project, selectedProjectId }: { project: ProjectWithTasks, selectedProjectId: string }) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Handler para deletar o projeto
    const handleDelete = async () => {
        try {
            await deleteProject(project.id);
            toast.success(`Projeto "${project.title}" excluído.`);
            // Redireciona para o Inbox após deletar
            window.location.href = '/projects?id=inbox';
        } catch (error) {
            toast.error("Erro ao excluir. Verifique se todas as tarefas foram removidas.");
        }
    };

    // Handler para atualizar o projeto
    const handleUpdate = async (formData: FormData) => {
        try {
            await updateProject(formData);
            toast.success(`Projeto "${project.title}" atualizado.`);
            setIsEditOpen(false);
        } catch (error) {
            toast.error("Falha ao atualizar projeto.");
        }
    };

    return (
        <div className="group relative">
            {/* Link/Botão do Projeto (Sempre Visível) */}
            <a href={`/projects?id=${project.id}`} className="block">
                <Button 
                    variant={selectedProjectId === project.id ? "secondary" : "ghost"} 
                    className="w-full justify-start truncate pr-10"
                >
                    <span className="mr-2 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    <span className="truncate">{project.title}</span>
                </Button>
            </a>

            {/* Menu de Opções (Visível no Hover) */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="absolute right-0 top-0 h-full w-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Opções do projeto"
                    >
                        <MoreHorizontal className="h-4 w-4 text-zinc-500" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    
                    {/* Opção 1: Editar */}
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar Detalhes
                            </DropdownMenuItem>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Editar: {project.title}</DialogTitle></DialogHeader>
                            <form action={handleUpdate} className="space-y-4">
                                <input type="hidden" name="id" value={project.id} />
                                <div className="space-y-2">
                                    <Label htmlFor="title">Nome do Projeto</Label>
                                    <Input id="title" name="title" defaultValue={project.title} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="description">Descrição</Label>
                                    <Input id="description" name="description" defaultValue={project.description || ""} />
                                </div>
                                <Button type="submit" className="w-full">
                                    <Check className="mr-2 h-4 w-4" /> Salvar Alterações
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Opção 2: Deletar */}
                    <DropdownMenuItem 
                        onSelect={(e) => { e.preventDefault(); setIsDeleteDialogOpen(true); }} 
                        className="text-red-500 hover:!bg-red-50"
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Deletar Projeto
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Modal de Confirmação de Deleção (Separado) */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle className="text-red-600">Confirmação de Exclusão</DialogTitle></DialogHeader>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        Você realmente quer deletar o projeto **{project.title}**? 
                        Todas as {project.tasks.length} tarefas associadas serão **apagadas permanentemente**. {/* <--- AGORA CORRIGIDO */}
                    </p>
                    <Button variant="destructive" onClick={handleDelete} className="w-full">
                        <Trash2 className="mr-2 h-4 w-4" /> Sim, Deletar {project.title}
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    );
}