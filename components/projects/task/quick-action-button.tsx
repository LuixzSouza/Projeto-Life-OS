'use client';

import React, { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Extraímos as variantes diretamente do componente Button para evitar o erro de exportação
type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | null | undefined;

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  variant?: ButtonVariant; // Usamos nossa definição local segura
  className?: string;
  disabled?: boolean;
}

/**
 * QuickActionButton: Botão tático de ação rápida com tooltip integrado.
 * Refinado para evitar erros de tipagem externa.
 */
export const QuickActionButton = forwardRef<HTMLButtonElement, QuickActionButtonProps>(
  ({ icon, label, onClick, variant = 'ghost', className, disabled = false }, ref) => {
    
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (!disabled) {
        onClick(e);
      }
    };

    return (
      <TooltipProvider delayDuration={150}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              ref={ref}
              type="button"
              variant={variant}
              size="icon"
              className={cn(
                'h-8 w-8 rounded-xl transition-all duration-300',
                'text-muted-foreground/60 border border-transparent',
                'hover:text-primary hover:bg-primary/10 hover:border-primary/10',
                'active:scale-90',
                disabled && 'opacity-30 cursor-not-allowed grayscale',
                className
              )}
              onClick={handleClick}
              disabled={disabled}
              aria-label={label}
            >
              <div className="relative z-10">
                {icon}
              </div>
            </Button>
          </TooltipTrigger>
          <TooltipContent 
            side="bottom" 
            className="px-3 py-1.5 bg-zinc-950 text-white border-zinc-800 rounded-lg shadow-2xl"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.15em] leading-none">
              {label}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

QuickActionButton.displayName = 'QuickActionButton';