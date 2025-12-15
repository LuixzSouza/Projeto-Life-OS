"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, CalendarClock, Trash2 } from "lucide-react";
import { createRecurring, updateRecurring, deleteRecurring } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";

// Interface compatível com o banco de dados
export interface RecurringItemData {
    id: string;
    title: string;
    amount: number;
    dayOfMonth: number;
    category: string;
}

interface RecurringDialogProps {
    trigger?: React.ReactNode;
    item?: RecurringItemData; // ✅ Adicionado para suportar edição
}

export function RecurringDialog({ trigger, item }: RecurringDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            if (item) {
                // Modo Edição
                formData.append("id", item.id);
                await updateRecurring(formData);
                toast.success("Custo fixo atualizado!");
            } else {
                // Modo Criação
                await createRecurring(formData);
                toast.success("Custo fixo adicionado!");
            }
            setOpen(false);
        } catch (error) {
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    }

    const handleDelete = async () => {
        if (!item) return;
        if (confirm("Tem certeza que deseja remover este custo fixo?")) {
            setIsLoading(true);
            await deleteRecurring(item.id);
            toast.success("Removido com sucesso.");
            setOpen(false);
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Plus className="h-4 w-4" />
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <CalendarClock className="h-5 w-5" />
                        </div>
                        {item ? "Editar Custo Fixo" : "Novo Custo Recorrente"}
                    </DialogTitle>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Nome da Despesa</Label>
                        <Input 
                            id="title" 
                            name="title" 
                            placeholder="Ex: Netflix, Aluguel..." 
                            defaultValue={item?.title} 
                            required 
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="amount">Valor Mensal (R$)</Label>
                            <Input 
                                id="amount" 
                                name="amount" 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00" 
                                defaultValue={item?.amount} 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="dayOfMonth">Dia de Vencimento</Label>
                            <Input 
                                id="dayOfMonth" 
                                name="dayOfMonth" 
                                type="number" 
                                min="1" 
                                max="31" 
                                placeholder="Dia (1-31)" 
                                defaultValue={item?.dayOfMonth} 
                                required 
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select name="category" defaultValue={item?.category || "Assinaturas"}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Moradia">🏠 Moradia</SelectItem>
                                <SelectItem value="Assinaturas">📺 Assinaturas</SelectItem>
                                <SelectItem value="Serviços">💡 Serviços (Luz/Água)</SelectItem>
                                <SelectItem value="Educação">📚 Educação</SelectItem>
                                <SelectItem value="Outros">📦 Outros</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <DialogFooter className="pt-2 flex justify-between sm:justify-between w-full">
                        {item ? (
                            <Button type="button" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={handleDelete} disabled={isLoading}>
                                <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </Button>
                        ) : <div />}
                        
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (item ? "Salvar" : "Criar")}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}