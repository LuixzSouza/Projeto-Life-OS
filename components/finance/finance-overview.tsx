"use client";

import { useState, useTransition, useMemo, useSyncExternalStore } from "react";
import {
  Wallet,
  TrendingUp,
  AlertTriangle,
  PiggyBank,
  Pencil,
  Check,
  X,
  Loader2,
  DollarSign,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Target,
  LucideBanknote
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import { updateSalary } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// --- IMPORTS DOS MÓDULOS ORGANIZADOS ---
import { MetricCard, ValueRow, PrivacyText, formatMoney } from "./ui-components";
import { generateFinanceReport } from "./report-generator";
import { FinanceOverviewProps } from "@/types/finance"; 
// ^ Se não tiver o arquivo de types, pode definir a interface aqui mesmo (veja abaixo)

/* -------------------------------------------------------------------------- */
/* DEFINIÇÕES LOCAIS (Caso não tenha criado o types/finance.ts ainda)         */
/* -------------------------------------------------------------------------- */
// Descomente se precisar da interface aqui:
/*
interface FinanceOverviewProps {
  totalBalance: number;
  netSalary: number;
  grossSalary: number;
  totalRecurring: number;
  totalPaidDebts?: number;
  totalPendingDebts?: number;
  wishlistTotal?: number;
  wishlistSaved?: number;
  transactions?: any[];
  recurringExpenses?: any[];
}
*/

/* -------------------------------------------------------------------------- */
/* CONFIGURAÇÃO DE TEXTOS E CORES                                             */
/* -------------------------------------------------------------------------- */

// Textos explicativos simplificados para leigos
const TOOLTIPS = {
  patrimonio: "A soma total de dinheiro que você tem hoje em todas as contas.",
  dividaAtiva: "O valor total de contas e empréstimos que você ainda precisa pagar.",
  metas: "Dinheiro que você já separou para seus sonhos (Wishlist).",
  custosFixos: "Contas obrigatórias todo mês (Aluguel, Luz, Internet, etc).",
  salarioBruto: "O valor do seu contrato antes de descontar os impostos.",
  deducoes: "Impostos (IRRF) e contribuições (INSS) retidos na fonte.",
  salarioLiquido: "O dinheiro real que cai na sua conta para você usar.",
  dividasPagas: "Dinheiro que saiu da sua conta este mês para quitar dívidas.",
  residual: "O seu lucro mensal! O dinheiro livre que sobrou após pagar tudo.",
};

// Lógica de Saúde Financeira (Baseado no Tema Primary)
const getHealthStatus = (committed: number, hasSalary: boolean) => {
  if (!hasSalary) {
    return {
      color: "bg-muted",
      text: "text-muted-foreground",
      label: "Configurar Renda",
      border: "border-muted"
    };
  }
  // Se gastou mais de 80% da renda fixa = Crítico (Vermelho)
  if (committed > 80) {
    return {
      color: "bg-destructive",
      text: "text-destructive",
      label: "Crítico",
      border: "border-destructive"
    };
  }
  // Se gastou mais de 50% = Alerta (Amarelo)
  if (committed > 50) {
    return {
      color: "bg-amber-500",
      text: "text-amber-600",
      label: "Atenção",
      border: "border-amber-500"
    };
  }
  // Saudável = Verde/Primary (Dependendo da sua preferência, Primary fica mais 'brand')
  return {
    color: "bg-primary",
    text: "text-primary",
    label: "Saudável",
    border: "border-primary"
  };
};

// Hook seguro para evitar erros de hidratação
function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

/* -------------------------------------------------------------------------- */
/* COMPONENTE PRINCIPAL                                                       */
/* -------------------------------------------------------------------------- */

export function FinanceOverview({
  totalBalance,
  netSalary,
  grossSalary,
  totalRecurring,
  totalPaidDebts = 0,
  totalPendingDebts = 0,
  wishlistTotal = 0,
  wishlistSaved = 0,
  transactions = [],
  recurringExpenses = []
}: FinanceOverviewProps) {
  const isClient = useIsClient();
  const [smartView, setSmartView] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  
  // Sincronização de Estado (React Pattern Seguro)
  const [prevGross, setPrevGross] = useState(grossSalary);
  const [tempSalary, setTempSalary] = useState(grossSalary.toString());

  if (grossSalary !== prevGross) {
    setPrevGross(grossSalary);
    setTempSalary(grossSalary.toString());
  }

  // Cálculos Memoizados
  const metrics = useMemo(() => {
    const taxes = Math.max(0, grossSalary - netSalary);
    // Residual = Liquido - (Custos Fixos + Dívidas Pagas no mês)
    const residual = netSalary - totalRecurring - totalPaidDebts;
    
    // Comprometimento = (Custos Fixos + Dívidas Pagas) / Líquido
    const committedRaw = netSalary > 0 
      ? ((totalRecurring + totalPaidDebts) / netSalary) * 100 
      : 0;
    const committed = Math.min(committedRaw, 100);
    
    const health = getHealthStatus(committed, grossSalary > 0);

    return { taxes, residual, committed, health, hasSalary: grossSalary > 0 };
  }, [grossSalary, netSalary, totalRecurring, totalPaidDebts]);

  const handleSaveSalary = () => {
    // Limpa formatação R$ e converte para float
    const val = parseFloat(tempSalary.replace(/[^\d.,]/g, '').replace(',', '.'));
    
    if (isNaN(val) || val < 0) return toast.error("Valor inválido");

    startTransition(async () => {
      try {
        await updateSalary(val);
        toast.success("Renda atualizada!");
        setIsEditing(false);
      } catch {
        toast.error("Erro ao atualizar salário");
      }
    });
  };

  const handleReport = () => {
    generateFinanceReport({
        totalBalance, netSalary, grossSalary, totalRecurring, totalPaidDebts, totalPendingDebts,
        metrics, transactions, recurringExpenses, wishlistTotal, wishlistSaved
    });
    toast.success("Download iniciado!", {
      description: "Seu relatório Excel está sendo gerado."
    });
  };

  // Skeleton de carregamento para evitar layout shift
  if (!isClient) return <div className="h-[400px] w-full bg-muted/10 animate-pulse rounded-3xl border border-border/40" />;

  return (
    <div className="px-6 md:px-8 py-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      
      {/* --- CABEÇALHO --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="text-3xl font-black tracking-tighter text-foreground flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <LucideBanknote className="h-5 w-5 text-muted-foreground" /> Visão Geral
            </h2>
            <Badge variant="outline" className={cn("h-7 px-3 text-[10px] uppercase font-bold tracking-wider", metrics.health.text, "border-current bg-transparent")}>
              {metrics.health.label}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReport} 
              className="h-10 font-bold gap-2 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30 transition-all"
            >
               <FileSpreadsheet className="h-4 w-4" /> Relatório Excel
            </Button>
            <Button 
                variant={smartView ? "secondary" : "default"} 
                size="sm" 
                onClick={() => setSmartView(!smartView)} 
                className="h-10 font-bold gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20"
            >
               {smartView ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} 
               Smart View
            </Button>
        </div>
      </div>

      {/* --- CARDS DE MÉTRICAS (GRID) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Patrimônio Total"
          value={totalBalance}
          icon={<Wallet className="h-5 w-5 text-primary" />}
          variant="primary"
          tooltip={TOOLTIPS.patrimonio}
          isSmartView={smartView}
        />
        <MetricCard
          title="Dívida Ativa"
          value={totalPendingDebts}
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          variant="danger"
          trend="up" // Tendência de "Alta" em dívida é ruim, o componente trata isso
          tooltip={TOOLTIPS.dividaAtiva}
          isSmartView={smartView}
        />
        <MetricCard
          title="Metas (Wishlist)"
          value={wishlistSaved}
          icon={<Target className="h-5 w-5 text-primary" />}
          description={`De ${formatMoney(wishlistTotal)}`}
          tooltip={TOOLTIPS.metas}
          isSmartView={smartView}
        />
        <MetricCard
          title="Custos Fixos"
          value={totalRecurring}
          icon={<DollarSign className="h-5 w-5 text-amber-500" />}
          variant="warning"
          tooltip={TOOLTIPS.custosFixos}
          isSmartView={smartView}
        />
      </div>

      {/* --- ÁREA PRINCIPAL (DETALHES + SAÚDE) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA ESQUERDA: FLUXO DE CAIXA */}
        <Card className="lg:col-span-2 border-border/50 shadow-sm relative overflow-hidden group bg-gradient-to-br from-card to-primary/5">
          <CardHeader className="pb-4 border-b border-border/40 bg-muted/10">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" /> Dinâmica de Renda
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-6">
            
            {/* Bloco de Edição de Salário */}
            <div className="flex items-center justify-between p-5 rounded-2xl border bg-card/50 hover:border-primary/30 transition-all group/salary">
                <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Salário Bruto</p>
                    <p className="text-xs text-muted-foreground/70">{TOOLTIPS.salarioBruto}</p>
                </div>
                {isEditing ? (
                    <div className="flex gap-2 animate-in fade-in zoom-in-95 origin-right">
                        <Input 
                          autoFocus 
                          value={tempSalary} 
                          onChange={e => setTempSalary(e.target.value)} 
                          className="w-32 h-9 text-right font-mono bg-background focus-visible:ring-primary/20" 
                        />
                        <Button size="icon" className="h-9 w-9" onClick={handleSaveSalary} disabled={isPending}>
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setIsEditing(false)}><X className="h-4 w-4"/></Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <div className={cn("text-3xl font-black font-mono tracking-tighter tabular-nums text-foreground transition-all group-hover/salary:text-primary", smartView && "blur-[6px]")}>
                            {formatMoney(grossSalary)}
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full opacity-50 hover:opacity-100" onClick={() => setIsEditing(true)}>
                          <Pencil className="h-4 w-4"/>
                        </Button>
                    </div>
                )}
            </div>

            {/* Grid de Detalhes */}
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
                <ValueRow label="(-) Deduções Fiscais" value={metrics.taxes} isNegative tooltip={TOOLTIPS.deducoes} isSmartView={smartView} />
                <ValueRow label="(=) Salário Líquido" value={netSalary} isTotal tooltip={TOOLTIPS.salarioLiquido} isSmartView={smartView} />
                <ValueRow label="(-) Custos Fixos" value={totalRecurring} isNegative tooltip={TOOLTIPS.custosFixos} isSmartView={smartView} />
                <ValueRow label="(-) Dívidas Pagas" value={totalPaidDebts} isNegative tooltip={TOOLTIPS.dividasPagas} isSmartView={smartView} />
            </div>

            <Separator />

            {/* Destaque do Residual */}
            <div className={cn("flex justify-between items-center p-6 rounded-2xl border-2 transition-all", 
                metrics.residual < 0 ? "border-destructive/20 bg-destructive/5" : "border-primary/20 bg-primary/5 shadow-inner"
            )}>
                <div>
                    <p className="text-sm font-bold text-foreground">Fluxo Residual</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Capacidade de Aporte</p>
                </div>
                <div className={cn("text-4xl font-black font-mono tracking-tighter tabular-nums", 
                    metrics.residual < 0 ? "text-destructive" : "text-primary",
                    smartView && "blur-[6px]"
                )}>
                    <PrivacyText value={metrics.residual} isSmartView={smartView} />
                </div>
            </div>
          </CardContent>
        </Card>

        {/* COLUNA DIREITA: DIAGNÓSTICO DE SAÚDE */}
        <Card className={cn("border-t-8 shadow-sm flex flex-col transition-all duration-500", metrics.health.border)}>
            <CardHeader className="bg-muted/10 border-b border-border/40">
                <CardTitle className="flex items-center gap-2 text-lg font-bold">
                  <ShieldCheck className="h-5 w-5 text-foreground"/> Diagnóstico
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-8 space-y-8">
                
                {/* Score Principal */}
                <div className="text-center">
                    <span className={cn("text-6xl font-black font-mono tracking-tighter tabular-nums transition-all duration-700", 
                        metrics.health.text,
                        smartView && "blur-md opacity-50"
                    )}>
                        {metrics.committed.toFixed(0)}%
                    </span>
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-2">Da Renda Comprometida</p>
                </div>
                
                <Progress value={metrics.committed} className="h-3 bg-muted shadow-inner" />
                
                {/* Recomendações */}
                <div className="bg-muted/30 p-5 rounded-xl border border-border/50">
                    <h4 className="text-[11px] font-black uppercase flex items-center gap-2 mb-3 tracking-wider text-foreground/80">
                        <Zap className="h-3.5 w-3.5 text-primary fill-current" /> Plano de Ação
                    </h4>
                    <ul className="space-y-3">
                        {(metrics.committed > 60 ? [
                            "Priorize a quitação de juros altos.", "Corte gastos supérfluos hoje.", "Evite novas parcelas no cartão."
                        ] : [
                            "Invista pelo menos 30% do residual.", "Reforce sua reserva de emergência.", "Revise suas metas de longo prazo."
                        ]).map((tip, i) => (
                            <li key={i} className="text-xs font-medium flex items-start gap-2 text-muted-foreground leading-snug">
                                <div className={cn("h-1.5 w-1.5 rounded-full mt-1.5 shrink-0", metrics.health.color)} /> 
                                {tip}
                            </li>
                        ))}
                    </ul>
                </div>
            </CardContent>
        </Card>

      </div>
    </div>
  );
}