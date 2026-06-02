"use client";

import { cn } from "@/lib/utils";

export function Stat({
  label,
  value,
  bordered,
  highlight,
}: {
  label: string;
  value: string | number;
  bordered?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "text-center p-2",
        bordered && "border-l border-r border-border/40"
      )}
    >
      <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
        {label}
      </div>

      <div
        className={cn(
          "text-lg font-bold",
          highlight ? "text-primary" : "text-foreground"
        )}
      >
        {value}
      </div>
    </div>
  );
}
