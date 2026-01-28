'use client';

import { useState, useTransition, useRef, useEffect, useCallback } from 'react';
import { Task } from '@prisma/client';
import {
  toggleTask,
  deleteTask,
  updateTask,
  toggleTaskPin,
  toggleTaskStar,
  updateTaskProgress,
} from '@/app/(dashboard)/projects/actions';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, isTomorrow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

// UI Components
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  CalendarIcon,
  Flag,
  Trash2,
  MoreVertical,
  Image as ImageIcon,
  X,
  AlertCircle,
  Clock,
  Save,
  Loader2,
  Pin,
  PinOff,
  Calendar,
  Link2,
  Eye,
  Star,
  StarOff,
  Target,
  Timer,
  CalendarDays,
  Sparkles,
  Zap,
  CheckCircle2,
  FileImage,
  Copy,
} from 'lucide-react';
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
import { CheckedState } from '@radix-ui/react-checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Sheet, SheetContent, SheetFooter } from '@/components/ui/sheet';

// Sub-components
import { TaskGridItem } from './task/task-grid-item';
import { TaskListItem } from './task/task-list-item';
import { TaskCompactItem } from './task/task-compact-item';
import { EditModal } from './task/edit-modal';

// Types
import type { TaskItemProps } from '@/types/task-types';

// Constants
export const PRIORITY_STYLES = {
  HIGH: {
    label: 'Alta',
    color: 'text-red-600 bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: '🔥',
    bgColor: 'bg-red-500',
  },
  MEDIUM: {
    label: 'Média',
    color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
    icon: '⚡',
    bgColor: 'bg-amber-500',
  },
  LOW: {
    label: 'Baixa',
    color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: '🌱',
    bgColor: 'bg-blue-500',
  },
} as const;

export const STATUS_STYLES = {
  TODO: { label: 'A fazer', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800', icon: <Target className="h-3 w-3" /> },
  IN_PROGRESS: {
    label: 'Em progresso',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900',
    icon: <Clock className="h-3 w-3" />,
  },
  REVIEW: { label: 'Em revisão', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900', icon: <Eye className="h-3 w-3" /> },
  DONE: {
    label: 'Concluída',
    color: 'bg-green-100 text-green-800 dark:bg-green-900',
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
} as const;

// Função para converter HTML em markdown limpo
const convertHtmlToMarkdown = (html: string): string => {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Remove scripts, styles, elementos indesejados
    tempDiv.querySelectorAll('script, style, noscript, iframe, nav, header, footer').forEach(el => el.remove());
    
    // Converte títulos
    tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
      const level = parseInt(el.tagName[1]);
      const text = el.textContent?.trim() || '';
      if (text) {
        el.outerHTML = `${'#'.repeat(level)} ${text}\n\n`;
      }
    });
    
    // Negrito
    tempDiv.querySelectorAll('b, strong').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text) {
        el.outerHTML = `**${text}**`;
      }
    });
    
    // Itálico
    tempDiv.querySelectorAll('i, em').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text) {
        el.outerHTML = `*${text}*`;
      }
    });
    
    // Links
    tempDiv.querySelectorAll('a').forEach(el => {
      const href = el.getAttribute('href');
      const text = el.textContent?.trim() || '';
      if (href && text) {
        el.outerHTML = `[${text}](${href})`;
      }
    });
    
    // Listas
    tempDiv.querySelectorAll('ul, ol').forEach((list, listIndex) => {
      const items = list.querySelectorAll('li');
      let listContent = '';
      
      items.forEach((item, itemIndex) => {
        const bullet = list.tagName === 'OL' ? `${itemIndex + 1}.` : '-';
        const text = item.textContent?.trim() || '';
        if (text) {
          listContent += `${bullet} ${text}\n`;
        }
      });
      
      if (listContent) {
        list.outerHTML = `${listContent}\n`;
      }
    });
    
    // Código
    tempDiv.querySelectorAll('code').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text) {
        if (el.parentElement?.tagName === 'PRE') {
          el.outerHTML = `\`\`\`\n${text}\n\`\`\``;
        } else {
          el.outerHTML = `\`${text}\``;
        }
      }
    });
    
    // Citações
    tempDiv.querySelectorAll('blockquote').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text) {
        el.outerHTML = `> ${text.replace(/\n/g, '\n> ')}\n\n`;
      }
    });
    
    // Parágrafos e quebras de linha
    tempDiv.querySelectorAll('p, br, div').forEach(el => {
      if (el.tagName === 'BR') {
        el.replaceWith('\n');
      } else if (el.tagName === 'P' || el.tagName === 'DIV') {
        const text = el.textContent?.trim() || '';
        if (text) {
          el.outerHTML = `${text}\n\n`;
        }
      }
    });
    
    // Limpeza final
    let result = tempDiv.textContent || html;
    
    result = result
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\s{2,}/g, ' ')
      .replace(/\[ \]/g, '- [ ]')
      .replace(/\[x\]/gi, '- [x]')
      .trim();
    
    return result;
  } catch (error) {
    console.error('Erro ao converter HTML:', error);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent?.replace(/\s{2,}/g, ' ').trim() || html;
  }
};

