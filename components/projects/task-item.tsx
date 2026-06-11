'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import {
  toggleTask,
  deleteTask,
  updateTask,
  toggleTaskPin,
  toggleTaskStar,
  updateTaskProgress,
  updateTaskStatus,
} from '@/app/(dashboard)/projects/actions';
import { isPast, isToday } from 'date-fns';
import { toast } from 'sonner';

// Sub-components
import { TaskGridItem } from './task/task-grid-item';
import { TaskListItem } from './task/task-list-item';
import { TaskCompactItem } from './task/task-compact-item';
import { EditModal } from './task/edit-modal';

// Types
import type { TaskItemProps, TaskStatus } from '@/types/task-types';
import { normalizeStatus } from './task/status-stepper';
import { CheckedState } from '@radix-ui/react-checkbox';

export function TaskItem({ task, viewMode }: TaskItemProps) {
  const [, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Estados locais controlados pelo Item e Modal
  const [imageContent, setImageContent] = useState<string | null>(task.image);
  const [isPinned, setIsPinned] = useState(task.isPinned || false);
  const [isStarred, setIsStarred] = useState(task.isStarred || false);
  const [isDone, setIsDone] = useState(task.isDone || false);
  const [status, setStatus] = useState<TaskStatus>(normalizeStatus(task.status));
  const [progress, setProgress] = useState(task.progress || 0);
  const [estimatedTime, setEstimatedTime] = useState(task.estimatedTime || 60);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincronização de props
  useEffect(() => {
    setIsPinned(task.isPinned || false);
    setIsStarred(task.isStarred || false);
    setIsDone(task.isDone || false);
    setStatus(normalizeStatus(task.status));
    setProgress(task.progress || 0);
    setEstimatedTime(task.estimatedTime || 60);
    setImageContent(task.image);
  }, [task]);

  // --- ACTIONS RÁPIDAS (TOOLTIPS/BADGES) ---

  const handleToggle = useCallback((checked: CheckedState) => {
    const next = checked === true;
    // Optimistic UI: reflete a marcação na hora; o servidor revalida em segundo plano.
    // O status acompanha (toggleTask grava DONE/TODO no servidor).
    setIsDone(next);
    setStatus(next ? 'DONE' : 'TODO');
    setProgress(next ? 100 : 0);
    startTransition(async () => {
      try {
        await toggleTask(task.id, next);
      } catch {
        // Reverte se o servidor falhar.
        setIsDone(!next);
        setStatus(!next ? 'DONE' : 'TODO');
        setProgress(!next ? 100 : 0);
        toast.error('Falha ao atualizar a tarefa.');
      }
    });
  }, [task.id]);

  // Clique no StatusStepper: avança no pipeline (DONE sincroniza o checkbox).
  const handleStatusChange = useCallback((next: TaskStatus) => {
    const prev = { status, isDone, progress };
    setStatus(next);
    setIsDone(next === 'DONE');
    if (next === 'DONE') setProgress(100);
    else if (next === 'TODO') setProgress(0);
    startTransition(async () => {
      try {
        await updateTaskStatus(task.id, next);
      } catch {
        setStatus(prev.status);
        setIsDone(prev.isDone);
        setProgress(prev.progress);
        toast.error('Falha ao mudar o status.');
      }
    });
  }, [task.id, status, isDone, progress]);

  const handleTogglePin = useCallback(async () => {
    const next = !isPinned;
    setIsPinned(next);
    try {
      await toggleTaskPin(task.id, next);
    } catch {
      setIsPinned(!next);
      toast.error('Falha ao fixar unidade.');
    }
  }, [task.id, isPinned]);

  const handleToggleStar = useCallback(async () => {
    const next = !isStarred;
    setIsStarred(next);
    try {
      await toggleTaskStar(task.id, next);
    } catch {
      setIsStarred(!next);
      toast.error('Erro de priorização.');
    }
  }, [task.id, isStarred]);

  const handleProgressChange = useCallback(async (val: number) => {
    setProgress(val);
    try {
      await updateTaskProgress(task.id, val);
    } catch {
      toast.error('Erro ao sincronizar progresso.');
    }
  }, [task.id]);

  // --- HANDLERS PARA O MODAL ---

  const handleDeleteConfirmed = useCallback(async () => {
    try {
      await deleteTask(task.id);
      toast.success('Registro eliminado');
      setIsOpen(false);
    } catch {
      toast.error('Falha técnica na exclusão.');
    }
  }, [task.id]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Payload excessivo: Limite 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageContent(ev.target?.result as string);
      toast.success('Identidade visual carregada');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handlePasteInModal = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            setImageContent(ev.target?.result as string);
            toast.success('Captura de imagem realizada');
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          return;
        }
      }
    }
  }, []);

  const handleSubmit = useCallback(async (formData: FormData) => {
    setIsSaving(true);
    try {
      // Configuração de metadados obrigatórios
      formData.set('id', task.id);
      formData.set('isPinned', isPinned.toString());
      formData.set('isStarred', isStarred.toString());
      formData.set('progress', progress.toString());
      formData.set('estimatedTime', estimatedTime.toString());
      
      if (imageContent) {
        formData.set('image', imageContent);
      } else {
        formData.delete('image');
      }

      // CORREÇÃO DO ERRO DE TIPAGEM: unknown primeiro, depois o objeto
      const result = (await updateTask(formData)) as unknown as { error?: string } | null;
      
      if (result && 'error' in result && result.error) {
        toast.error(result.error);
        return;
      }

      setIsOpen(false);
      toast.success('Unidade sincronizada');
    } catch (error) {
      console.error(error);
      toast.error('Erro na transmissão de dados.');
    } finally {
      setIsSaving(false);
    }
  }, [task.id, imageContent, isPinned, isStarred, progress, estimatedTime]);

  const copyTaskLink = useCallback(() => {
    const url = `${window.location.origin}/projects/task/${task.id}`;
    navigator.clipboard.writeText(url);
    toast.success('Link de acesso copiado');
  }, [task.id]);

  const isOverdue = !!(task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && !isDone);

  const commonProps = {
    task,
    isOverdue,
    isPinned,
    isStarred,
    isDone,
    status,
    progress,
    estimatedTime,
    onToggle: handleToggle,
    onStatusChange: handleStatusChange,
    onToggleStar: handleToggleStar,
    onTogglePin: handleTogglePin,
    onOpenModal: () => setIsOpen(true)
  };

  return (
    <>
      {/* VISTA DINÂMICA */}
      {(() => {
        switch (viewMode) {
          case 'grid': return <TaskGridItem {...commonProps} />;
          case 'compact': return <TaskCompactItem {...commonProps} />;
          default: return <TaskListItem {...commonProps} />;
        }
      })()}
      
      {/* TERMINAL DE EDIÇÃO */}
      <EditModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        task={task}
        imageContent={imageContent}
        setImageContent={setImageContent}
        fileInputRef={fileInputRef}
        isPinned={isPinned}
        isStarred={isStarred}
        progress={progress}
        estimatedTime={estimatedTime}
        isSaving={isSaving}
        onTogglePin={handleTogglePin}
        onToggleStar={handleToggleStar}
        onProgressChange={handleProgressChange}
        setProgress={setProgress}
        setEstimatedTime={setEstimatedTime}
        onCopyLink={copyTaskLink}
        onDelete={handleDeleteConfirmed}
        onSubmit={handleSubmit}
        onImageUpload={handleImageUpload}
        onPaste={handlePasteInModal}
      />
    </>
  );
}