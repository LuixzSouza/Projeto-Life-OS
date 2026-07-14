"use client";

import { useState } from "react";
import {
  AlertCircle, Dumbbell, Zap, Clock, Target,
  ChevronDown, ChevronUp, HelpCircle, Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Guia profissional e intuitivo para leigos durante a sessão de treino.
 * Explica o que fazer e por quê em linguagem simples.
 */
export function SessionGuide({ collapsed: initialCollapsed = false }: { collapsed?: boolean }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  const sections = [
    {
      icon: Dumbbell,
      title: "Como usar este app",
      items: [
        "✅ Cada linha = 1 série (repetição com peso)",
        "🏋️ Preencha o peso e reps que conseguiu fazer",
        "☑️ Clique no ✓ quando terminar a série",
        "⏱️ Descanse o tempo sugerido entre séries",
      ],
    },
    {
      icon: Zap,
      title: "O que é RPE/RIR",
      items: [
        "🎯 RPE = Nota de cansaço (1-10): 'Como estava cansado?' 1=fácil, 10=limite máximo",
        "💪 RIR = Reps em reserva: 'Quantas reps MAIS você conseguiria fazer?' 0-5",
        "💡 Use apenas UM deles, aquele que faz mais sentido pra você",
      ],
    },
    {
      icon: Target,
      title: "Por que registrar tudo",
      items: [
        "📊 O histórico mostra sua evolução (ficou mais forte?)",
        "🎯 Ajuda a não esquecer qual foi a carga da semana passada",
        "📈 Sobrecarga progressiva = chave do progresso muscular",
        "💾 Fica salvo mesmo sem internet (sincroniza depois)",
      ],
    },
    {
      icon: Clock,
      title: "Descanso entre séries",
      items: [
        "⏱️ O app sugere um tempo baseado no exercício",
        "💪 Force muscular: 2-3 min de descanso",
        "🔄 Hipertrofia (tamanho): 60-90 seg",
        "⚡ Resistência: 30-45 seg",
        "🔊 Alarme soa quando está na hora de voltar!",
      ],
    },
  ];

  return (
    <div className={cn(
      "rounded-xl border border-border/40 bg-gradient-to-br from-primary/5 to-primary/2 transition-all",
      collapsed ? "p-2" : "p-4 space-y-3",
    )}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            {collapsed ? "📚 Ver guia" : "📚 Guia rápido (fechar)"}
          </span>
        </div>
        {collapsed ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {!collapsed && (
        <div className="space-y-3 pt-2 border-t border-primary/20">
          {sections.map((section, idx) => {
            const Icon = section.icon;
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <h4 className="text-xs font-bold text-foreground">{section.title}</h4>
                </div>
                <ul className="space-y-0.5 ml-5 text-[11px] text-foreground/80 leading-relaxed">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary/60 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}

          <div className="mt-3 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-700/80 space-y-1">
            <div className="flex items-start gap-1.5">
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
              <p>
                <strong>Sem pressão!</strong> Você pode SEMPRE voltar e editar o treino depois.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Dica em contexto: quando fazer algo específico
 */
export function ContextTip({
  icon: Icon = HelpCircle,
  title,
  description,
  example,
  color = "blue",
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  example?: string;
  color?: "blue" | "green" | "amber" | "rose";
}) {
  const colorMap = {
    blue: "bg-blue-500/10 border-blue-500/20 text-blue-700",
    green: "bg-emerald-500/10 border-emerald-500/20 text-emerald-700",
    amber: "bg-amber-500/10 border-amber-500/20 text-amber-700",
    rose: "bg-rose-500/10 border-rose-500/20 text-rose-700",
  };

  return (
    <div className={cn("p-2.5 rounded-lg border text-[11px] space-y-1", colorMap[color])}>
      <div className="flex items-start gap-1.5 font-medium">
        <Icon className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>{title}</span>
      </div>
      <p className="opacity-90">{description}</p>
      {example && (
        <p className="italic opacity-75">
          <strong>Ex:</strong> {example}
        </p>
      )}
    </div>
  );
}

/**
 * Card educativo grande — explicações sobre conceitos importantes
 */
export function EducationalCard({
  step,
  title,
  description,
  action,
  actionLabel,
  highlight,
}: {
  step: number;
  title: string;
  description: string;
  action?: () => void;
  actionLabel?: string;
  highlight?: string;
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {step}
            </span>
            <h3 className="font-bold text-foreground">{title}</h3>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{description}</p>
        </div>
      </div>

      {highlight && (
        <div className="p-2 rounded-lg bg-primary/20 border border-primary/30 text-xs font-semibold text-primary">
          ⚡ {highlight}
        </div>
      )}

      {action && actionLabel && (
        <Button
          type="button"
          onClick={action}
          size="sm"
          className="h-8 w-full rounded-lg text-xs gap-1.5"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Barra de status com o que o usuário deve fazer agora
 */
export function CurrentAction({
  type,
  message,
}: {
  type: "weight" | "reps" | "rest" | "done" | "rpe" | "tips";
  message: string;
}) {
  const typeConfig = {
    weight: { icon: "⚖️", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-700" },
    reps: { icon: "📊", bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-700" },
    rest: { icon: "⏱️", bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-700" },
    done: { icon: "✅", bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-700" },
    rpe: { icon: "💪", bg: "bg-purple-500/10", border: "border-purple-500/30", text: "text-purple-700" },
    tips: { icon: "💡", bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-700" },
  };

  const config = typeConfig[type];

  return (
    <div className={cn("p-3 rounded-xl border text-xs font-bold text-center", config.bg, config.border, config.text)}>
      <span className="mr-1">{config.icon}</span> {message}
    </div>
  );
}
