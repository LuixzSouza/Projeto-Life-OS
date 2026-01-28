'use client';

import { Badge } from '@/components/ui/badge';
import { PRIORITY_STYLES } from '../task-item';
import { cn } from '@/lib/utils';

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