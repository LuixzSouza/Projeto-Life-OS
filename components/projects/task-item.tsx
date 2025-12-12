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
import { CalendarIcon, Flag, Trash2, MoreVertical, Image as ImageIcon, X, LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { CheckedState } from "@radix-ui/react-checkbox";


// Configuração Visual das Prioridades
interface PriorityInfo {
  label: string;
  color: string;
  icon: LucideIcon;
}

const priorityConfig: Record<string, PriorityInfo> = {
    HIGH: { label: "Alta", color: "text-red-600 bg-red-100 dark:bg-red-900/30 border-red-200", icon: Flag },
    MEDIUM: { label: "Média", color: "text-amber-600 bg-amber-100 dark:bg-amber-900/30 border-amber-200", icon: Flag },
    LOW: { label: "Baixa", color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30 border-blue-200", icon: Flag },
};

// Componente para Display de Metadados (reutilizável)
function MetadataRow({ label, children }: { label: string, children: React.ReactNode }) {
    return (
        <div className="flex items-center gap-4 py-3 border-b border-dashed border-zinc-100 dark:border-zinc-800 last:border-0">
            <Label className="w-24 text-xs font-semibold text-zinc-500 uppercase tracking-wide shrink-0">{label}</Label>
            <div className="flex-1 flex items-center gap-2">{children}</div>
        </div>
    );
}

export function TaskItem({ task }: { task: Task }) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false); 
  const [imageContent, setImageContent] = useState<string | null>(task.image);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers
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
      return format(date, "dd/MM", { locale: ptBR });
  };

  const isOverdue = task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && !task.isDone;
  const dateLabel = getDateLabel(task.dueDate);

  return (
    <div className={cn(
      "group flex flex-col p-0 rounded-xl border bg-card hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm relative overflow-hidden",
      task.isDone ? "opacity-60 bg-zinc-50 dark:bg-zinc-900/30 border-transparent" : "border-zinc-100 dark:border-zinc-800"
    )}>
      
      {/* 1. ÁREA DE IMAGEM NA LISTA (MINIATURA) */}
      {task.image && (
          <div className="w-full h-32 relative cursor-pointer group/image" onClick={() => setIsOpen(true)}>
              <img src={task.image} alt="Anexo" className="w-full h-full object-cover transition-transform group-hover/image:scale-105 duration-500" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity flex items-end p-3">
                  <span className="text-xs text-white font-medium flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Ver anexo</span>
              </div>
          </div>
      )}

      {/* 2. CONTEÚDO DA LISTA */}
      <div className="flex items-start justify-between p-3.5 gap-3">
          
          <div className="flex items-start gap-3 flex-1 min-w-0">
              <Checkbox 
                  checked={task.isDone} 
                  onCheckedChange={handleToggle}
                  className="mt-0.5 h-5 w-5 rounded-full border-2 border-zinc-300 dark:border-zinc-600 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 transition-all"
              />
              
              <div className="flex flex-col min-w-0 cursor-pointer" onClick={() => setIsOpen(true)}>
                  <span className={cn(
                      "font-medium text-sm leading-tight transition-all",
                      task.isDone && "line-through text-zinc-400 decoration-zinc-400"
                  )}>
                      {task.title}
                  </span>
                  
                  <div className="flex items-center gap-3 mt-1.5 h-4">
                      {dateLabel && (
                          <span className={cn("flex items-center gap-1 text-[11px] font-medium", isOverdue ? "text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-md" : "text-zinc-500")}>
                              <CalendarIcon className="h-3 w-3" /> {dateLabel}
                          </span>
                      )}
                      
                      {task.priority === 'HIGH' && !task.isDone && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded-md uppercase tracking-wide">
                              <Flag className="h-3 w-3 fill-current" /> Alta
                          </span>
                      )}
                  </div>
              </div>
          </div>

          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 -mr-2">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </SheetTrigger>
            
            <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col h-full bg-white dark:bg-zinc-950 border-l shadow-2xl">
                
                {/* 3. HEADER ACESSÍVEL + IMAGEM HERO */}
                <SheetHeader className="sr-only">
                    <SheetTitle>Editar Tarefa</SheetTitle> 
                    <SheetDescription>Detalhes da tarefa {task.title}</SheetDescription>
                </SheetHeader>
                
                <div className="relative w-full bg-zinc-100 dark:bg-zinc-900 min-h-[160px] flex items-center justify-center border-b overflow-hidden group/header shrink-0">
                    {imageContent ? (
                        <>
                            <img src={imageContent} alt="Task cover" className="w-full h-full max-h-[300px] object-cover" />
                            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover/header:opacity-100 transition-opacity">
                                <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/90 backdrop-blur shadow-sm hover:bg-red-50" onClick={() => setImageContent(null)}>
                                    <X className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div 
                            className="flex flex-col items-center gap-2 text-zinc-400 hover:text-indigo-500 transition-colors cursor-pointer p-10 w-full h-full justify-center" 
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm"><ImageIcon className="h-6 w-6" /></div>
                            <span className="text-xs font-medium">Adicionar Capa</span>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>

                {/* 4. FORMULÁRIO */}
                <div className="flex-1 overflow-y-auto" onPaste={handlePasteInModal} tabIndex={0}>
                    <form id={`form-${task.id}`} action={async (fd) => {
                        if(imageContent) fd.set('image', imageContent); else fd.delete('image');
                        await updateTask(fd);
                        setIsOpen(false);
                        toast.success("Salvo com sucesso!");
                    }} className="p-6 space-y-6">
                        
                        <input type="hidden" name="id" value={task.id} />
                        
                        <div className="space-y-3">
                             <Label className="sr-only" htmlFor="title">Título</Label>
                             <Input 
                                name="title" 
                                id="title"
                                defaultValue={task.title} 
                                required 
                                className="text-xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0 focus-visible:border-b-2 focus-visible:border-indigo-500 rounded-none h-auto placeholder:text-zinc-300" 
                                placeholder="Nome da tarefa..."
                            />
                        </div>

                        <div className="space-y-0">
                            <MetadataRow label="Status">
                                <Checkbox 
                                    id={`status-${task.id}`}
                                    checked={task.isDone} 
                                    onCheckedChange={handleToggle}
                                    className="h-5 w-5 rounded-full data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                />
                                <Label htmlFor={`status-${task.id}`} className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
                                    {task.isDone ? 'Concluída' : 'Pendente'}
                                </Label>
                            </MetadataRow>
                            
                            <MetadataRow label="Prioridade">
                                <Select name="priority" defaultValue={task.priority}>
                                    <SelectTrigger className="w-[140px] h-8 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">🔵 Baixa</SelectItem>
                                        <SelectItem value="MEDIUM">🟡 Média</SelectItem>
                                        <SelectItem value="HIGH">🔴 Alta</SelectItem>
                                    </SelectContent>
                                </Select>
                            </MetadataRow>

                            <MetadataRow label="Vencimento">
                                <Input 
                                    name="dueDate" 
                                    type="date" 
                                    className="w-auto h-8 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-xs"
                                    defaultValue={task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : ""} 
                                />
                            </MetadataRow>
                        </div>
                        
                        <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-4 text-center bg-zinc-50/50 dark:bg-zinc-900/50">
                            <p className="text-xs text-zinc-400">
                                Dica: Pressione <kbd className="bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border text-zinc-500 font-mono text-[10px]">Ctrl + V</kbd> aqui para colar uma imagem.
                            </p>
                        </div>
                    </form>
                </div>

                {/* 5. RODAPÉ FIXO */}
                <SheetFooter className="p-4 border-t bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-row justify-between items-center sm:justify-between gap-4 shrink-0">
                    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 px-2">
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Tarefa?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação removerá permanentemente a tarefa.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteConfirmed} className="bg-red-600 hover:bg-red-700 text-white">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    <Button type="submit" form={`form-${task.id}`} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md px-6">
                        Salvar
                    </Button>
                </SheetFooter>
            </SheetContent>
          </Sheet>
      </div>
    </div>
  );
}