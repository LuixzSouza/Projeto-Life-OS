'use client';

import { useState, useCallback } from 'react';
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
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Star, Pin, ChevronRight, Zap, Info, ImageIcon, Link2, Trash2,
} from 'lucide-react';

import type { EditModalProps } from './edit-modal-types';
import { QuickAction } from './edit-modal-helpers';
import { EditModalSidebar } from './edit-modal-sidebar';
import { EditModalFooter } from './edit-modal-footer';

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
  const [projectId] = useState(task.projectId ?? 'inbox');
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
                  {/* eslint-disable-next-line @next/next/no-img-element */}
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
        <EditModalSidebar
          status={status}
          setStatus={setStatus}
          priority={priority}
          setPriority={setPriority}
          dueDate={dueDate}
          setDueDate={setDueDate}
          progress={progress}
          setProgress={setProgress}
          onProgressChange={onProgressChange}
          estimatedTime={estimatedTime}
          setEstimatedTime={setEstimatedTime}
        />
      </div>

      {/* 3. RODAPÉ / DELETE CENTRALIZADO */}
      <EditModalFooter onDelete={onDelete} isSaving={isSaving} onSave={handleFormSubmit} />

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onImageUpload} />
    </>
  );
}
