"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Receipt, TrendingUp, TrendingDown, Plus, Pencil, Trash2, ArrowRight, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createRecurring, updateRecurring, deleteRecurring, updateTransaction, deleteTransaction } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RecurringDialog } from "./recurring-dialog";

// --- TIPAGEM FORTE ---
interface TransactionItem {
    id: string;
    description: string;
    amount: number;
    type: string; // INCOME | EXPENSE
    category: string;
    date: Date | string;
    account?: { name: string };
}

interface RecurringItem {
    id: string;
    title: string;
    amount: number;
    dayOfMonth: number;
}

// --- HELPER DE ÍCONES DE MARCA ---
const getBrandIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('spotify')) return "https://www.google.com/s2/favicons?domain=spotify.com&sz=64";
    if (n.includes('netflix')) return "https://www.google.com/s2/favicons?domain=netflix.com&sz=64";
    if (n.includes('amazon') || n.includes('prime')) return "https://www.google.com/s2/favicons?domain=amazon.com&sz=64";
    if (n.includes('youtube')) return "https://www.google.com/s2/favicons?domain=youtube.com&sz=64";
    if (n.includes('adobe')) return "https://www.google.com/s2/favicons?domain=adobe.com&sz=64";
    if (n.includes('uber')) return "https://www.google.com/s2/favicons?domain=uber.com&sz=64";
    if (n.includes('ifood')) return "https://www.google.com/s2/favicons?domain=ifood.com.br&sz=64";
    return null;
}

// --- CARD DE SALÁRIO ---
export function SalaryCard({ net, inss, fgts }: { net: number, inss: number, fgts: number }) {
  return (
      <Card className="bg-zinc-900 text-white border-zinc-800 shadow-xl relative overflow-hidden group">
          <div className="absolute -right-10 -top-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700"></div>
          
          <CardContent className="p-6 relative z-10">
              <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-zinc-800/50 backdrop-blur-md rounded-lg border border-zinc-700"><Wallet className="h-5 w-5 text-zinc-400" /></div>
                  <Badge variant="outline" className="text-zinc-400 border-zinc-700 bg-zinc-800/50">Mensal</Badge>
              </div>
              <p className="text-xs text-zinc-400 uppercase font-bold tracking-wider">Salário Líquido (Est.)</p>
              <p className="text-3xl font-bold mt-1 text-emerald-400">R$ {net.toFixed(2)}</p>
              <div className="flex gap-4 mt-4 pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono">
                  <span>INSS: -{inss.toFixed(0)}</span>
                  <span>FGTS: +{fgts.toFixed(0)}</span>
              </div>
          </CardContent>
      </Card>
  )
}

// --- CARD DE CUSTOS FIXOS (COM EDITAR) ---
export function RecurringCard({ total, items }: { total: number, items: RecurringItem[] }) {
    const [editItem, setEditItem] = useState<RecurringItem | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            if(editItem) {
                await updateRecurring(formData);
                toast.success("Assinatura atualizada.");
            } else {
                await createRecurring(formData);
                toast.success("Assinatura criada.");
            }
            setIsDialogOpen(false);
            setEditItem(null);
        } catch {
            toast.error("Erro ao salvar.");
        } finally {
            setIsLoading(false);
        }
    }

    const handleDelete = async (id: string) => {
        if(confirm("Remover assinatura?")) {
            await deleteRecurring(id);
            toast.success("Removido.");
            setIsDialogOpen(false); // Fecha modal se estiver aberto
        }
    }

    return (
      <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 h-full flex flex-col overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
               <div className="flex items-center gap-2">
                    <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"><Receipt className="h-4 w-4 text-red-500" /></div>
                    <span className="font-semibold text-sm">Custos Fixos</span>
               </div>
               
               <RecurringDialog />
          </CardHeader>
          
          <CardContent className="flex-1 p-0 overflow-y-auto max-h-[300px] scrollbar-thin">
              <div className="p-4 grid grid-cols-1 gap-2">
                 {items.length === 0 ? (
                     <div className="text-center py-8 text-zinc-400 text-xs italic">Nenhuma assinatura cadastrada.</div>
                 ) : items.map(r => {
                     const logo = getBrandIcon(r.title);
                     return (
                        <div key={r.id} className="group flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-transparent hover:border-zinc-200 dark:hover:border-zinc-700">
                             <div className="flex items-center gap-3">
                                 {logo ? (
                                     <img src={logo} className="w-8 h-8 rounded-md object-contain bg-white p-0.5" alt="Logo" />
                                 ) : (
                                     <div className="w-8 h-8 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-zinc-500">
                                         {r.title.substring(0,2).toUpperCase()}
                                     </div>
                                 )}
                                 <div>
                                     <p className="font-medium text-sm">{r.title}</p>
                                     <p className="text-[10px] text-zinc-400">Todo dia {r.dayOfMonth}</p>
                                 </div>
                             </div>
                             <div className="flex items-center gap-2">
                                 <span className="font-bold text-sm text-zinc-700 dark:text-zinc-300">R$ {r.amount.toFixed(2)}</span>
                                 <div className="opacity-0 group-hover:opacity-100 flex gap-1 transition-opacity">
                                     <Button size="icon" variant="ghost" className="h-6 w-6 text-zinc-400 hover:text-indigo-600" onClick={() => { setEditItem(r); setIsDialogOpen(true); }}>
                                        <Pencil className="h-3 w-3" />
                                     </Button>
                                 </div>
                             </div>
                        </div>
                     )
                 })}
              </div>
          </CardContent>
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30">
              <div className="flex justify-between items-center">
                  <span className="text-xs text-zinc-500 font-medium uppercase">Total Mensal</span>
                  <span className="text-lg font-bold text-red-600 dark:text-red-400">- R$ {total.toFixed(2)}</span>
              </div>
          </div>
      </Card>
    )
}

