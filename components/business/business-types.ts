// Tipos compartilhados do módulo Business (CRM + cobranças).

export interface InvoiceData { id: string; title: string; value: number; dueDate: Date; status: string; paidAt?: Date | null; transactionId?: string | null; linkUrl?: string | null; }
export interface BillingData { id: string; title: string; totalValue: number; status: string; lastRemindedAt?: Date | null; invoices: InvoiceData[] }

// Conexão vinculada ao cliente (subconjunto leve de Friend).
export interface LinkedFriend { id: string; name: string; imageUrl?: string | null; phone?: string | null; company?: string | null; jobTitle?: string | null }

export interface ClientData {
  id: string;
  name: string;
  company?: string | null;
  imageUrl?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  document?: string | null;
  address?: string | null;
  notes?: string | null;
  friendId?: string | null;
  friend?: LinkedFriend | null;
  billings: BillingData[]
}

// Opções passadas para os modais.
export type FriendOption = { id: string; name: string; imageUrl?: string | null; company?: string | null }
export type AccountOption = { id: string; name: string; color?: string | null; isConnected: boolean }

export type ActionResponse = { success: boolean; message: string; }

export type DeleteTarget = { type: 'CLIENT' | 'BILLING' | 'INVOICE'; id: string; name: string };
