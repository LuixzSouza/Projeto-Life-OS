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
      "fixed inset-0 z-[50]", // Z-index alto para cobrir qualquer elemento
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

/**
 * Tamanhos padronizados do modal. Use `size` em vez de escrever `sm:max-w-[...]`
 * em cada dialog — assim todos os modais do sistema ficam consistentes.
 */
type DialogSize = "sm" | "md" | "lg" | "xl"

const DIALOG_SIZES: Record<DialogSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
}

interface DialogContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean
  /** Largura máxima padronizada no desktop. Default: "md". */
  size?: DialogSize
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, showCloseButton = true, size = "md", ...props }, ref) => {
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
          // Posição centralizada (desktop e mobile) com gutter seguro nas laterais
          "fixed left-1/2 top-1/2 z-[100] -translate-x-1/2 -translate-y-1/2",
          "flex flex-col w-[calc(100%-1.5rem)]",
          DIALOG_SIZES[size],
          // Estrutura: cantos arredondados, borda, sombra e altura limitada com scroll interno
          "rounded-3xl border border-border/50 bg-background shadow-2xl",
          // isolate: cria um stacking context próprio — impede que o conteúdo rolável
          // "vaze" por cima dos cantos arredondados durante a animação de zoom.
          "outline-none overflow-hidden isolate",
          "max-h-[90dvh]", // dvh respeita a barra dinâmica dos navegadores mobile

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
              "absolute right-4 top-4 sm:right-5 sm:top-5 z-10 h-8 w-8 rounded-xl flex items-center justify-center",
              "bg-muted/60 text-muted-foreground transition-all duration-200",
              "hover:bg-rose-500/10 hover:text-rose-500 hover:rotate-90", // Rotação ao passar o mouse
              "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ring-offset-background",
              "disabled:pointer-events-none"
            )}
          >
            <X className="h-4 w-4 stroke-[3]" />
            <span className="sr-only">Fechar</span>
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

interface DialogHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Ícone exibido num "chip" à esquerda do título (padrão do sistema). */
  icon?: React.ReactNode
  /** Título do modal. Se informado, renderiza um <DialogTitle> acessível. */
  title?: React.ReactNode
  /** Subtítulo/descrição opcional. */
  description?: React.ReactNode
  /** Classe extra para o chip do ícone (ex.: trocar a cor para sucesso/erro). */
  iconClassName?: string
}

/**
 * Cabeçalho padronizado. Duas formas de uso:
 *  - Declarativo: <DialogHeader icon={<Wallet/>} title="..." description="..." />
 *  - Manual (retrocompat): <DialogHeader><DialogTitle>...</DialogTitle></DialogHeader>
 */
const DialogHeader = ({
  className,
  icon,
  title,
  description,
  iconClassName,
  children,
  ...props
}: DialogHeaderProps) => {
  const declarative = icon || title || description

  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "px-5 py-5 sm:px-8 sm:py-6 border-b border-border/40 bg-muted/10 shrink-0",
        className
      )}
      {...props}
    >
      {declarative ? (
        <div className="flex items-start gap-3.5 pr-8">
          {icon && (
            <div
              className={cn(
                "p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-sm shrink-0 [&_svg]:h-5 [&_svg]:w-5",
                iconClassName
              )}
            >
              {icon}
            </div>
          )}
          <div className="space-y-1 min-w-0 pt-0.5">
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </div>
        </div>
      ) : (
        children
      )}
    </div>
  )
}
DialogHeader.displayName = "DialogHeader"

/**
 * Corpo rolável do modal. Use para o conteúdo principal (forms, listas):
 * garante que conteúdos longos rolem dentro do modal em vez de estourar a tela.
 */
const DialogBody = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-body"
    className={cn(
      // min-h-0: num DialogContent (flex-col + max-h), o filho rolável precisa poder
      // encolher abaixo do conteúdo — senão o overflow-hidden do modal corta em vez
      // de rolar. Sem isto o corpo do modal "não dá scroll".
      "flex-1 min-h-0 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6",
      className
    )}
    {...props}
  />
)
DialogBody.displayName = "DialogBody"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    data-slot="dialog-footer"
    className={cn(
      "flex flex-col-reverse gap-3 sm:flex-row sm:justify-end px-5 py-4 sm:px-8 sm:py-5 border-t border-border/40 bg-muted/5 shrink-0 mt-auto",
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
      // break-words: títulos longos sem espaços (URLs, nomes colados) quebram em
      // vez de estourar a largura do modal por baixo do botão de fechar.
      "text-lg font-bold tracking-tight text-foreground leading-tight break-words",
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
      "text-sm font-medium text-muted-foreground leading-relaxed",
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
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}