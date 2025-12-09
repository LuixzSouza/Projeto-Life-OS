"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { WishlistForm } from "./wishlist-form";

export function WishlistDialog() {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Plus className="h-4 w-4"/> Nova Meta
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Criar Objetivo</DialogTitle>
                </DialogHeader>
                {/* Usa o form reutilizável e passa a função para fechar o modal */}
                <WishlistForm onClose={() => setOpen(false)} />
            </DialogContent>
        </Dialog>
    );
}