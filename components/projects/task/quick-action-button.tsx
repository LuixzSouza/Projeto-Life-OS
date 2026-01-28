'use client';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

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
              disabled && 'opacity-50 cursor-not-allowed',
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