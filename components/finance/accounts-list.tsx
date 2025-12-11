"use client";

import { useState } from "react";
import { Plus, Wallet, Trash2, CreditCard, MoreVertical, Pencil, Copy, Check, Link2, Landmark, Nfc } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { createAccount, updateAccount, deleteAccount } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AccountDialog } from "./account-dialog";
import { Button } from "@/components/ui/button";

interface AccountItem {
    id: string;
    name: string;
    balance: number;
    color: string | null;
    type: string;
    isConnected?: boolean; // Novo campo vindo do Prisma
    provider?: string | null;
}

export function AccountsList({ accounts }: { accounts: AccountItem[] }) {
    const [editAccount, setEditAccount] = useState<AccountItem | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        try {
            if (editAccount) {
                await updateAccount(formData);
                toast.success("Conta atualizada com sucesso!");
            } else {
                await createAccount(formData);
                toast.success("Nova carteira criada!");
            }
            setIsDialogOpen(false);
            setEditAccount(null);
        } catch {
            toast.error("Erro ao salvar alterações.");
        }
    };

    const handleDelete = async (id: string) => {
        if(confirm("Tem certeza absoluta? Isso apagará o histórico financeiro desta conta para sempre.")) {
            const toastId = toast.loading("Encerrando conta...");
            await deleteAccount(id);
            toast.success("Conta encerrada.", { id: toastId });
        }
    }

    const openEdit = (acc: AccountItem) => {
        setEditAccount(acc);
        setIsDialogOpen(true);
    }

    return (
        <div className="w-full">
            {/* Scroll Area com Snap para sensação de App Nativo */}
            <div className="flex gap-5 overflow-x-auto pb-6 pt-2 px-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800 snap-x snap-mandatory">
                
                {/* Botão Nova Conta (Estilo 'Wireframe') */}
                <AccountDialog
                    trigger={
                        <div className="min-w-[300px] h-[180px] rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition-all group snap-center active:scale-95 duration-200">
                            <div className="h-12 w-12 rounded-full bg-white dark:bg-zinc-900 shadow-sm border border-zinc-200 dark:border-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform group-hover:border-indigo-500/50">
                                <Plus className="h-6 w-6 text-zinc-400 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <span className="text-sm font-medium text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200 mt-4 transition-colors">
                                Nova Carteira
                            </span>
                        </div>
                    } 
                />

                {/* Lista de Cartões */}
                {accounts.map(acc => (
                    <div key={acc.id} className="snap-center">
                        <BankCard 
                            account={acc} 
                            onEdit={() => openEdit(acc)} 
                            onDelete={() => handleDelete(acc.id)} 
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- SUBCOMPONENTE: CARD BANCÁRIO PREMIUM ---
function BankCard({ account, onEdit, onDelete }: { account: AccountItem, onEdit: () => void, onDelete: () => void }) {
    const [copied, setCopied] = useState(false);

    const handleCopyBalance = () => {
        navigator.clipboard.writeText(account.balance.toString());
        setCopied(true);
        toast.success("Saldo copiado!");
        setTimeout(() => setCopied(false), 2000);
    };

    // Formatação de Moeda
    const formattedBalance = new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
    }).format(account.balance);

    return (
        <div 
            className="relative min-w-[300px] h-[180px] rounded-3xl shadow-xl overflow-hidden text-white transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 group select-none"
            style={{ 
                background: `linear-gradient(135deg, ${account.color || '#18181b'} 0%, #09090b 100%)`
            }}
        >
            {/* Efeitos de Fundo (Noise + Glow) */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay"></div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

            {/* Conteúdo do Cartão */}
            <div className="relative z-10 p-6 flex flex-col justify-between h-full">
                
                {/* TOPO: Nome e Menu */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 shadow-sm">
                            {account.isConnected ? (
                                <Link2 className="h-4 w-4 text-green-300" />
                            ) : (
                                <Wallet className="h-4 w-4 text-white/90" />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold tracking-wide text-sm truncate max-w-[140px]" title={account.name}>
                                {account.name}
                            </span>
                            {account.isConnected && (
                                <span className="text-[10px] text-green-300/90 font-medium flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                    Conectado
                                </span>
                            )}
                        </div>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="p-1.5 hover:bg-white/10 rounded-full transition-colors outline-none text-white/70 hover:text-white">
                                <MoreVertical className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel>Opções da Conta</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                                <Pencil className="h-4 w-4 mr-2" /> Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleCopyBalance} className="cursor-pointer">
                                <Copy className="h-4 w-4 mr-2" /> Copiar Saldo
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={onDelete} className="text-red-600 focus:text-red-600 cursor-pointer">
                                <Trash2 className="h-4 w-4 mr-2" /> Encerrar
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* MEIO: Chip e Contactless */}
                <div className="flex items-center justify-between opacity-80 mt-2">
                    {/* Chip Simulado (CSS Puro) */}
                    <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-yellow-200 via-yellow-400 to-yellow-600 border border-yellow-700/30 relative overflow-hidden shadow-inner">
                        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-yellow-700/40"></div>
                        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-yellow-700/40"></div>
                        <div className="absolute top-1/2 left-1/2 w-4 h-4 border border-yellow-700/40 rounded-sm -translate-x-1/2 -translate-y-1/2"></div>
                    </div>
                    {/* Ícone Contactless */}
                    <Nfc className="h-6 w-6 text-white/50" />
                </div>

                {/* BASE: Saldo e Labels */}
                <div className="mt-auto">
                    <p className="text-[10px] uppercase tracking-widest text-white/60 mb-1 font-medium">Saldo Disponível</p>
                    <div 
                        className="flex items-center gap-2 cursor-pointer group/balance w-fit" 
                        onClick={handleCopyBalance}
                        title="Clique para copiar"
                    >
                        <h3 className="text-2xl font-mono font-bold tracking-tight text-white drop-shadow-md">
                            {formattedBalance}
                        </h3>
                        {copied ? (
                            <Check className="h-4 w-4 text-green-400 animate-in zoom-in" />
                        ) : (
                            <Copy className="h-3 w-3 text-white/30 opacity-0 group-hover/balance:opacity-100 transition-opacity" />
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}