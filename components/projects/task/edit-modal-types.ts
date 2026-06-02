import { Task, Project } from '@prisma/client';

export interface EditModalProps {
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
