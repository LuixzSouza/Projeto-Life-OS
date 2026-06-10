// src/app/dashboard/_components/finance-section.tsx
import type { ElementType } from "react";
import { getFinancialData, getBusinessData } from "@/lib/services/dashboard.service";
import { calculateMargin, formatInvoices } from "@/lib/utils/dashboard.utils";
import { formatCurrency as formatCurrencyUtil } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FinanceChart } from "@/components/dashboard/client-charts";
import { InvoicesCard } from "@/components/dashboard/invoices-card";
import { TransactionsCard } from "@/components/dashboard/transactions-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, TrendingUp, TrendingDown, Activity, Receipt, FileText } from "lucide-react";

// ==========================================
// 1. COMPONENTES MENORES (Extraídos p/ evitar repetição)
// ==========================================
type KpiColor = "blue" | "emerald" | "rose" | "amber" | "slate";

const kpiStyles: Record<KpiColor, { border: string; icon: string }> = {
  blue: { border: "border-l-blue-500", icon: "text-blue-500" },
  emerald: { border: "border-l-emerald-500", icon: "text-emerald-500" },
  rose: { border: "border-l-rose-500", icon: "text-rose-500" },
  amber: { border: "border-l-amber-500", icon: "text-amber-500" },
  slate: { border: "border-l-slate-400", icon: "text-slate-400" },
};

