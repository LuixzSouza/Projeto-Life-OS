"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2, DollarSign, Tag, Wallet, ArrowUpCircle, ArrowDownCircle, Trash2, CalendarIcon } from "lucide-react";
import { createTransaction, updateTransaction, deleteTransaction } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Interface para as contas disponíveis
interface AccountOption {
    id: string;
    name: string;
}

// Interface para os dados da transação (Edição)
interface TransactionData {
    id: string;
    description: string;
    amount: number;
    type: string;
    category: string;
    accountId: string;
    date: Date;
}

interface TransactionDialogProps {
    accounts?: AccountOption[]; // Agora opcional para evitar erros se não passar
    transaction?: TransactionData | null; // Se existir, é edição
    trigger?: React.ReactNode;
}

export function TransactionDialog({ accounts = [], transaction, trigger }: TransactionDialogProps) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [type, setType] = useState(transaction?.type || "EXPENSE");

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        formData.set("type", type);
        
        try {
            if (transaction) {
                formData.append("id", transaction.id);
                await updateTransaction(formData);
                toast.success("Movimentação atualizada!");
            } else {
                await createTransaction(formData);
                toast.success("Movimentação registrada!");
            }
            setOpen(false);
        } catch (error) {
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!transaction) return;
        if (confirm("Tem certeza que deseja excluir essa transação? O saldo da conta será revertido.")) {
            setIsLoading(true);
            await deleteTransaction(transaction.id);
            toast.success("Transação excluída.");
            setOpen(false);
            setIsLoading(false);
        }
    }

    // Se não houver contas, não deixa abrir (ou mostra aviso)
    const hasAccounts = accounts.length > 0;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger ? trigger : (
                    <Button className="h-10 px-6 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-transform hover:scale-105" disabled={!hasAccounts}>
                        <Plus className="mr-2 h-4 w-4" /> Nova Transação
                    </Button>
                )}
            </DialogTrigger>
            
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{transaction ? "Editar Movimentação" : "Registrar Movimentação"}</DialogTitle>
                </DialogHeader>
                
                {!hasAccounts && !transaction ? (
                    <div className="py-4 text-center text-sm text-muted-foreground">
                        Você precisa criar uma carteira antes de adicionar transações.
                    </div>
                ) : (
                    <form action={handleSubmit} className="space-y-5 py-2">
                        
                        {/* Seletor de Tipo Visual */}
                        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg">
                            <button
                                type="button"
                                onClick={() => setType("EXPENSE")}
                                className={cn(
                                    "flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                                    type === "EXPENSE" 
                                        ? "bg-background text-red-600 shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground"
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
                                        ? "bg-background text-emerald-600 shadow-sm" 
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <ArrowUpCircle className="h-4 w-4" /> Receita
                            </button>
                        </div>

                        <div className="space-y-2">
                            <Label>Valor (R$)</Label>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    name="amount" 
                                    type="number" 
                                    step="0.01" 
                                    placeholder="0,00" 
                                    defaultValue={transaction?.amount}
                                    required 
                                    className={cn(
                                        "pl-9 text-lg font-bold", 
                                        type === 'EXPENSE' ? "text-red-600" : "text-emerald-600"
                                    )}
                                    autoFocus={!transaction}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Descrição</Label>
                            <Input name="description" defaultValue={transaction?.description} placeholder="Ex: Mercado Semanal" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Carteira</Label>
                                <div className="relative">
                                    <Wallet className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                                    <Select name="accountId" defaultValue={transaction?.accountId || accounts[0]?.id}>
                                        <SelectTrigger className="pl-9"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {accounts.map(acc => (
                                                <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Categoria</Label>
                                <div className="relative">
                                    <Tag className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input name="category" defaultValue={transaction?.category} placeholder="Ex: Lazer" className="pl-9" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Data</Label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    name="date" 
                                    type="date" 
                                    className="pl-9" 
                                    defaultValue={transaction?.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]} 
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2 flex sm:justify-between w-full">
                            {transaction ? (
                                <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={handleDelete} disabled={isLoading}>
                                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                                </Button>
                            ) : <div />}
                            
                            <div className="flex gap-2">
                                <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
                                <Button 
                                    type="submit" 
                                    className={cn(
                                        "text-white transition-colors min-w-[120px]",
                                        type === 'EXPENSE' ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                                    )} 
                                    disabled={isLoading}
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (transaction ? "Salvar" : "Registrar")}
                                </Button>
                            </div>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}