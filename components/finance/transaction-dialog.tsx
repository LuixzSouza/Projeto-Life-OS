"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, DollarSign, Tag, Wallet, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { createTransaction } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AccountOption {
    id: string;
    name: string;
}

export function TransactionDialog({ accounts }: { accounts: AccountOption[] }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [type, setType] = useState("EXPENSE"); // Estado para controlar visualmente o tipo

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        formData.set("type", type); // Garante que o tipo visual seja enviado
        
        try {
            await createTransaction(formData);
            toast.success("Movimentação registrada!");
            setOpen(false);
        } catch (error) {
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-transform hover:scale-105">
                    <Plus className="mr-2 h-4 w-4" /> Nova Transação
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Registrar Movimentação</DialogTitle>
                </DialogHeader>
                
                <form action={handleSubmit} className="space-y-5 py-2">
                    
                    {/* Seletor de Tipo Visual */}
                    <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                        <button
                            type="button"
                            onClick={() => setType("EXPENSE")}
                            className={cn(
                                "flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                type === "EXPENSE" 
                                    ? "bg-white dark:bg-zinc-800 text-red-600 shadow-sm" 
                                    : "text-zinc-500 hover:text-zinc-700"
                            )}
                        >
                            <ArrowDownCircle className="h-4 w-4" /> Despesa
                        </button>
                        <button
                            type="button"
                            onClick={() => setType("INCOME")}
                            className={cn(
                                "flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                type === "INCOME" 
                                    ? "bg-white dark:bg-zinc-800 text-emerald-600 shadow-sm" 
                                    : "text-zinc-500 hover:text-zinc-700"
                            )}
                        >
                            <ArrowUpCircle className="h-4 w-4" /> Receita
                        </button>
                    </div>

                    <div className="space-y-2">
                        <Label>Valor (R$)</Label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                            <Input 
                                name="amount" 
                                type="number" 
                                step="0.01" 
                                placeholder="0,00" 
                                required 
                                className="pl-9 text-lg font-bold" 
                                autoFocus
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Descrição</Label>
                        <Input name="description" placeholder="Ex: Mercado Semanal" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Carteira</Label>
                            <div className="relative">
                                <Wallet className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400 pointer-events-none" />
                                <select 
                                    name="accountId" 
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                                >
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Categoria</Label>
                            <div className="relative">
                                <Tag className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
                                <Input name="category" placeholder="Ex: Lazer" className="pl-9" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button 
                            type="submit" 
                            className={cn(
                                "w-full text-white transition-colors",
                                type === 'EXPENSE' ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                            )} 
                            disabled={isLoading}
                        >
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (type === 'EXPENSE' ? "Registrar Saída" : "Registrar Entrada")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}