"use client";

import { AlertCircle, CheckCircle2, Zap, TrendingUp, Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Instruções e contexto para cada série dentro de um exercício.
 * Mostra ao usuário EXATAMENTE o que fazer em cada momento.
 */
export function SeriesInstructions({
  setIndex,
  totalSets,
  isDone,
  requiresWeight,
  isTimed,
  isPR,
}: {
  setIndex: number; // 0-indexed
  totalSets: number;
  isDone: boolean;
  requiresWeight: boolean;
  isTimed: boolean;
  isPR: boolean;
}) {
  const setNumber = setIndex + 1;
  const isLast = setIndex === totalSets - 1;

  return (
    <div className="space-y-2 text-xs text-muted-foreground/80">
      {/* Numeração + status */}
      <div className="flex items-center gap-2">
        <span className="font-bold text-foreground">Série {setNumber} de {totalSets}</span>
        {isDone ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 font-semibold">
            <CheckCircle2 className="h-3 w-3" /> Feita
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-semibold">
            <Zap className="h-3 w-3" /> Pendente
          </span>
        )}
        {isPR && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold text-[10px]">
            🏆 RECORDE!
          </span>
        )}
      </div>

      {/* O que fazer */}
      {!isDone && (
        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-700 space-y-1.5">
          <div className="flex gap-2">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-semibold">O que fazer agora:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-[10px]">
                {requiresWeight && (
                  <li>Digite o <strong>peso</strong> (kg ou libras)</li>
                )}
                <li>Digite o <strong>número de reps</strong> (repetições que conseguiu fazer)</li>
                {!isTimed && (
                  <li>Opcional: marque o <strong>RPE ou RIR</strong> (dificuldade/reps restantes)</li>
                )}
                <li>Clique no <strong className="text-emerald-600">✓ Série feita</strong></li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-muted/40">
        <span className="text-[10px] font-semibold">Progresso</span>
        <div className="flex gap-1">
          {Array.from({ length: totalSets }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i < setIndex ? "w-3 bg-emerald-500" : i === setIndex ? "w-4 bg-amber-500" : "w-2 bg-border/40",
              )}
            />
          ))}
        </div>
      </div>

      {/* Dica contextual */}
      {!isDone && setNumber <= 2 && (
        <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 text-[10px]">
          <strong>💡 Dica:</strong> Digite o peso que você <strong>realmente usou</strong>, não o que planejava. Não tem problema se for diferente da ficha!
        </div>
      )}

      {/* Próximo passo */}
      {isDone && !isLast && (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] flex items-center gap-1.5">
          <ArrowRight className="h-3 w-3" /> Descanse e prepare-se para a próxima série!
        </div>
      )}

      {isDone && isLast && (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-[10px] flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3" /> Todas as séries feitas! 🎉 Passe para o próximo exercício.
        </div>
      )}
    </div>
  );
}

/**
 * Explicação sobre o que significa cada campo
 */
export function FieldHelp({
  field,
}: {
  field: "weight" | "reps" | "rpe" | "rir" | "type";
}) {
  const explanations = {
    weight: {
      title: "Peso",
      what: "Quanto de carga você levantou?",
      example: "Se você fez 10 reps com 20kg, digite 20",
      why: "Ajuda a acompanhar sua força aumentando",
    },
    reps: {
      title: "Repetições",
      what: "Quantas vezes você levantou o peso?",
      example: "Se fez 10 repetições, digite 10",
      why: "Mostra se você está melhorando em resistência",
    },
    rpe: {
      title: "RPE (Esforço Percebido)",
      what: "De 1 a 10, quão cansada foi a série?",
      example: "RPE 8 = cansada mas com margem | RPE 9 = no limite",
      why: "Ajuda a entender se o treino está bem balanceado",
    },
    rir: {
      title: "RIR (Reps em Reserva)",
      what: "Quantas reps MAIS você conseguiria fazer?",
      example: "Fez 10 reps mas poderia fazer 2 mais = RIR 2",
      why: "Mesmo que RPE, mas em linguagem de reps",
    },
    type: {
      title: "Tipo de série",
      what: "Normal / Aquecimento / Dropset / etc.",
      example: "Série normal = aquela mesmo | Warmup = para esquentar",
      why: "Diferencia séries leves de aquecimento das pesadas",
    },
  };

  const exp = explanations[field];

  return (
    <div className="space-y-2 text-[11px]">
      <div className="font-bold text-foreground">{exp.title}</div>
      <div className="space-y-1.5 text-muted-foreground/80">
        <div className="flex gap-2">
          <span className="font-semibold text-foreground">O quê?</span>
          <span>{exp.what}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold text-foreground">Ex:</span>
          <span>{exp.example}</span>
        </div>
        <div className="flex gap-2">
          <span className="font-semibold text-foreground">Por quê?</span>
          <span>{exp.why}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Status visual: o que o usuário PRECISA fazer neste momento
 */
export function MissingFieldsAlert({
  missing,
}: {
  missing: ("weight" | "reps" | "rpe" | "rir")[];
}) {
  if (missing.length === 0) return null;

  const labels: Record<string, string> = {
    weight: "⚖️ Peso",
    reps: "📊 Reps",
    rpe: "💪 RPE",
    rir: "🔋 RIR",
  };

  return (
    <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-700 space-y-1.5">
      <div className="flex items-center gap-1.5 font-semibold text-xs">
        <AlertCircle className="h-3.5 w-3.5" />
        Faltam dados para concluir:
      </div>
      <div className="flex flex-wrap gap-1.5">
        {missing.map((field) => (
          <span key={field} className="px-2 py-0.5 rounded bg-rose-500/20 text-[10px] font-medium">
            {labels[field]}
          </span>
        ))}
      </div>
    </div>
  );
}
