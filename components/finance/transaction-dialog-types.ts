// Tipos do diálogo de transação.

export interface AccountOption {
  id: string;
  name: string;
}

export interface TransactionData {
  id: string;
  description: string;
  amount: number;
  type: string;
  category: string;
  accountId: string;
  date: Date;
}

export interface TransactionDialogProps {
  accounts?: AccountOption[];
  transaction?: TransactionData | null;
  trigger?: React.ReactNode;
  /** Modo controlado: um único diálogo fora do .map() em listas grandes
      (regra do CLAUDE.md — nunca montar Dialog dentro de loop). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
