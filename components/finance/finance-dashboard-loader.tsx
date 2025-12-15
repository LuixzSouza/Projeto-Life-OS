"use client";

import dynamic from "next/dynamic";
// Importamos os tipos que definimos no arquivo principal para manter a consistência
import type { 
  DashboardAccount, 
  DashboardTransaction, 
  DashboardWishlist, 
  DashboardRecurring 
} from "@/components/finance/finance-dashboard";

// Replicamos a interface aqui para garantir que o Loader exija os dados corretos
interface FinanceDashboardLoaderProps {
  accounts: DashboardAccount[];
  transactions: DashboardTransaction[];
  wishlist: DashboardWishlist[];
  recurring: DashboardRecurring[];
  totalBalance: number;
  totalRecurring: number;
  netSalary: number;
  grossSalary: number; // ✅ Agora obrigatório e tipado
  hasSalarySet: boolean;
}

// Importa o Dashboard inteiro desativando o SSR
const FinanceDashboard = dynamic<FinanceDashboardLoaderProps>(
  () => import("./finance-dashboard").then((mod) => mod.FinanceDashboard),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-muted/20 flex items-center justify-center">
        <div className="text-center space-y-4 flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="relative">
              {/* Spinner com cor do tema (Primary) */}
              <div className="h-12 w-12 rounded-full border-4 border-muted border-t-primary animate-spin"></div>
              {/* Efeito de Ping sutil */}
              <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-primary/20 animate-ping opacity-75"></div>
          </div>
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Sincronizando finanças...
          </p>
        </div>
      </div>
    )
  }
);

export function FinanceDashboardLoader(props: FinanceDashboardLoaderProps) {
  return <FinanceDashboard {...props} />;
}