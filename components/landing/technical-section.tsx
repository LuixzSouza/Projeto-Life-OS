// components/landing/technical-section.tsx
"use client";

import {
  ShieldCheck,
  HardDrive,
  WifiOff,
  Zap,
  Lock,
  CloudOff,
  Database,
  type LucideIcon,
} from "lucide-react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import type { MouseEvent } from "react";

/* --- Pilar (spec-list ao lado do cofre) --- */
interface PillarProps {
  icon: LucideIcon;
  title: string;
  desc: string;
  index: number;
}
function Pillar({ icon: Icon, title, desc, index }: PillarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 * index }}
      className="group relative flex gap-4 rounded-2xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-primary/40 hover:bg-card/70"
    >
      {/* linha de acento à esquerda */}
      <span className="absolute left-0 top-5 h-[calc(100%-2.5rem)] w-px bg-gradient-to-b from-primary/60 to-transparent" />
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110">
        <Icon className="size-5" />
      </div>
      <div>
        <h3 className="font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{desc}</p>
      </div>
    </motion.div>
  );
}

/* --- Anel pulsante do cofre (efeito "radar blindado") --- */
function PulseRing({ size, delay }: { size: number; delay: number }) {
  return (
    <motion.span
      className="absolute rounded-full border border-primary/25"
      style={{ width: size, height: size }}
      animate={{ scale: [0.85, 1.1, 0.85], opacity: [0.55, 0, 0.55] }}
      transition={{ duration: 4, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/* --- Selo do cofre (Criptografado / Offline / Portátil) --- */
function Seal({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
      <Icon className="size-3.5 text-primary" />
      {label}
    </span>
  );
}

/* --- Métrica da prova técnica --- */
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-[92px] flex-col items-center rounded-xl border border-border/60 bg-background/50 p-3">
      <span className="mb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="font-mono text-lg font-bold text-foreground">{value}</span>
    </div>
  );
}

export default function TechnicalSection() {
  const reduceMotion = useReducedMotion();

  // Spotlight que segue o cursor sobre o cofre (mesma linguagem do hero command-center).
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);
  const spotlight = useMotionTemplate`radial-gradient(420px circle at ${mouseX}% ${mouseY}%, color-mix(in oklch, var(--primary) 14%, transparent), transparent 70%)`;

  function handleMove(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    mouseX.set(((e.clientX - r.left) / r.width) * 100);
    mouseY.set(((e.clientY - r.top) / r.height) * 100);
  }

  return (
    <section
      id="privacy"
      className="relative overflow-hidden border-t border-border/60 px-6 py-32"
    >
      {/* fundo themeable (grade + glow no accent) */}
      <div className="landing-grid pointer-events-none absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      <div className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-full max-w-3xl -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* --- HEADER --- */}
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
            <ShieldCheck className="size-3.5" /> Arquitetura Blindada
          </span>
          <h2 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Seus dados, <span className="text-gradient-brand">suas regras.</span>
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            Esqueça a nuvem pública. O{" "}
            <strong className="text-foreground">Life OS</strong> sela tudo num{" "}
            <strong className="text-foreground">cofre local</strong> — gravado
            fisicamente no seu dispositivo, onde só você tem a chave.
          </p>
        </div>

        {/* --- SHOWCASE: o cofre + os pilares --- */}
        <div className="grid items-center gap-8 lg:grid-cols-2">
          {/* O COFRE (visual interativo) */}
          <motion.div
            onMouseMove={reduceMotion ? undefined : handleMove}
            className="landing-card relative flex min-h-[420px] flex-col overflow-hidden rounded-3xl p-8"
          >
            {!reduceMotion && (
              <motion.div
                className="pointer-events-none absolute inset-0"
                style={{ background: spotlight }}
              />
            )}

            {/* topo: dispositivo (ligado) vs nuvem (desconectada) */}
            <div className="relative z-10 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <HardDrive className="size-4 text-primary" /> Seu dispositivo
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <CloudOff className="size-3.5 text-destructive/70" />
                <span className="line-through decoration-destructive/60">
                  Nuvem pública
                </span>
              </span>
            </div>

            {/* núcleo: cofre selado com anéis pulsantes */}
            <div className="relative z-10 grid flex-1 place-items-center py-8">
              {!reduceMotion && (
                <>
                  <PulseRing size={320} delay={0} />
                  <PulseRing size={240} delay={1.3} />
                  <PulseRing size={160} delay={2.6} />
                </>
              )}
              <div className="relative grid size-32 place-items-center rounded-[2rem] border border-primary/30 bg-primary/10 backdrop-blur-md">
                <Database className="size-12 text-primary" />
                {/* selo de cadeado */}
                <span className="absolute -bottom-3 -right-3 grid size-9 place-items-center rounded-xl border border-primary/30 bg-background shadow-lg">
                  <Lock className="size-4 text-primary" />
                </span>
              </div>
            </div>

            {/* rodapé: o arquivo + selos */}
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 px-4 py-2.5 font-mono text-sm">
                <span className="text-muted-foreground">~/</span>
                <span className="text-foreground">life-os.db</span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-primary">
                  <span className="size-1.5 rounded-full bg-primary" /> selado
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Seal icon={Lock} label="Criptografado" />
                <Seal icon={WifiOff} label="Offline" />
                <Seal icon={HardDrive} label="Portátil" />
              </div>
            </div>
          </motion.div>

          {/* PILARES */}
          <div className="flex flex-col gap-4">
            <Pillar
              index={0}
              icon={HardDrive}
              title="Propriedade real"
              desc="Você não aluga seus dados — eles vivem num arquivo no seu HD. Faça backup, copie ou leve num pen-drive quando quiser."
            />
            <Pillar
              index={1}
              icon={WifiOff}
              title="100% offline"
              desc="Sua produtividade não depende do Wi-Fi. O sistema funciona por completo sem internet, em qualquer lugar do mundo."
            />
            <Pillar
              index={2}
              icon={Zap}
              title="Velocidade nativa"
              desc="Sem telas de carregamento. A interação é instantânea — 0ms de latência de rede, fluida de ponta a ponta."
            />
          </div>
        </div>

        {/* --- PROVA TÉCNICA: SQLite --- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-8 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-r from-primary/5 via-card/40 to-primary/5 p-px"
        >
          <div className="flex flex-col items-center justify-between gap-8 rounded-[calc(1.5rem-1px)] bg-card/60 p-8 backdrop-blur md:flex-row">
            <div className="max-w-xl">
              <div className="mb-2 flex items-center gap-2">
                <Lock className="size-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Engine de dados
                </span>
              </div>
              <h4 className="text-xl font-bold text-foreground">Powered by SQLite</h4>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                A mesma tecnologia de banco confiada pela{" "}
                <strong className="text-foreground">NASA</strong> em missões
                espaciais e pela <strong className="text-foreground">Airbus</strong>{" "}
                em sistemas de voo. Robusto, inquebrável e portátil.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Metric label="Latência" value="0ms" />
              <Metric label="Encryption" value="AES-256" />
              <Metric label="Backups" value="∞" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
