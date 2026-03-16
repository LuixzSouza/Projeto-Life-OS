"use client";

import { useState, useTransition, useMemo, useSyncExternalStore, FC, ReactNode } from "react";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Pencil,
  Check,
  X,
  Loader2,
  DollarSign,
  ShieldCheck,
  Zap,
  Eye,
  EyeOff,
  FileSpreadsheet,
  Target,
  Info,
  ArrowRight
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";

import { updateSalary } from "@/app/(dashboard)/finance/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { generateFinanceReport } from "./report-generator";
import { FinanceOverviewProps } from "@/types/finance"; 

/* -------------------------------------------------------------------------- */
/* TEXTOS E CONFIGURAÇÕES                                                     */
/* -------------------------------------------------------------------------- */

const TOOLTIPS = {
  patrimonio: "A soma total de dinheiro que você tem hoje em todas as contas conectadas.",
  dividaAtiva: "O valor total de faturas pendentes e contas a pagar em aberto.",
  metas: "Dinheiro que você já separou para seus objetivos na Lista de Desejos.",
  custosFixos: "Contas obrigatórias projetadas para este mês (Assinaturas, Serviços, etc).",
  salarioBruto: "O valor total das suas receitas ou salário antes de qualquer desconto.",
  deducoes: "Estimativa de impostos, taxas ou retenções na fonte.",
  salarioLiquido: "O dinheiro real que cai na sua conta e você pode usar.",
  dividasPagas: "Dinheiro que já saiu da sua conta este mês para quitar pendências.",
  residual: "O seu Fluxo Livre! O que sobra no fim do mês após pagar os custos fixos.",
};

const getHealthStatus = (committed: number, hasSalary: boolean) => {
  if (!hasSalary) return { color: "bg-muted", text: "text-muted-foreground", label: "Definir Renda", border: "border-border/50" };
  if (committed > 80) return { color: "bg-rose-500", text: "text-rose-500", label: "Crítico", border: "border-rose-500/30" };
  if (committed > 50) return { color: "bg-amber-500", text: "text-amber-500", label: "Atenção", border: "border-amber-500/30" };
  return { color: "bg-emerald-500", text: "text-emerald-500", label: "Saudável", border: "border-emerald-500/30" };
};

