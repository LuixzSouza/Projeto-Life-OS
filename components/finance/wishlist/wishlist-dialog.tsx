"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Target } from "lucide-react";
import { WishlistForm } from "./wishlist-form";

interface WishlistDialogProps { trigger?: React.ReactNode; }

export function WishlistDialog({ trigger }: WishlistDialogProps) {
    const [open, setOpen] = useState<boolean>(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="outline" className="gap-2 rounded-xl font-bold border-dashed border-border hover:bg-muted/50">
                        <Plus className="h-4 w-4"/> Nova Meta
                    </Button>
                )}
            </DialogTrigger>

            {/* removido overflow-hidden para evitar cortar possíveis popovers/selects */}
            <DialogContent className="sm:max-w-[600px] p-0 gap-0 rounded-[2rem] shadow-2xl border-border/40">
                <div className="px-8 py-6 border-b border-border/40 bg-muted/10 flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
                        <Target className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-extrabold">Nova Meta de Consumo</DialogTitle>
                        <DialogDescription className="mt-0.5 font-medium">O que você está planejando conquistar?</DialogDescription>
                    </div>
                </div>
                
                <div className="p-8 bg-background">
                    <WishlistForm onClose={() => setOpen(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
}