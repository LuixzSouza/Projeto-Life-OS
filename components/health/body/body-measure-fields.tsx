"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export const MeasureRow = ({ label, value, highlight }: { label: string, value?: number, highlight?: boolean }) => (
    <div className="space-y-1">
        <span className="text-[10px] text-muted-foreground">{label}</span>
        <div className={cn("font-mono font-medium text-sm border rounded px-2 py-1", highlight ? "bg-primary/10 border-primary/30" : "bg-muted/20")}>{value || '--'}</div>
    </div>
);

export const InputWithTooltip = ({ label, val, onChange, tooltip }: { label: string, val?: number, onChange: (v: string) => void, tooltip: string }) => (
    <div className="space-y-2">
        <div className="flex items-center gap-1.5">
            <Label className="text-[10px] font-bold text-muted-foreground uppercase">{label}</Label>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger type="button"><HelpCircle className="h-3 w-3 text-muted-foreground/70 hover:text-primary cursor-help" /></TooltipTrigger>
                    <TooltipContent className="max-w-[200px] text-xs leading-normal p-2">
                        {tooltip}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
        <Input
            type="number" step="0.1"
            value={val || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0.0" className="bg-muted/20 h-9"
        />
    </div>
);
