"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Slider — Enterprise / Premium
 * Comportamento 100% preservado
 * Visual refinado, hierarquia clara e tema dinâmico
 * ------------------------------------------------------------------------------------------------- */

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const values = React.useMemo<number[]>(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min],
    [value, defaultValue, min]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        /* Layout */
        "relative flex w-full touch-none select-none items-center",
        "data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",

        /* Estados */
        "data-[disabled]:opacity-50",

        className
      )}
      {...props}
    >
      {/* Track */}
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          "relative grow overflow-hidden rounded-full",

          /* Base neutra */
          "bg-muted",

          /* Dimensões */
          "data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full",
          "data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
        )}
      >
        {/* Range */}
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute h-full w-full",

            /* Destaque premium */
            "bg-gradient-to-r from-primary via-primary/80 to-primary",

            /* Orientação */
            "data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full"
          )}
        />
      </SliderPrimitive.Track>

      {/* Thumbs */}
      {Array.from({ length: values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          aria-label={`Slider handle ${index + 1}`}
          className={cn(
            /* Estrutura */
            "block size-4 shrink-0 rounded-full",

            /* Cores */
            "bg-background border border-primary",

            /* Profundidade */
            "shadow-sm",

            /* Interação */
            "transition-[box-shadow,transform]",
            "hover:scale-105 hover:ring-4 hover:ring-primary/20",
            "focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:outline-hidden",

            /* Estados */
            "disabled:pointer-events-none disabled:opacity-50"
          )}
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
