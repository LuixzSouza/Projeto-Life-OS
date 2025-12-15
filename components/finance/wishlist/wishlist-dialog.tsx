"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";
import { WishlistForm } from "./wishlist-form";
import { DashboardWishlist } from "@/components/finance/finance-dashboard"; // Importando a tipagem correta se necessário, ou definindo localmente

interface WishlistDialogProps {
    trigger?: React.ReactNode;
}

export function WishlistDialog({ trigger }: WishlistDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="outline" className="gap-2 border-dashed border-border hover:bg-muted/50 hover:border-primary/50">
                        <Plus className="h-4 w-4"/> Nova Meta
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden gap-0">
                <div className="px-6 py-6 border-b border-border bg-muted/10 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Target className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <DialogTitle>Nova Meta de Consumo</DialogTitle>
                        <DialogDescription className="mt-0.5">O que você está planejando conquistar?</DialogDescription>
                    </div>
                </div>
                
                <div className="p-6">
                    <WishlistForm onClose={() => setOpen(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
}