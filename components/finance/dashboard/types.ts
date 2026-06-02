// Tipos compartilhados do dashboard financeiro.
export interface DashboardAccount { id: string; name: string; balance: number; color: string | null; type: string; isConnected: boolean; provider?: string | null; }
export interface DashboardTransaction { id: string; description: string; amount: number; date: Date; type: string; category: string; account?: { name: string }; accountId: string; }
export interface DashboardWishlist { id: string; name: string; price: number; saved: number; priority: string; image: string | null; imageUrl?: string | null; productUrl?: string | null; currentAmount?: number; }
export interface DashboardRecurring { id: string; title: string; amount: number; category: string; dayOfMonth: number; }
