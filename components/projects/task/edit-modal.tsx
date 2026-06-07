'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Star, Pin, ListChecks, Info, ImageIcon, Link2, Trash2, SlidersHorizontal,
} from 'lucide-react';

import type { EditModalProps } from './edit-modal-types';
import { QuickAction } from './edit-modal-helpers';
import { TaskProperties } from './edit-modal-sidebar';
import { EditModalFooter } from './edit-modal-footer';
import { EntityConnections } from '@/components/connect/entity-connections';
import { Button } from '@/components/ui/button';

export function EditModal(props: EditModalProps) {
  const { isOpen, onClose, task } = props;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-2xl w-full max-h-[88vh] p-0 gap-0 overflow-hidden bg-background border-border/40 shadow-2xl rounded-2xl flex flex-col outline-none"
      >
        {/* ACESSIBILIDADE */}
        <DialogHeader className="sr-only">
          <DialogTitle>{task.title}</DialogTitle>
          <DialogDescription>Editar tarefa</DialogDescription>
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
      {/* TOP BAR (o X da biblioteca aparece à direita automaticamente) */}
      <header className="h-14 border-b border-border/40 bg-muted/10 flex items-center justify-between px-5 shrink-0 pr-14">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <ListChecks size={15} />
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground min-w-0">
            <span className="truncate">Editar tarefa</span>
            <span className="hidden sm:inline rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground/70">
              #{task.id.slice(-6).toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <QuickAction icon={Pin} active={isPinned} color="text-amber-500" onClick={onTogglePin} tooltip="Fixar" />
          <QuickAction icon={Star} active={isStarred} color="text-yellow-500" onClick={onToggleStar} tooltip="Destacar" />
          <QuickAction icon={Link2} active={false} color="" onClick={onCopyLink} tooltip="Copiar link" />
        </div>
      </header>

      {/* CORPO — coluna única, rolável */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">

        {/* Capa (opcional, compacta) */}
        <div className="relative group/image">
          {imageContent ? (
            <div className="relative rounded-xl overflow-hidden border border-border/40 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageContent} alt="Capa" className="w-full h-40 object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-all flex items-center justify-center gap-3">
                <Button variant="secondary" size="sm" className="rounded-xl font-semibold" onClick={() => fileInputRef.current?.click()}>Alterar</Button>
                <Button variant="destructive" size="icon" className="h-9 w-9 rounded-xl" onClick={() => setImageContent(null)}>
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" className="w-full h-20 border-2 border-dashed border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/30 flex items-center justify-center gap-2 transition-colors text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="h-5 w-5" />
              <span className="text-xs font-semibold">Adicionar imagem de capa</span>
            </Button>
          )}
        </div>

        {/* Título */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título da tarefa..."
          className="w-full bg-transparent text-2xl font-bold tracking-tight outline-none border-none p-0 focus:ring-0 placeholder:text-muted-foreground/40"
        />

        {/* Descrição */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Info size={13} /> Descrição
          </label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onPaste={onPaste}
            variant="default"
            placeholder="Adicione detalhes, contexto e próximos passos..."
            className="min-h-[140px] text-[15px] leading-relaxed text-foreground"
          />
        </div>

        {/* Propriedades (em grade, no corpo) */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <SlidersHorizontal size={13} /> Propriedades
          </label>
          <TaskProperties
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

        {/* Tags, Anexos & Conexões (card recolhível) */}
        <div className="pt-2">
          <EntityConnections entityType="task" entityId={task.id} />
        </div>
      </div>

      {/* RODAPÉ */}
      <EditModalFooter onDelete={onDelete} isSaving={isSaving} onSave={handleFormSubmit} />

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onImageUpload} />
    </>
  );
}
