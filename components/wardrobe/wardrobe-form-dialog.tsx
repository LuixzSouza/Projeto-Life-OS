"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogTrigger, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { WardrobeFormDialogProps } from "./wardrobe-form-constants";
import { WardrobeFormInner } from "./wardrobe-form-inner";

// Re-exporta os tipos públicos para manter imports existentes estáveis.
export type { WardrobeStatus, WardrobeItemData } from "./wardrobe-form-constants";

/* ========================================================================= */
/* COMPONENTE PRINCIPAL (Wrapper do Modal)                                   */
/* ========================================================================= */
export function WardrobeFormDialog({ mode = "create", initialData, trigger, open, onOpenChange }: WardrobeFormDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const isOpen = open !== undefined ? open : internalOpen;
    const setIsOpen = onOpenChange || setInternalOpen;
    const formKey = isOpen ? (initialData?.id || 'new-item') : 'closed-item';

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {(trigger || mode === "create") && (
                <DialogTrigger asChild>
                    {trigger || (
                        <Button className="gap-2 shadow-sm font-semibold h-10 px-4 rounded-lg">
                            <Plus className="h-4 w-4" /> Nova Peça
                        </Button>
                    )}
                </DialogTrigger>
            )}

            <DialogContent className="w-[96vw] sm:max-w-2xl md:max-w-5xl lg:max-w-6xl h-[92vh] md:h-[86vh] p-0 gap-0 bg-background border-border/40 rounded-2xl overflow-hidden flex flex-col md:flex-row shadow-2xl">
                <DialogHeader className="sr-only">
                    <DialogTitle>Editor de Guarda-Roupa</DialogTitle>
                    <DialogDescription>Adicione ou edite peças do seu armário</DialogDescription>
                </DialogHeader>

                {isOpen && (
                    <WardrobeFormInner
                        key={formKey}
                        mode={mode}
                        initialData={initialData}
                        onSuccess={() => setIsOpen(false)}
                        onCancel={() => setIsOpen(false)}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
