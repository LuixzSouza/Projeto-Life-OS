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
// Importar componentes do Alert Dialog
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";


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
        <div className="flex items-center gap-4 py-2 border-b border-dashed border-zinc-100 dark:border-zinc-800">
            <Label className="w-24 text-xs text-zinc-500 shrink-0">{label}</Label>
            <div className="flex-1">{children}</div>
        </div>
    );
}

export function TaskItem({ task }: { task: Task }) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false); // Novo estado para o Alert
  const [imageContent, setImageContent] = useState<string | null>(task.image);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handlers (mantidos)
  const handleToggle = () => { startTransition(async () => { await toggleTask(task.id, task.isDone); }); };
  
  // Ação de Deletar: Executada APENAS após a confirmação do modal
  const handleDeleteConfirmed = async () => { 
    await deleteTask(task.id); 
    toast.success("Tarefa excluída.");
    setIsOpen(false); // Fecha o Sheet após deletar
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
  const priorityInfo = priorityConfig[task.priority] || priorityConfig.MEDIUM;

  return (
    <div className={cn(
      "group flex flex-col p-0 rounded-xl border bg-card hover:border-indigo-200 dark:hover:border-indigo-800 transition-all shadow-sm",
      task.isDone ? "opacity-50 bg-zinc-50 dark:bg-zinc-900/50 border-transparent" : "border-zinc-100 dark:border-zinc-800"
    )}>
      
      {/* 1. ÁREA DE IMAGEM NA LISTA (MINIATURA) */}
      {task.image && (
          <div className="w-full h-28 rounded-t-xl overflow-hidden relative cursor-pointer" onClick={() => setIsOpen(true)}>
              <img src={task.image} alt="Anexo" className="w-full h-full object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
      )}

      {/* 2. CHECKBOX, TÍTULO, E BOTÕES (ROW DE CONTEÚDO) */}
      <div className="flex items-start justify-between p-3 flex-1 min-w-0">
          
          <div className="flex items-start gap-3 flex-1 overflow-hidden">
              {/* Checkbox */}
              <Checkbox 
                  checked={task.isDone} 
                  onCheckedChange={handleToggle}
                  className="h-5 w-5 rounded-full border-2 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 transition-colors"
              />
              
              {/* Título e Detalhes */}
              <div className="flex flex-col truncate cursor-pointer pt-0.5" onClick={() => setIsOpen(true)}>
                  <span className={cn("font-medium text-sm truncate select-none", task.isDone && "line-through text-zinc-400")}>
                      {task.title}
                  </span>
                  <div className="flex items-center gap-2 text-[10px] text-zinc-500 h-4">
                      {dateLabel && (
                          <span className={cn("flex items-center gap-1", isOverdue ? "text-red-500 font-bold" : "")}>
                              <CalendarIcon className="h-3 w-3" /> {dateLabel}
                          </span>
                      )}
                      {(task.priority === 'HIGH') && (
                          <span className="flex items-center gap-1 text-red-500 font-medium">
                              <Flag className="h-3 w-3 fill-current" /> Alta
                          </span>
                      )}
                  </div>
              </div>
          </div>

          {/* Botão de Opções */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </SheetTrigger>
            
            {/* CONTEÚDO DO SHEET (MODAL MELHORADO) */}
            <SheetContent side="right" className="sm:max-w-md p-0 flex flex-col h-full bg-white dark:bg-zinc-950">
                
                {/* 3. HEADER DE ACESSIBILIDADE E TÍTULO VISUAL */}
                <SheetHeader className="p-6 pb-2">
                    {/* Título obrigatório para acessibilidade */}
                    <SheetTitle className="sr-only">Editar Tarefa: {task.title}</SheetTitle> 
                    <SheetDescription className="sr-only">Detalhes da tarefa {task.title}</SheetDescription>
                </SheetHeader>
                
                {/* 4. CABEÇALHO HERO (IMAGEM) */}
                <div className="relative w-full bg-zinc-200 dark:bg-zinc-900 min-h-[150px] flex items-center justify-center border-b overflow-hidden group/header">
                    {imageContent ? (
                        <>
                            <img src={imageContent} alt="Task attachment" className="w-full h-full max-h-[300px] object-cover" />
                            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover/header:opacity-100 transition-opacity">
                                <Button size="icon" variant="secondary" className="h-8 w-8 bg-white/80 backdrop-blur" onClick={() => setImageContent(null)}>
                                    <X className="h-4 w-4 text-red-500" />
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-zinc-400 p-8 cursor-pointer hover:text-zinc-600 transition-colors" onClick={() => fileInputRef.current?.click()}>
                            <ImageIcon className="h-8 w-8" />
                            <span className="text-xs">Clique para adicionar capa</span>
                        </div>
                    )}
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                </div>

                {/* CORPO DO FORMULÁRIO (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6" onPaste={handlePasteInModal} tabIndex={0}>
                    {/* O formulário que será submetido */}
                    <form id={`form-${task.id}`} action={async (fd) => {
                        if(imageContent) fd.set('image', imageContent); else fd.delete('image');
                        await updateTask(fd);
                        setIsOpen(false);
                        toast.success("Tarefa salva!");
                    }} className="space-y-6">
                        <input type="hidden" name="id" value={task.id} />
                        
                        {/* Título Grande */}
                        <div className="space-y-2">
                            <Input 
                                name="title" 
                                defaultValue={task.title} 
                                required 
                                className="text-2xl font-bold bg-transparent border-0 px-0 focus-visible:ring-0 focus-visible:border-indigo-500 h-10" 
                                placeholder="Nome da tarefa..."
                            />
                        </div>

                        {/* BLOCO DE METADADOS E PROPRIEDADES */}
                        <div className="space-y-1">
                            <MetadataRow label="Status">
                                <Checkbox 
                                    id={`status-${task.id}`}
                                    checked={task.isDone} 
                                    onCheckedChange={handleToggle}
                                    className="h-5 w-5 rounded-full data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                />
                                <Label htmlFor={`status-${task.id}`} className="ml-3 text-sm font-medium">
                                    {task.isDone ? 'Concluída' : 'Pendente'}
                                </Label>
                            </MetadataRow>
                            
                            <MetadataRow label="Prioridade">
                                <Select name="priority" defaultValue={task.priority}>
                                    <SelectTrigger className="w-[150px] h-8 bg-zinc-100 dark:bg-zinc-800 border-dashed"><SelectValue /></SelectTrigger>
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
                                    className="max-w-[150px] h-8 bg-zinc-100 dark:bg-zinc-800"
                                    defaultValue={task.dueDate ? format(task.dueDate, "yyyy-MM-dd") : ""} 
                                />
                            </MetadataRow>
                        </div>
                        {/* FIM DO BLOCO DE METADADOS */}
                        
                        <div className="rounded-lg border border-dashed p-4 text-center bg-zinc-100/50 dark:bg-zinc-900/50">
                            <p className="text-xs text-zinc-400">
                                Pressione <kbd className="bg-zinc-200 dark:bg-zinc-800 px-1 rounded mx-1 text-zinc-600 dark:text-zinc-300 font-mono">Ctrl + V</kbd> 
                                neste painel para colar uma imagem.
                            </p>
                        </div>
                    </form>
                </div>

                {/* RODAPÉ FIXO (Melhorado para Exclusão) */}
                <SheetFooter className="p-6 border-t bg-white dark:bg-zinc-950 flex flex-row justify-between gap-4 items-center">
                    
                    {/* Botão de Exclusão: Abre o AlertDialog */}
                    <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                        <AlertDialogTrigger asChild>
                            <Button type="button" variant="link" size="sm" className="text-red-500 hover:text-red-600 hover:no-underline px-0">
                                <Trash2 className="mr-2 h-4 w-4" /> Excluir Tarefa
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Excluir Tarefa Permanentemente?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Esta ação não pode ser desfeita. Isso removerá a tarefa &quot;{task.title}&quot; e qualquer anexo.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={handleDeleteConfirmed} 
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                >
                                    Sim, Excluir
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>

                    {/* Botão Salvar (Ação Primária) */}
                    <Button type="submit" form={`form-${task.id}`} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        Salvar Alterações
                    </Button>
                </SheetFooter>
            </SheetContent>
          </Sheet>
      </div>
    </div>
  );
}