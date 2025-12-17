"use client";

import * as React from "react";
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group";
import { CircleIcon } from "lucide-react";

import { cn } from "@/lib/utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn(
        /* Layout previsível */
        "grid gap-3",

        /* Melhor leitura visual em listas */
        "items-start",

        className
      )}
      {...props}
    />
  );
}

function RadioGroupItem({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-group-item"
      className={cn(
        /* Dimensões e forma */
        "aspect-square size-4 shrink-0 rounded-full",

        /* Base neutra enterprise */
        "bg-background dark:bg-input/30",

        /* Borda sutil e consistente */
        "border border-input",

        /* Hierarquia visual */
        "text-primary",

        /* Feedback visual premium */
        "shadow-xs transition-[color,box-shadow,border-color] duration-200",

        /* Estados de foco e acessibilidade */
        "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",

        /* Estados inválidos */
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",

        /* Estados desabilitados */
        "disabled:cursor-not-allowed disabled:opacity-50",

        className
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator
        data-slot="radio-group-indicator"
        className={cn(
          /* Centralização perfeita */
          "relative flex items-center justify-center",

          /* Animação suave ao selecionar */
          "transition-transform duration-200"
        )}
      >
        <CircleIcon
          className={cn(
            /* Ponto central */
            "absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2",

            /* Cor dinâmica do tema */
            "fill-primary"
          )}
        />
      </RadioGroupPrimitive.Indicator>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioGroupItem };
