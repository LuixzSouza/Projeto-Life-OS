"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Wallet, Trash2, CreditCard, MoreVertical, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAccount, updateAccount, deleteAccount } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AccountDialog } from "./account-dialog";

interface AccountItem {
    id: string;
    name: string;
    balance: number;
    color: string | null;
    type: string;
}

export function AccountsList({ accounts }: { accounts: AccountItem[] }) {
  const [editAccount, setEditAccount] = useState<AccountItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSubmit = async (formData: FormData) => {
      try {
          if (editAccount) {
              await updateAccount(formData);
              toast.success("Conta atualizada!");
          } else {
              await createAccount(formData);
              toast.success("Nova carteira criada!");
          }
          setIsDialogOpen(false);
          setEditAccount(null);
      } catch {
          toast.error("Erro ao salvar.");
      }
  };

  const handleDelete = async (id: string) => {
      if(confirm("Tem certeza? Isso apagará todas as transações desta conta.")) {
          await deleteAccount(id);
          toast.success("Conta encerrada.");
      }
  }

  const openEdit = (acc: AccountItem) => {
      setEditAccount(acc);
      setIsDialogOpen(true);
  }

  return (
    <div className="w-full overflow-x-auto pb-4 pt-1 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
        <div className="flex gap-4 min-w-max px-1">
            
            {/* Botão Nova Conta */}
            <AccountDialog
                trigger={
                    <div className="w-[280px] h-[160px] rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group shrink-0">
                        <div className="p-3 rounded-full bg-white dark:bg-zinc-950 shadow-sm group-hover:scale-110 transition-transform">
                            <Plus className="h-6 w-6 text-zinc-400 group-hover:text-zinc-600" />
                        </div>
                        <span className="text-sm font-medium text-zinc-500 mt-3">Adicionar Carteira</span>
                    </div>
                } 
            />

            {/* Lista de Cartões */}
            {accounts.map(acc => (
                <div 
                    key={acc.id} 
                    className="relative w-[280px] h-[160px] rounded-2xl shadow-lg shrink-0 overflow-hidden text-white group transition-transform hover:-translate-y-1 duration-300"
                    style={{ 
                        background: `linear-gradient(135deg, ${acc.color || '#111'} 0%, #000 100%)`
                    }}
                >
                    {/* Textura de Ruído/Brilho */}
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
                    
                    <div className="relative z-10 p-5 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                                <Wallet className="h-5 w-5 opacity-80" />
                                <span className="font-semibold tracking-wide text-sm">{acc.name}</span>
                            </div>
                            
                            {/* Menu de Ações (3 pontinhos) */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button className="p-1 hover:bg-white/20 rounded transition-colors outline-none">
                                        <MoreVertical className="h-4 w-4 text-white/80" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-32">
                                    <DropdownMenuItem onClick={() => openEdit(acc)}>
                                        <Pencil className="h-3 w-3 mr-2" /> Editar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDelete(acc.id)} className="text-red-600 focus:text-red-600">
                                        <Trash2 className="h-3 w-3 mr-2" /> Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        <div className="space-y-4">
                            {/* Chip Simulado */}
                            <div className="flex gap-3 items-center opacity-80">
                                <div className="w-10 h-7 rounded bg-gradient-to-tr from-yellow-200 to-yellow-500 border border-yellow-600/30"></div>
                                <CreditCard className="h-6 w-6 opacity-50" />
                            </div>
                            
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest opacity-60 mb-0.5">Saldo Atual</p>
                                    <p className="text-2xl font-bold tracking-tight">R$ {acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}