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
import { CalendarIcon, Flag, Trash2, MoreVertical, Image as ImageIcon, X, AlertCircle, Clock, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckedState } from "@radix-ui/react-checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

interface TaskItemProps {
    task: Task; 
    viewMode: 'list' | 'compact'; 
}

const PRIORITY_STYLES = {
    HIGH: { label: "Alta", color: "text-red-600 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800" },
    MEDIUM: { label: "Média", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800" },
    LOW: { label: "Baixa", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800" },
};

function MetadataRow({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-4 border-b border-border last:border-0">
            <div className="flex items-center gap-2 text-muted-foreground">
                {icon}
                <Label className="text-xs font-medium uppercase tracking-wider cursor-default">{label}</Label>
            </div>
            <div className="flex items-center gap-2">{children}</div>
        </div>
    );
}

export function TaskItem({ task, viewMode }: TaskItemProps) { 
    const [isPending, startTransition] = useTransition();
    const [isOpen, setIsOpen] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false); 
    const [imageContent, setImageContent] = useState<string | null>(task.image);
    const [isSaving, setIsSaving] = useState(false);
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

    const handleSubmit = async (formData: FormData) => {
        setIsSaving(true);
        if(imageContent) formData.set('image', imageContent); else formData.delete('image');
        
        try {
            await updateTask(formData);
            setIsOpen(false);
            toast.success("Tarefa atualizada!");
        } catch (error) {
            toast.error("Erro ao salvar.");
        } finally {
            setIsSaving(false);
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
    const priorityStyle = PRIORITY_STYLES[task.priority as keyof typeof PRIORITY_STYLES] || PRIORITY_STYLES.LOW;

    return (
        <div className={cn(
            "group flex flex-col sm:flex-row bg-card border border-border rounded-xl overflow-hidden transition-all hover:border-primary/50 hover:shadow-sm mb-3",
            task.isDone ? "opacity-60 bg-muted/30 border-transparent" : ""
        )}>
            
            {/* MINIATURA DE IMAGEM (Lista) */}
            {task.image && viewMode === 'list' && (
                 <div 
                    className="w-full sm:w-24 h-24 sm:h-auto relative cursor-pointer group/image shrink-0 bg-muted" 
                    onClick={() => setIsOpen(true)}
                >
                    <img 
                        src={task.image} 
                        alt="Capa" 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-105" 
                        loading="lazy" 
                    />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-white drop-shadow-md" />
                    </div>
                </div>
            )}

            {/* CONTEÚDO */}
            <div className={cn("flex flex-1 items-start gap-4 p-4", viewMode === 'compact' && 'py-3 items-center')}>
                
                <Checkbox 
                    checked={task.isDone} 
                    onCheckedChange={handleToggle}
                    className="mt-1 h-5 w-5 rounded-full border-2 border-muted-foreground/40 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 transition-all"
                />
                
                <div className="flex-1 min-w-0 cursor-pointer space-y-1.5" onClick={() => setIsOpen(true)}>
                    <div className="flex items-start justify-between gap-4">
                        <span className={cn(
                            "font-medium text-sm sm:text-base leading-tight transition-all line-clamp-2 text-foreground",
                            task.isDone && "line-through text-muted-foreground decoration-muted-foreground/50"
                        )}>
                            {task.title}
                        </span>
                    </div>
                    
                    {/* Metadados */}
                    <div className="flex flex-wrap items-center gap-2 h-5">
                        {dateLabel && viewMode === 'list' && (
                            <Badge variant="outline" className={cn(
                                "flex items-center gap-1.5 text-[10px] px-2 py-0 h-5 font-normal border",
                                isOverdue 
                                    ? "text-red-600 bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900" 
                                    : "text-muted-foreground border-border"
                            )}>
                                {isOverdue ? <AlertCircle className="h-3 w-3" /> : <CalendarIcon className="h-3 w-3" />} 
                                {dateLabel}
                            </Badge>
                        )}
                        
                        {(task.priority === 'HIGH' || viewMode === 'list') && !task.isDone && (
                            <Badge variant="outline" className={cn(
                                "flex items-center gap-1 text-[10px] px-2 py-0 h-5 border font-semibold",
                                priorityStyle.color
                            )}>
                                <Flag className="h-3 w-3 fill-current" /> {priorityStyle.label}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Ações (Só aparece no Hover) */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity hidden sm:block">
                    <Sheet open={isOpen} onOpenChange={setIsOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </SheetTrigger>
                        
                        <SheetContent className="sm:max-w-md p-0 flex flex-col h-full border-l border-border bg-background">
                            
                            <SheetHeader className="sr-only">
                                <SheetTitle>Editar Tarefa</SheetTitle> 
                                <SheetDescription>Detalhes</SheetDescription>
                            </SheetHeader>
                            
                            {/* Área da Imagem de Capa */}
                            <div className="relative w-full bg-muted/30 min-h-[180px] max-h-[220px] flex items-center justify-center border-b border-border overflow-hidden shrink-0">
                                {imageContent ? (
                                    <>
                                        <img src={imageContent} alt="Capa" className="w-full h-full object-cover" />
                                        <Button 
                                            size="icon" 
                                            variant="secondary" 
                                            className="absolute top-4 right-4 h-8 w-8 bg-background/80 backdrop-blur shadow-sm hover:text-destructive" 
                                            onClick={() => setImageContent(null)}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </>
                                ) : (
                                    <div 
                                        className="flex flex-col items-center gap-3 text-muted-foreground hover:text-primary transition-colors cursor-pointer w-full h-full justify-center p-8 hover:bg-muted/50" 
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="p-4 bg-background rounded-full shadow-sm border border-border">
                                            <ImageIcon className="h-6 w-6" />
                                        </div>
                                        <span className="text-xs font-semibold uppercase tracking-wide">Adicionar Capa</span>
                                    </div>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                            </div>

                            {/* Formulário de Edição */}
                            <div className="flex-1 overflow-y-auto" onPaste={handlePasteInModal} tabIndex={0}>
                                <form action={handleSubmit} id={`form-${task.id}`} className="p-6 space-y-6">
                                    <input type="hidden" name="id" value={task.id} />
                                    
                                    {/* Título */}
                                    <div className="space-y-4">
                                         <Input 
                                            name="title" 
                                            defaultValue={task.title} 
                                            required 
                                            className="text-xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-primary rounded-none h-auto placeholder:text-muted-foreground py-2" 
                                            placeholder="Nome da tarefa..."
                                        />
                                    </div>

                                    {/* Metadados */}
                                    <div className="space-y-1">
                                        <MetadataRow label="Status" icon={<div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />}>
                                            <div className="flex items-center gap-2">
                                                <Checkbox 
                                                    id={`status-modal-${task.id}`}
                                                    checked={task.isDone} 
                                                    onCheckedChange={handleToggle}
                                                    className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                                />
                                                <Label htmlFor={`status-modal-${task.id}`} className="text-sm font-medium cursor-pointer">
                                                    {task.isDone ? 'Concluída' : 'Pendente'}
                                                </Label>
                                            </div>
                                        </MetadataRow>
                                        
                                        <MetadataRow label="Prioridade" icon={<Flag className="h-4 w-4" />}>
                                            <Select name="priority" defaultValue={task.priority}>
                                                <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/30 border-border"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="LOW">🔵 Baixa</SelectItem>
                                                    <SelectItem value="MEDIUM">🟡 Média</SelectItem>
                                                    <SelectItem value="HIGH">🔴 Alta</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </MetadataRow>

                                        <MetadataRow label="Vencimento" icon={<CalendarIcon className="h-4 w-4" />}>
                                            <Input 
                                                name="dueDate" 
                                                type="date" 
                                                className="w-auto h-8 text-xs bg-muted/30 border-border"
                                                defaultValue={task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""} 
                                            />
                                        </MetadataRow>
                                    </div>
                                    
                                    {/* Área de Colagem */}
                                    <div className="rounded-xl border border-dashed border-border p-6 text-center bg-muted/10">
                                        <p className="text-xs text-muted-foreground">
                                            Cole uma imagem aqui (<kbd className="font-mono bg-muted px-1 rounded text-foreground">Ctrl+V</kbd>) para definir a capa.
                                        </p>
                                    </div>
                                </form>
                            </div>

                            {/* Rodapé */}
                            <SheetFooter className="p-4 border-t border-border bg-muted/10 flex flex-row justify-between items-center sm:justify-between gap-4 shrink-0">
                                <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button type="button" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                                            <Trash2 className="mr-2 h-4 w-4" /> Excluir
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-destructive hover:bg-destructive/90">Sim, excluir</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>

                                <Button type="submit" form={`form-${task.id}`} disabled={isSaving} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm px-6">
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Salvar
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </div>
    );
}