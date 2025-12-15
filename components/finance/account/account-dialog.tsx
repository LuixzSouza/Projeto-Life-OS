"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wallet } from "lucide-react";
import { createAccount, updateAccount } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";

// ... (Mantenha o COLORS e interfaces anteriores)
const COLORS = [
    { name: "Nubank", value: "#820ad1" },
    { name: "Inter", value: "#ff7a00" },
    { name: "Itaú", value: "#ec7000" },
    { name: "Bradesco", value: "#cc092f" },
    { name: "Santander", value: "#ec0000" },
    { name: "Verde", value: "#10b981" },
    { name: "Azul", value: "#3b82f6" },
    { name: "Preto", value: "#18181b" },
];

interface AccountData { id: string; name: string; balance: number; color: string | null; type: string; }

interface AccountDialogProps {
    open?: boolean; // Agora opcional, pois pode ser controlado internamente
    onOpenChange?: (open: boolean) => void;
    account?: AccountData | null;
    trigger?: React.ReactNode; // ✅ Adicionado trigger
}

export function AccountDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange, account, trigger }: AccountDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Usa estado controlado ou interno
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setIsOpen = controlledOnOpenChange || setInternalOpen;

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        try {
            if (account) {
                formData.append("id", account.id);
                await updateAccount(formData);
                toast.success("Conta atualizada!");
            } else {
                await createAccount(formData);
                toast.success("Nova conta criada!");
            }
            setIsOpen(false);
        } catch (error) {
            toast.error("Erro ao salvar conta.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {/* ✅ Renderiza o Trigger se ele existir */}
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <Wallet className="h-5 w-5" />
                        </div>
                        {account ? "Editar Conta" : "Nova Carteira"}
                    </DialogTitle>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome da Conta</Label>
                        <Input id="name" name="name" placeholder="Ex: Nubank, Carteira..." defaultValue={account?.name || ""} required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo</Label>
                            <Select name="type" defaultValue={account?.type || "CHECKING"}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CHECKING">Conta Corrente</SelectItem>
                                    <SelectItem value="SAVINGS">Poupança</SelectItem>
                                    <SelectItem value="INVESTMENT">Investimento</SelectItem>
                                    <SelectItem value="CASH">Dinheiro Físico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="balance">Saldo Inicial</Label>
                            <Input id="balance" name="balance" type="number" step="0.01" placeholder="0.00" defaultValue={account?.balance || ""} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Cor do Cartão</Label>
                        <div className="flex flex-wrap gap-2">
                            {COLORS.map((c) => (
                                <label key={c.value} className="cursor-pointer relative">
                                    <input type="radio" name="color" value={c.value} className="peer sr-only" defaultChecked={account?.color === c.value || (!account && c.value === "#820ad1")} />
                                    <div className="w-6 h-6 rounded-full transition-all peer-checked:ring-2 peer-checked:ring-offset-2 peer-checked:ring-primary hover:scale-110" style={{ backgroundColor: c.value }} title={c.name} />
                                </label>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="pt-2">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (account ? "Salvar" : "Criar")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}