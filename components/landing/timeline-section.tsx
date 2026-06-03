// components/landing/timeline-section.tsx
"use client";

import {
  Sunrise,
  BrainCircuit,
  Wallet,
  Moon,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import { motion, useScroll, useReducedMotion } from "framer-motion";
import { useRef } from "react";

interface TimelineItem {
  time: string;
  icon: LucideIcon;
  module: string;
  title: string;
  desc: string;
}

const TIMELINE: TimelineItem[] = [
  {
    time: "07:00",
    icon: Sunrise,
    module: "Health & Dashboard",
    title: "Sincronização biológica",
    desc: "O dia começa com o registro de sono e humor (HealthMetric). O sistema calcula sua 'Bateria Social' e ajusta a dificuldade das tarefas sugeridas no Dashboard.",
  },
  {
    time: "09:30",
    icon: BrainCircuit,
    module: "Projects & Focus",
    title: "Deep work block",
    desc: "Hora de focar. Você seleciona uma tarefa de alta prioridade vinculada a um projeto ativo. O timer Pomodoro inicia e o status muda para 'Em Foco'.",
  },
  {
    time: "14:00",
    icon: Wallet,
    module: "Finance",
    title: "Gestão de ativos",
    desc: "Pausa para o almoço e atualização financeira. Registro rápido de despesas (Transaction) e verificação do saldo das contas e da meta do Wishlist.",
  },
  {
    time: "21:00",
    icon: Moon,
    module: "AI & Journal",
    title: "Fechamento inteligente",
    desc: "A IA (AiChat) analisa tudo o que foi feito, gasto e monitorado. Ela gera um resumo no seu Diário e sugere a preparação para amanhã.",
  },
];

export default function TimelineSection() {
  const reduceMotion = useReducedMotion();

  // Trilha do dia que se preenche no accent conforme a seção é rolada.
  const trackRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 65%", "end 60%"],
  });

  return (
    <section
      id="routine"
      className="relative overflow-hidden border-t border-border/60 px-6 py-32"
    >
      {/* fundo themeable (grade + glow no accent) */}
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-[420px] w-1/2 max-w-xl rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-4xl">
        {/* --- HEADER --- */}
        <div className="mx-auto mb-16 max-w-2xl space-y-5 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 font-mono text-xs uppercase tracking-widest text-primary"
          >
            <LineChart className="size-3.5" /> Life OS Routine
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl font-bold tracking-tight text-foreground md:text-4xl"
          >
            Um dia na vida do seu{" "}
            <span className="text-gradient-brand">Sistema Operacional</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="mx-auto max-w-lg text-lg leading-relaxed text-muted-foreground"
          >
            Da hora que acorda até ir dormir, cada interação alimenta seu banco de
            dados local — gerando inteligência real sobre a sua vida.
          </motion.p>
        </div>

        {/* --- TRILHA DO DIA --- */}
        <div ref={trackRef} className="relative">
          {/* trilho base + preenchimento no accent (segue o scroll) */}
          <div className="absolute left-7 top-2 bottom-2 w-px -translate-x-1/2 overflow-hidden rounded-full bg-border/70">
            {reduceMotion ? (
              <div className="absolute inset-0 bg-gradient-to-b from-primary to-primary/30" />
            ) : (
              <motion.div
                className="absolute inset-x-0 top-0 h-full origin-top bg-gradient-to-b from-primary to-primary/30"
                style={{ scaleY: scrollYProgress }}
              />
            )}
          </div>

          <div className="space-y-10">
            {TIMELINE.map((item, i) => (
              <RoutineRow
                key={item.time}
                item={item}
                index={i}
                reduceMotion={!!reduceMotion}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RoutineRow({
  item,
  index,
  reduceMotion,
}: {
  item: TimelineItem;
  index: number;
  reduceMotion: boolean;
}) {
  const Icon = item.icon;
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      className="group relative flex gap-5"
    >
      {/* nó na trilha */}
      <div className="relative z-10 grid size-14 shrink-0 place-items-center rounded-2xl border border-primary/30 bg-card/80 shadow-sm backdrop-blur transition-all duration-300 group-hover:scale-110 group-hover:border-primary/60 group-hover:shadow-[0_0_24px_-6px_var(--color-primary)]">
        <span className="absolute inset-0 rounded-2xl bg-primary/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <Icon className="relative size-6 text-primary" />
      </div>

      {/* card de conteúdo */}
      <div className="flex-1 pt-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-primary/20 bg-primary/10 px-2 py-0.5 font-mono text-sm font-bold text-primary">
            {item.time}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            {item.module}
          </span>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors duration-300 group-hover:border-primary/30 group-hover:bg-card/70">
          <h3 className="mb-1.5 text-lg font-bold text-foreground transition-colors group-hover:text-primary">
            {item.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {item.desc}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
