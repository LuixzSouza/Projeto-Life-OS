"use client";

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { LucideIcon } from 'lucide-react';

export function PropertyRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">
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
      <TooltipContent side="top" className="text-[10px] font-black uppercase tracking-widest bg-zinc-950 border-none text-white px-3 py-1.5 shadow-2xl">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}