// --- LISTA DE TRANSAÇÕES (COM FILTROS E EDITAR) ---
export function TransactionList({ transactions }: { transactions: TransactionItem[] }) {
    const [editTx, setEditTx] = useState<TransactionItem | null>(null);
    const [filterType, setFilterType] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
    const [isLoading, setIsLoading] = useState(false);

    const filteredTransactions = transactions.filter(t => 
        filterType === 'ALL' ? true : t.type === filterType
    );

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true);
        try {
            await updateTransaction(formData);
            toast.success("Transação atualizada.");
            setEditTx(null);
        } catch {
            toast.error("Erro ao atualizar.");
        } finally {
            setIsLoading(false);
        }
    }

    const handleDelete = async (id: string) => {
        if(confirm("Tem certeza que deseja excluir esta transação?")) {
            setIsLoading(true);
            await deleteTransaction(id);
            toast.success("Transação removida.");
            setEditTx(null);
            setIsLoading(false);
        }
    }

    return (
      <Card className="border-0 shadow-sm bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-800 h-full flex flex-col">
          <CardHeader className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 py-3 px-4">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                      <CardTitle className="text-base font-semibold">Extrato</CardTitle>
                      <Badge variant="secondary" className="font-normal text-xs h-5 px-1.5 bg-zinc-200 dark:bg-zinc-800 text-zinc-600">{filteredTransactions.length}</Badge>
                  </div>
                  
                  {/* Filtros Visuais */}
                  <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg">
                      <button 
                        onClick={() => setFilterType('ALL')}
                        className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", filterType === 'ALL' ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700")}
                      >
                        Tudo
                      </button>
                      <button 
                        onClick={() => setFilterType('INCOME')}
                        className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", filterType === 'INCOME' ? "bg-white dark:bg-zinc-700 shadow-sm text-emerald-600" : "text-zinc-500 hover:text-emerald-600")}
                      >
                        Entradas
                      </button>
                      <button 
                        onClick={() => setFilterType('EXPENSE')}
                        className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", filterType === 'EXPENSE' ? "bg-white dark:bg-zinc-700 shadow-sm text-red-600" : "text-zinc-500 hover:text-red-600")}
                      >
                        Saídas
                      </button>
                  </div>
              </div>
          </CardHeader>
          
          <CardContent className="p-0 flex-1 overflow-y-auto min-h-[350px] scrollbar-thin">
              {/* Modal de Edição */}
              <Dialog open={!!editTx} onOpenChange={(open) => !open && setEditTx(null)}>
                  <DialogContent>
                      <DialogHeader><DialogTitle>Detalhes da Transação</DialogTitle></DialogHeader>
                      <form action={handleSubmit} className="space-y-4">
                          <input type="hidden" name="id" value={editTx?.id} />
                          <div className="space-y-2">
                             <Label>Descrição</Label>
                             <Input name="description" defaultValue={editTx?.description} placeholder="Descrição" required />
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                  <Label>Valor</Label>
                                  <Input name="amount" type="number" step="0.01" defaultValue={editTx?.amount} required />
                              </div>
                              <div className="space-y-2">
                                  <Label>Tipo</Label>
                                  <Select name="type" defaultValue={editTx?.type}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent><SelectItem value="INCOME">Receita (Entrada)</SelectItem><SelectItem value="EXPENSE">Despesa (Saída)</SelectItem></SelectContent>
                                  </Select>
                              </div>
                          </div>
                          
                          <div className="space-y-2">
                             <Label>Categoria</Label>
                             <Input name="category" defaultValue={editTx?.category} placeholder="Ex: Alimentação" />
                          </div>

                          <DialogFooter className="flex justify-between sm:justify-between gap-2">
                             <Button type="button" variant="destructive" onClick={() => handleDelete(editTx!.id)} disabled={isLoading}>
                                 {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4 mr-2"/>} Excluir
                             </Button>
                             <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 flex-1" disabled={isLoading}>
                                 {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : "Salvar Alterações"}
                             </Button>
                          </DialogFooter>
                      </form>
                  </DialogContent>
              </Dialog>

              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredTransactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-40 text-zinc-400">
                          <p className="text-sm">Nenhuma transação encontrada.</p>
                      </div>
                  ) : filteredTransactions.map(t => (
                      <div 
                        key={t.id} 
                        onClick={() => setEditTx(t)}
                        className="flex justify-between items-center p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group cursor-pointer"
                      >
                          <div className="flex items-center gap-4 min-w-0">
                              <div className={`p-2.5 rounded-full shrink-0 ${t.type === 'INCOME' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                                  {t.type === 'INCOME' ? <TrendingUp className="h-5 w-5"/> : <TrendingDown className="h-5 w-5"/>}
                              </div>
                              <div className="min-w-0 flex-1">
                                  <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate pr-2">{t.description}</p>
                                  <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                                      <span className="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide">{t.category || "Geral"}</span>
                                      {t.account?.name && (
                                          <>
                                            <span className="text-zinc-300">•</span>
                                            <span className="truncate max-w-[80px] text-zinc-600 dark:text-zinc-400">{t.account.name}</span>
                                          </>
                                      )}
                                  </div>
                              </div>
                          </div>
                          <div className="text-right shrink-0 pl-2">
                            <span className={`font-bold text-sm block ${t.type === 'INCOME' ? 'text-emerald-600' : 'text-zinc-900 dark:text-zinc-100'}`}>
                                {t.type === 'INCOME' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">
                                {new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                      </div>
                  ))}
              </div>
          </CardContent>
      </Card>
    )
}