const formatMoney = (val: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

function useIsClient() {
  return useSyncExternalStore(() => () => {}, () => true, () => false);
}

/* -------------------------------------------------------------------------- */
/* COMPONENTES AUXILIARES (UI)                                                */
/* -------------------------------------------------------------------------- */

const PrivacyText: FC<{ value: number; isSmartView: boolean; className?: string; prefix?: string; }> = ({ value, isSmartView, className, prefix = "" }) => {
  const formattedValue = formatMoney(Math.abs(value));
  return (
    <div className={cn("relative overflow-hidden inline-flex items-center align-baseline h-[1.2em]", className)}>
      <span className={cn("absolute inset-0 transition-all duration-500", isSmartView ? "translate-y-[120%] opacity-0 blur-sm" : "translate-y-0 opacity-100 blur-0")}>
        {prefix}{formattedValue}
      </span>
      <span className={cn("absolute inset-0 flex items-center transition-all duration-500 font-sans tracking-widest text-muted-foreground/40 select-none", isSmartView ? "translate-y-0 opacity-100" : "-translate-y-[120%] opacity-0")} aria-hidden="true">
        ••••••••
      </span>
      <span className="invisible pointer-events-none select-none">{prefix}{formattedValue}</span>
    </div>
  );
};

const MetricCard: FC<{ title: string; value: number; icon: ReactNode; trend?: "up" | "down"; variant?: "default" | "primary" | "warning" | "danger"; isSmartView?: boolean; tooltip?: string; description?: string; }> = ({ title, value, icon, trend, variant = "default", isSmartView = false, tooltip, description }) => {
  const variants = {
    default: "bg-card border-border/40 text-foreground",
    primary: "bg-gradient-to-br from-primary/10 to-transparent border-primary/20 text-primary",
    warning: "bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20 text-amber-600",
    danger: "bg-gradient-to-br from-rose-500/10 to-transparent border-rose-500/20 text-rose-600",
  };

  return (
    <Card className={cn("relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 rounded-3xl group border", variants[variant])}>
      <CardContent className="p-6 flex flex-col justify-between h-full min-h-[160px]">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3.5 rounded-2xl bg-background/80 backdrop-blur-md shadow-sm border border-border/50 group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <div className="flex items-center gap-2">
             {trend && (
              <Badge variant="secondary" className={cn("font-bold text-[10px] uppercase tracking-wider h-6 px-2.5 bg-background/80 backdrop-blur-md border-border/50 shadow-sm", trend === "up" ? "text-emerald-600" : "text-rose-500")}>
                {trend === "up" ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {trend === "up" ? "Alta" : "Baixa"}
              </Badge>
            )}
            {tooltip && (
                <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="cursor-help p-1.5 opacity-40 hover:opacity-100 hover:bg-background/80 rounded-full transition-all">
                                <Info className="h-4 w-4 text-current" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs p-3 max-w-[220px] shadow-xl leading-relaxed rounded-xl font-medium">{tooltip}</TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
          </div>
        </div>
        <div className="space-y-1 mt-auto">
          <p className="text-[10px] font-black uppercase tracking-widest opacity-70">{title}</p>
          <div className="text-2xl sm:text-3xl font-black font-mono tracking-tighter tabular-nums flex items-center">
            <PrivacyText value={value} isSmartView={!!isSmartView} />
          </div>
          {description && <p className="text-[10px] font-bold opacity-60 mt-1">{description}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

const ValueRow: FC<{ label: string; value: number; tooltip: string; isNegative?: boolean; isTotal?: boolean; isSmartView?: boolean; }> = ({ label, value, tooltip, isNegative, isTotal, isSmartView }) => (
  <div className={cn("flex justify-between items-center py-3.5 px-4 -mx-4 rounded-xl transition-colors group/row hover:bg-muted/40", isTotal && "mt-2 mb-4 bg-muted/30 border border-border/50 shadow-inner")}>
    <div className="flex items-center gap-2">
      <span className={cn("text-xs sm:text-sm font-semibold tracking-tight transition-colors", isTotal ? "text-foreground font-black uppercase tracking-wider text-[11px]" : "text-muted-foreground group-hover/row:text-foreground")}>
        {label}
      </span>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help opacity-0 group-hover/row:opacity-100 transition-opacity p-0.5 hover:text-primary">
               <Info className="h-3.5 w-3.5" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs max-w-[240px] shadow-xl p-3 font-medium rounded-xl">{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
    <div className={cn("font-mono font-bold tabular-nums tracking-tight flex items-center justify-end text-sm sm:text-base", isTotal ? "text-primary text-lg" : "text-muted-foreground", isNegative && value > 0 && "text-rose-500")}>
      <PrivacyText value={value} isSmartView={!!isSmartView} prefix={isNegative && value > 0 ? "- " : ""} />
    </div>
  </div>
);

/* -------------------------------------------------------------------------- */
/* COMPONENTE PRINCIPAL DA PÁGINA                                             */
/* -------------------------------------------------------------------------- */

export function FinanceOverview({
  totalBalance, netSalary, grossSalary, totalRecurring, totalPaidDebts = 0, totalPendingDebts = 0, wishlistTotal = 0, wishlistSaved = 0, transactions = [], recurringExpenses = []
}: FinanceOverviewProps) {
  const isClient = useIsClient();
  const [smartView, setSmartView] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [tempSalary, setTempSalary] = useState(grossSalary.toString());

  const metrics = useMemo(() => {
    const taxes = Math.max(0, grossSalary - netSalary);
    const residual = netSalary - totalRecurring - totalPaidDebts;
    const committedRaw = netSalary > 0 ? ((totalRecurring + totalPaidDebts) / netSalary) * 100 : 0;
    const committed = Math.min(committedRaw, 100);
    const health = getHealthStatus(committed, grossSalary > 0);
    return { taxes, residual, committed, health, hasSalary: grossSalary > 0 };
  }, [grossSalary, netSalary, totalRecurring, totalPaidDebts]);

  const handleSaveSalary = () => {
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
    generateFinanceReport({ totalBalance, netSalary, grossSalary, totalRecurring, totalPaidDebts, totalPendingDebts, metrics, transactions, recurringExpenses, wishlistTotal, wishlistSaved });
    toast.success("Download iniciado!", { description: "Seu relatório Excel está sendo gerado." });
  };

  if (!isClient) return <div className="h-[400px] w-full bg-muted/10 animate-pulse rounded-[2rem] border border-border/40" />;

  // Variáveis para o Gráfico Circular (SVG)
  const circleRadius = 42;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleOffset = circleCircumference - (metrics.committed / 100) * circleCircumference;

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      
      {/* HEADER DE CONTROLES */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <div className="p-3 bg-foreground rounded-2xl shadow-lg">
                <Wallet className="h-5 w-5 text-background" />
            </div>
            <div>
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">Visão Global</h2>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-0.5">Painel de Controle</p>
            </div>
        </div>
        <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleReport} className="rounded-xl h-11 font-bold gap-2 hover:bg-primary/5 hover:text-primary transition-colors shadow-sm">
               <FileSpreadsheet className="h-4 w-4" /> Relatório
            </Button>
            <Button variant={smartView ? "secondary" : "default"} onClick={() => setSmartView(!smartView)} className="rounded-xl h-11 font-bold gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20">
               {smartView ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Smart View
            </Button>
        </div>
      </div>

      {/* CARDS DE MÉTRICAS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard title="Patrimônio Consolidado" value={totalBalance} icon={<Wallet className="h-6 w-6 text-primary" />} variant="primary" tooltip={TOOLTIPS.patrimonio} isSmartView={smartView} />
        <MetricCard title="Dívida Ativa" value={totalPendingDebts} icon={<AlertTriangle className="h-6 w-6 text-rose-500" />} variant="danger" trend="up" tooltip={TOOLTIPS.dividaAtiva} isSmartView={smartView} />
        <MetricCard title="Cofre (Wishlist)" value={wishlistSaved} icon={<Target className="h-6 w-6 text-emerald-500" />} variant="default" description={`Meta Total: ${formatMoney(wishlistTotal)}`} tooltip={TOOLTIPS.metas} isSmartView={smartView} />
        <MetricCard title="Custos Fixos Totais" value={totalRecurring} icon={<DollarSign className="h-6 w-6 text-amber-500" />} variant="warning" tooltip={TOOLTIPS.custosFixos} isSmartView={smartView} />
      </div>

      {/* ÁREA DE DETALHES & SAÚDE FINANCEIRA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CAIXA ESQUERDA: DINÂMICA DE RENDA */}
        <Card className="lg:col-span-2 rounded-[2rem] border-border/40 shadow-lg relative overflow-hidden bg-card">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <CardHeader className="pb-4 pt-8 px-8">
            <CardTitle className="text-2xl font-extrabold flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-primary" /> Dinâmica de Renda
            </CardTitle>
          </CardHeader>
          
          <CardContent className="px-8 pb-8 space-y-8 relative z-10">
            
            {/* Bloco Editável do Salário */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-3xl border border-border/60 bg-muted/10 hover:bg-muted/30 hover:border-primary/30 transition-all group/salary gap-4 shadow-sm">
                <div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5 mb-1">
                        <Wallet className="h-3.5 w-3.5" /> Receita Bruta / Salário
                    </p>
                    <p className="text-xs text-muted-foreground font-medium">{TOOLTIPS.salarioBruto}</p>
                </div>
                {isEditing ? (
                    <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 bg-background p-1.5 rounded-2xl shadow-inner border border-border/50">
                        <Input autoFocus value={tempSalary} onChange={e => setTempSalary(e.target.value)} className="w-36 h-10 text-right font-mono text-lg font-bold border-none focus-visible:ring-0 bg-transparent" />
                        <Button size="icon" className="h-10 w-10 rounded-xl shadow-md" onClick={handleSaveSalary} disabled={isPending}>
                            {isPending ? <Loader2 className="h-5 w-5 animate-spin"/> : <Check className="h-5 w-5"/>}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl hover:bg-destructive/10 hover:text-destructive" onClick={() => setIsEditing(false)}><X className="h-5 w-5"/></Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-4">
                        <div className={cn("text-3xl sm:text-4xl font-black font-mono tracking-tighter tabular-nums text-foreground group-hover/salary:text-primary transition-colors", smartView && "blur-md opacity-60")}>
                            {formatMoney(grossSalary)}
                        </div>
                        <Button size="icon" variant="outline" className="h-10 w-10 rounded-xl opacity-50 hover:opacity-100 hover:text-primary hover:border-primary/50 shadow-sm transition-all" onClick={() => setIsEditing(true)}>
                          <Pencil className="h-4 w-4"/>
                        </Button>
                    </div>
                )}
            </div>

            {/* DRE Simplificado */}
            <div className="grid md:grid-cols-2 gap-x-12 gap-y-2 px-2">
                <ValueRow label="Deduções e Impostos" value={metrics.taxes} isNegative tooltip={TOOLTIPS.deducoes} isSmartView={smartView} />
                <ValueRow label="Renda Líquida Real" value={netSalary} isTotal tooltip={TOOLTIPS.salarioLiquido} isSmartView={smartView} />
                <Separator className="col-span-full my-3 md:hidden opacity-50" />
                <ValueRow label="Custo de Vida Fixo" value={totalRecurring} isNegative tooltip={TOOLTIPS.custosFixos} isSmartView={smartView} />
                <ValueRow label="Pagamento de Dívidas" value={totalPaidDebts} isNegative tooltip={TOOLTIPS.dividasPagas} isSmartView={smartView} />
            </div>

            {/* Resultado Final (Caixa Forte) */}
            <div className={cn("flex flex-col sm:flex-row sm:justify-between sm:items-center p-8 rounded-[2rem] border-2 transition-all mt-6 relative overflow-hidden shadow-sm", 
                metrics.residual < 0 ? "border-rose-500/30 bg-rose-500/5" : "border-primary/20 bg-primary/5"
            )}>
                <div className="absolute right-0 top-0 opacity-5 pointer-events-none translate-x-1/4 -translate-y-1/4">
                    <TrendingUp className="w-56 h-56" />
                </div>
                <div className="relative z-10 mb-3 sm:mb-0">
                    <p className="text-lg sm:text-xl font-black text-foreground flex items-center gap-2">
                        Fluxo de Caixa Livre <ArrowRight className="h-5 w-5 opacity-40" />
                    </p>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Sua capacidade real de aporte e lazer</p>
                </div>
                <div className={cn("text-4xl sm:text-5xl font-black font-mono tracking-tighter tabular-nums relative z-10", 
                    metrics.residual < 0 ? "text-rose-500" : "text-primary",
                    smartView && "blur-[10px] opacity-60"
                )}>
                    <PrivacyText value={metrics.residual} isSmartView={smartView} />
                </div>
            </div>
          </CardContent>
        </Card>

        {/* CAIXA DIREITA: DIAGNÓSTICO DE SAÚDE (SCORE DINÂMICO) */}
        <Card className={cn("rounded-[2rem] border-border/40 shadow-lg flex flex-col transition-all duration-500 border-t-[10px] bg-card", metrics.health.border)}>
            <CardHeader className="pt-8 px-8 pb-4">
                <CardTitle className="flex items-center justify-between text-xl font-extrabold">
                  <div className="flex items-center gap-3">
                      <ShieldCheck className="h-6 w-6 text-foreground/80"/> Diagnóstico
                  </div>
                  <Badge variant="outline" className={cn("px-3 py-1 font-black tracking-widest uppercase text-[10px] border-current bg-transparent", metrics.health.text)}>
                      {metrics.health.label}
                  </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between px-8 pb-8 space-y-8">
                
                {/* Score Circular Real (SVG) */}
                <div className="text-center py-6">
                    <div className="relative inline-flex items-center justify-center">
                        <svg className="w-52 h-52 transform -rotate-90" viewBox="0 0 100 100">
                           {/* Fundo do círculo */}
                           <circle cx="50" cy="50" r={circleRadius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
                           {/* Progresso Dinâmico */}
                           <circle 
                              cx="50" 
                              cy="50" 
                              r={circleRadius} 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="8" 
                              strokeLinecap="round"
                              className={cn(metrics.health.text, "transition-all duration-1000 ease-out")} 
                              style={{ 
                                strokeDasharray: circleCircumference, 
                                strokeDashoffset: isClient ? circleOffset : circleCircumference 
                              }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn("text-6xl font-black font-mono tracking-tighter tabular-nums transition-all duration-700", metrics.health.text, smartView && "blur-xl opacity-40")}>
                                {metrics.committed.toFixed(0)}<span className="text-3xl">%</span>
                            </span>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Comprometido</p>
                        </div>
                    </div>
                </div>
                
                {/* Plano de Ação */}
                <div className="bg-muted/20 p-6 rounded-3xl border border-border/50 shadow-sm mt-auto">
                    <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 mb-4 text-foreground/80">
                        <Zap className="h-4 w-4 text-primary fill-primary/20" /> O que fazer agora?
                    </h4>
                    <ul className="space-y-4">
                        {(metrics.committed > 60 ? [
                            "Foque na quitação de dívidas com juros altos.", 
                            "Corte assinaturas e custos fixos não essenciais.", 
                            "Evite assumir novas parcelas no cartão."
                        ] : [
                            "Mantenha os aportes na reserva de emergência.", 
                            "Considere investir 30% do seu Fluxo Livre.", 
                            "Financie os itens da sua Lista de Desejos."
                        ]).map((tip, i) => (
                            <li key={i} className="text-xs sm:text-sm font-semibold flex items-start gap-3 text-muted-foreground leading-relaxed">
                                <div className={cn("h-2.5 w-2.5 rounded-full mt-1 shrink-0 shadow-sm", metrics.health.color)} /> 
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