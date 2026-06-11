import { Task } from '@prisma/client';
import { CheckedState } from '@radix-ui/react-checkbox';

/** Pipeline de status da tarefa (mesmas chaves do Kanban). */
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';

export interface TaskItemProps {
  task: Task;
  viewMode: 'list' | 'compact' | 'grid';
}

export interface TaskBaseProps {
  task: Task;
  isOverdue: boolean;
  isPinned: boolean;
  isStarred: boolean;
  /** Estado de conclusão controlado localmente (optimistic UI). */
  isDone: boolean;
  /** Status controlado localmente (optimistic UI) — fonte do StatusStepper. */
  status: TaskStatus;
  progress: number;
  estimatedTime?: number;
  onToggle: (checked: CheckedState) => void;
  /** Avança/regride a tarefa no pipeline (clique no StatusStepper). */
  onStatusChange: (next: TaskStatus) => void;
  onToggleStar: () => void;
  onTogglePin?: () => void;
  onOpenModal: () => void;
}