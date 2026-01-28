'use client';

import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

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
        className={cn("w-16 h-1.5", className)}
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