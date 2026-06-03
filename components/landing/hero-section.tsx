"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Wallet, CheckCircle2, HeartPulse, TrendingUp, BookOpen,
  Activity, Cpu, ShieldCheck, Github, CreditCard, Gift,
} from "lucide-react";
import Link from "next/link";
import {
  motion, AnimatePresence, useMotionValue, useMotionTemplate,
  useSpring, useTransform, useReducedMotion,
} from "framer-motion";
import { cn } from "@/lib/utils";
import { CtaButton } from "./cta-button";

interface HeroProps {
  authState: {
    isLoggedIn: boolean;
    isConfigured: boolean;
  };
}

// Palavras que ciclam no headline (no gradiente do accent).
const CYCLING_WORDS = ["Conectada.", "Organizada.", "Protegida.", "Sua."];

const TRUST = [
  { icon: ShieldCheck, label: "100% Local" },
  { icon: Gift, label: "Grátis pra sempre" },
  { icon: Github, label: "Open Source" },
  { icon: CreditCard, label: "Sem cartão" },
];

// --- CARD ORBITAL (todo dirigido pelo accent) ---
interface FeatureCardProps {
  icon: React.ElementType;
  title: string;
  value: string;
  subtext: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const FeatureCard = ({ icon: Icon, title, value, subtext, onMouseEnter, onMouseLeave }: FeatureCardProps) => (
  <div
    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    <div className="landing-card relative w-60 p-4 rounded-2xl shadow-2xl cursor-pointer transition-all duration-300 pointer-events-auto group/card hover:scale-110 hover:border-primary/50 hover:shadow-[0_0_60px_-15px_var(--color-primary)]">
      {/* Linha brilhante (accent) no topo */}
      <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/80 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity" />

      <div className="flex items-start justify-between mb-3">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/15 text-primary ring-1 ring-inset ring-primary/30 transition-colors group-hover/card:bg-primary group-hover/card:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/60 border border-border/60">
          <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--color-primary)]" />
          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider group-hover/card:text-foreground transition-colors">Live</span>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">{title}</p>
        <p className="text-xl font-bold text-foreground leading-tight tracking-tight">{value}</p>
        <div className="grid grid-rows-[0fr] group-hover/card:grid-rows-[1fr] transition-all duration-300 ease-out">
          <div className="overflow-hidden">
            <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2 text-xs text-primary font-medium">
              <Activity className="h-3 w-3" /> {subtext}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default function HeroSection({ authState }: HeroProps) {
  const { isLoggedIn, isConfigured } = authState;
  const targetUrl = isLoggedIn ? "/dashboard" : isConfigured ? "/login" : "/setup";
  const reduceMotion = useReducedMotion();

  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [wordIndex, setWordIndex] = useState(0);
  const [pointerActive, setPointerActive] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // Pointer → motion values (sem re-render). Alimentam o spotlight e o parallax.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);

  // Spotlight (glow do accent) que segue o cursor.
  const spotlight = useMotionTemplate`radial-gradient(550px circle at ${mx}px ${my}px, color-mix(in oklch, var(--color-primary) 16%, transparent), transparent 60%)`;

  // Parallax 3D: posição relativa do cursor → leve inclinação do orbital.
  const rotateY = useSpring(useTransform(px, [0, 1], [10, -10]), { stiffness: 70, damping: 18 });
  const rotateX = useSpring(useTransform(py, [0, 1], [-10, 10]), { stiffness: 70, damping: 18 });

  // Ciclo das palavras do headline.
  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setWordIndex((w) => (w + 1) % CYCLING_WORDS.length), 2400);
    return () => clearInterval(id);
  }, [reduceMotion]);

  const handlePointer = (e: React.MouseEvent<HTMLElement>) => {
    if (reduceMotion) return;
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    mx.set(x);
    my.set(y);
    px.set(x / rect.width);
    py.set(y / rect.height);
    if (!pointerActive) setPointerActive(true);
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handlePointer}
      className="relative min-h-[95vh] flex flex-col justify-center overflow-hidden pt-20 pb-20"
    >
      {/* SPOTLIGHT que segue o cursor (accent) */}
      {!reduceMotion && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500"
          style={{ background: spotlight, opacity: pointerActive ? 1 : 0 }}
        />
      )}

      {/* BACKGROUND ambiente (accent, themeable) */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[800px] bg-primary/5 rounded-full blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px]" />
      </div>

      <div className="container relative z-10 px-6 mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

        {/* --- ESQUERDA: TEXTO --- */}
        <div className="text-center lg:text-left space-y-8 max-w-2xl mx-auto lg:mx-0 relative z-20">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/50 backdrop-blur-sm group cursor-default hover:border-primary/40 transition-colors"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">Sistema Operacional Pessoal v1.0</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1]"
          >
            Sua vida, <br />
            {/* Palavra que cicla no gradiente do accent */}
            <span className="relative inline-block align-top">
              <AnimatePresence mode="wait">
                <motion.span
                  key={reduceMotion ? "static" : wordIndex}
                  initial={reduceMotion ? false : { opacity: 0, y: 24, rotateX: -40 }}
                  animate={{ opacity: 1, y: 0, rotateX: 0 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -24, rotateX: 40 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block text-gradient-brand animate-gradient-x"
                >
                  {reduceMotion ? "Sua." : CYCLING_WORDS[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg text-muted-foreground leading-relaxed"
          >
            O <strong className="text-foreground">Life OS</strong> reúne finanças, projetos, estudos e saúde num único arquivo SQLite que é <strong className="text-foreground">seu</strong>. Sem assinatura, sem nuvem obrigatória, sem rastreio.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center gap-4 pt-4 justify-center lg:justify-start"
          >
            <CtaButton href={targetUrl}>
              {isLoggedIn ? "Acessar Dashboard" : "Começar Agora"}
            </CtaButton>
            <Link href="#modules" className="w-full sm:w-auto">
              <Button variant="ghost" className="w-full sm:w-auto h-14 px-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border">
                Explorar Módulos
              </Button>
            </Link>
          </motion.div>

          {/* --- SELOS DE CONFIANÇA --- */}
          <motion.ul
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex flex-wrap items-center gap-x-5 gap-y-2.5 pt-2 justify-center lg:justify-start"
          >
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* --- DIREITA: ORBITAL com parallax 3D --- */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 1200 }}
          className="relative h-[750px] w-full hidden lg:flex items-center justify-center overflow-visible [transform-style:preserve-3d]"
        >
          {/* 1. NÚCLEO "REATOR" */}
          <div className="absolute z-30 flex items-center justify-center pointer-events-none">
            <div className="absolute w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute w-72 h-72 rounded-full border border-primary/10 border-t-primary/50 animate-[spin_10s_linear_infinite]" />
            <div className="absolute w-60 h-60 rounded-full border border-primary/10 border-b-primary/50 animate-[spin_15s_linear_infinite_reverse]" />
            <div className="absolute w-44 h-44 rounded-full border border-dashed border-border animate-[spin_25s_linear_infinite]" />

            <div className="relative w-36 h-36 rounded-full bg-card border border-primary/30 shadow-[0_0_80px_-20px_var(--color-primary)] flex items-center justify-center group cursor-pointer pointer-events-auto hover:scale-105 transition-transform duration-500">
              <div className="absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0_300deg,var(--color-primary)_360deg)] opacity-30 animate-[spin_4s_linear_infinite]" />
              <div className="absolute inset-1 rounded-full bg-background" />
              <div className="relative z-10 flex flex-col items-center gap-1">
                <Cpu className="h-10 w-10 text-primary animate-pulse drop-shadow-[0_0_15px_var(--color-primary)]" />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold font-mono text-foreground tracking-[0.2em]">CORE</span>
                  <span className="text-[8px] font-mono text-primary/70">ONLINE</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. ÓRBITA INTERNA */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-[450px] h-[450px] rounded-full border border-border/70 border-dashed z-10" />

            <div
              className={cn("absolute w-[450px] h-[450px] rounded-full", hoveredCard === "finance" ? "z-[60]" : "z-20")}
              style={{ animation: "spin 45s linear infinite", animationPlayState: hoveredCard === "finance" ? "paused" : "running" }}
            >
              <div style={{ animation: "spin 45s linear infinite reverse", animationPlayState: hoveredCard === "finance" ? "paused" : "running" }}>
                <FeatureCard icon={Wallet} title="Finanças" value="R$ 12.450" subtext="Patrimônio Consolidado"
                  onMouseEnter={() => setHoveredCard("finance")} onMouseLeave={() => setHoveredCard(null)} />
              </div>
            </div>

            <div
              className={cn("absolute w-[450px] h-[450px] rounded-full", hoveredCard === "health" ? "z-[60]" : "z-20")}
              style={{ animation: "spin 45s linear infinite", animationDelay: "-22.5s", animationPlayState: hoveredCard === "health" ? "paused" : "running" }}
            >
              <div style={{ animation: "spin 45s linear infinite reverse", animationDelay: "-22.5s", animationPlayState: hoveredCard === "health" ? "paused" : "running" }}>
                <FeatureCard icon={HeartPulse} title="Saúde" value="92 pts" subtext="Recuperação Máxima"
                  onMouseEnter={() => setHoveredCard("health")} onMouseLeave={() => setHoveredCard(null)} />
              </div>
            </div>
          </div>

          {/* 3. ÓRBITA EXTERNA */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute w-[700px] h-[700px] rounded-full border border-border/50 z-0" />

            <div
              className={cn("absolute w-[700px] h-[700px] rounded-full", hoveredCard === "projects" ? "z-[60]" : "z-10")}
              style={{ animation: "spin 60s linear infinite reverse", animationPlayState: hoveredCard === "projects" ? "paused" : "running" }}
            >
              <div style={{ animation: "spin 60s linear infinite", animationPlayState: hoveredCard === "projects" ? "paused" : "running" }}>
                <FeatureCard icon={CheckCircle2} title="Projetos" value="3 Ativos" subtext="Sprint Finalizando"
                  onMouseEnter={() => setHoveredCard("projects")} onMouseLeave={() => setHoveredCard(null)} />
              </div>
            </div>

            <div
              className={cn("absolute w-[700px] h-[700px] rounded-full", hoveredCard === "studies" ? "z-[60]" : "z-10")}
              style={{ animation: "spin 60s linear infinite reverse", animationDelay: "-20s", animationPlayState: hoveredCard === "studies" ? "paused" : "running" }}
            >
              <div style={{ animation: "spin 60s linear infinite", animationDelay: "-20s", animationPlayState: hoveredCard === "studies" ? "paused" : "running" }}>
                <FeatureCard icon={BookOpen} title="Estudos" value="React JS" subtext="Módulo Avançado"
                  onMouseEnter={() => setHoveredCard("studies")} onMouseLeave={() => setHoveredCard(null)} />
              </div>
            </div>

            <div
              className={cn("absolute w-[700px] h-[700px] rounded-full", hoveredCard === "goals" ? "z-[60]" : "z-10")}
              style={{ animation: "spin 60s linear infinite reverse", animationDelay: "-40s", animationPlayState: hoveredCard === "goals" ? "paused" : "running" }}
            >
              <div style={{ animation: "spin 60s linear infinite", animationDelay: "-40s", animationPlayState: hoveredCard === "goals" ? "paused" : "running" }}>
                <FeatureCard icon={TrendingUp} title="Meta" value="65%" subtext="Viagem Europa"
                  onMouseEnter={() => setHoveredCard("goals")} onMouseLeave={() => setHoveredCard(null)} />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
