"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Wallet, Check } from "lucide-react";
import { createAccount, updateAccount } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
interface AccountDialogProps { open?: boolean; onOpenChange?: (open: boolean) => void; account?: AccountData | null; trigger?: React.ReactNode; }

export function AccountDialog({ open: controlledOpen, onOpenChange: controlledOnOpenChange, account, trigger }: AccountDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedColor, setSelectedColor] = useState(account?.color || "#820ad1");

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setIsOpen = controlledOnOpenChange || setInternalOpen;

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        formData.set("color", selectedColor); // Força a cor selecionada via state
        try {
            if (account) {
                formData.append("id", account.id);
                await updateAccount(formData);
                toast.success("Conta atualizada com sucesso!");
            } else {
                await createAccount(formData);
                toast.success("Carteira criada e pronta para uso!");
            }
            setIsOpen(false);
        } catch {
            toast.error("Erro ao salvar conta.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            
            <DialogContent className="sm:max-w-[425px] rounded-[2rem] p-0 overflow-hidden shadow-2xl border-border/40">
                <div className="bg-muted/10 p-6 border-b border-border/40" style={{ backgroundColor: `${selectedColor}10` }}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-xl font-extrabold" style={{ color: selectedColor }}>
                            <div className="p-2.5 rounded-xl bg-background shadow-sm border border-border/50">
                                <Wallet className="h-5 w-5" />
                            </div>
                            {account ? "Editar Carteira" : "Nova Carteira"}
                        </DialogTitle>
                        <DialogDescription>Crie uma carteira manual para organizar o saldo.</DialogDescription>
                    </DialogHeader>
                </div>

                <form action={handleSubmit} className="space-y-5 p-6 bg-background">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome da Conta</Label>
                        <Input name="name" placeholder="Ex: Nubank, Carteira Física..." defaultValue={account?.name || ""} required className="h-12 rounded-xl bg-muted/20 font-bold text-base" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Tipo</Label>
                            <Select name="type" defaultValue={account?.type || "CHECKING"}>
                                <SelectTrigger className="h-12 rounded-xl bg-muted/20 font-medium"><SelectValue /></SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="CHECKING">Conta Corrente</SelectItem>
                                    <SelectItem value="SAVINGS">Poupança</SelectItem>
                                    <SelectItem value="INVESTMENT">Investimento</SelectItem>
                                    <SelectItem value="CASH">Dinheiro Físico</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Saldo Atual (R$)</Label>
                            <Input name="balance" type="number" step="0.01" placeholder="0.00" defaultValue={account?.balance || ""} className="h-12 rounded-xl bg-muted/20 font-mono font-bold" />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identidade Visual</Label>
                        <div className="flex flex-wrap gap-3">
                            {COLORS.map((c) => (
                                <button
                                    key={c.value}
                                    type="button"
                                    onClick={() => setSelectedColor(c.value)}
                                    className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm border-2", selectedColor === c.value ? "border-foreground scale-110" : "border-transparent")}
                                    style={{ backgroundColor: c.value }}
                                    title={c.name}
                                >
                                    {selectedColor === c.value && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <DialogFooter className="pt-4 border-t border-border/40">
                        <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => setIsOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={isLoading} className="rounded-xl font-bold shadow-lg" style={{ backgroundColor: selectedColor, color: "white" }}>
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (account ? "Salvar" : "Criar Conta")}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}