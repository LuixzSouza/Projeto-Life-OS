"use client";

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { LucideIcon } from 'lucide-react';

export function PropertyRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon size={14} /> {label}
      </div>
      {children}
    </div>
  );
}

export function QuickAction({ icon: Icon, active, color, onClick, tooltip }: { icon: LucideIcon; active: boolean; color: string; onClick: () => void; tooltip: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-10 w-10 rounded-xl transition-all",
            active ? `${color} bg-background shadow-lg border border-border/10` : "text-muted-foreground hover:bg-muted"
          )}
          onClick={onClick}
        >
          <Icon size={20} className={cn(active && "fill-current")} />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-[11px] font-semibold bg-foreground text-background border-none px-2.5 py-1 shadow-lg">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
