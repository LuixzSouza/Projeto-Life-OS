"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Brain, Wallet, Dumbbell, CalendarDays, BookOpen, Trophy, Flame,
  CornerDownLeft, ShieldCheck, Github, CreditCard, Gift, Sparkles,
} from "lucide-react";
import Link from "next/link";
import {
  motion, AnimatePresence, animate, useMotionValue, useMotionTemplate,
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

const TRUST = [
  { icon: ShieldCheck, label: "100% Local" },
  { icon: Gift, label: "Grátis pra sempre" },
  { icon: Github, label: "Open Source" },
  { icon: CreditCard, label: "Sem cartão" },
];

// Poeira de dados que sobe no fundo do console (posições determinísticas → sem
// mismatch de hidratação).
const MOTES = [
  { l: 12, d: 0, dur: 7, s: 3 }, { l: 30, d: 1.2, dur: 8, s: 2 },
  { l: 48, d: 2.4, dur: 6.5, s: 4 }, { l: 66, d: 0.6, dur: 9, s: 2 },
  { l: 82, d: 3, dur: 7.5, s: 3 }, { l: 92, d: 1.8, dur: 8.5, s: 2 },
];

// Faíscas do "recorde" (burst único ao revelar o widget de treino).
const GYM_SPARKS = [
  { x: -14, y: -10 }, { x: 10, y: -16 }, { x: 18, y: 2 },
  { x: -6, y: -20 }, { x: 24, y: -8 }, { x: 2, y: -22 },
];

// --- CENAS DO CONSOLE: cada uma é uma pergunta real respondida por um módulo. ---
type SceneKind = "finance" | "gym" | "agenda" | "study";
interface Scene {
  id: string;
  chip: string;
  icon: React.ElementType;
  q: string;
  a: string;
  kind: SceneKind;
}

const SCENES: Scene[] = [
  { id: "fin", chip: "Finanças", icon: Wallet, kind: "finance",
    q: "Quanto sobrou esse mês?",
    a: "Você guardou R$ 1.240 — 18% da sua renda. Ritmo melhor que o mês passado." },
  { id: "gym", chip: "Treino", icon: Dumbbell, kind: "gym",
    q: "Como foi meu treino hoje?",
    a: "Peito & Tríceps · 5,2k kg de volume e um novo recorde no supino." },
  { id: "agenda", chip: "Agenda", icon: CalendarDays, kind: "agenda",
    q: "O que eu tenho pra hoje?",
    a: "3 blocos: foco às 9h, reunião às 14h e treino às 19h." },
  { id: "study", chip: "Estudos", icon: BookOpen, kind: "study",
    q: "Quantos flashcards revisar?",
    a: "12 cards de React vencendo hoje. Seu streak está em 7 dias." },
];

// Número que conta de 0 até o alvo (anima na entrada do widget). Com reduce-motion,
// mostra o valor final direto.
function CountUp({ to, format, duration = 1.1 }: { to: number; format: (n: number) => string; duration?: number }) {
  const reduce = useReducedMotion();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, to, { duration, ease: "easeOut", onUpdate: (v) => setVal(v) });
    return () => controls.stop();
  }, [to, duration, reduce]);
  return <>{format(reduce ? to : val)}</>;
}

// Três pontinhos pulsando enquanto a IA "pensa".
function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-1 py-0.5" aria-label="Pensando">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60"
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
        />
      ))}
    </span>
  );
}

