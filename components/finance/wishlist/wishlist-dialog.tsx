"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogBody, DialogTrigger } from "@/components/ui/dialog";
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

            <DialogContent size="lg">
                <DialogHeader
                    icon={<Target />}
                    title="Nova Meta de Consumo"
                    description="O que você está planejando conquistar?"
                />
                <DialogBody>
                    <WishlistForm onClose={() => setOpen(false)} />
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}