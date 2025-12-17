import * as React from "react";
import { cn } from "@/lib/utils";

function Input({
  className,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        /* Base */
        "w-full min-w-0 h-9 rounded-md border bg-transparent px-3 py-1 text-sm",
        "text-foreground placeholder:text-muted-foreground",
        "shadow-xs transition-[color,box-shadow,border-color,background-color]",
        "outline-none",

        /* Tema / estados */
        "border-input dark:bg-input/30",
        "selection:bg-primary selection:text-primary-foreground",

        /* Focus */
        "focus-visible:border-primary/60",
        "focus-visible:ring-2 focus-visible:ring-primary/30",

        /* Validação */
        "aria-invalid:border-destructive",
        "aria-invalid:ring-2 aria-invalid:ring-destructive/20",
        "dark:aria-invalid:ring-destructive/40",

        /* Disabled */
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",

        /* File input */
        "file:inline-flex file:h-7 file:border-0 file:bg-transparent",
        "file:text-sm file:font-medium file:text-foreground",

        /* Responsivo */
        "md:text-sm",

        className
      )}
      {...props}
    />
  );
}

export { Input };
