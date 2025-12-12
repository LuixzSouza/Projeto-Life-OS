"use client";

import { useState, useTransition, useRef } from "react";
import { Task } from "@prisma/client";
import { toggleTask, deleteTask, updateTask } from "@/app/(dashboard)/projects/actions";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";

// UI Components
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Flag, Trash2, MoreVertical, Image as ImageIcon, X, LucideIcon, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckedState } from "@radix-ui/react-checkbox";

interface PriorityInfo {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
}

interface TaskItemProps {
    task: Task; 
    viewMode: 'list' | 'compact'; 
}

const priorityConfig: Record<string, PriorityInfo> = {
    HIGH: { label: "Alta", color: "text-red-700 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-950/30", borderColor: "border-red-200 dark:border-red-900" },
    MEDIUM: { label: "Média", color: "text-amber-700 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-950/30", borderColor: "border-amber-200 dark:border-amber-900" },
    LOW: { label: "Baixa", color: "text-blue-700 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-950/30", borderColor: "border-blue-200 dark:border-blue-900" },
};

function MetadataRow({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
            <Label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</Label>
            <div className="flex items-center gap-2">{children}</div>
        </div>
    );
}

export function TaskItem({ task, viewMode }: TaskItemProps) { 
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false); 
    const [imageContent, setImageContent] = useState<string | null>(task.image);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleToggle = (checked: CheckedState) => { 
        startTransition(async () => { 
            await toggleTask(task.id, checked === true); 
        }); 
    };
    
    const handleDeleteConfirmed = async () => { 
        await deleteTask(task.id); 
        toast.success("Tarefa excluída.");
        setIsOpen(false); 
    };
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setImageContent(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handlePasteInModal = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                const file = items[i].getAsFile();
                if(file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        setImageContent(ev.target?.result as string);
                        toast.success("Imagem colada!");
                    }
                    reader.readAsDataURL(file);
                }
            }
        }
    };
    
    const getDateLabel = (date: Date | null) => {
        if (!date) return null;
        if (isToday(date)) return "Hoje";
        if (isTomorrow(date)) return "Amanhã";
        return format(date, "dd MMM", { locale: ptBR });
    };

    const isOverdue = task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && !task.isDone;
    const dateLabel = getDateLabel(task.dueDate);
    const priority = priorityConfig[task.priority] || priorityConfig.MEDIUM;

    return (
        <div className={cn(
            "group flex flex-col sm:flex-row bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-sm my-3 mx-3",
            task.isDone ? "opacity-60 bg-zinc-50 dark:bg-zinc-950 border-transparent" : ""
        )}>
            
            {/* 1. MINIATURA DE IMAGEM (Apenas Lista) */}
            {task.image && viewMode === 'list' && (
                 <div 
                    className="w-full sm:w-32 h-32 sm:h-auto relative cursor-pointer group/image shrink-0 bg-zinc-100 dark:bg-zinc-950" 
                    onClick={() => setIsOpen(true)}
                >
                    <img 
                        src={task.image} 
                        alt="Capa" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-105" 
                        loading="lazy" 
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="w-5 h-5 text-white drop-shadow-md" />
                    </div>
                </div>
            )}

            {/* 2. CONTEÚDO PRINCIPAL */}
            <div className={cn("flex flex-1 items-start gap-4 p-4", viewMode === 'compact' && 'py-3 items-center')}>
                
                <Checkbox 
                    checked={task.isDone} 
                    onCheckedChange={handleToggle}
                    className="mt-1 h-5 w-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-all shadow-sm"
                />
                
                <div className="flex-1 min-w-0 cursor-pointer space-y-1.5" onClick={() => setIsOpen(true)}>
                    <div className="flex items-start justify-between gap-4">
                        <span className={cn(
                            "font-medium text-sm sm:text-base leading-tight transition-all line-clamp-2",
                            task.isDone && "line-through text-zinc-400 decoration-zinc-400"
                        )}>
                            {task.title}
                        </span>
                    </div>
                    
                    {/* Metadados (Data e Prioridade) */}
                    <div className="flex flex-wrap items-center gap-2 h-5">
                        {dateLabel && viewMode === 'list' && (
                            <span className={cn(
                                "flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md border",
                                isOverdue 
                                    ? "text-red-600 bg-red-50 border-red-100 dark:bg-red-900/20 dark:border-red-900" 
                                    : "text-zinc-600 bg-zinc-50 border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-400"
                            )}>
                                {isOverdue ? <AlertCircle className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />} 
                                {dateLabel}
                            </span>
                        )}
                        
                        {(task.priority === 'HIGH' || viewMode === 'list') && !task.isDone && (
                            <span className={cn(
                                "flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider",
                                priority.color, priority.bgColor, priority.borderColor
                            )}>
                                <Flag className="h-3 w-3 fill-current" /> {priority.label}
                            </span>
                        )}
                    </div>
                </div>

                {/* Botão de Opções (Hover) */}
                <div className="hidden sm:block">
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        
                        {/* --- MODAL DE EDIÇÃO --- */}
                        <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col h-full bg-white dark:bg-zinc-950 border-l shadow-2xl">
                            
                            <SheetHeader className="sr-only">
                                <SheetTitle>Editar</SheetTitle> 
                                <SheetDescription>Detalhes da tarefa</SheetDescription>
                            </SheetHeader>
                            
                            {/* Capa do Modal */}
                            <div className="relative w-full bg-zinc-100 dark:bg-zinc-900 min-h-[200px] max-h-[250px] flex items-center justify-center border-b overflow-hidden group/header shrink-0">
                                {imageContent ? (
                                    <>
                                        <img src={imageContent} alt="Capa" className="w-full h-full object-cover" />
                                        <div className="absolute top-4 right-4 flex gap-2">
                                            <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/80 backdrop-blur shadow-sm hover:bg-red-100 hover:text-red-600 transition-colors" onClick={() => setImageContent(null)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </>
                                ) : (
                                    <div 
                                        className="flex flex-col items-center gap-3 text-zinc-400 hover:text-indigo-600 transition-colors cursor-pointer w-full h-full justify-center p-8 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800" 
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="p-4 bg-white dark:bg-zinc-800 rounded-full shadow-sm border border-zinc-100 dark:border-zinc-700">
                                            <ImageIcon className="h-6 w-6" />
                                        </div>
                                        <span className="text-xs font-semibold uppercase tracking-wide">Adicionar Imagem de Capa</span>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </div>

                            {/* Formulário */}
                            <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950" onPaste={handlePasteInModal} tabIndex={0}>
                                <form id={`form-${task.id}`} action={async (fd) => {
                                    if(imageContent) fd.set('image', imageContent); else fd.delete('image');
                                    await updateTask(fd);
                                    setIsOpen(false);
                                    toast.success("Salvo!");
                                }} className="p-6 space-y-6">
                                    
                                    <input type="hidden" name="id" value={task.id} />
                                    
                                    <div className="space-y-4">
                                         <Input 
                                            name="title" 
                                            defaultValue={task.title} 
                                            required 
                                            className="text-xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-indigo-500 rounded-none h-auto placeholder:text-zinc-300 py-2" 
                                            placeholder="Nome da tarefa..."
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <MetadataRow label="Status">
                                            <div className="flex items-center gap-2">
                                                <Checkbox 
                                                    id={`status-modal-${task.id}`}
                                                    checked={task.isDone} 
                                                    onCheckedChange={handleToggle}
                                                    className="h-5 w-5 rounded-full data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                                />
                                                <Label htmlFor={`status-modal-${task.id}`} className="text-sm font-medium cursor-pointer">
                                                    {task.isDone ? 'Concluída' : 'Pendente'}
                                                </Label>
                                            </div>
                                        </MetadataRow>
                                        
                                        <MetadataRow label="Prioridade">
                                            <Select name="priority" defaultValue={task.priority}>
                                                <SelectTrigger className="w-[140px] h-9 text-xs"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="LOW">🔵 Baixa</SelectItem>
                                                    <SelectItem value="MEDIUM">🟡 Média</SelectItem>
                                                    <SelectItem value="HIGH">🔴 Alta</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </MetadataRow>

                                        <MetadataRow label="Vencimento">
                                            <div className="relative">
                                                <Input 
                                                    name="dueDate" 
                                                    type="date" 
                                                    className="w-auto h-9 text-xs pl-9"
                                                    defaultValue={task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : ""} 
                                                />
                                                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                            </div>
                                        </MetadataRow>
                                    </div>
                                    
                                    <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center bg-zinc-50/50 dark:bg-zinc-900/50">
                                        <p className="text-xs text-zinc-400">
                                            Cole uma imagem aqui (<kbd className="font-mono bg-zinc-200 dark:bg-zinc-700 px-1 rounded">Ctrl+V</kbd>) para definir a capa.
                                        </p>
                                    </div>
                                </form>
                            </div>

                            {/* Rodapé */}
                            <SheetFooter className="p-4 border-t bg-zinc-50/30 dark:bg-zinc-900/30 flex flex-row justify-between items-center sm:justify-between gap-4 shrink-0">
                                <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="ghost" size="sm" className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30">
                                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Esta ação não pode ser desfeita.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700">Sim, excluir</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                <Button type="submit" form={`form-${task.id}`} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md px-8">
                                    Salvar Alterações
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </div>
    );
}