// Compacto no mobile (entram 2 por linha num iPhone SE) e espaçoso no desktop.
function KpiCard({ title, value, subtitle, icon: Icon, color }: { title: string; value: string | number; subtitle?: string; icon: ElementType; color: KpiColor }) {
  const styles = kpiStyles[color] || kpiStyles.slate;

  return (
    <Card className={`min-w-0 border-l-4 ${styles.border} shadow-sm transition-all hover:shadow-md`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 pb-1 sm:p-6 sm:pb-2">
        <CardTitle className="truncate text-xs font-medium text-muted-foreground sm:text-sm">{title}</CardTitle>
        <div className={`shrink-0 p-1.5 sm:p-2 rounded-full bg-background/50 ${styles.icon} bg-opacity-10`}>
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-6 sm:pt-0">
        <div className="truncate text-base font-bold tracking-tight sm:text-2xl">{value}</div>
        {subtitle && <p className="mt-0.5 hidden text-xs text-muted-foreground sm:mt-1 sm:block">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

// ==========================================
// 2. SEÇÃO PRINCIPAL
// ==========================================
export async function FinanceSection({ userId, currency }: { userId: string, currency: string }) {
  // Fixando a data no servidor (Previne erro de Hydration no React)
  const serverToday = new Date();
  serverToday.setHours(0, 0, 0, 0);

  // Promise.allSettled protege a tela: se 'business' falhar, 'finance' ainda renderiza!
  const results = await Promise.allSettled([
    getFinancialData(userId),
    getBusinessData(userId)
  ]);

  // Tratamento de falhas individuais
  const finance = results[0].status === "fulfilled" ? results[0].value : null;
  const business = results[1].status === "fulfilled" ? results[1].value : null;

  // ==========================================
  // 3. NORMALIZAÇÃO DE DADOS (Protegido contra null)
  // ==========================================
  const formatCurrency = (val: number) => formatCurrencyUtil(val, { currency });

  // Dados Financeiros
  const totalBalance = finance?.accounts?.reduce((acc, item) => acc + Number(item.balance || 0), 0) || 0;
  const income = Number(finance?.incomeSum?._sum?.amount || 0);
  const expense = Number(finance?.expenseSum?._sum?.amount || 0);
  const margin = calculateMargin(income, expense);

  const chartData = [
    { name: 'Entradas', total: income, type: 'INCOME' as const },
    { name: 'Saídas', total: expense, type: 'EXPENSE' as const },
  ];

  // Dados de Faturas e Transações (Cadeia opcional '?.')
  const upcomingInvoices = business?.topInvoicesRaw ? formatInvoices(business.topInvoicesRaw) : [];
  
  const recentTransactions = (finance?.recentTransactions || []).map(t => ({
    id: t.id,
    type: t.type,
    description: t.description,
    amount: Number(t.amount),
    date: t.date,
    account: { name: t.account?.name || "Conta Excluída" } // Fallback seguro
  }));

  // ==========================================
  // 4. ESTADOS VAZIOS
  // ==========================================
  const hasChartData = income > 0 || expense > 0;
  const hasInvoices = upcomingInvoices.length > 0;
  const hasTransactions = recentTransactions.length > 0;

  return (
    <div className="space-y-6">
      
      {/* KPIs Financeiros Padronizados (2 por linha já no mobile — sem torre de cards) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
        <KpiCard title="Saldo Total" value={formatCurrency(totalBalance)} icon={Wallet} color="blue" subtitle="Em todas as contas" />
        <KpiCard title="Entradas (Mês)" value={formatCurrency(income)} icon={TrendingUp} color="emerald" />
        <KpiCard title="Saídas (Mês)" value={formatCurrency(expense)} icon={TrendingDown} color="rose" />
        <KpiCard title="Margem / Retenção" value={`${margin.toFixed(1)}%`} icon={Activity} color="amber" subtitle="Sob o total de entradas" />
      </div>

      {/* Grid Principal Adaptativo */}
      <div className="grid gap-6 xl:grid-cols-12">
        
        {/* Coluna Esquerda: Visão Geral (min-w-0: impede o gráfico/conteúdo
            de alargar a coluna além da viewport e criar scroll lateral) */}
        <div className="min-w-0 xl:col-span-8 flex flex-col gap-6">
          
          <Card className="shadow-sm flex-1">
            <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-4">
              <CardTitle className="text-base font-semibold">Fluxo de Caixa</CardTitle>
              <CardDescription>Balanço consolidado do mês atual</CardDescription>
            </CardHeader>
            <CardContent className="h-full min-h-[250px] overflow-hidden p-4 pt-0 sm:p-6 sm:pt-0">
              {finance === null ? (
                <EmptyState icon={Activity} title="Erro ao carregar" description="Não foi possível carregar os dados do gráfico." />
              ) : !hasChartData ? (
                <EmptyState icon={TrendingUp} title="Sem fluxo no período" description="Nenhuma entrada ou saída registrada neste mês." />
              ) : (
                // title="" — o card acima já é o título; evita o cabeçalho duplicado.
                <FinanceChart data={chartData} title="" />
              )}
            </CardContent>
          </Card>

          {/* Renderização condicional e segura das faturas */}
          {business === null ? (
             <Card className="p-6 text-center text-muted-foreground text-sm border-dashed">Erro ao carregar faturas.</Card>
          ) : !hasInvoices ? (
             <Card className="p-6 text-center border-dashed">
               <EmptyState icon={FileText} title="Nenhuma fatura pendente" description="Você não possui cobranças abertas no momento." />
             </Card>
          ) : (
            <InvoicesCard invoices={upcomingInvoices} today={serverToday} formatCurrency={formatCurrency} />
          )}

        </div>

        {/* Coluna Direita: Transações */}
        <div className="min-w-0 xl:col-span-4 flex flex-col">
          {finance === null ? (
            <Card className="p-6 h-full text-center text-muted-foreground text-sm border-dashed">Erro ao carregar transações.</Card>
          ) : !hasTransactions ? (
            <Card className="h-full shadow-sm flex flex-col justify-center border-dashed">
              <CardContent className="pt-6">
                <EmptyState icon={Receipt} title="Nenhuma transação" description="Suas movimentações recentes aparecerão aqui." />
              </CardContent>
            </Card>
          ) : (
            <div className="h-full">
              <TransactionsCard transactions={recentTransactions} />
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// ==========================================
// 5. SKELETON ESPECÍFICO (Melhoria de UI/UX)
// ==========================================
export function FinanceSectionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8 space-y-6">
          <Skeleton className="h-[350px] w-full rounded-xl" />
          <Skeleton className="h-[250px] w-full rounded-xl" />
        </div>
        <div className="xl:col-span-4">
          <Skeleton className="h-full min-h-[600px] w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}