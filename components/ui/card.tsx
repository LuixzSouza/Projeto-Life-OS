import * as React from "react"
import { cn } from "@/lib/utils"

/* -------------------------------------------------------------------------------------------------
 * Card
 * -----------------------------------------------------------------------------------------------*/

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Base Styling: Fundo limpo, cantos suaves e padding equilibrado
        "bg-card text-card-foreground flex flex-col gap-5 rounded-xl py-5",
        
        // Bordas e Sombras (Sutis e Elegantes)
        "border border-border/50 shadow-sm", 

        // Interação Suave: Destaca levemente ao passar o mouse, sem exageros
        "transition-all duration-300 ease-out hover:border-border/80 hover:shadow-md",
        
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        // Grid inteligente para acomodar o título e o CardAction (botão de opções)
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-5",
        "has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-5",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Title
 * -----------------------------------------------------------------------------------------------*/

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn(
        // Hierarquia Corrigida: text-lg e font-semibold é o padrão ouro para títulos de cards
        "font-semibold leading-none text-foreground text-lg tracking-tight",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Description
 * -----------------------------------------------------------------------------------------------*/

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn(
        "text-sm text-muted-foreground leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Action (Botões no topo direito do Card)
 * -----------------------------------------------------------------------------------------------*/

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end -mt-1 -mr-1", // Alinhamento fino
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Content
 * -----------------------------------------------------------------------------------------------*/

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn(
        // Ajustado para text-sm (Padrão Notion/Linear para conteúdos de cards)
        "px-5 text-sm leading-relaxed flex-1",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Footer
 * -----------------------------------------------------------------------------------------------*/

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-5 [.border-t]:pt-4",
        className
      )}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}