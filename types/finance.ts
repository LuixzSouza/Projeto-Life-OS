// types/finance.ts

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  date: Date | string;
  category: string;
}

export interface RecurringExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  dayOfMonth: number;
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  saved: number;
}

export interface FinanceOverviewProps {
  totalBalance: number;
  netSalary: number;
  grossSalary: number;
  totalRecurring: number;
  totalPaidDebts?: number; // Adicione a interrogação (?)
  totalPendingDebts?: number; // Adicione a interrogação (?)
  wishlistTotal?: number;
  wishlistSaved?: number;
  hasSalarySet?: boolean;
  transactions?: Transaction[];
  recurringExpenses?: RecurringExpense[];
}