// Hook para processar conteúdo colado
export const usePasteFormatter = (onContentChange: (content: string) => void) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    e.preventDefault();
    
    const clipboard = e.clipboardData;
    if (!clipboard) return;

    // Verifica se é imagem
    const items = Array.from(clipboard.items);
    const imageItem = items.find(item => item.type.startsWith('image/'));
    
    if (imageItem) {
      const file = imageItem.getAsFile();
      if (file) {
        return { type: 'image', file };
      }
    }

    // Processa texto/HTML
    const text = clipboard.getData('text/plain');
    const html = clipboard.getData('text/html');
    
    if (text || html) {
      setIsProcessing(true);
      
      try {
        let cleanedContent = text;
        
        // Se tiver HTML, converte para markdown
        if (html && html !== text) {
          cleanedContent = convertHtmlToMarkdown(html);
        } else if (text) {
          // Limpa texto simples
          cleanedContent = text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/\s{2,}/g, ' ')
            .trim();
        }
        
        onContentChange(cleanedContent);
        toast.success("Conteúdo formatado colado com sucesso!");
      } catch (error) {
        console.error('Erro ao processar colagem:', error);
        toast.error("Erro ao processar conteúdo. Mantendo formato original.");
      } finally {
        setIsProcessing(false);
      }
    }
    
    return { type: 'text' };
  }, [onContentChange]);

  return { handlePaste, isProcessing };
};

// Componentes auxiliares
interface MetadataRowProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function MetadataRow({ label, icon, children, className }: MetadataRowProps) {
  return (
    <div className={cn('flex items-center justify-between py-3 px-4 hover:bg-muted/30 transition-colors', className)}>
      <div className="flex items-center gap-3 text-muted-foreground">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
          {icon}
        </div>
        <Label className="text-sm font-medium cursor-default">{label}</Label>
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'ghost' | 'secondary' | 'outline';
  className?: string;
  disabled?: boolean;
}

export function QuickActionButton({ 
  icon, 
  label, 
  onClick, 
  variant = 'ghost', 
  className,
  disabled = false 
}: QuickActionButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size="icon"
            className={cn(
              'h-8 w-8 rounded-full transition-all hover:scale-105',
              'hover:bg-primary/10 hover:text-primary',
              className
            )}
            onClick={onClick}
            disabled={disabled}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface DateBadgeProps {
  date: Date | null;
  isOverdue: boolean;
}

export function DateBadge({ date, isOverdue }: DateBadgeProps) {
  if (!date) return null;

  const formatDate = (d: Date) => {
    if (isToday(d)) return 'Hoje';
    if (isTomorrow(d)) return 'Amanhã';
    const diffDays = differenceInDays(d, new Date());
    if (diffDays > 0 && diffDays <= 7) return `Em ${diffDays} dias`;
    return format(d, 'dd MMM', { locale: ptBR });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              'flex items-center gap-1.5 text-xs px-2.5 py-1 h-6 font-medium border transition-colors',
              'hover:bg-gradient-to-r hover:from-primary/5 hover:to-primary/10',
              isOverdue
                ? 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800 hover:bg-red-100'
                : 'text-muted-foreground border-border hover:bg-muted',
            )}
          >
            {isOverdue ? (
              <AlertCircle className="h-3.5 w-3.5" />
            ) : (
              <CalendarDays className="h-3.5 w-3.5" />
            )}
            {formatDate(date)}
            {isOverdue && ' (Atrasada)'}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-sm">{format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ProgressBarProps {
  value: number;
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, className, showLabel = true }: ProgressBarProps) {
  return (
    <div className="flex items-center gap-2">
      <Progress 
        value={value} 
        className={cn("w-16 h-2", className)}
        indicatorClassName="bg-gradient-to-r from-primary to-primary/80"
      />
      {showLabel && (
        <span className="text-xs font-medium text-muted-foreground min-w-[35px]">
          {value}%
        </span>
      )}
    </div>
  );
}

