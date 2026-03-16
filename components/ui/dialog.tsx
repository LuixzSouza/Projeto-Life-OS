"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"
import { useDialogClick, DialogProvider } from "./dialog-context"

/* -------------------------------------------------------------------------------------------------
 * Re-exports
 * -----------------------------------------------------------------------------------------------*/

export { DialogProvider }

/* -------------------------------------------------------------------------------------------------
 * Root
 * -----------------------------------------------------------------------------------------------*/

const Dialog = DialogPrimitive.Root

/* -------------------------------------------------------------------------------------------------
 * Trigger
 * -----------------------------------------------------------------------------------------------*/

const DialogTrigger = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Trigger>
>(({ onClick, ...props }, ref) => {
  const { captureClick } = useDialogClick()

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    captureClick(event)
    onClick?.(event)
  }

  return (
    <DialogPrimitive.Trigger
      ref={ref}
      data-slot="dialog-trigger"
      onClick={handleClick}
      {...props}
    />
  )
})
DialogTrigger.displayName = DialogPrimitive.Trigger.displayName

/* -------------------------------------------------------------------------------------------------
 * Portal / Close
 * -----------------------------------------------------------------------------------------------*/

const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

/* -------------------------------------------------------------------------------------------------
 * Overlay (Fundo Desfocado Premium)
 * -----------------------------------------------------------------------------------------------*/

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    data-slot="dialog-overlay"
    className={cn(
      "fixed inset-0 z-[100]", // Z-index alto para cobrir qualquer elemento
      "bg-background/80 backdrop-blur-md", // Desfoque de vidro (Glassmorphism)
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/* -------------------------------------------------------------------------------------------------
 * Content (A "Janela" do HUD)
 * -----------------------------------------------------------------------------------------------*/

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, showCloseButton = true, ...props }, ref) => {
  const { clickPosition } = useDialogClick()

  const style: React.CSSProperties & Record<string, string> = {
    "--start-x": `${clickPosition.x}px`,
    "--start-y": `${clickPosition.y}px`,
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        style={style}
        data-slot="dialog-content"
        className={cn(
          "fixed left-1/2 top-1/2 z-[100] grid w-[95%] max-w-lg",
          "-translate-x-1/2 -translate-y-1/2 flex flex-col", // Centralização perfeita
          "rounded-[2.5rem] border border-border/50 bg-background shadow-2xl", // Bordas extremas e sombra pesada
          "outline-none overflow-hidden",
          "max-h-[90vh]", // Limite de altura inteligente

          /* Radix animations */
          "data-[state=open]:animate-in data-[state=closed]:animate-out",
          "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
          "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          "duration-300",

          /* Custom click-origin animation (mantido seu context) */
          "animate-in-from-click data-[state=closed]:animate-out-to-click",

          className
        )}
        {...props}
      >
        {children}

        {/* Botão de Fechar Tático */}
        {showCloseButton && (
          <DialogPrimitive.Close
            className={cn(
              "absolute right-6 top-6 h-8 w-8 rounded-xl flex items-center justify-center",
              "bg-muted/50 text-muted-foreground transition-all duration-200",
              "hover:bg-rose-500/10 hover:text-rose-500 hover:rotate-90", // Rotação ao passar o mouse
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ring-offset-background",
              "disabled:pointer-events-none"
            )}
          >
            <X className="h-4 w-4 stroke-[3]" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

/* -------------------------------------------------------------------------------------------------
 * Layout Helpers (Header e Footer estruturados)
 * -----------------------------------------------------------------------------------------------*/

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-header"
    className={cn(
      "flex flex-col gap-1 text-center sm:text-left px-8 py-6 border-b border-border/40 bg-muted/10 shrink-0",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-footer"
    className={cn(
      "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end px-8 py-5 border-t border-border/40 bg-background shrink-0 mt-auto",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

/* -------------------------------------------------------------------------------------------------
 * Typography (Tipografia Tática)
 * -----------------------------------------------------------------------------------------------*/

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    data-slot="dialog-title"
    className={cn(
      "text-xl font-black uppercase tracking-tighter text-foreground leading-none",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    data-slot="dialog-description"
    className={cn(
      "text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1.5",
      className
    )}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

/* -------------------------------------------------------------------------------------------------
 * Exports
 * -----------------------------------------------------------------------------------------------*/

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}