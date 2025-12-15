"use client";

import { useState, useEffect } from "react";
import { Plus, Wallet, Trash2, MoreVertical, Pencil, Copy, Check, Link2, Nfc } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteAccount } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { AccountDialog } from "./account-dialog";

interface AccountItem {
    id: string;
    name: string;
    balance: number;
    color: string | null;
    type: string;
    isConnected?: boolean; 
    provider?: string | null;
}

export function AccountsList({ accounts }: { accounts: AccountItem[] }) {
    const [isMounted, setIsMounted] = useState(false);
    
    useEffect(() => {
        const timer = setTimeout(() => setIsMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    // Estado unificado do Modal
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState<AccountItem | null>(null);

    // Abre modal em modo CRIAÇÃO
    const handleCreate = () => {
        setSelectedAccount(null);
        setIsDialogOpen(true);
    };

    // Abre modal em modo EDIÇÃO
    const handleEdit = (acc: AccountItem) => {
        setSelectedAccount(acc);
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if(confirm("Tem certeza? Isso apagará o histórico desta conta.")) {
            await deleteAccount(id);
            toast.success("Conta encerrada.");
        }
    }

    if (!isMounted) return <div className="flex gap-5 overflow-hidden pb-6"><div className="w-[320px] h-[200px] bg-muted rounded-3xl animate-pulse" /></div>;

    return (
        <div className="w-full">
            <div className="flex gap-5 overflow-x-auto pb-8 pt-2 px-1 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent snap-x snap-mandatory">
                
                {/* Botão Nova Conta (Agora é um botão clicável simples) */}
                <div 
                    onClick={handleCreate}
                    className="min-w-[320px] h-[200px] rounded-3xl border-2 border-dashed border-border bg-muted/20 hover:bg-muted/40 flex flex-col items-center justify-center cursor-pointer transition-all group snap-center active:scale-95 duration-200"
                >
                    <div className="h-14 w-14 rounded-full bg-background shadow-sm border border-border flex items-center justify-center group-hover:scale-110 transition-transform group-hover:border-primary/50">
                        <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground mt-4 transition-colors">
                        Nova Carteira
                    </span>
                </div>

                {/* Lista de Contas */}
                {accounts.map(acc => (
                    <div key={acc.id} className="snap-center">
                        <BankCard 
                            account={acc} 
                            onEdit={() => handleEdit(acc)} 
                            onDelete={() => handleDelete(acc.id)} 
                        />
                    </div>
                ))}
            </div>

            {/* Único Dialog Controlado para Criar e Editar */}
            <AccountDialog 
                open={isDialogOpen} 
                onOpenChange={setIsDialogOpen} 
                account={selectedAccount} 
            />
        </div>
    );
}

function BankCard({ account, onEdit, onDelete }: { account: AccountItem, onEdit: () => void, onDelete: () => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopyBalance = () => {
        navigator.clipboard.writeText(account.balance.toString());
        setCopied(true);
        toast.success("Saldo copiado!");
        setTimeout(() => setCopied(false), 2000);
    };

    const formattedBalance = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(account.balance);

    return (
        <div 
            className="relative min-w-[320px] h-[200px] rounded-3xl shadow-xl overflow-hidden text-white transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group select-none"
            style={{ 
                background: `linear-gradient(135deg, ${account.color || '#18181b'} 0%, #000000 100%)`
            }}
        >
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none"></div>
            <div className="absolute top-[-50%] right-[-50%] w-[100%] h-[100%] bg-white/10 blur-[80px] rounded-full pointer-events-none"></div>
            
            <div className="relative z-10 p-7 flex flex-col justify-between h-full">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 shadow-sm">
                            {account.isConnected ? <Link2 className="h-5 w-5 text-emerald-300" /> : <Wallet className="h-5 w-5 text-white/90" />}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold tracking-wide text-base truncate max-w-[150px] drop-shadow-md">
                                {account.name}
                            </span>
                            {account.isConnected && (
                                <span className="text-[10px] text-emerald-300/90 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                    Sync Ativo
                                </span>
                            )}
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-2 hover:bg-white/10 rounded-full transition-colors outline-none text-white/70 hover:text-white">
                                <MoreVertical className="h-5 w-5" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onEdit} className="cursor-pointer"><Pencil className="h-4 w-4 mr-2" /> Editar</DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCopyBalance} className="cursor-pointer"><Copy className="h-4 w-4 mr-2" /> Copiar Saldo</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive cursor-pointer"><Trash2 className="h-4 w-4 mr-2" /> Encerrar</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex items-center justify-between opacity-80 pl-1">
                    <div className="w-12 h-9 rounded-md bg-gradient-to-tr from-yellow-200 via-yellow-400 to-yellow-600 border border-yellow-700/30 relative overflow-hidden shadow-inner flex items-center justify-center">
                         <div className="w-full h-[1px] bg-yellow-800/30 absolute"></div>
                         <div className="h-full w-[1px] bg-yellow-800/30 absolute"></div>
                    </div>
                    <Nfc className="h-8 w-8 text-white/40 rotate-90" />
                </div>

                <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/60 mb-1 font-medium pl-1">Saldo Atual</p>
                    <div 
                        className="flex items-center gap-3 cursor-pointer group/balance w-fit" 
                        onClick={handleCopyBalance}
                        title="Clique para copiar"
                    >
                        <h3 className="text-3xl font-mono font-bold tracking-tighter text-white drop-shadow-md">
                            {formattedBalance}
                        </h3>
                        {copied ? <Check className="h-5 w-5 text-emerald-400 animate-in zoom-in" /> : <Copy className="h-4 w-4 text-white/30 opacity-0 group-hover/balance:opacity-100 transition-opacity" />}
                    </div>
                </div>
            </div>
        </div>
    );
}