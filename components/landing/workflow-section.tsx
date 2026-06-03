// components/landing/workflow-section.tsx
"use client";

import {
  BrainCircuit,
  Calendar,
  Activity,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

/* --- Estágio do pipeline (Input -> Intelligence -> Output) --- */
interface Stage {
  n: string;
  icon: LucideIcon;
  label: string;
  code: string;
  body: ReactNode;
  live?: boolean;
}

const STAGES: Stage[] = [
  {
    n: "01",
    icon: Activity,
    label: "Dados de entrada",
    code: "Input: HealthMetric",
    body: (
      <>
        Sono detectado:{" "}
        <strong className="font-bold text-foreground">5h 20m</strong>. Recuperação
        baixa.
      </>
    ),
  },
  {
    n: "02",
    icon: BrainCircuit,
    label: "Life OS Intelligence",
    code: "Process: Settings/AI",
    body: <>Analisando contexto… risco de fadiga cognitiva elevado.</>,
    live: true,
  },
  {
    n: "03",
    icon: Calendar,
    label: "Ação automática",
    code: "Output: Task/Event",
    body: (
      <>
        <strong className="font-bold text-primary">✓ Agenda otimizada.</strong>{" "}
        Sessão de estudo reduzida em 30 min.
      </>
    ),
  },
];

const BULLETS = [
  {
    title: "Saúde & Produtividade",
    desc: "Dados de sono e treino influenciam a agenda.",
  },
  {
    title: "Finanças & Metas",
    desc: "Compras ajustam automaticamente orçamentos futuros.",
  },
  {
    title: "Privacidade total",
    desc: "Seus dados processados localmente, sem nuvem externa.",
  },
];

export default function WorkflowSection() {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="ai"
      className="relative flex items-center overflow-hidden border-t border-border/60 px-6 py-32"
    >
      {/* fundo themeable (grade + glows no accent) */}
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black_70%,transparent_100%)]" />
      <div className="pointer-events-none absolute right-0 top-1/2 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-primary/10 opacity-50 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-20 h-[400px] w-[400px] rounded-full bg-primary/10 opacity-40 blur-[100px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center gap-16 md:flex-row md:gap-20">
        {/* --- ESQUERDA: NARRATIVA --- */}
        <div className="flex-1 space-y-8">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary shadow-[0_0_20px_-6px_var(--color-primary)]"
          >
            <Layers className="size-3.5" /> Contexto Unificado
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-bold leading-tight tracking-tight text-foreground md:text-5xl"
          >
            Seus dados não vivem
            <br />
            em <span className="text-gradient-brand">silos isolados.</span>
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg leading-relaxed text-muted-foreground"
          >
            O <strong className="text-foreground">Life OS</strong> entende que sua
            produtividade depende da sua saúde física. Se você dormiu mal, o sistema
            ajusta suas metas. Se gastou demais, ele alerta sobre o orçamento. Tudo
            conectado via SQLite local.
          </motion.p>

          <div className="space-y-5 pt-2">
            {BULLETS.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                className="group flex gap-4"
              >
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary transition-all duration-300 group-hover:shadow-[0_0_10px_var(--color-primary)]" />
                <div>
                  <h4 className="text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                    {item.title}
                  </h4>
                  <p className="text-sm leading-snug text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* --- DIREITA: O PIPELINE --- */}
        <div className="flex w-full flex-1 justify-center">
          <div className="relative w-full max-w-md">
            {/* trilho do pipeline + feixe de luz fluindo */}
            <div className="absolute left-[22px] top-2 bottom-2 w-px overflow-hidden rounded-full bg-border/70">
              {!reduceMotion && (
                <motion.div
                  className="absolute top-0 h-[150px] w-full bg-gradient-to-b from-transparent via-primary/80 to-transparent shadow-[0_0_16px_0px_var(--color-primary)]"
                  animate={{ top: ["-40%", "140%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>

            <div className="space-y-5">
              {STAGES.map((stage, i) => (
                <StageCard
                  key={stage.n}
                  stage={stage}
                  index={i}
                  reduceMotion={!!reduceMotion}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StageCard({
  stage,
  index,
  reduceMotion,
}: {
  stage: Stage;
  index: number;
  reduceMotion: boolean;
}) {
  const Icon = stage.icon;
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, x: 20, scale: 0.96 }}
      whileInView={{ opacity: 1, x: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.15 }}
      className={`group relative ml-12 flex items-start gap-4 rounded-2xl border bg-card/80 p-5 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-card ${
        stage.live
          ? "border-primary/30 shadow-[0_0_40px_-10px_var(--color-primary)] ring-1 ring-primary/10"
          : "border-border/60 shadow-sm hover:border-primary/30 hover:shadow-[0_0_30px_-8px_var(--color-primary)]"
      }`}
    >
      {/* nó na trilha */}
      <span className="absolute -left-8 top-7 size-3 -translate-y-1/2 rounded-full border-[3px] border-background bg-primary shadow-sm transition-transform duration-300 group-hover:scale-125" />

      {/* ícone do estágio */}
      <div className="relative mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-105">
        <Icon className="size-5" />
        {/* número do estágio */}
        <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full border border-primary/20 bg-background font-mono text-[10px] font-bold text-primary">
          {stage.n}
        </span>
      </div>

      {/* conteúdo */}
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-primary/80">
          {stage.label}
        </div>
        <p className="mb-1 font-mono text-xs text-muted-foreground">{stage.code}</p>
        <div className="text-sm font-medium leading-relaxed text-foreground">
          {stage.body}
        </div>
      </div>

      {/* pulso "ao vivo" no card de processamento */}
      {stage.live && (
        <span className="absolute right-4 top-4 flex size-2">
          {!reduceMotion && (
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
          )}
          <span className="relative inline-flex size-2 rounded-full bg-primary" />
        </span>
      )}
    </motion.div>
  );
}
