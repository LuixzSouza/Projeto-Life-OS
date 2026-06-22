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
import { TaskChecklistEditor } from './task-checklist-editor';
import { TaskBlockersEditor } from './task-blockers-editor';

export function EditModal(props: EditModalProps) {
  const { isOpen, onClose, task } = props;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-4xl w-[96vw] h-[88vh] max-h-[88vh] p-0 gap-0 overflow-hidden bg-background border-border/40 shadow-2xl rounded-2xl flex flex-col outline-none"
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

      {/* CORPO — 2 colunas no desktop (conteúdo | propriedades), empilha no mobile */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar md:flex md:overflow-hidden">

        {/* COLUNA PRINCIPAL: capa, título, descrição, conexões */}
        <div className="min-w-0 space-y-6 p-6 md:flex-1 md:h-full md:overflow-y-auto custom-scrollbar">

          {/* Capa (opcional, compacta) */}
          <div className="relative group/image">
            {imageContent ? (
              <div className="relative rounded-xl overflow-hidden border border-border/40 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageContent} alt="Capa" className="w-full h-44 object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/image:opacity-100 transition-all flex items-center justify-center gap-3">
                  <Button variant="secondary" size="sm" className="rounded-xl font-semibold" onClick={() => fileInputRef.current?.click()}>Alterar</Button>
                  <Button variant="destructive" size="icon" aria-label="Remover imagem" className="h-9 w-9 rounded-xl" onClick={() => setImageContent(null)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" className="w-full h-16 border-2 border-dashed border-border/40 rounded-xl hover:bg-primary/5 hover:border-primary/30 flex items-center justify-center gap-2 transition-colors text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
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
            className="w-full bg-transparent text-2xl md:text-3xl font-bold tracking-tight outline-none border-none p-0 focus:ring-0 placeholder:text-muted-foreground/40"
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
              className="min-h-[180px] text-[15px] leading-relaxed text-foreground"
            />
          </div>

          {/* Checklist (subtarefas) — salva sozinha, sem depender do botão Salvar */}
          <TaskChecklistEditor taskId={task.id} initialRaw={task.checklist} />

          {/* Dependências: "bloqueada por" outras tarefas do projeto */}
          <TaskBlockersEditor taskId={task.id} />

          {/* Tags, Anexos & Conexões (card recolhível) */}
          <div className="pt-2">
            <EntityConnections entityType="task" entityId={task.id} />
          </div>
        </div>

        {/* SIDEBAR DE PROPRIEDADES (desktop) / seção final (mobile) */}
        <aside className="shrink-0 space-y-4 border-t border-border/40 bg-muted/10 p-5 md:h-full md:w-[300px] md:overflow-y-auto md:border-l md:border-t-0 custom-scrollbar">
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
        </aside>
      </div>

      {/* RODAPÉ */}
      <EditModalFooter onDelete={onDelete} isSaving={isSaving} onSave={handleFormSubmit} />

      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={onImageUpload} />
    </>
  );
}
