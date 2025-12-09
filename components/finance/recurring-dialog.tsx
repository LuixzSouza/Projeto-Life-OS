"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, CalendarClock } from "lucide-react";
import { createRecurring, updateRecurring } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";

interface RecurringItem {
    id: string;
    title: string;
    amount: number;
    dayOfMonth: number;
}

export function RecurringDialog({ item, trigger }: { item?: RecurringItem, trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            if (item) {
                await updateRecurring(formData);
                toast.success("Assinatura atualizada!");
            } else {
                await createRecurring(formData);
                toast.success("Assinatura criada!");
            }
            setOpen(false);
        } catch {
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Plus className="h-3 w-3" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>{item ? "Editar Custo Fixo" : "Novo Custo Fixo"}</DialogTitle>
                </DialogHeader>
                
                <form action={handleSubmit} className="space-y-4 py-2">
                    {item && <input type="hidden" name="id" value={item.id} />}
                    
                    <div className="space-y-2">
                        <Label>Nome da Assinatura</Label>
                        <Input name="title" defaultValue={item?.title} placeholder="Ex: Spotify, Aluguel..." required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Valor Mensal (R$)</Label>
                            <Input name="amount" type="number" step="0.01" defaultValue={item?.amount} placeholder="0.00" required />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-1">
                                <CalendarClock className="h-3 w-3" /> Dia Venc.
                            </Label>
                            <Input name="dayOfMonth" type="number" min="1" max="31" defaultValue={item?.dayOfMonth} placeholder="10" required />
                        </div>
                    </div>

                    <DialogFooter className="pt-4">
                        <Button type="submit" disabled={isLoading} className="w-full bg-red-600 hover:bg-red-700 text-white">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar Custo Fixo"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}