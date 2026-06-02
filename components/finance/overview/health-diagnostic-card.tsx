"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FinanceMetrics } from "./overview-shared";

interface HealthDiagnosticCardProps {
  metrics: FinanceMetrics;
  smartView: boolean;
  isClient: boolean;
}

export function HealthDiagnosticCard({ metrics, smartView, isClient }: HealthDiagnosticCardProps) {
  // Variáveis para o Gráfico Circular (SVG)
  const circleRadius = 42;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const circleOffset = circleCircumference - (metrics.committed / 100) * circleCircumference;

  const tips = metrics.committed > 60
    ? [
        "Foque na quitação de dívidas com juros altos.",
        "Corte assinaturas e custos fixos não essenciais.",
        "Evite assumir novas parcelas no cartão.",
      ]
    : [
        "Mantenha os aportes na reserva de emergência.",
        "Considere investir 30% do seu Fluxo Livre.",
        "Financie os itens da sua Lista de Desejos.",
      ];

  return (
    <Card className={cn("rounded-[2rem] border-border/40 shadow-lg flex flex-col transition-all duration-500 border-t-[10px] bg-card", metrics.health.border)}>
      <CardHeader className="pt-8 px-8 pb-4">
        <CardTitle className="flex items-center justify-between text-xl font-extrabold">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-foreground/80" /> Diagnóstico
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
            {tips.map((tip, i) => (
              <li key={i} className="text-xs sm:text-sm font-semibold flex items-start gap-3 text-muted-foreground leading-relaxed">
                <div className={cn("h-2.5 w-2.5 rounded-full mt-1 shrink-0 shadow-sm", metrics.health.color)} />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
