"use client";

import { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Loader2,
  DollarSign,
  Tag,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  CalendarIcon,
  AlertCircle,
} from "lucide-react";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
} from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AccountOption {
  id: string;
  name: string;
}
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
  accounts?: AccountOption[];
  transaction?: TransactionData | null;
  trigger?: React.ReactNode;
}

export function TransactionDialog({
  accounts = [],
  transaction,
  trigger,
}: TransactionDialogProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [type, setType] = useState<string>(transaction?.type || "EXPENSE");

  // --- AMOUNT: armazenamos os centavos como string ("131031" => R$ 1.310,31)
  const [amountDigits, setAmountDigits] = useState<string>(() => {
    if (transaction?.amount === undefined || transaction?.amount === null)
      return "";
    const cents = Math.round(Number(transaction.amount) * 100);
    return String(cents);
  });

  // derived values
  const rawAmount: string = amountDigits
    ? (Number(amountDigits) / 100).toFixed(2)
    : "";
  const formattedAmount: string = amountDigits
    ? new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(rawAmount))
    : "";

  const amountInputRef = useRef<HTMLInputElement | null>(null);

  // Mantém o cursor no final (melhora UX em inputs formatados)
  useEffect(() => {
    const el = amountInputRef.current;
    if (!el) return;
    // pequeno timeout para garantir que o valor já foi aplicado ao DOM
    const t = window.setTimeout(() => {
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }, 0);
    return () => window.clearTimeout(t);
  }, [formattedAmount]);

  // alterações no input visível: pegamos apenas dígitos (centavos)
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = e.target.value.replace(/\D/g, "");
    // limite opcional pra evitar overflow no campo (12 dígitos = até bilhões)
    setAmountDigits(onlyDigits.slice(0, 12));
  };

  // cola: limpa tudo que não é dígito
  const handleAmountPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const onlyDigits = text.replace(/\D/g, "");
    if (!onlyDigits) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    setAmountDigits(onlyDigits.slice(0, 12));
  };

  // tecla: permite dígitos e teclas de navegação/remoção
  const handleAmountKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowed = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Home",
      "End",
    ];
    if (allowed.includes(e.key)) return;
    if (/^\d$/.test(e.key)) return;
    // permitir também '.' e ',' para quem digitar separador — vamos ignorar e formatar
    if (e.key === "." || e.key === ",") {
      // previne inserir o caractere direto no campo (pois trabalhamos com dígitos)
      e.preventDefault();
      return;
    }
    e.preventDefault();
  };

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    // garantia: setamos o tipo e o amount (raw com ponto decimal) no formData
    formData.set("type", type);
    formData.set("amount", rawAmount); // backend espera número (parsear server-side)

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
      console.error(error);
      toast.error("Erro ao salvar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    setIsLoading(true);
    try {
      await deleteTransaction(transaction.id);
      toast.success("Transação excluída com sucesso.");
      setIsDeleteDialogOpen(false);
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir transação.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasAccounts = accounts.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button
              className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
              disabled={!hasAccounts}
            >
              <Plus className="mr-2 h-5 w-5" /> Nova Transação
            </Button>
          )}
        </DialogTrigger>

        <DialogContent className="sm:max-w-[425px] rounded-[2rem] shadow-2xl p-0 overflow-hidden border-border/40">
          <div className="bg-muted/10 p-6 border-b border-border/40">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl font-extrabold">
                <div
                  className={cn(
                    "p-2 rounded-xl",
                    type === "INCOME"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-rose-500/10 text-rose-600"
                  )}
                >
                  <DollarSign className="h-5 w-5" />
                </div>
                {transaction ? "Editar Movimentação" : "Nova Movimentação"}
              </DialogTitle>
              <DialogDescription>
                Preencha os detalhes financeiros abaixo.
              </DialogDescription>
            </DialogHeader>
          </div>

          {!hasAccounts && !transaction ? (
            <div className="p-10 text-center flex flex-col items-center">
              <Wallet className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Você precisa criar uma carteira antes de adicionar transações.
              </p>
            </div>
          ) : (
            <form
              action={handleSubmit}
              className="space-y-5 p-6 bg-background"
              noValidate
            >
              {/* Segmented Control Moderno */}
              <div className="flex p-1.5 bg-muted/30 rounded-2xl border border-border/50">
                <button
                  type="button"
                  onClick={() => setType("EXPENSE")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all",
                    type === "EXPENSE"
                      ? "bg-background text-rose-600 shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ArrowDownRight className="h-4 w-4" /> Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setType("INCOME")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-xl transition-all",
                    type === "INCOME"
                      ? "bg-background text-emerald-600 shadow-sm border border-border/50"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ArrowUpRight className="h-4 w-4" /> Receita
                </button>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Valor (R$)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/50" />
                  {/* Input VISÍVEL: formatado (pt-BR). Não tem name para não colidir com hidden */}
                  <Input
                    ref={amountInputRef}
                    type="text"
                    placeholder="0,00"
                    value={formattedAmount}
                    onChange={handleAmountChange}
                    onPaste={handleAmountPaste}
                    onKeyDown={handleAmountKeyDown}
                    className={cn(
                      "pl-11 h-14 text-2xl font-black font-mono rounded-xl bg-muted/20 border-border/40 focus-visible:ring-primary/20",
                      type === "EXPENSE" ? "text-rose-600" : "text-emerald-600"
                    )}
                    inputMode="decimal"
                    autoFocus={!transaction}
                    aria-label="Valor em reais"
                  />

                  {/* Hidden: o valor real que será enviado ao servidor (padrão ponto decimal) */}
                  <input type="hidden" name="amount" value={rawAmount} />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Descrição
                </Label>
                <Input
                  name="description"
                  defaultValue={transaction?.description}
                  placeholder="Ex: Mercado, Salário..."
                  required
                  className="h-12 rounded-xl bg-muted/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Carteira
                  </Label>
                  <Select
                    name="accountId"
                    defaultValue={transaction?.accountId || accounts[0]?.id}
                  >
                    <SelectTrigger className="h-12 rounded-xl bg-muted/20 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id} className="font-medium">
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                    Categoria
                  </Label>
                  <div className="relative">
                    <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                    <Input
                      name="category"
                      defaultValue={transaction?.category}
                      placeholder="Ex: Lazer"
                      className="h-12 pl-9 rounded-xl bg-muted/20 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                  Data
                </Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                  <Input
                    name="date"
                    type="date"
                    className="h-12 pl-9 rounded-xl bg-muted/20 font-medium"
                    defaultValue={
                      transaction?.date
                        ? new Date(transaction.date).toISOString().split("T")[0]
                        : new Date().toISOString().split("T")[0]
                    }
                  />
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-border/40 flex justify-between w-full items-center">
                {transaction ? (
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-rose-600 hover:bg-rose-500/10 rounded-xl font-bold px-4"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Excluir
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-xl font-bold"
                    onClick={() => setOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className={cn(
                      "rounded-xl font-bold text-white shadow-lg min-w-[120px]",
                      type === "EXPENSE"
                        ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20"
                        : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                    )}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : transaction ? (
                      "Salvar"
                    ) : (
                      "Registrar"
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Seguro de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-destructive/20 shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 text-destructive mb-2">
              <div className="p-3 rounded-2xl bg-destructive/10">
                <AlertCircle className="h-6 w-6" />
              </div>
              <AlertDialogTitle className="text-xl font-bold">
                Excluir Transação?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base text-muted-foreground">
              Você está prestes a remover esta transação. O saldo da sua
              carteira será automaticamente recalculado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="rounded-xl h-12 font-bold">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90 rounded-xl h-12 font-bold px-8 shadow-lg shadow-destructive/20"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sim, Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}