'use client';

import { useState, useCallback } from 'react';
import { Task, Project } from '@prisma/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// UI Components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// Icons
import {
  Flag,
  CalendarDays,
  LayoutTemplate,
  Save,
  Trash2,
  Star,
  Pin,
  ChevronRight,
  Target,
  Timer,
  ArrowRightLeft,
  Zap,
  Info,
  Loader2,
  ImageIcon,
  Link2
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  allProjects?: Project[];
  progress: number;
  estimatedTime: number;
  setProgress: (v: number) => void;
  setEstimatedTime: (v: number) => void;
  isPinned: boolean;
  isStarred: boolean;
  onTogglePin: () => void;
  onToggleStar: () => void;
  onDelete: () => void;
  isSaving: boolean;
  onSubmit: (data: FormData) => Promise<void>;
  imageContent: string | null;
  setImageContent: (value: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onProgressChange: (value: number) => void;
  onCopyLink: () => void;
}

export function EditModal(props: EditModalProps) {
  const { isOpen, onClose, task } = props;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-[95vw] w-full xl:max-w-7xl h-[92vh] p-0 gap-0 overflow-hidden bg-background border-border/40 shadow-2xl rounded-[2.5rem] flex flex-col outline-none"
      >
        {/* ACESSIBILIDADE */}
        <DialogHeader className="sr-only">
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>Painel de gerenciamento de missão</DialogDescription>
        </DialogHeader>

        {/* TOOLTIP E CONTEÚDO COM RESET POR ID */}
        <TooltipProvider delayDuration={0}>
          <EditModalContent key={task.id} {...props} />
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
}

function EditModalContent({
  task,
  allProjects = [],
  progress,
  estimatedTime,
  setProgress,
  setEstimatedTime,
  isPinned,
  isStarred,
  onTogglePin,
  onToggleStar,
  onDelete,
  isSaving,
  onSubmit,
  imageContent,
  setImageContent,
  fileInputRef,
  onImageUpload,
  onPaste,
  onProgressChange,
  onCopyLink
}: EditModalProps) {
  
  // Estado local sincronizado via 'key' no componente pai
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [status, setStatus] = useState(task.status ?? 'TODO');
  const [priority, setPriority] = useState(task.priority ?? 'MEDIUM');
  const [projectId, setProjectId] = useState(task.projectId ?? 'inbox');
  const [dueDate, setDueDate] = useState<Date | undefined>(
    task.dueDate ? new Date(task.dueDate) : undefined
  );

  const handleFormSubmit = useCallback(async () => {
    const data = new FormData();
    
    // OBRIGATÓRIO: O servidor precisa do ID para dar o update
    data.set('id', task.id); 
    
    data.set('title', title);
    data.set('description', description);
    data.set('status', status);
    data.set('priority', priority);
    data.set('projectId', projectId);
    data.set('progress', progress.toString());
    data.set('estimatedTime', estimatedTime.toString());
    
    if (dueDate) {
      data.set('dueDate', dueDate.toISOString());
    } else {
      data.delete('dueDate'); // Garante que limpa se não houver data
    }

    await onSubmit(data);
  }, [task.id, title, description, status, priority, projectId, progress, estimatedTime, dueDate, onSubmit]);
    
return (
    <>
      {/* 1. TOP BAR (O X padrão da biblioteca aparecerá à direita deste header automaticamente) */}
      <header className="h-14 border-b border-border/40 bg-muted/5 flex items-center justify-between px-6 shrink-0 pr-16">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm">
            <Zap size={14} className="fill-current" />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
            <span>Control Panel</span>
            <ChevronRight size={10} />
            <span className="text-foreground/60">{task.id.slice(-8).toUpperCase()}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <QuickAction icon={Pin} active={isPinned} color="text-amber-400" onClick={onTogglePin} tooltip="Fixar" />
          <QuickAction icon={Star} active={isStarred} color="text-yellow-400" onClick={onToggleStar} tooltip="Priorizar" />
          <QuickAction icon={Link2} active={false} color="" onClick={onCopyLink} tooltip="Copiar Link" />
        </div>
      </header>

      {/* 2. ÁREA DE TRABALHO */}
      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row bg-background">
        
        {/* COLUNA ESQUERDA: EDITOR */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-16 space-y-12 custom-scrollbar">
          <div className="space-y-6">
            {/* AREA DE IMAGEM */}
            <div className="relative group/image max-w-2xl">
              {imageContent ? (
                <div className="relative rounded-[2rem] overflow-hidden border border-border/40 shadow-2xl">
                  <img src={imageContent} alt="Cover" className="w-full h-64 object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-all flex items-center justify-center gap-3">
                    <Button variant="secondary" size="sm" className="rounded-xl font-bold text-[10px] uppercase" onClick={() => fileInputRef.current?.click()}>Alterar</Button>
                    <Button variant="destructive" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setImageContent(null)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ) : (
                <Button variant="ghost" className="w-full h-32 border-2 border-dashed border-border/40 rounded-[2rem] hover:bg-primary/5 flex flex-col gap-2" onClick={() => fileInputRef.current?.click()}>
                  <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Inserir Mídia de Capa</span>
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Título da Missão..."
                className="w-full bg-transparent text-4xl lg:text-6xl font-black tracking-tighter outline-none border-none p-0 focus:ring-0"
              />
              <Separator className="bg-border/40" />
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
                <Info size={12} /> Briefing Técnico
              </div>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                onPaste={onPaste}
                variant="ghost"
                placeholder="Detalhes operacionais..."
                className="min-h-[400px] text-xl leading-relaxed px-0 placeholder:text-muted-foreground/10"
              />
            </div>
          </div>
        </main>

        {/* COLUNA DIREITA: SIDEBAR */}
        <aside className="w-full lg:w-[360px] border-l border-border/40 bg-muted/5 p-8 space-y-10 overflow-y-auto shrink-0">
          <section className="space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">Parâmetros</h4>
            
            <PropertyRow icon={LayoutTemplate} label="Status">
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="h-11 border-none bg-background/50 shadow-xl rounded-2xl font-bold text-[10px] uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="TODO" className="text-[10px] font-bold uppercase">A Fazer</SelectItem>
                  <SelectItem value="IN_PROGRESS" className="text-[10px] font-bold uppercase">Em Curso</SelectItem>
                  <SelectItem value="DONE" className="text-[10px] font-bold uppercase">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </PropertyRow>

            <PropertyRow icon={Flag} label="Urgência">
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="h-11 border-none bg-background/50 shadow-xl rounded-2xl font-bold text-[10px] uppercase">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="LOW" className="text-[10px] font-bold uppercase">Baixa</SelectItem>
                  <SelectItem value="MEDIUM" className="text-[10px] font-bold uppercase text-amber-500">Média</SelectItem>
                  <SelectItem value="HIGH" className="text-[10px] font-bold uppercase text-rose-500">Alta</SelectItem>
                </SelectContent>
              </Select>
            </PropertyRow>

            <PropertyRow icon={CalendarDays} label="Prazo">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" className="w-full h-11 justify-start bg-background/50 shadow-xl rounded-2xl font-bold text-[10px] uppercase px-5">
                    {dueDate ? format(dueDate, "dd MMM, yyyy", { locale: ptBR }) : "Definir"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-[2rem] overflow-hidden border-border/40 shadow-2xl" align="end">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={ptBR} initialFocus />
                </PopoverContent>
              </Popover>
            </PropertyRow>
          </section>

          <Separator className="bg-border/40" />

          <section className="space-y-8">
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/30">Métricas</h4>
            <div className="bg-background border border-border/40 rounded-[2rem] p-6 space-y-6 shadow-xl">
               <div className="flex justify-between items-end">
                  <div className="space-y-1">
                     <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-[0.3em]">Saúde</span>
                     <div className="text-4xl font-black font-mono tracking-tighter text-primary">{progress}%</div>
                  </div>
                  <Target size={24} className="text-primary/20" />
               </div>
               <Slider value={[progress]} onValueChange={([v]) => { setProgress(v); onProgressChange(v); }} max={100} step={5} />
            </div>

            <div className="flex items-center justify-between px-4 py-4 bg-background/40 rounded-2xl border border-dashed border-border/60">
               <div className="flex items-center gap-3 text-[10px] font-bold uppercase text-muted-foreground/60">
                  <Timer size={14} /> Esforço
               </div>
               <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    value={estimatedTime} 
                    onChange={e => setEstimatedTime(Number(e.target.value))}
                    className="w-12 bg-transparent border-none text-right font-mono text-lg font-black outline-none text-primary"
                  />
                  <span className="text-[9px] font-black text-muted-foreground/30 uppercase">Min</span>
               </div>
            </div>
          </section>
        </aside>
      </div>

      {/* 3. RODAPÉ / DELETE CENTRALIZADO */}
      <footer className="h-24 px-8 border-t border-border/40 bg-muted/5 flex items-center justify-between shrink-0">
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="h-12 px-6 rounded-2xl text-muted-foreground/30 hover:text-rose-500 font-black text-[10px] uppercase tracking-widest transition-all group">
              <Trash2 size={16} className="mr-2 group-hover:rotate-12 transition-transform" /> Eliminar Unidade
            </Button>
          </AlertDialogTrigger>
          
          <AlertDialogContent 
            className="rounded-[2.5rem] border-border/40 shadow-2xl p-10 max-w-sm flex flex-col items-center fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          >
            <AlertDialogHeader className="flex flex-col items-center text-center space-y-4">
              <div className="h-20 w-20 rounded-[2rem] bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-inner">
                 <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <AlertDialogTitle className="text-3xl font-black uppercase tracking-tighter italic">Apagar?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground font-medium text-sm leading-relaxed px-4">
                  Esta ação removerá todos os dados desta missão permanentemente do Life OS.
                </AlertDialogDescription>
              </div>
            </AlertDialogHeader>
            
            <AlertDialogFooter className="mt-10 flex flex-col gap-3 w-full sm:flex-col">
              <AlertDialogAction 
                onClick={onDelete} 
                className="h-14 w-full rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[11px] tracking-widest shadow-xl shadow-rose-500/20"
              >
                Confirmar Exclusão
              </AlertDialogAction>
              <AlertDialogCancel className="h-14 w-full rounded-2xl font-black uppercase text-[11px] tracking-widest border-border/60 bg-transparent hover:bg-muted">
                Cancelar
              </AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button 
          onClick={handleFormSubmit} 
          disabled={isSaving}
          className="h-14 px-12 rounded-2xl bg-foreground text-background hover:bg-foreground/90 font-black uppercase tracking-[0.1em] text-[11px] shadow-2xl transition-all active:scale-95 disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin mr-3" /> : <Save size={18} className="mr-3" />}
          {isSaving ? "Salvando..." : "Confirmar Mudanças"}
        </Button>
      </footer>

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onImageUpload} />
    </>
  );
}

// --- HELPERS ---

function PropertyRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
        <Icon size={14} /> {label}
      </div>
      {children}
    </div>
  );
}

function QuickAction({ icon: Icon, active, color, onClick, tooltip }: { icon: LucideIcon; active: boolean; color: string; onClick: () => void; tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className={cn(
            "h-10 w-10 rounded-xl transition-all", 
            active ? `${color} bg-background shadow-lg border border-border/10` : "text-muted-foreground hover:bg-muted"
          )}
          onClick={onClick}
        >
          <Icon size={20} className={cn(active && "fill-current")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[10px] font-black uppercase tracking-widest bg-zinc-950 border-none text-white px-3 py-1.5 shadow-2xl">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}