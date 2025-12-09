"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Wallet, Palette } from "lucide-react";
import { createAccount, updateAccount } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Tipagem compatível
interface AccountItem {
    id: string;
    name: string;
    balance: number;
    color: string | null;
    type: string;
}

const ACCOUNT_COLORS = ["#000000", "#820ad1", "#ea1d2c", "#f1c40f", "#2ecc71", "#3498db", "#e67e22"];

export function AccountDialog({ account, trigger }: { account?: AccountItem, trigger?: React.ReactNode }) {
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedColor, setSelectedColor] = useState(account?.color || "#000000");

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        formData.set('color', selectedColor);
        
        try {
            if (account) {
                await updateAccount(formData);
                toast.success("Carteira atualizada!");
            } else {
                await createAccount(formData);
                toast.success("Nova carteira criada!");
            }
            setOpen(false);
        } catch {
            toast.error("Erro ao salvar carteira.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" /> Nova Carteira
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{account ? "Editar Carteira" : "Nova Carteira"}</DialogTitle>
                </DialogHeader>
                
                <form action={handleSubmit} className="space-y-4 py-2">
                    {account && <input type="hidden" name="id" value={account.id} />}
                    
                    <div className="space-y-2">
                        <Label>Nome do Banco / Carteira</Label>
                        <Input name="name" defaultValue={account?.name} placeholder="Ex: Nubank, Cofre..." required />
                    </div>

                    <div className="space-y-2">
                        <Label>Saldo Inicial (R$)</Label>
                        <Input 
                            name="balance" 
                            type="number" 
                            step="0.01" 
                            defaultValue={account?.balance || 0} 
                            // Se for edição, desabilitamos o saldo inicial para não quebrar o histórico
                            // (O saldo deve ser ajustado via transações)
                            readOnly={!!account} 
                            className={account ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500" : ""}
                        />
                        {account && <p className="text-[10px] text-zinc-500">Para ajustar o saldo, crie uma transação.</p>}
                    </div>

                    <div className="space-y-3 pt-2">
                        <Label className="flex items-center gap-2 text-xs uppercase font-bold text-zinc-500">
                            <Palette className="h-3 w-3" /> Cor do Cartão
                        </Label>
                        <div className="flex flex-wrap gap-3">
                            {ACCOUNT_COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setSelectedColor(color)}
                                    className={cn(
                                        "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                                        selectedColor === color ? "border-zinc-900 dark:border-white scale-110" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>
                    
                    <input type="hidden" name="type" value="CHECKING" />

                    <DialogFooter className="pt-4">
                         <Button type="submit" disabled={isLoading} className="w-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (account ? "Salvar Alterações" : "Criar Carteira")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}