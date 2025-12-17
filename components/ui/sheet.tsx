"use client";

import * as React from "react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------------------------------
 * Sheet (Enterprise / Premium)
 * Comportamento: Radix UI Primitives
 * Estilo: Shadcn UI + Premium Enhancements
 * ------------------------------------------------------------------------------------------------- */

const Sheet = SheetPrimitive.Root;

const SheetTrigger = SheetPrimitive.Trigger;

const SheetClose = SheetPrimitive.Close;

const SheetPortal = SheetPrimitive.Portal;

function SheetOverlay({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=open]:fade-in-0",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
        className
      )}
      {...props}
    />
  );
}
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

/* -------------------------------------------------------------------------------------------------
 * Variantes de Animação e Posicionamento
 * ------------------------------------------------------------------------------------------------- */

const sheetVariants = cva(
  cn(
    "fixed z-50 gap-4 bg-background p-6 shadow-2xl transition ease-in-out",
    "data-[state=open]:animate-in data-[state=closed]:animate-out",
    "data-[state=closed]:duration-300 data-[state=open]:duration-500",
    // Detalhe Premium: Linha de gradiente sutil na borda
    "after:absolute after:pointer-events-none after:z-10"
  ),
  {
    variants: {
      side: {
        top: cn(
          "inset-x-0 top-0 border-b",
          "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
          "after:inset-x-0 after:bottom-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-primary/50 after:to-transparent"
        ),
        bottom: cn(
          "inset-x-0 bottom-0 border-t",
          "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          "after:inset-x-0 after:top-0 after:h-[1px] after:bg-gradient-to-r after:from-transparent after:via-primary/50 after:to-transparent"
        ),
        left: cn(
          "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
          "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          "after:inset-y-0 after:right-0 after:w-[1px] after:bg-gradient-to-b after:from-transparent after:via-primary/50 after:to-transparent"
        ),
        right: cn(
          "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
          "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          "after:inset-y-0 after:left-0 after:w-[1px] after:bg-gradient-to-b after:from-transparent after:via-primary/50 after:to-transparent"
        ),
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

function SheetContent({
  side = "right",
  className,
  children,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        className={cn(sheetVariants({ side }), className)}
        {...props}
      >
        {children}
        
        {/* Botão de Fechar Premium */}
        <SheetPrimitive.Close 
          className={cn(
            "absolute right-4 top-4 rounded-full p-2 opacity-70 ring-offset-background transition-all",
            "hover:bg-primary/10 hover:text-primary hover:opacity-100",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2",
            "disabled:pointer-events-none"
          )}
        >
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}
SheetContent.displayName = SheetPrimitive.Content.displayName;

/* -------------------------------------------------------------------------------------------------
 * Componentes de Estrutura Interna
 * ------------------------------------------------------------------------------------------------- */

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-2 text-center sm:text-left",
        className
      )}
      {...props}
    />
  );
}
SheetHeader.displayName = "SheetHeader";

function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
        className
      )}
      {...props}
    />
  );
}
SheetFooter.displayName = "SheetFooter";

function SheetTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      className={cn(
        "text-lg font-semibold leading-none tracking-tight text-foreground",
        // Pequeno detalhe visual para destacar o título
        "flex items-center gap-2",
        className
      )}
      {...props}
    />
  );
}
SheetTitle.displayName = SheetPrimitive.Title.displayName;

function SheetDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      className={cn(
        "text-sm text-muted-foreground leading-relaxed",
        className
      )}
      {...props}
    />
  );
}
SheetDescription.displayName = SheetPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};