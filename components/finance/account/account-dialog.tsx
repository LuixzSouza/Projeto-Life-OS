"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface AccountData {
  id: string;
  name: string;
  balance: number | string;
  color: string | null;
  type: string;
}

interface AccountDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  account?: AccountData | null;
  trigger?: React.ReactNode;
}

export function AccountDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  account,
  trigger,
}: AccountDialogProps) {
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState<string>(
    account?.color || "#820ad1"
  );

  /**
   * Guarda apenas os dígitos (centavos)
   * Ex: "131031" => R$1.310,31
   */
  const [digits, setDigits] = useState<string>(() => {
    if (account?.balance === undefined || account?.balance === null) return "";
    const cents = Math.round(Number(account.balance) * 100);
    return String(cents);
  });

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  // setIsOpen tem assinatura (open: boolean) => void — usamos a prop se existir,
  // senão criamos um wrapper que chama o setter interno.
  const setIsOpen: (open: boolean) => void =
    controlledOnOpenChange ?? ((open: boolean) => setInternalOpen(open));

  // O Dialog é único e global (montado uma vez). Os initializers lazy de `digits`
  // e `selectedColor` só rodam na 1ª montagem (com account=null), então ao abrir
  // em modo edição os estados ficavam defasados — o saldo aparecia vazio e era
  // salvo como 0. Ressincronizamos sempre que o dialog abre ou a conta muda.
  useEffect(() => {
    if (!isOpen) return;
    if (account?.balance !== undefined && account?.balance !== null && account?.balance !== "") {
      setDigits(String(Math.round(Number(account.balance) * 100)));
    } else {
      setDigits("");
    }
    setSelectedColor(account?.color || "#820ad1");
  }, [account, isOpen]);

  /** valor matemático real enviado ao backend (string com ponto decimal) */
  const rawBalance: string = digits ? (Number(digits) / 100).toFixed(2) : "";

  /** valor formatado exibido ao usuário (pt-BR) */
  const formattedBalance: string = digits
    ? new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(rawBalance))
    : "";

  /** trata mudanças no input visível */
  const handleBalanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const onlyDigits = e.target.value.replace(/\D/g, "");
    const limited = onlyDigits.slice(0, 12); // limite opcional
    setDigits(limited);
  };

  /** trata colagem (cola "R$ 1.310,31" etc) */
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const onlyDigits = text.replace(/\D/g, "");
    if (!onlyDigits) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    setDigits(onlyDigits.slice(0, 12));
  };

  /** permite apenas teclas úteis — não bloqueia atalhos por exemplo */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const allowedKeys = [
      "Backspace",
      "Delete",
      "ArrowLeft",
      "ArrowRight",
      "Tab",
      "Home",
      "End",
    ];
    if (allowedKeys.includes(e.key)) return;
    // permitir dígitos
    if (/^\d$/.test(e.key)) return;
    // bloquear o resto
    e.preventDefault();
  };

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);

    formData.set("color", selectedColor);
    formData.set("balance", rawBalance);

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
    } catch (err) {
      // log para debugar (mantemos a tipagem natural do erro)
      console.error(err);
      toast.error("Erro ao salvar conta.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}

      <DialogContent size="md" className="z-[90]">
        <DialogHeader style={{ backgroundColor: `${selectedColor}10` }}>
          <div className="flex items-start gap-3.5 pr-8">
            <div
              className="p-2.5 rounded-xl bg-background shadow-sm border border-border/50 shrink-0"
              style={{ color: selectedColor }}
            >
              <Wallet className="h-5 w-5" />
            </div>
            <div className="space-y-1 min-w-0 pt-0.5">
              <DialogTitle style={{ color: selectedColor }}>
                {account ? "Editar Carteira" : "Nova Carteira"}
              </DialogTitle>
              <DialogDescription>
                Crie uma carteira manual para organizar o saldo.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form action={handleSubmit} className="flex flex-col flex-1 min-h-0" noValidate>
          <DialogBody className="space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Nome da Conta
            </Label>

            <Input
              name="name"
              placeholder="Ex: Nubank, Carteira Física..."
              defaultValue={account?.name || ""}
              required
              className="h-12 rounded-xl bg-muted/20 font-bold text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Tipo
              </Label>

              <Select name="type" defaultValue={account?.type || "CHECKING"}>
                <SelectTrigger className="h-12 rounded-xl bg-muted/20 font-medium">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>

                <SelectContent className="rounded-xl z-[100]">
                  <SelectItem value="CHECKING">Conta Corrente</SelectItem>
                  <SelectItem value="SAVINGS">Poupança</SelectItem>
                  <SelectItem value="INVESTMENT">Investimento</SelectItem>
                  <SelectItem value="CASH">Dinheiro Físico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                Saldo Atual (R$)
              </Label>

              <Input
                type="text"
                placeholder="0,00"
                value={formattedBalance}
                onChange={handleBalanceChange}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                className="h-12 rounded-xl bg-muted/20 font-mono font-bold"
                inputMode="decimal"
                autoComplete="off"
                aria-label="Saldo atual em reais"
              />

              {/* input escondido que realmente manda o valor para o servidor (padrão com ponto decimal) */}
              <input type="hidden" name="balance" value={rawBalance} />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
              Identidade Visual
            </Label>

            <div className="flex flex-wrap gap-3">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setSelectedColor(c.value)}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-sm border-2",
                    selectedColor === c.value ? "border-foreground scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: c.value }}
                  title={c.name}
                >
                  {selectedColor === c.value && (
                    <Check className="h-4 w-4 text-white drop-shadow-md" />
                  )}
                </button>
              ))}
            </div>
          </div>

          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" className="rounded-xl font-bold" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={isLoading}
              className="rounded-xl font-bold shadow-lg"
              style={{ backgroundColor: selectedColor, color: "white" }}
            >
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : account ? "Salvar" : "Criar Conta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}