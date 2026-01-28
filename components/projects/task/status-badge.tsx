'use client';

import { Badge } from '@/components/ui/badge';
import { STATUS_STYLES } from '../task-item';
import { cn } from '@/lib/utils';

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