interface PriorityBadgeProps {
  priority: keyof typeof PRIORITY_STYLES;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const style = PRIORITY_STYLES[priority] || PRIORITY_STYLES.LOW;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] px-2 py-0 h-5 font-medium',
        'transition-colors hover:scale-105',
        style.color
      )}
    >
      <span className="text-xs mr-1">{style.icon}</span>
      {style.label}
    </Badge>
  );
}

interface StatusBadgeProps {
  status: keyof typeof STATUS_STYLES;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.TODO;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-[10px] px-2 py-0 h-5 font-medium',
        style.color
      )}
    >
      {style.icon}
      <span className="ml-1">{style.label}</span>
    </Badge>
  );
}

// Componente principal
export function TaskItem({ task, viewMode }: TaskItemProps) {
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const [imageContent, setImageContent] = useState<string | null>(task.image);
  const [isSaving, setIsSaving] = useState(false);
  const [isPinned, setIsPinned] = useState(task.isPinned || false);
  const [isStarred, setIsStarred] = useState(task.isStarred || false);
  const [progress, setProgress] = useState(task.progress || 0);
  const [estimatedTime, setEstimatedTime] = useState(task.estimatedTime || 60);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsPinned(task.isPinned || false);
    setIsStarred(task.isStarred || false);
    setProgress(task.progress || 0);
    setEstimatedTime(task.estimatedTime || 60);
  }, [task]);

  const handleToggle = useCallback(
    (checked: CheckedState) => {
      startTransition(async () => {
        await toggleTask(task.id, checked === true);
      });
    },
    [task.id],
  );

  const handleDeleteConfirmed = useCallback(async () => {
    try {
      await deleteTask(task.id);
      toast.success('Tarefa excluída com sucesso!');
      setIsOpen(false);
    } catch (error) {
      toast.error('Erro ao excluir tarefa. Tente novamente.');
    }
  }, [task.id]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter menos de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadstart = () => {
      toast.loading('Processando imagem...');
    };
    
    reader.onload = (ev) => {
      setImageContent(ev.target?.result as string);
      toast.success('Imagem adicionada com sucesso!');
    };
    
    reader.onerror = () => {
      toast.error('Erro ao carregar a imagem.');
    };
    
    reader.readAsDataURL(file);
    e.target.value = '';
  }, []);

  const handlePasteInModal = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    
    // Primeiro verifica se é imagem
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          if (file.size > 5 * 1024 * 1024) {
            toast.error('A imagem deve ter menos de 5MB.');
            return;
          }
          
          const reader = new FileReader();
          reader.onload = (ev) => {
            setImageContent(ev.target?.result as string);
            toast.success('Imagem colada com sucesso!');
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          return;
        }
      }
    }

    // Se não for imagem, processa texto formatado
    const text = e.clipboardData.getData('text/plain');
    const html = e.clipboardData.getData('text/html');
    
    if (html && html !== text) {
      e.preventDefault();
      const formatted = convertHtmlToMarkdown(html);
      const textarea = e.target as HTMLTextAreaElement;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      const newValue = textarea.value.substring(0, start) + formatted + textarea.value.substring(end);
      textarea.value = newValue;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      
      toast.success('Conteúdo formatado colado!');
    }
  }, []);

  const handleSubmit = useCallback(
    async (formData: FormData) => {
      setIsSaving(true);
      try {
        if (imageContent) {
          formData.set('image', imageContent);
        } else {
          formData.delete('image');
        }

        formData.set('isPinned', isPinned.toString());
        formData.set('isStarred', isStarred.toString());
        formData.set('progress', progress.toString());
        formData.set('estimatedTime', estimatedTime.toString());

        await updateTask(formData);
        setIsOpen(false);
        toast.success('Tarefa atualizada com sucesso!');
      } catch (error) {
        console.error('Erro ao atualizar tarefa:', error);
        toast.error('Erro ao salvar alterações. Tente novamente.');
      } finally {
        setIsSaving(false);
      }
    },
    [imageContent, isPinned, isStarred, progress, estimatedTime],
  );

  const handleTogglePin = useCallback(async () => {
    const newPinnedState = !isPinned;
    setIsPinned(newPinnedState);
    try {
      await toggleTaskPin(task.id, newPinnedState);
      toast.success(newPinnedState ? 'Tarefa fixada!' : 'Tarefa desfixada');
    } catch (error) {
      setIsPinned(!newPinnedState);
      toast.error('Erro ao atualizar. Tente novamente.');
    }
  }, [task.id, isPinned]);

  const handleToggleStar = useCallback(async () => {
    const newStarredState = !isStarred;
    setIsStarred(newStarredState);
    try {
      await toggleTaskStar(task.id, newStarredState);
      toast.success(newStarredState ? 'Tarefa destacada!' : 'Tarefa normalizada');
    } catch (error) {
      setIsStarred(!newStarredState);
      toast.error('Erro ao atualizar. Tente novamente.');
    }
  }, [task.id, isStarred]);

  const handleProgressChange = useCallback(
    async (value: number) => {
      setProgress(value);
      try {
        await updateTaskProgress(task.id, value);
      } catch (error) {
        toast.error('Erro ao atualizar progresso.');
      }
    },
    [task.id],
  );

  const copyTaskLink = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}/projects/task/${task.id}`);
    toast.success('Link da tarefa copiado para a área de transferência!');
  }, [task.id]);

  const isOverdue = !!(task.dueDate && isPast(task.dueDate) && !isToday(task.dueDate) && !task.isDone);

  // Renderização condicional baseada no modo de visualização
  switch (viewMode) {
    case 'grid':
      return (
        <TaskGridItem
          task={task}
          isOverdue={isOverdue}
          isPinned={isPinned}
          isStarred={isStarred}
          progress={progress}
          onToggle={handleToggle}
          onToggleStar={handleToggleStar}
          onOpenModal={() => setIsOpen(true)}
        />
      );
    
    case 'compact':
      return (
        <TaskCompactItem
          task={task}
          isOverdue={isOverdue}
          isPinned={isPinned}
          isStarred={isStarred}
          progress={progress}
          estimatedTime={estimatedTime}
          onToggle={handleToggle}
          onToggleStar={handleToggleStar}
          onTogglePin={handleTogglePin}
          onOpenModal={() => setIsOpen(true)}
        />
      );
    
    default: // 'list'
      return (
        <>
          <TaskListItem
            task={task}
            isOverdue={isOverdue}
            isPinned={isPinned}
            isStarred={isStarred}
            progress={progress}
            estimatedTime={estimatedTime}
            onToggle={handleToggle}
            onToggleStar={handleToggleStar}
            onTogglePin={handleTogglePin}
            onOpenModal={() => setIsOpen(true)}
          />
          
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
}