// Widget visual de cada módulo (puro SVG/divs, temático no accent — sem libs pesadas).
function SceneWidget({ kind }: { kind: SceneKind }) {
  const reduce = useReducedMotion();

  if (kind === "finance") {
    const bars = [42, 56, 48, 70, 62, 92];
    return (
      <div className="rounded-xl border border-border/60 bg-background/40 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-muted-foreground">Economia do mês</span>
          <span className="text-[11px] font-bold text-primary">
            <CountUp to={18} duration={0.9} format={(v) => `+${Math.round(v)}%`} />
          </span>
        </div>
        <div className="mt-2 flex h-12 items-end gap-1.5">
          {bars.map((h, i) => (
            <motion.div
              key={i}
              style={{ height: `${h}%`, transformOrigin: "bottom" }}
              initial={reduce ? false : { scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
              className={cn("flex-1 rounded-sm", i === bars.length - 1 ? "bg-primary" : "bg-primary/25")}
            />
          ))}
        </div>
        <p className="mt-2 text-sm font-bold text-foreground">
          <CountUp to={1240} format={(v) => `R$ ${Math.round(v).toLocaleString("pt-BR")} guardados`} />
        </p>
      </div>
    );
  }

  if (kind === "gym") {
    return (
      <div className="rounded-xl border border-border/60 bg-background/40 p-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground">Volume de hoje</p>
            <p className="text-lg font-bold tabular-nums text-foreground">
              <CountUp to={5200} format={(v) => `${(v / 1000).toFixed(1).replace(".", ",")}k kg`} />
            </p>
          </div>
          <span className="relative inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2 py-1 text-[10px] font-bold text-amber-500">
            <Trophy className="h-3 w-3" /> Recorde
            {!reduce && GYM_SPARKS.map((s, i) => (
              <motion.span
                key={i}
                aria-hidden
                initial={{ opacity: 0, x: 0, y: 0, scale: 0.4 }}
                animate={{ opacity: [0, 1, 0], x: s.x, y: s.y, scale: [0.4, 1, 0.3] }}
                transition={{ duration: 0.8, delay: 0.3 + i * 0.05, ease: "easeOut" }}
                className="pointer-events-none absolute right-2 top-1 h-1.5 w-1.5 rounded-full bg-amber-400"
              />
            ))}
          </span>
        </div>
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted/60">
          <motion.div
            style={{ width: "78%", transformOrigin: "left" }}
            initial={reduce ? false : { scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
            className="h-full rounded-full bg-primary"
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">Supino 80kg · melhor que da última vez</p>
      </div>
    );
  }

  if (kind === "agenda") {
    const blocks = [
      { t: "09:00", label: "Foco profundo", w: "70%" },
      { t: "14:00", label: "Reunião", w: "48%" },
      { t: "19:00", label: "Treino", w: "60%" },
    ];
    return (
      <div className="space-y-1.5 rounded-xl border border-border/60 bg-background/40 p-3">
        {blocks.map((b, i) => (
          <div key={b.t} className="flex items-center gap-2">
            <span className="w-10 shrink-0 font-mono text-[10px] text-muted-foreground">{b.t}</span>
            <motion.div
              style={{ width: b.w, transformOrigin: "left" }}
              initial={reduce ? false : { scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.45, delay: 0.15 + i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="flex h-6 items-center rounded-md border border-primary/30 bg-primary/15 px-2 text-[11px] font-medium text-foreground"
            >
              <span className="truncate">{b.label}</span>
            </motion.div>
          </div>
        ))}
      </div>
    );
  }

  // study
  return (
    <div className="rounded-xl border border-border/60 bg-background/40 p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground">Sequência de revisão</span>
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          <CountUp to={12} duration={0.9} format={(v) => `${Math.round(v)} cards hoje`} />
        </span>
      </div>
      <div className="mt-2.5 flex items-center gap-1">
        {Array.from({ length: 7 }, (_, i) => (
          <motion.div
            key={i}
            style={{ transformOrigin: "bottom" }}
            initial={reduce ? false : { scaleY: 0, opacity: 0 }}
            animate={{ scaleY: 1, opacity: 1 }}
            transition={{ duration: 0.35, delay: 0.15 + i * 0.06 }}
            className="h-6 flex-1 rounded-md bg-primary/70"
          />
        ))}
      </div>
      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Flame className="h-3 w-3 text-orange-500" /> 7 dias seguidos
      </p>
    </div>
  );
}

export default function HeroSection({ authState }: HeroProps) {
  const { isLoggedIn, isConfigured } = authState;
  const targetUrl = isLoggedIn ? "/dashboard" : isConfigured ? "/login" : "/setup";
  const reduceMotion = useReducedMotion();

  const sectionRef = useRef<HTMLElement>(null);

  // --- Estado do console interativo ---
  const [sceneIndex, setSceneIndex] = useState(0);
  const [typedQ, setTypedQ] = useState("");
  const [typedA, setTypedA] = useState("");
  const [phase, setPhase] = useState<"q" | "thinking" | "a" | "done">("q");
  const scene = SCENES[sceneIndex];

  // Spotlight: segue o cursor na SEÇÃO inteira (glow ambiente).
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const [pointerActive, setPointerActive] = useState(false);
  const spotlight = useMotionTemplate`radial-gradient(550px circle at ${mx}px ${my}px, color-mix(in oklch, var(--color-primary) 14%, transparent), transparent 60%)`;

  const handleSpotlight = (e: React.MouseEvent<HTMLElement>) => {
    if (reduceMotion) return;
    const rect = sectionRef.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set(e.clientX - rect.left);
    my.set(e.clientY - rect.top);
    if (!pointerActive) setPointerActive(true);
  };

  // Tilt 3D: calculado em relação ao PRÓPRIO card (não à seção) e sutil. Começa
  // centralizado (0.5 → 0°) e volta suave ao sair — a mola elimina qualquer "salto".
  const tiltX = useMotionValue(0.5);
  const tiltY = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(tiltX, [0, 1], [5.5, -5.5]), { stiffness: 150, damping: 20 });
  const rotateX = useSpring(useTransform(tiltY, [0, 1], [-5.5, 5.5]), { stiffness: 150, damping: 20 });

  const handleCardTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const r = e.currentTarget.getBoundingClientRect();
    tiltX.set((e.clientX - r.left) / r.width);
    tiltY.set((e.clientY - r.top) / r.height);
  };
  const resetCardTilt = () => { tiltX.set(0.5); tiltY.set(0.5); };

  // Motor: digita a pergunta → "pensa" → digita a resposta → avança sozinho.
  // Clicar num chip troca de cena e reinicia. Respeita reduce-motion.
  useEffect(() => {
    if (reduceMotion) return;
    let cancelled = false;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const wait = (ms: number) => new Promise<void>((res) => { timeouts.push(setTimeout(res, ms)); });
    const s = SCENES[sceneIndex];
    void (async () => {
      // O primeiro await joga todos os setState para fora do corpo síncrono do effect.
      await wait(0);
      if (cancelled) return;
      setTypedQ(""); setTypedA(""); setPhase("q");
      for (let i = 1; i <= s.q.length; i++) { if (cancelled) return; setTypedQ(s.q.slice(0, i)); await wait(26); }
      await wait(360); if (cancelled) return;
      setPhase("thinking");
      await wait(750); if (cancelled) return;
      setPhase("a");
      for (let i = 1; i <= s.a.length; i++) { if (cancelled) return; setTypedA(s.a.slice(0, i)); await wait(17); }
      if (cancelled) return;
      setPhase("done");
      await wait(3000); if (cancelled) return;
      setSceneIndex((idx) => (idx + 1) % SCENES.length);
    })();
    return () => { cancelled = true; timeouts.forEach(clearTimeout); };
  }, [sceneIndex, reduceMotion]);

  const showQ = reduceMotion ? scene.q : typedQ;
  const showA = reduceMotion ? scene.a : typedA;
  const aiVisible = reduceMotion || phase !== "q";
  const thinking = phase === "thinking" && !reduceMotion;
  const showWidget = reduceMotion || phase === "a" || phase === "done";

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleSpotlight}
      className="relative flex min-h-[95vh] flex-col justify-center overflow-hidden pb-20 pt-20"
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
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[800px] w-[1200px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="container relative z-10 mx-auto grid grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2">

        {/* --- ESQUERDA: TEXTO --- */}
        <div className="relative z-20 mx-auto max-w-2xl space-y-8 text-center lg:mx-0 lg:text-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="group inline-flex cursor-default items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 backdrop-blur-sm transition-colors hover:border-primary/40"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
              Cérebro Digital · IA híbrida (local + nuvem)
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-5xl font-bold leading-[1.1] tracking-tight text-foreground md:text-7xl"
          >
            Pergunte. <br />
            <span className="text-gradient-brand animate-gradient-x">Sua vida responde.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg leading-relaxed text-muted-foreground"
          >
            O <strong className="text-foreground">Life OS</strong> reúne finanças, treinos, agenda e estudos num único arquivo que é <strong className="text-foreground">seu</strong> — e uma IA conecta tudo. Toque numa pergunta ao lado 👉 e veja respondendo ao vivo.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex flex-col items-center gap-4 pt-4 sm:flex-row lg:justify-start"
          >
            <CtaButton href={targetUrl}>
              {isLoggedIn ? "Acessar Dashboard" : "Começar Agora"}
            </CtaButton>
            <Link href="#modules" className="w-full sm:w-auto">
              <Button variant="ghost" className="h-14 w-full rounded-full border border-transparent px-8 text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground sm:w-auto">
                Explorar Módulos
              </Button>
            </Link>
          </motion.div>

          <motion.ul
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 pt-2 lg:justify-start"
          >
            {TRUST.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Icon className="h-4 w-4 text-primary" />
                {label}
              </li>
            ))}
          </motion.ul>
        </div>

        {/* --- DIREITA: CONSOLE DO CÉREBRO DIGITAL (interativo) --- */}
        <motion.div
          onMouseMove={handleCardTilt}
          onMouseLeave={resetCardTilt}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={reduceMotion ? undefined : { rotateX, rotateY, transformPerspective: 1400 }}
          className="group/console relative mx-auto w-full max-w-md [transform-style:preserve-3d] [will-change:transform]"
        >
          {/* halo do accent atrás do console (intensifica de leve no hover) */}
          <div aria-hidden className="absolute -inset-6 -z-10 rounded-[2rem] bg-primary/10 blur-2xl transition-opacity duration-500 group-hover/console:opacity-150" />

          <div className="landing-card overflow-hidden rounded-3xl shadow-2xl transition-shadow duration-500 group-hover/console:shadow-[0_30px_70px_-20px_color-mix(in_oklch,var(--color-primary)_35%,transparent)]">
            {/* Header da janela */}
            <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-3">
              <span className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-red-400/70" />
                <span className="h-3 w-3 rounded-full bg-amber-400/70" />
                <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
              </span>
              <div className="ml-2 flex items-center gap-1.5">
                <motion.span
                  animate={reduceMotion ? undefined : { scale: thinking ? [1, 1.18, 1] : 1 }}
                  transition={{ duration: 0.9, repeat: thinking ? Infinity : 0 }}
                >
                  <Brain className="h-4 w-4 text-primary" />
                </motion.span>
                <span className="text-sm font-semibold text-foreground">Cérebro Digital</span>
              </div>
              <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-2 py-0.5">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  {thinking ? "pensando" : "online"}
                </span>
              </span>
            </div>

            {/* Conversa */}
            <div className="relative flex min-h-[260px] flex-col gap-3 p-4">
              {/* Poeira de dados subindo no fundo */}
              {!reduceMotion && (
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                  {MOTES.map((m, i) => (
                    <motion.span
                      key={i}
                      className="absolute bottom-0 rounded-full bg-primary/30"
                      style={{ left: `${m.l}%`, width: m.s, height: m.s }}
                      animate={{ y: [0, -170], opacity: [0, 0.6, 0] }}
                      transition={{ duration: m.dur, delay: m.d, repeat: Infinity, ease: "linear" }}
                    />
                  ))}
                </div>
              )}

              {/* Pergunta do usuário */}
              <div className="relative z-10 flex items-start justify-end gap-2">
                <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                  {showQ}
                  {!reduceMotion && phase === "q" && <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-primary-foreground align-middle" />}
                </div>
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  Você
                </span>
              </div>

              {/* Resposta da IA (entra depois da pergunta) */}
              {aiVisible && (
                <motion.div
                  initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="relative z-10 flex items-start gap-2"
                >
                  <span className="relative mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-1 ring-inset ring-primary/30">
                    {thinking && <span className="absolute inset-0 animate-ping rounded-full bg-primary/30" />}
                    <Brain className="relative h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="rounded-2xl rounded-tl-sm border border-border/60 bg-background/50 px-3 py-2 text-sm text-foreground">
                      {thinking ? (
                        <ThinkingDots />
                      ) : (
                        <>
                          {showA || <span className="text-muted-foreground/60">…</span>}
                          {!reduceMotion && phase === "a" && <span className="ml-0.5 inline-block h-4 w-px animate-pulse bg-foreground align-middle" />}
                        </>
                      )}
                    </div>

                    {/* Widget do módulo (entra junto com a resposta) */}
                    <AnimatePresence mode="wait">
                      {showWidget && (
                        <motion.div
                          key={scene.id}
                          initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.97 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={reduceMotion ? undefined : { opacity: 0, y: -8, scale: 0.97 }}
                          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <SceneWidget kind={scene.kind} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Barra de "input" + chips de pergunta (a interação) */}
            <div className="space-y-3 border-t border-border/60 bg-muted/20 p-3">
              <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-3 py-2">
                <span className="text-sm text-muted-foreground/70">Pergunte ao Life OS…</span>
                <span className="ml-auto flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <CornerDownLeft className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SCENES.map((s, i) => {
                  const ChipIcon = s.icon;
                  const active = i === sceneIndex;
                  return (
                    <motion.button
                      key={s.id}
                      type="button"
                      onClick={() => setSceneIndex(i)}
                      aria-pressed={active}
                      whileHover={reduceMotion ? undefined : { scale: 1.06 }}
                      whileTap={reduceMotion ? undefined : { scale: 0.94 }}
                      className={cn(
                        "relative inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                        active ? "border-transparent text-primary" : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                      )}
                    >
                      {/* Pílula que desliza para o chip ativo (layout animation) */}
                      {active && (
                        <motion.span
                          layoutId="heroChipHighlight"
                          className="absolute inset-0 rounded-full bg-primary/10 ring-1 ring-inset ring-primary/40"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className="relative z-10 inline-flex items-center gap-1.5">
                        <ChipIcon className="h-3.5 w-3.5" /> {s.chip}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
