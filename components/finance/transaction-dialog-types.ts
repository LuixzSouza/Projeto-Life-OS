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
}
