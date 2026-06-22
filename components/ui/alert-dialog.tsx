"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

function AlertDialog(
  props: React.ComponentProps<typeof AlertDialogPrimitive.Root>
) {
  return (
    <AlertDialogPrimitive.Root
      data-slot="alert-dialog"
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

function AlertDialogTrigger(
  props: React.ComponentProps<typeof AlertDialogPrimitive.Trigger>
) {
  return (
    <AlertDialogPrimitive.Trigger
      data-slot="alert-dialog-trigger"
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Portal
 * -----------------------------------------------------------------------------------------------*/

function AlertDialogPortal(
  props: React.ComponentProps<typeof AlertDialogPrimitive.Portal>
) {
  return (
    <AlertDialogPrimitive.Portal
      data-slot="alert-dialog-portal"
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Overlay (Glassmorphism Premium)
 * -----------------------------------------------------------------------------------------------*/

function AlertDialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Overlay>) {
  return (
    <AlertDialogPrimitive.Overlay
      data-slot="alert-dialog-overlay"
      className={cn(
        // Z-INDEX 100 para a camada de sombra/desfoque
        "fixed inset-0 z-[100]", 
        "bg-background/80 backdrop-blur-md", 
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Content (Centralização Estrita e Borda Arredondada)
 * -----------------------------------------------------------------------------------------------*/

function AlertDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Content
        data-slot="alert-dialog-content"
        className={cn(
          // Z-INDEX 110 para a caixa do modal (sempre MAIOR que o overlay)
          "fixed left-[50%] top-[50%] z-[110] translate-x-[-50%] translate-y-[-50%]",
          "w-[calc(100%-1.5rem)] max-w-md",
          // Alinhado ao sistema de Dialog (mesma borda/raio/sombra)
          "rounded-3xl border border-border/50 bg-background shadow-2xl",
          "overflow-hidden flex flex-col outline-none",
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          "duration-300",
          className
        )}
        {...props}
      >
        {/* Acento superior: tom destrutivo, sinalizando uma ação irreversível. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-destructive/40 via-destructive to-destructive/40 opacity-40"
        />
        {props.children}
      </AlertDialogPrimitive.Content>
    </AlertDialogPortal>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Header
 * -----------------------------------------------------------------------------------------------*/

function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "flex flex-col items-center gap-3 px-6 pt-8 pb-6 text-center bg-muted/10 border-b border-border/40",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Footer
 * -----------------------------------------------------------------------------------------------*/

function AlertDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-center gap-3 px-6 py-5 bg-background",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Title (Tipografia Tática)
 * -----------------------------------------------------------------------------------------------*/

function AlertDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "text-xl font-black tracking-tight text-foreground leading-tight",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Description
 * -----------------------------------------------------------------------------------------------*/

function AlertDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        "text-sm font-medium leading-relaxed text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Actions (Botões com alturas e tracking consistentes)
 * -----------------------------------------------------------------------------------------------*/

function AlertDialogAction({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Action>) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(
        buttonVariants({ variant: "destructive" }),
        "h-11 w-full sm:w-auto px-6 rounded-xl shadow-sm",
        "font-bold text-sm transition-all active:scale-95",
        className
      )}
      {...props}
    />
  )
}

function AlertDialogCancel({
  className,
  ...props
}: React.ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return (
    <AlertDialogPrimitive.Cancel
      className={cn(
        buttonVariants({ variant: "outline" }),
        "h-11 w-full sm:w-auto px-6 rounded-xl border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground",
        "font-bold text-sm transition-all mt-0",
        className
      )}
      {...props}
    />
  )
}

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}