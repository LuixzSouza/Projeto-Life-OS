"use client";

import { useState } from "react";
// Removemos a importação do @prisma/client para não obrigar o tipo completo
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Trash2, Pencil, Folder } from "lucide-react";
import { toast } from "sonner";
import { updateProject, deleteProject } from "@/app/(dashboard)/projects/actions";

// ✅ TIPAGEM CORRETA:
// Definimos exatamente o formato que o componente recebe do page.tsx.
// Não exigimos a tarefa completa, apenas o que já buscamos.
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
    project: ProjectSummary; // Usa a interface leve
    selectedProjectId: string;
    pendingCount: number;
}

export function ProjectItem({ project, selectedProjectId, pendingCount }: ProjectItemProps) {
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    // Handler para deletar o projeto
    const handleDelete = async () => {
        try {
            await deleteProject(project.id);
            toast.success(`Projeto "${project.title}" excluído.`);
            if (selectedProjectId === project.id) {
                window.location.href = '/projects?id=inbox';
            }
        } catch (error) {
            toast.error("Erro ao excluir.");
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

    const isActive = selectedProjectId === project.id;

    return (
        <div className="group relative flex items-center">
            {/* Link/Botão do Projeto */}
            <a href={`/projects?id=${project.id}`} className="block flex-1 min-w-0">
                <Button 
                    variant={isActive ? "secondary" : "ghost"} 
                    className="w-full justify-start pr-8 relative h-9"
                >
                    <Folder className={`mr-2 h-4 w-4 ${isActive ? "text-indigo-600" : "text-zinc-400"}`} />
                    <span className={`truncate ${isActive ? "font-semibold text-zinc-900 dark:text-zinc-100" : "text-zinc-600 dark:text-zinc-400"}`}>
                        {project.title}
                    </span>
                    
                    {/* Badge de Pendências */}
                    {pendingCount > 0 && (
                        <Badge variant="secondary" className="ml-auto h-5 px-1.5 text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-normal group-hover:bg-white dark:group-hover:bg-zinc-700 transition-colors">
                            {pendingCount}
                        </Badge>
                    )}
                </Button>
            </a>

            {/* Menu de Opções */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={`absolute right-1 top-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity ${isActive ? "opacity-100" : ""}`}
                    >
                        <MoreHorizontal className="h-4 w-4 text-zinc-400" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    
                    {/* Opção 1: Editar */}
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Pencil className="mr-2 h-4 w-4" /> Editar Projeto
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
                                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                                    Salvar Alterações
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Opção 2: Deletar */}
                    <DropdownMenuItem 
                        onSelect={(e) => { e.preventDefault(); setIsDeleteDialogOpen(true); }} 
                        className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Deletar Projeto
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Modal de Confirmação de Deleção */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Excluir Projeto?</DialogTitle></DialogHeader>
                    <div className="py-4 text-sm text-zinc-500">
                        <p>Você está prestes a excluir <strong>{project.title}</strong>.</p>
                        <p className="mt-2 text-red-600 font-medium">
                            Isso apagará permanentemente {project.tasks.length} tarefas associadas.
                        </p>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Sim, excluir projeto
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}