"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
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

import type { TransactionDialogProps } from "./transaction-dialog-types";
import { useAmountInput } from "./use-amount-input";
import { DeleteTransactionAlert } from "./delete-transaction-alert";
import { EntityConnections } from "@/components/connect/entity-connections";

export function TransactionDialog({
  accounts = [],
  transaction,
  trigger,
}: TransactionDialogProps) {
  const [open, setOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [type, setType] = useState<string>(transaction?.type || "EXPENSE");

  const {
    amountInputRef,
    rawAmount,
    formattedAmount,
    handleAmountChange,
    handleAmountPaste,
    handleAmountKeyDown,
  } = useAmountInput(transaction?.amount);

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

        <DialogContent size="md">
          <DialogHeader
            icon={<DollarSign />}
            iconClassName={cn(
              type === "INCOME"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
            )}
            title={transaction ? "Editar Movimentação" : "Nova Movimentação"}
            description="Preencha os detalhes financeiros abaixo."
          />

          {!hasAccounts && !transaction ? (
            <DialogBody className="text-center flex flex-col items-center py-10">
              <Wallet className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">
                Você precisa criar uma carteira antes de adicionar transações.
              </p>
            </DialogBody>
          ) : (
            <form
              action={handleSubmit}
              className="flex flex-col flex-1 min-h-0"
              noValidate
            >
              <DialogBody className="space-y-5">
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

              {/* Tags, Anexos & Conexões — só em edição (precisa do id). Card recolhível form-safe. */}
              {transaction && (
                <div className="pt-2">
                  <EntityConnections entityType="transaction" entityId={transaction.id} />
                </div>
              )}

              </DialogBody>

              <DialogFooter className="!flex-row justify-between items-center">
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
      <DeleteTransactionAlert
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        isLoading={isLoading}
        onConfirm={handleDelete}
      />
    </>
  );
}
