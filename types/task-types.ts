import { Task } from '@prisma/client';
import { CheckedState } from '@radix-ui/react-checkbox';

export interface TaskItemProps {
  task: Task;
  viewMode: 'list' | 'compact' | 'grid';
}

export interface TaskBaseProps {
  task: Task;
  isOverdue: boolean;
  isPinned: boolean;
  isStarred: boolean;
  progress: number;
  estimatedTime?: number;
  onToggle: (checked: CheckedState) => void;
  onToggleStar: () => void;
  onTogglePin?: () => void;
  onOpenModal: () => void;
}