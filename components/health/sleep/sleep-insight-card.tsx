"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit } from "lucide-react";
import type { SleepInsights } from "@/lib/sleep-math";

function buildAdvice(insights: SleepInsights, goal: number): string {
  const { count, avg7, debt, consistency, score } = insights;

  if (count === 0) {
    return "Registre suas noites para receber uma análise personalizada do seu descanso e recuperação.";
  }
  if (debt > 5) {
    return `Você acumulou ${debt}h de dívida de sono nesta semana. Antecipe a hora de dormir em 30–60 min nos próximos dias para recuperar a energia e a imunidade.`;
  }
  if (consistency < 50 && count >= 3) {
    return "Seus horários estão irregulares. Dormir e acordar perto do mesmo horário todos os dias (inclusive fins de semana) regula seu relógio biológico e melhora a qualidade do sono.";
  }
  if (avg7 < goal - 1) {
    return `Sua média (${avg7}h) está abaixo da meta de ${goal}h. Reduzir telas e cafeína à noite ajuda a aumentar o tempo total de sono profundo.`;
  }
  if (score >= 85) {
    return "Descanso excelente! Sua duração e regularidade estão ótimas — isso potencializa memória, humor e performance física. Continue assim.";
  }
  return "Bom descanso no geral. Pequenos ajustes na consistência dos horários podem levar seu Sleep Score ao nível ideal.";
}

export function SleepInsightCard({ insights, goal }: { insights: SleepInsights; goal: number }) {
  return (
    <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase font-bold text-primary flex items-center gap-2">
          <BrainCircuit className="h-4 w-4" /> Coach do Sono
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground leading-relaxed">{buildAdvice(insights, goal)}</p>
      </CardContent>
    </Card>
  );
}
